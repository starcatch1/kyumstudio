import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { engineRoot } from '../stage2a/project-lib.mjs';

export { engineRoot };
export const transitions = new Set(['cut','lime-wipe','black-wipe','center-split']);
export const layouts = new Set(['center','split','full']);
export const sceneKinds = new Set(['title','media','text','end']);

const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
const clamp = (v, lo, hi, d) => Math.max(lo, Math.min(hi, num(v, d)));
const exists = async p => { try { await access(p); return true; } catch { return false; } };

function transition(v) {
  if (!v) return {type:'cut',duration:0};
  if (typeof v === 'string') return {type:v,duration:v === 'cut' ? 0 : 0.56};
  const type = String(v.type || 'cut');
  return {type,duration:type === 'cut' ? 0 : num(v.duration,0.56)};
}
function text(v={}) {
  return {kicker:String(v.kicker||''),label:String(v.label||''),eyebrow:String(v.eyebrow||''),title:String(v.title||''),body:String(v.body||''),badge:String(v.badge||''),tags:Array.isArray(v.tags)?v.tags.map(String):[]};
}
function composition(c, ci) {
  let cursor=0;
  const scenes=(c.scenes||[]).map((s,si)=>{
    const duration=num(s.duration,NaN), explicit=s.start!==undefined&&s.start!==null;
    const start=explicit?num(s.start,NaN):cursor;
    const out={id:String(s.id||`scene-${si+1}`),kind:String(s.kind||(s.asset?'media':'text')),start,duration,track:Number.isInteger(s.track)?s.track:1,mediaTrack:Number.isInteger(s.mediaTrack)?s.mediaTrack:2,asset:s.asset?String(s.asset):'',mediaStart:Math.max(0,num(s.mediaStart,0)),layout:String(s.layout||(s.asset?'split':'center')),motion:String(s.motion||'subtle'),snapEnd:s.snapEnd!==false,transition:transition(s.transition),text:text(s.text)};
    if(Number.isFinite(start)&&Number.isFinite(duration)) cursor=Math.max(cursor,start+duration);
    return out;
  });
  const end=scenes.reduce((m,s)=>Math.max(m,Number.isFinite(s.start+s.duration)?s.start+s.duration:0),0);
  return {id:String(c.id||`composition-${ci+1}`),title:String(c.title||c.id||`Composition ${ci+1}`),width:num(c.width,1920),height:num(c.height,1080),fps:num(c.fps,30),duration:c.duration==='auto'||c.duration==null?end:num(c.duration,NaN),scenes};
}
function captions(v){return Array.isArray(v)?v.map((x,i)=>({id:String(x.id||`caption-${i+1}`),start:Math.max(0,num(x.start,0)),duration:num(x.duration,NaN),text:String(x.text||'')})):[];}

export function normalizeProject(raw){
  const a=raw.audio||{}, b=a.bgm||{}, s=a.beatSync||{}, n=a.narration||{}, d=a.ducking||{}, l=a.normalization||{}, p=raw.presets||{};
  return {schemaVersion:Number(raw.schemaVersion||3),id:String(raw.id||'stage2b-project'),title:String(raw.title||raw.id||'Stage 2B Project'),quality:String(raw.quality||'high'),presets:{visual:String(p.visual||'editorial-clean'),caption:String(p.caption||'editorial-card')},audio:{mode:String(a.mode||'external'),bgm:{asset:String(b.asset||''),volume:clamp(b.volume,0,1,.22),loop:b.loop!==false,start:Math.max(0,num(b.start,0))},beatSync:{enabled:s.enabled!==false,maxSnap:clamp(s.maxSnap,0,1,.25),minSceneDuration:Math.max(.25,num(s.minSceneDuration,1)),bpmMin:clamp(s.bpmMin,40,240,70),bpmMax:clamp(s.bpmMax,40,240,170),minConfidence:clamp(s.minConfidence,0,1,.18),candidateSource:String(s.candidateSource||'hybrid')},narration:{mode:String(n.mode||'none'),asset:String(n.asset||''),script:String(n.script||''),voice:String(n.voice||'af_nova'),start:Math.max(0,num(n.start,0)),volume:clamp(n.volume,0,2,1),captions:captions(n.captions)},ducking:{enabled:d.enabled!==false,threshold:clamp(d.threshold,.001,1,.035),ratio:clamp(d.ratio,1,20,8),attackMs:clamp(d.attackMs,1,2000,20),releaseMs:clamp(d.releaseMs,1,5000,320)},normalization:{targetLufs:clamp(l.targetLufs,-30,-5,-14),truePeak:clamp(l.truePeak,-9,0,-1.5),lra:clamp(l.lra,1,30,11)}},preprocessors:Array.isArray(raw.preprocessors)?raw.preprocessors:[],assets:raw.assets&&typeof raw.assets==='object'?raw.assets:{},compositions:Array.isArray(raw.compositions)?raw.compositions.map(composition):[]};
}
export async function loadProject(arg='project.stage2b.json'){
  const projectPath=path.isAbsolute(arg)?arg:path.resolve(engineRoot,arg), projectDir=path.dirname(projectPath);
  return {projectPath,projectDir,project:normalizeProject(JSON.parse(await readFile(projectPath,'utf8')))};
}

export async function validateProject(project,{projectDir,checkAssets=true}={}){
  const errors=[],warnings=[];
  if(project.schemaVersion!==3) errors.push(`schemaVersion must be 3, got ${project.schemaVersion}`);
  if(!/^[a-z0-9][a-z0-9._-]*$/i.test(project.id)) errors.push(`invalid project.id ${project.id}`);
  if(!['draft','standard','high'].includes(project.quality)) errors.push(`invalid quality ${project.quality}`);
  if(!['external','silent'].includes(project.audio.mode)) errors.push(`invalid audio.mode ${project.audio.mode}`);
  if(!['beats','onsets','hybrid'].includes(project.audio.beatSync.candidateSource)) errors.push('invalid beatSync.candidateSource');
  if(project.audio.beatSync.bpmMin>=project.audio.beatSync.bpmMax) errors.push('beatSync.bpmMin must be < bpmMax');
  for(const [id,a] of Object.entries(project.assets)){
    if(!a||!['image','video','audio'].includes(a.type)) errors.push(`asset ${id} has invalid type`);
    if(!a?.src) errors.push(`asset ${id} missing src`);
    else if(checkAssets&&projectDir&&!/^https?:\/\//i.test(a.src)&&!await exists(path.resolve(projectDir,a.src))) errors.push(`missing asset ${id}: ${path.resolve(projectDir,a.src)}`);
  }
  if(project.audio.mode==='external'){
    const a=project.assets[project.audio.bgm.asset];
    if(!a||a.type!=='audio') errors.push(`audio.bgm.asset must reference an audio asset: ${project.audio.bgm.asset}`);
  }
  const nar=project.audio.narration;
  if(nar.mode==='file'&&project.assets[nar.asset]?.type!=='audio') errors.push(`narration.asset must reference audio: ${nar.asset}`);
  if(nar.mode==='tts'&&!nar.script.trim()) errors.push('narration.mode=tts requires script');
  if(!['none','file','tts'].includes(nar.mode)) errors.push(`invalid narration.mode ${nar.mode}`);
  if(!project.compositions.length) errors.push('at least one composition required');
  for(const c of project.compositions){
    if(c.fps!==30) errors.push(`${c.id}: fps must be 30`);
    if(!c.scenes.length) errors.push(`${c.id}: scenes required`);
    let prevEnd=0;
    for(let i=0;i<c.scenes.length;i++){
      const s=c.scenes[i], end=s.start+s.duration;
      if(!sceneKinds.has(s.kind)||!layouts.has(s.layout)||!transitions.has(s.transition.type)) errors.push(`${c.id}/${s.id}: invalid scene contract`);
      if(!Number.isFinite(s.start)||s.start<0||!Number.isFinite(s.duration)||s.duration<=0) errors.push(`${c.id}/${s.id}: invalid timing`);
      if(i&&s.start<prevEnd-.001) errors.push(`${c.id}/${s.id}: sequential scene overlap`);
      if(s.asset){const a=project.assets[s.asset]; if(!a) errors.push(`${c.id}/${s.id}: unknown asset ${s.asset}`); else if(a.type==='audio') errors.push(`${c.id}/${s.id}: audio asset cannot be visual media`);}
      if(s.kind==='media'&&!s.asset) errors.push(`${c.id}/${s.id}: media scene requires asset`);
      if(i<c.scenes.length-1&&s.transition.type!=='cut'&&s.transition.duration>Math.min(s.duration,c.scenes[i+1].duration)/2+.001) errors.push(`${c.id}/${s.id}: transition exceeds safe window`);
      prevEnd=end;
    }
    if(Math.abs(c.duration-prevEnd)>.02) errors.push(`${c.id}: duration ${c.duration} does not match timeline end ${prevEnd}`);
    for(const cue of nar.captions) if(!Number.isFinite(cue.duration)||cue.duration<=0||!cue.text.trim()) errors.push(`${c.id}: invalid narration caption ${cue.id}`); else if(cue.start+cue.duration>c.duration+.02) warnings.push(`${c.id}: caption ${cue.id} will be clipped`);
  }
  return {ok:errors.length===0,errors,warnings};
}
