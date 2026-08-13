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
function loudnormMeasure(file,l){
  const r=run('ffmpeg',['-v','info','-i',file,'-af',`loudnorm=I=${l.targetLufs}:TP=${l.truePeak}:LRA=${l.lra}:print_format=json`,'-f','null','-']);
  const blocks=[...String(r.stderr||'').matchAll(/\{[\s\S]*?"input_i"[\s\S]*?\}/g)];
  if(!blocks.length)throw new Error('Unable to parse loudnorm first-pass measurement.');
  const m=JSON.parse(blocks.at(-1)[0]);
  for(const k of ['input_i','input_tp','input_lra','input_thresh','target_offset']) if(!Number.isFinite(Number(m[k]))) throw new Error(`Invalid loudnorm measurement ${k}=${m[k]}`);
  return m;
}
function normalizeTwoPass(premaster,out,l,duration){
  const m=loudnormMeasure(premaster,l);
  const filter=`loudnorm=I=${l.targetLufs}:TP=${l.truePeak}:LRA=${l.lra}:measured_I=${m.input_i}:measured_LRA=${m.input_lra}:measured_TP=${m.input_tp}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=summary,atrim=0:${duration},aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo`;
  run('ffmpeg',['-y','-v','warning','-i',premaster,'-af',filter,'-t',String(duration),'-c:a','pcm_s16le',out]);
  console.log(`[P2B] Loudnorm 2-pass: input ${m.input_i} LUFS / ${m.input_tp} dBTP -> target ${l.targetLufs} LUFS / ${l.truePeak} dBTP`);
}
async function narrationPath(){
  const n=project.audio.narration;
  if(n.mode==='none')return null;
  if(n.mode==='file')return assetPath(n.asset);
  const scriptFile=path.join(dir,'narration-script.txt'),wav=path.join(dir,'narration-tts.wav');await writeFile(scriptFile,n.script,'utf8');
  const npx=process.platform==='win32'?'npx.cmd':'npx';console.log(`[P2B] TTS via HyperFrames voice=${n.voice}`);run(npx,['--yes','hyperframes','tts',scriptFile,'--voice',n.voice,'--output',wav]);return wav;
}

const narration=await narrationPath(),manifest={projectId:project.id,mode:project.audio.mode,files:{},narration:narration?path.relative(engineRoot,narration).replaceAll('\\','/'):null};
for(const comp of project.compositions){
  const out=path.join(outDir,`${comp.id}-mix.wav`),premaster=path.join(outDir,`${comp.id}-premaster.wav`),duration=Number(comp.duration),l=project.audio.normalization;
  if(project.audio.mode==='silent'){
    run('ffmpeg',['-y','-v','warning','-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-t',String(duration),'-c:a','pcm_s16le',out]);
  }else{
    const bgm=assetPath(project.audio.bgm.asset),inputs=[];
    if(project.audio.bgm.loop)inputs.push('-stream_loop','-1');
    if(project.audio.bgm.start>0)inputs.push('-ss',String(project.audio.bgm.start));
    inputs.push('-i',bgm);if(narration)inputs.push('-i',narration);
    const d=project.audio.ducking,n=project.audio.narration,filters=[];
    filters.push(`[0:a]atrim=0:${duration},asetpts=PTS-STARTPTS,volume=${project.audio.bgm.volume}[bgm]`);let mix='bgm';
    if(narration){
      const delay=Math.round(n.start*1000);
      filters.push(`[1:a]asetpts=PTS-STARTPTS,volume=${n.volume},adelay=${delay}|${delay},apad,atrim=0:${duration}[nar0]`);
      if(d.enabled){
        filters.push('[nar0]asplit=2[nar_sc][nar_mix]');
        filters.push(`[bgm][nar_sc]sidechaincompress=threshold=${d.threshold}:ratio=${d.ratio}:attack=${d.attackMs}:release=${d.releaseMs}[duck]`);
        filters.push('[duck][nar_mix]amix=inputs=2:duration=longest:normalize=0[mix]');
      } else filters.push('[bgm][nar0]amix=inputs=2:duration=longest:normalize=0[mix]');
      mix='mix';
    }
    filters.push(`[${mix}]atrim=0:${duration},aformat=sample_rates=48000:channel_layouts=stereo[out]`);
    run('ffmpeg',['-y','-v','warning',...inputs,'-filter_complex',filters.join(';'),'-map','[out]','-t',String(duration),'-c:a','pcm_s16le',premaster]);
    normalizeTwoPass(premaster,out,l,duration);
  }
  manifest.files[comp.id]=path.relative(engineRoot,out).replaceAll('\\','/');console.log(`[P2B] Mixed audio: ${comp.id} -> ${out}`);
}
const manifestPath=path.join(dir,'audio-manifest.json');await writeFile(manifestPath,JSON.stringify(manifest,null,2),'utf8');console.log(`[P2B] Audio manifest: ${manifestPath}`);
