import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'audio');
await mkdir(outDir, { recursive: true });

const sampleRate = 48000;
const channels = 2;
const bitsPerSample = 16;

function seededNoise(seed = 0x12345678) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return (s / 0xffffffff) * 2 - 1;
  };
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

function renderTrack({ duration, boundaries, bpm, seed }) {
  const frames = Math.floor(duration * sampleRate);
  const buffer = Buffer.alloc(44 + frames * channels * 2);
  writeWavHeader(buffer, frames);
  const noise = seededNoise(seed);
  const beat = 60 / bpm;
  const chords = [
    [57, 60, 64], // Am
    [53, 57, 60], // F
    [60, 64, 67], // C
    [55, 59, 62], // G
  ];

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
    const barPhase = (t % 4) / 4;
    pad *= 0.72 + 0.28 * Math.sin(Math.PI * barPhase);

    const beatPhase = t % beat;
    let kick = 0;
    if (beatPhase < 0.18) {
      const env = Math.exp(-beatPhase * 22);
      const f = 72 - 26 * (beatPhase / 0.18);
      kick = Math.sin(2 * Math.PI * f * beatPhase) * env * 0.075;
    }

    const halfBeat = beat / 2;
    const hatPhase = t % halfBeat;
    let hat = 0;
    if (hatPhase < 0.045) {
      const env = Math.exp(-hatPhase * 80);
      hat = noise() * env * 0.014;
    }

    let whooshL = 0;
    let whooshR = 0;
    let chime = 0;
    for (const b of boundaries) {
      const rel = t - (b - 0.26);
      if (rel >= 0 && rel <= 0.44) {
        const p = rel / 0.44;
        const env = Math.sin(Math.PI * p);
        const n = noise() * env * 0.042;
        whooshL += n * (1 - p * 0.62);
        whooshR += n * (0.38 + p * 0.62);
      }
      const c = t - b;
      if (c >= 0 && c < 0.28) {
        const env = Math.exp(-c * 12);
        chime += (Math.sin(2 * Math.PI * 880 * c) + 0.5 * Math.sin(2 * Math.PI * 1320 * c)) * env * 0.018;
      }
    }

    let master = 1;
    if (t < 0.9) master *= smoothstep(t / 0.9);
    if (t > duration - 1.1) master *= smoothstep((duration - t) / 1.1);

    const mono = (pad + kick + hat + chime) * master;
    let left = mono + whooshL * master;
    let right = mono + whooshR * master;
    left = Math.max(-0.92, Math.min(0.92, left));
    right = Math.max(-0.92, Math.min(0.92, right));

    buffer.writeInt16LE(Math.round(left * 32767), offset); offset += 2;
    buffer.writeInt16LE(Math.round(right * 32767), offset); offset += 2;
  }
  return buffer;
}

const longAudio = renderTrack({ duration: 30, boundaries: [3,6,9,12,15,18,21,24,27], bpm: 92, seed: 0x13579bdf });
const shortAudio = renderTrack({ duration: 17, boundaries: [2.5,5.5,8.5,11.5,14.5], bpm: 104, seed: 0x2468ace0 });

await writeFile(path.join(outDir, 'style-long.wav'), longAudio);
await writeFile(path.join(outDir, 'style-short.wav'), shortAudio);
console.log('[P1] Generated deterministic BGM + transition SFX tracks.');
