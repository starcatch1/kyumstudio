import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [file,expectedArg,reportArg,targetArg='-14',peakArg='-1.5']=process.argv.slice(2);
if(!file||!expectedArg||!reportArg) throw new Error('usage: qa-audio.mjs <file> <duration> <report> [targetLufs] [truePeak]');
const expected=Number(expectedArg),target=Number(targetArg),peakLimit=Number(peakArg);
function run(bin,args,encoding='utf8'){const r=spawnSync(bin,args,{encoding,maxBuffer:32*1024*1024,windowsHide:true});return r;}
const probe=run('ffprobe',['-v','error','-select_streams','a:0','-show_entries','format=duration:stream=sample_rate,channels,codec_name','-of','json',file]);
if(probe.status!==0) throw new Error(probe.stderr);
const pj=JSON.parse(probe.stdout),stream=pj.streams?.[0]||{},duration=Number(pj.format?.duration||0);
const loud=run('ffmpeg',['-v','info','-i',file,'-af',`loudnorm=I=${target}:TP=${peakLimit}:LRA=11:print_format=json`,'-f','null','-']);
const text=String(loud.stderr||''), matches=[...text.matchAll(/\{[\s\S]*?"input_i"[\s\S]*?\}/g)], block=matches.at(-1)?.[0];
let stats={};try{stats=block?JSON.parse(block):{};}catch{}
const integrated=Number(stats.input_i),truePeak=Number(stats.input_tp);
const decode=run('ffmpeg',['-v','error','-i',file,'-f','null','-']);
const checks={duration:Math.abs(duration-expected)<=.08,sampleRate:Number(stream.sample_rate)===48000,stereo:Number(stream.channels)===2,decodeClean:decode.status===0,loudness:Number.isFinite(integrated)?Math.abs(integrated-target)<=2.5:false,truePeak:Number.isFinite(truePeak)?truePeak<=peakLimit+.8:false};
const result={ok:Object.values(checks).every(Boolean),file,expectedDuration:expected,actual:{duration,codec:stream.codec_name,sampleRate:Number(stream.sample_rate),channels:Number(stream.channels),integratedLufs:integrated,truePeakDbtp:truePeak},targets:{integratedLufs:target,truePeakDbtp:peakLimit},checks,decodeError:decode.status===0?null:String(decode.stderr||'').trim()};
await mkdir(path.dirname(reportArg),{recursive:true});await writeFile(reportArg,JSON.stringify(result,null,2),'utf8');console.log(JSON.stringify(result,null,2));if(!result.ok) process.exit(2);
