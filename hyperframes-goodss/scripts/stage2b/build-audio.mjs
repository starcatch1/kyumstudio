import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { engineRoot } from './project-lib.mjs';

const arg=process.argv[2]||'project.stage2b.json';
const sourcePath=path.isAbsolute(arg)?arg:path.resolve(engineRoot,arg);
const source=JSON.parse(await readFile(sourcePath,'utf8'));
const dir=path.join(engineRoot,'generated','stage2b',source.id), resolvedPath=path.join(dir,'resolved-project.json');
const project=JSON.parse(await readFile(resolvedPath,'utf8')), projectDir=path.dirname(sourcePath), outDir=path.join(dir,'audio');
await mkdir(outDir,{recursive:true});

function run(bin,args){const r=spawnSync(bin,args,{encoding:'utf8',maxBuffer:32*1024*1024,windowsHide:true});if(r.status!==0)throw new Error(`${bin} failed (${r.status}): ${String(r.stderr||r.stdout||'').trim()}`);return r;}
function assetPath(id){const a=project.assets[id];if(!a)throw new Error(`Unknown asset ${id}`);return path.resolve(projectDir,a.src);}
async function narrationPath(){
  const n=project.audio.narration;
  if(n.mode==='none') return null;
  if(n.mode==='file') return assetPath(n.asset);
  const scriptFile=path.join(dir,'narration-script.txt'), wav=path.join(dir,'narration-tts.wav');await writeFile(scriptFile,n.script,'utf8');
  const npx=process.platform==='win32'?'npx.cmd':'npx';
  console.log(`[P2B] TTS via HyperFrames voice=${n.voice}`);run(npx,['--yes','hyperframes','tts',scriptFile,'--voice',n.voice,'--output',wav]);return wav;
}
const narration=await narrationPath(), manifest={projectId:project.id,mode:project.audio.mode,files:{},narration:narration?path.relative(engineRoot,narration).replaceAll('\\','/'):null};
for(const comp of project.compositions){
  const out=path.join(outDir,`${comp.id}-mix.wav`), duration=Number(comp.duration);
  if(project.audio.mode==='silent'){
    run('ffmpeg',['-y','-v','warning','-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-t',String(duration),'-c:a','pcm_s16le',out]);
  }else{
    const bgm=assetPath(project.audio.bgm.asset), inputs=[];
    if(project.audio.bgm.loop) inputs.push('-stream_loop','-1');
    if(project.audio.bgm.start>0) inputs.push('-ss',String(project.audio.bgm.start));
    inputs.push('-i',bgm);
    if(narration) inputs.push('-i',narration);
    const l=project.audio.normalization, d=project.audio.ducking, n=project.audio.narration, filters=[];
    filters.push(`[0:a]atrim=0:${duration},asetpts=PTS-STARTPTS,volume=${project.audio.bgm.volume}[bgm]`);
    let mix='bgm';
    if(narration){
      const delay=Math.round(n.start*1000);filters.push(`[1:a]asetpts=PTS-STARTPTS,volume=${n.volume},adelay=${delay}|${delay}[nar]`);
      if(d.enabled){filters.push(`[bgm][nar]sidechaincompress=threshold=${d.threshold}:ratio=${d.ratio}:attack=${d.attackMs}:release=${d.releaseMs}[duck]`);filters.push('[duck][nar]amix=inputs=2:duration=longest:normalize=0[mix]');}
      else filters.push('[bgm][nar]amix=inputs=2:duration=longest:normalize=0[mix]');
      mix='mix';
    }
    filters.push(`[${mix}]loudnorm=I=${l.targetLufs}:TP=${l.truePeak}:LRA=${l.lra},atrim=0:${duration},aformat=sample_rates=48000:channel_layouts=stereo[out]`);
    run('ffmpeg',['-y','-v','warning',...inputs,'-filter_complex',filters.join(';'),'-map','[out]','-t',String(duration),'-c:a','pcm_s16le',out]);
  }
  manifest.files[comp.id]=path.relative(engineRoot,out).replaceAll('\\','/');console.log(`[P2B] Mixed audio: ${comp.id} -> ${out}`);
}
const manifestPath=path.join(dir,'audio-manifest.json');await writeFile(manifestPath,JSON.stringify(manifest,null,2),'utf8');console.log(`[P2B] Audio manifest: ${manifestPath}`);
