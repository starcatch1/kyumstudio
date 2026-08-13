import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export async function loadResolvedConfig() {
  const presets = JSON.parse(await readFile(path.join(root, 'config', 'presets.json'), 'utf8'));
  const project = JSON.parse(await readFile(path.join(root, 'config', 'project.json'), 'utf8'));

  const visual = presets.visualPresets?.[project.visualPreset];
  const caption = presets.captionPresets?.[project.captionPreset];
  const audio = presets.audioPresets?.[project.audioPreset];

  if (!visual) throw new Error(`Unknown visualPreset: ${project.visualPreset}`);
  if (!caption) throw new Error(`Unknown captionPreset: ${project.captionPreset}`);
  if (!audio) throw new Error(`Unknown audioPreset: ${project.audioPreset}`);
  if (!['draft','standard','high'].includes(project.quality)) throw new Error(`Invalid quality: ${project.quality}`);

  return {
    root,
    presets,
    project: {
      ...project,
      bgmVolume: clamp(project.bgmVolume, 0, 1, 0.18),
      sfxVolume: clamp(project.sfxVolume, 0, 1, 0.28)
    },
    visual,
    caption,
    audio
  };
}

export function cssVarBlock(visual, caption) {
  const headline = Number(caption.headlineScale || 1);
  const body = Number(caption.bodyScale || 1);
  return `:root{--canvas:${visual.canvas};--panel:${visual.panel};--text:${visual.text};--muted:${visual.muted};--accent:${visual.accent};--divider:${visual.divider};--radius:${visual.radius}px;--headline-scale:${headline};--body-scale:${body};}`;
}
