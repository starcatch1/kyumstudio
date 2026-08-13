import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadProject, engineRoot } from './project-lib.mjs';

const projectArg = process.argv[2] || 'project.json';
const { project } = await loadProject(projectArg);
const presets = JSON.parse(await readFile(path.join(engineRoot, 'config/presets.json'), 'utf8'));
const audioPreset = presets.audioPresets?.[project.audio.preset];
if (project.audio.mode === 'synthetic' && !audioPreset) {
  console.error(`[P2A] Unknown audio preset: ${project.audio.preset}`);
  process.exit(2);
}

const sampleRate = 48000;
const channels = 2;
const bitsPerSample = 16;
const outputDir = path.join(engineRoot, 'generated', 'stage2a', project.id, 'audio');
await mkdir(outputDir, { recursive: true });

function seededNoise(seed = 0x12345678) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return (s / 0xffffffff) * 2 - 1;
  };
}

function hashString(value) {
  let h = 2166136261 >>> 0;
  for (const c of value) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function midi(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

function smoothstep(x) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

function writeWavHeader(buffer, frames) {
  const blockAlign = channels * bitsPerSample / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = frames * blockAlign;
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
}

function renderTrack({ duration, boundaries, bpm, seed, preset, bgmVolume, sfxVolume }) {
  const frames = Math.max(1, Math.floor(duration * sampleRate));
  const buffer = Buffer.alloc(44 + frames * channels * 2);
  writeWavHeader(buffer, frames);
  const noise = seededNoise(seed);
  const beat = 60 / bpm;
  const chords = preset.chords;
  let offset = 44;

  for (let i = 0; i < frames; i++) {
    const t = i / sampleRate;
    const chord = chords[Math.floor(t / 4) % chords.length];
    let pad = 0;
    for (let k = 0; k < chord.length; k++) {
      const f = midi(chord[k] - 12);
      pad += Math.sin(2 * Math.PI * f * t + k * 0.7) * (0.018 / (k + 1));
      pad += Math.sin(2 * Math.PI * f * 2 * t + k * 0.2) * 0.004;
    }
    pad *= preset.padGain;
    const barPhase = (t % 4) / 4;
    pad *= 0.72 + 0.28 * Math.sin(Math.PI * barPhase);

    const beatPhase = t % beat;
    let kick = 0;
    if (beatPhase < 0.18) {
      const env = Math.exp(-beatPhase * 22);
      const f = 72 - 26 * (beatPhase / 0.18);
      kick = Math.sin(2 * Math.PI * f * beatPhase) * env * 0.075 * preset.kickGain;
    }

    const halfBeat = beat / 2;
    const hatPhase = t % halfBeat;
    let hat = 0;
    if (hatPhase < 0.045) {
      const env = Math.exp(-hatPhase * 80);
      hat = noise() * env * 0.014 * preset.hatGain;
    }

    let whooshL = 0;
    let whooshR = 0;
    let chime = 0;
    for (const boundary of boundaries) {
      const rel = t - (boundary - 0.26);
      if (rel >= 0 && rel <= 0.44) {
        const p = rel / 0.44;
        const env = Math.sin(Math.PI * p);
        const n = noise() * env * 0.042 * preset.sfxGain;
        whooshL += n * (1 - p * 0.62);
        whooshR += n * (0.38 + p * 0.62);
      }
      const c = t - boundary;
      if (c >= 0 && c < 0.28) {
        const env = Math.exp(-c * 12);
        chime += (Math.sin(2 * Math.PI * 880 * c) + 0.5 * Math.sin(2 * Math.PI * 1320 * c)) * env * 0.018 * preset.sfxGain;
      }
    }

    let master = 1;
    if (t < 0.9) master *= smoothstep(t / 0.9);
    if (t > duration - 1.1) master *= smoothstep((duration - t) / 1.1);

    const bgm = (pad + kick + hat) * bgmVolume;
    const fx = (chime * sfxVolume);
    let left = (bgm + fx) * master + whooshL * sfxVolume * master;
    let right = (bgm + fx) * master + whooshR * sfxVolume * master;
    left = Math.max(-0.92, Math.min(0.92, left));
    right = Math.max(-0.92, Math.min(0.92, right));
    buffer.writeInt16LE(Math.round(left * 32767), offset); offset += 2;
    buffer.writeInt16LE(Math.round(right * 32767), offset); offset += 2;
  }
  return buffer;
}

const manifest = { projectId: project.id, mode: project.audio.mode, files: {} };
for (const comp of project.compositions) {
  if (project.audio.mode === 'silent') {
    manifest.files[comp.id] = null;
    continue;
  }
  const boundaries = comp.scenes.slice(0, -1).map(s => s.start + s.duration);
  const portrait = comp.height > comp.width;
  const bpm = portrait ? audioPreset.bpmShort : audioPreset.bpmLong;
  const wav = renderTrack({
    duration: comp.duration,
    boundaries,
    bpm,
    seed: hashString(`${project.id}:${comp.id}:${project.audio.preset}`),
    preset: audioPreset,
    bgmVolume: project.audio.bgmVolume,
    sfxVolume: project.audio.sfxVolume,
  });
  const file = path.join(outputDir, `${comp.id}.wav`);
  await writeFile(file, wav);
  manifest.files[comp.id] = path.relative(engineRoot, file).replaceAll('\\', '/');
  console.log(`[P2A] Audio ${comp.id}: ${comp.duration}s / ${bpm} BPM / ${project.audio.preset}`);
}

const manifestPath = path.join(engineRoot, 'generated', 'stage2a', project.id, 'audio-manifest.json');
await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`[P2A] Audio manifest: ${manifestPath}`);
