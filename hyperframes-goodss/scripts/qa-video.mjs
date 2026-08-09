import { readFile, writeFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const [fileArg, wArg, hArg, reportArg] = process.argv.slice(2);
if (!fileArg || !wArg || !hArg) {
  console.error('Usage: node scripts/qa-video.mjs <file> <width> <height> [report.json]');
  process.exit(2);
}

const file = path.resolve(fileArg);
const expectedW = Number(wArg);
const expectedH = Number(hArg);
const report = path.resolve(reportArg || file.replace(/\.mp4$/i, '-qa.json'));

function run(bin, args) {
  const r = spawnSync(bin, args, { encoding:'utf8', stdio:['ignore','pipe','pipe'] });
  return { code:r.status ?? 1, stdout:r.stdout ?? '', stderr:r.stderr ?? '' };
}

const fileStat = await stat(file);
const probeRun = run('ffprobe', ['-v','error','-show_streams','-show_format','-of','json',file]);
if (probeRun.code !== 0) {
  console.error(probeRun.stderr);
  process.exit(3);
}
const probe = JSON.parse(probeRun.stdout);
const video = probe.streams.find(s => s.codec_type === 'video');
const audio = probe.streams.find(s => s.codec_type === 'audio');
const duration = Number(probe.format?.duration || video?.duration || 0);
const fpsParts = String(video?.avg_frame_rate || '0/1').split('/').map(Number);
const fps = fpsParts[1] ? fpsParts[0]/fpsParts[1] : 0;

const head = await readFile(file);
const scan = head.subarray(0, Math.min(head.length, 2 * 1024 * 1024));
const moov = scan.indexOf(Buffer.from('moov'));
const mdat = scan.indexOf(Buffer.from('mdat'));
const faststart = moov >= 0 && (mdat < 0 || moov < mdat);

const decode = run('ffmpeg', ['-v','error','-i',file,'-f','null','-']);

const checks = {
  existsAndSized: fileStat.size > 50_000,
  videoCodecH264: video?.codec_name === 'h264',
  profileMain: String(video?.profile || '').toLowerCase().includes('main'),
  pixelFormat420: video?.pix_fmt === 'yuv420p',
  width: video?.width === expectedW,
  height: video?.height === expectedH,
  fps30: Math.abs(fps - 30) < 0.05,
  audioAAC: audio?.codec_name === 'aac',
  audio48k: Number(audio?.sample_rate) === 48000,
  audioStereo: Number(audio?.channels) === 2,
  durationValid: duration >= 5,
  faststart,
  decodeClean: decode.code === 0 && decode.stderr.trim() === ''
};

const ok = Object.values(checks).every(Boolean);
const output = {
  ok,
  file,
  bytes:fileStat.size,
  duration,
  expected:{ width:expectedW, height:expectedH, fps:30 },
  actual:{
    width:video?.width,
    height:video?.height,
    fps,
    codec:video?.codec_name,
    profile:video?.profile,
    pix_fmt:video?.pix_fmt,
    audio_codec:audio?.codec_name,
    audio_sample_rate:audio?.sample_rate,
    audio_channels:audio?.channels
  },
  checks,
  decodeError: decode.stderr.trim() || null
};

await writeFile(report, JSON.stringify(output,null,2), 'utf8');
console.log(JSON.stringify(output,null,2));
if (!ok) {
  console.error(`[P0] QA FAILED: ${path.basename(file)}`);
  process.exit(10);
}
console.log(`[P0] QA PASS: ${path.basename(file)}`);
