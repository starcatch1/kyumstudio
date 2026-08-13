import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadProject, engineRoot } from './project-lib.mjs';

const arg=process.argv[2]||'project.stage2b.json';
const {project}=await loadProject(arg);
const dir=path.join(engineRoot,'generated','stage2b',project.id);
const analysisPath=path.join(dir,'audio-analysis.json');
let report={analysis:null};
try{report=JSON.parse(await readFile(analysisPath,'utf8'));}catch{}
const analysis=report.analysis;

function candidatesFor(comp){
  if(!project.audio.beatSync.enabled||!analysis) return [];
  const cfg=project.audio.beatSync, offset=project.audio.bgm.start||0, out=[];
  if((cfg.candidateSource==='beats'||cfg.candidateSource==='hybrid')&&analysis.confidence>=cfg.minConfidence){
    for(const t of analysis.beats||[]){const x=t-offset;if(x>=0&&x<=comp.duration) out.push({time:x,type:'beat',strength:1});}
  }
  if(cfg.candidateSource==='onsets'||cfg.candidateSource==='hybrid'){
    for(const o of analysis.onsets||[]){const x=o.time-offset;if(x>=0&&x<=comp.duration&&o.strength>=.18) out.push({time:x,type:'onset',strength:o.strength});}
  }
  out.sort((a,b)=>a.time-b.time||b.strength-a.strength);
  return out.filter((x,i)=>i===0||Math.abs(x.time-out[i-1].time)>.025||x.strength>out[i-1].strength);
}
function nearest(list,target,maxSnap,min,max){
  let best=null;
  for(const c of list){if(c.time<min||c.time>max) continue;const d=Math.abs(c.time-target);if(d<=maxSnap&&(!best||d<best.delta-1e-9||(Math.abs(d-best.delta)<1e-9&&c.strength>best.c.strength))) best={c,delta:d};}
  return best;
}

const resolved=structuredClone(project), timingReport={projectId:project.id,beatSync:project.audio.beatSync,analysis:analysis?{bpm:analysis.bpm,confidence:analysis.confidence,beatInterval:analysis.beatInterval}:null,compositions:[]};
for(const comp of resolved.compositions){
  const source=project.compositions.find(c=>c.id===comp.id), list=candidatesFor(source), minDur=project.audio.beatSync.minSceneDuration, maxSnap=project.audio.beatSync.maxSnap;
  const finalEnd=source.duration, boundaries=[], changes=[];let prev=source.scenes[0]?.start||0;
  for(let i=0;i<source.scenes.length-1;i++){
    const scene=source.scenes[i], original=scene.start+scene.duration, remaining=source.scenes.length-(i+1), lo=prev+minDur, hi=finalEnd-remaining*minDur;
    const hit=scene.snapEnd?nearest(list,original,maxSnap,lo,hi):null, value=hit?hit.c.time:original;
    boundaries.push(value);changes.push({scene:scene.id,original:Number(original.toFixed(4)),resolved:Number(value.toFixed(4)),delta:Number((value-original).toFixed(4)),source:hit?hit.c.type:'original'});prev=value;
  }
  let start=source.scenes[0]?.start||0;
  for(let i=0;i<comp.scenes.length;i++){
    const end=i<boundaries.length?boundaries[i]:finalEnd;comp.scenes[i].start=Number(start.toFixed(4));comp.scenes[i].duration=Number((end-start).toFixed(4));start=end;
  }
  comp.duration=finalEnd;
  timingReport.compositions.push({id:comp.id,candidates:list.length,changes});
}
await mkdir(dir,{recursive:true});
const resolvedPath=path.join(dir,'resolved-project.json'), reportPath=path.join(dir,'timing-report.json');
await writeFile(resolvedPath,JSON.stringify(resolved,null,2),'utf8');await writeFile(reportPath,JSON.stringify(timingReport,null,2),'utf8');
console.log(`[P2B] Timing resolved: ${resolvedPath}`);
for(const c of timingReport.compositions){const snapped=c.changes.filter(x=>x.source!=='original');console.log(`[P2B] ${c.id}: snapped ${snapped.length}/${c.changes.length} boundaries`);}
