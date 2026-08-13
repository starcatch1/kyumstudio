import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadProject } from './project-lib.mjs';

const {project,projectDir}=await loadProject(process.argv[2]||'project.stage2b.json');
const SR=48000, CH=2;

function wavHeader(frames){
  const b=Buffer.alloc(44), data=frames*CH*2;
  b.write('RIFF',0); b.writeUInt32LE(36+data,4); b.write('WAVE',8); b.write('fmt ',12); b.writeUInt32LE(16,16); b.writeUInt16LE(1,20); b.writeUInt16LE(CH,22); b.writeUInt32LE(SR,24); b.writeUInt32LE(SR*CH*2,28); b.writeUInt16LE(CH*2,32); b.writeUInt16LE(16,34); b.write('data',36); b.writeUInt32LE(data,40); return b;
}
async function renderWav(file,duration,sample){
  const frames=Math.round(duration*SR), out=Buffer.alloc(44+frames*CH*2); wavHeader(frames).copy(out); let o=44;
  for(let i=0;i<frames;i++){
    const t=i/SR, v=Math.max(-.9,Math.min(.9,sample(t)));
    const s=Math.round(v*32767); out.writeInt16LE(s,o); o+=2; out.writeInt16LE(s,o); o+=2;
  }
  await mkdir(path.dirname(file),{recursive:true}); await writeFile(file,out);
}
function beatSample(bpm){
  const beat=60/bpm;
  return t=>{
    const p=t%beat, env=p<.15?Math.exp(-p*28):0;
    const kick=Math.sin(2*Math.PI*(72-24*Math.min(1,p/.15))*p)*env*.42;
    const click=p<.035?Math.sin(2*Math.PI*1800*p)*Math.exp(-p*95)*.18:0;
    const pad=(Math.sin(2*Math.PI*110*t)+.45*Math.sin(2*Math.PI*165*t))*.045;
    return kick+click+pad;
  };
}
function narrationSample(){
  return t=>{
    const syllable=t%.34, gate=syllable<.23?Math.sin(Math.PI*syllable/.23):0;
    const phrase=(Math.floor(t/1.36)%2)?1:.82;
    const f=175+22*Math.sin(2*Math.PI*.6*t);
    return gate*phrase*(Math.sin(2*Math.PI*f*t)+.32*Math.sin(2*Math.PI*f*2.03*t)+.14*Math.sin(2*Math.PI*f*3.02*t))*.18;
  };
}

let count=0;
for(const p of project.preprocessors){
  if(p.type==='beat-audio-fixture'){
    const file=path.resolve(projectDir,String(p.output||'assets/music-fixture.wav'));
    await renderWav(file,Number(p.duration||16),beatSample(Number(p.bpm||120))); count++; console.log(`[P2B] beat fixture: ${file} (${p.bpm||120} BPM)`);
  } else if(p.type==='narration-fixture'){
    const file=path.resolve(projectDir,String(p.output||'assets/narration-fixture.wav'));
    await renderWav(file,Number(p.duration||5),narrationSample()); count++; console.log(`[P2B] narration fixture: ${file}`);
  }
}
console.log(`[P2B] Asset preparation complete (${count} audio fixture(s)).`);
