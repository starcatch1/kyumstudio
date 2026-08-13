import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { loadProject, engineRoot } from './project-lib.mjs';

const RATE=12000, HOP=120, WIN=480, HOP_SEC=HOP/RATE;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function exec(bin,args,encoding=null){
  const r=spawnSync(bin,args,{encoding,maxBuffer:256*1024*1024,windowsHide:true});
  if(r.status!==0) throw new Error(`${bin} failed: ${String(r.stderr||'').trim()}`);
  return r.stdout;
}
export function probeAudio(file){
  const raw=exec('ffprobe',['-v','error','-select_streams','a:0','-show_entries','format=duration:stream=sample_rate,channels','-of','json',file],'utf8');
  const j=JSON.parse(raw), s=j.streams?.[0]||{};
  return {duration:Number(j.format?.duration||0),sampleRate:Number(s.sample_rate||0),channels:Number(s.channels||0)};
}
function decode(file){return exec('ffmpeg',['-v','error','-i',file,'-vn','-ac','1','-ar',String(RATE),'-f','s16le','-acodec','pcm_s16le','pipe:1']);}
function envelope(pcm){
  const n=Math.floor(pcm.length/2), samples=new Float64Array(n);
  for(let i=0;i<n;i++) samples[i]=pcm.readInt16LE(i*2)/32768;
  const frames=Math.max(1,Math.floor((n-WIN)/HOP)+1), rms=new Float64Array(frames);
  for(let f=0;f<frames;f++){
    const start=f*HOP; let sum=0;
    for(let i=0;i<WIN&&start+i<n;i++){const v=samples[start+i]; sum+=v*v;}
    rms[f]=Math.sqrt(sum/WIN);
  }
  const onset=new Float64Array(frames); let max=0;
  for(let i=0;i<frames;i++){
    let base=0,c=0; for(let k=Math.max(0,i-10);k<i;k++){base+=rms[k];c++;}
    base=c?base/c:rms[i]; onset[i]=Math.max(0,rms[i]-base*.92); max=Math.max(max,onset[i]);
  }
  if(max>0) for(let i=0;i<frames;i++) onset[i]/=max;
  return onset;
}
function tempo(onset,bpmMin,bpmMax){
  const minLag=Math.max(2,Math.floor(60/(bpmMax*HOP_SEC))), maxLag=Math.max(minLag+1,Math.ceil(60/(bpmMin*HOP_SEC)));
  const scores=[]; let best={lag:minLag,score:-1};
  for(let lag=minLag;lag<=maxLag;lag++){
    let dot=0,a=0,b=0;
    for(let i=lag;i<onset.length;i++){const x=onset[i],y=onset[i-lag];dot+=x*y;a+=x*x;b+=y*y;}
    const score=dot/(Math.sqrt(a*b)+1e-9); scores.push(score); if(score>best.score) best={lag,score};
  }
  const sorted=[...scores].sort((a,b)=>a-b), median=sorted[Math.floor(sorted.length/2)]||0;
  const confidence=clamp((best.score-median)/(1-median+1e-9),0,1);
  return {bpm:60/(best.lag*HOP_SEC),periodFrames:best.lag,correlation:best.score,confidence};
}
function beatGrid(onset,periodFrames,duration){
  let bestOffset=0,best=-1;
  for(let off=0;off<periodFrames;off++){
    let s=0,c=0; for(let i=off;i<onset.length;i+=periodFrames){s+=onset[i]+.5*(onset[i-1]||0)+.5*(onset[i+1]||0);c++;}
    s/=Math.max(1,c); if(s>best){best=s;bestOffset=off;}
  }
  const period=periodFrames*HOP_SEC, first=bestOffset*HOP_SEC, beats=[];
  for(let t=first;t<=duration+.001;t+=period) beats.push(Number(t.toFixed(4)));
  return {period,phase:first,beats};
}
function onsetTimes(onset,duration){
  let mean=0; for(const v of onset) mean+=v; mean/=onset.length;
  let variance=0; for(const v of onset) variance+=(v-mean)**2; variance/=onset.length;
  const threshold=Math.max(.08,mean+Math.sqrt(variance)*.75), out=[]; let last=-99;
  for(let i=1;i<onset.length-1;i++) if(onset[i]>=threshold&&onset[i]>=onset[i-1]&&onset[i]>onset[i+1]){
    const t=i*HOP_SEC; if(t-last>=.12&&t<=duration+.01){out.push({time:Number(t.toFixed(4)),strength:Number(onset[i].toFixed(4))});last=t;}
  }
  return {threshold:Number(threshold.toFixed(4)),items:out.slice(0,2000)};
}
export function analyzeAudioFile(file,{bpmMin=70,bpmMax=170}={}){
  const meta=probeAudio(file), onset=envelope(decode(file)), t=tempo(onset,bpmMin,bpmMax), grid=beatGrid(onset,t.periodFrames,meta.duration), os=onsetTimes(onset,meta.duration);
  return {file,meta,analysisRate:RATE,hopSeconds:HOP_SEC,bpm:Number(t.bpm.toFixed(3)),confidence:Number(t.confidence.toFixed(4)),correlation:Number(t.correlation.toFixed(4)),beatInterval:Number(grid.period.toFixed(4)),phase:Number(grid.phase.toFixed(4)),beats:grid.beats,onsets:os.items,onsetThreshold:os.threshold};
}

if(import.meta.url===`file://${process.argv[1].replaceAll('\\','/')}`||process.argv[1]?.endsWith('analyze-audio.mjs')){
  const arg=process.argv[2]||'project.stage2b.json', {project,projectDir}=await loadProject(arg), dir=path.join(engineRoot,'generated','stage2b',project.id);
  await mkdir(dir,{recursive:true});
  let report={projectId:project.id,mode:project.audio.mode,analysis:null};
  if(project.audio.mode==='external'){
    const asset=project.assets[project.audio.bgm.asset], file=path.resolve(projectDir,asset.src);
    report.analysis=analyzeAudioFile(file,project.audio.beatSync);
    console.log(`[P2B] BGM analysis: ${report.analysis.bpm.toFixed(2)} BPM / confidence ${report.analysis.confidence.toFixed(3)} / ${report.analysis.beats.length} beats`);
  }
  const out=path.join(dir,'audio-analysis.json'); await writeFile(out,JSON.stringify(report,null,2),'utf8'); console.log(`[P2B] Audio analysis: ${out}`);
}
