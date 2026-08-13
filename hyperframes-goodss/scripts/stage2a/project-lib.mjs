import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

export const engineRoot = path.resolve(import.meta.dirname, '../..');
export const allowedAssetTypes = new Set(['image', 'video']);
export const allowedSceneKinds = new Set(['title', 'media', 'text', 'end']);
export const allowedLayouts = new Set(['center', 'split', 'full']);
export const allowedTransitions = new Set(['cut', 'lime-wipe', 'black-wipe', 'center-split']);

const EPS = 0.001;

export function resolveProjectPath(projectArg = 'project.json') {
  return path.isAbsolute(projectArg) ? projectArg : path.resolve(engineRoot, projectArg);
}

export async function loadProject(projectArg = 'project.json') {
  const projectPath = resolveProjectPath(projectArg);
  const raw = JSON.parse(await readFile(projectPath, 'utf8'));
  const projectDir = path.dirname(projectPath);
  const project = normalizeProject(raw);
  return { projectPath, projectDir, project };
}

function asNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeTransition(value) {
  if (!value) return { type: 'cut', duration: 0 };
  if (typeof value === 'string') {
    return { type: value, duration: value === 'cut' ? 0 : 0.56 };
  }
  const type = value.type || 'cut';
  return {
    type,
    duration: type === 'cut' ? 0 : asNumber(value.duration, 0.56),
  };
}

function normalizeText(text = {}) {
  return {
    kicker: String(text.kicker || ''),
    label: String(text.label || ''),
    eyebrow: String(text.eyebrow || ''),
    title: String(text.title || ''),
    body: String(text.body || ''),
    badge: String(text.badge || ''),
    tags: Array.isArray(text.tags) ? text.tags.map(String) : [],
  };
}

function normalizeComposition(comp, index) {
  let cursor = 0;
  const scenes = (comp.scenes || []).map((scene, sceneIndex) => {
    const duration = asNumber(scene.duration, NaN);
    const explicitStart = scene.start !== undefined && scene.start !== null;
    const start = explicitStart ? asNumber(scene.start, NaN) : cursor;
    const track = Number.isInteger(scene.track) ? scene.track : 1;
    const mediaTrack = Number.isInteger(scene.mediaTrack) ? scene.mediaTrack : 2;
    const normalized = {
      id: String(scene.id || `scene-${sceneIndex + 1}`),
      kind: String(scene.kind || (scene.asset ? 'media' : 'text')),
      start,
      duration,
      track,
      mediaTrack,
      asset: scene.asset ? String(scene.asset) : '',
      mediaStart: Math.max(0, asNumber(scene.mediaStart, 0)),
      layout: String(scene.layout || (scene.asset ? 'split' : 'center')),
      motion: String(scene.motion || 'subtle'),
      transition: normalizeTransition(scene.transition),
      text: normalizeText(scene.text),
      explicitStart,
    };
    if (Number.isFinite(start) && Number.isFinite(duration)) {
      cursor = Math.max(cursor, start + duration);
    }
    return normalized;
  });
  const maxEnd = scenes.reduce((m, s) => Number.isFinite(s.start + s.duration) ? Math.max(m, s.start + s.duration) : m, 0);
  const durationMode = comp.duration === undefined || comp.duration === null || comp.duration === 'auto' ? 'auto' : 'fixed';
  const duration = durationMode === 'auto' ? maxEnd : asNumber(comp.duration, NaN);
  return {
    id: String(comp.id || `composition-${index + 1}`),
    title: String(comp.title || comp.id || `Composition ${index + 1}`),
    width: asNumber(comp.width, 1920),
    height: asNumber(comp.height, 1080),
    fps: asNumber(comp.fps, 30),
    durationMode,
    duration,
    scenes,
  };
}

export function normalizeProject(raw) {
  const presets = raw.presets || {};
  const audio = raw.audio || {};
  return {
    schemaVersion: Number(raw.schemaVersion || 2),
    id: String(raw.id || 'untitled-project'),
    title: String(raw.title || raw.id || 'Untitled Project'),
    quality: String(raw.quality || 'high'),
    presets: {
      visual: String(presets.visual || raw.visualPreset || 'editorial-clean'),
      caption: String(presets.caption || raw.captionPreset || 'editorial-card'),
      audio: String(presets.audio || raw.audioPreset || audio.preset || 'minimal-electronic'),
    },
    audio: {
      mode: String(audio.mode || 'synthetic'),
      preset: String(audio.preset || presets.audio || raw.audioPreset || 'minimal-electronic'),
      bgmVolume: Math.max(0, Math.min(1, asNumber(audio.bgmVolume ?? raw.bgmVolume, 0.18))),
      sfxVolume: Math.max(0, Math.min(1, asNumber(audio.sfxVolume ?? raw.sfxVolume, 0.28))),
    },
    preprocessors: Array.isArray(raw.preprocessors) ? raw.preprocessors : [],
    assets: raw.assets && typeof raw.assets === 'object' ? raw.assets : {},
    compositions: Array.isArray(raw.compositions) ? raw.compositions.map(normalizeComposition) : [],
  };
}

function intervalsOverlap(a, b) {
  return a.start < b.end - EPS && b.start < a.end - EPS;
}

function checkIntervals(intervals, label, errors) {
  const byTrack = new Map();
  for (const item of intervals) {
    if (!byTrack.has(item.track)) byTrack.set(item.track, []);
    byTrack.get(item.track).push(item);
  }
  for (const [track, items] of byTrack) {
    items.sort((a, b) => a.start - b.start);
    for (let i = 1; i < items.length; i++) {
      if (intervalsOverlap(items[i - 1], items[i])) {
        errors.push(`${label}: track ${track} overlap between ${items[i - 1].id} and ${items[i].id}`);
      }
    }
  }
}

async function fileExists(file) {
  try { await access(file); return true; } catch { return false; }
}

export async function validateProject(project, { projectDir, checkAssets = true } = {}) {
  const errors = [];
  const warnings = [];
  if (project.schemaVersion !== 2) errors.push(`schemaVersion must be 2, got ${project.schemaVersion}`);
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(project.id)) errors.push(`project.id contains unsupported characters: ${project.id}`);
  if (!['draft', 'standard', 'high'].includes(project.quality)) errors.push(`quality must be draft|standard|high, got ${project.quality}`);
  if (!['synthetic', 'silent'].includes(project.audio.mode)) errors.push(`Stage 2A audio.mode supports synthetic|silent; got ${project.audio.mode}`);

  const assetIds = new Set();
  for (const [assetId, asset] of Object.entries(project.assets)) {
    if (assetIds.has(assetId)) errors.push(`duplicate asset id: ${assetId}`);
    assetIds.add(assetId);
    if (!asset || typeof asset !== 'object') { errors.push(`asset ${assetId} must be an object`); continue; }
    if (!allowedAssetTypes.has(asset.type)) errors.push(`asset ${assetId} type must be image|video, got ${asset.type}`);
    if (!asset.src || typeof asset.src !== 'string') errors.push(`asset ${assetId} is missing src`);
    if (checkAssets && projectDir && asset.src && !/^https?:\/\//i.test(asset.src)) {
      const full = path.resolve(projectDir, asset.src);
      if (!await fileExists(full)) errors.push(`missing asset ${assetId}: ${full}`);
    }
  }

  if (!project.compositions.length) errors.push('project must contain at least one composition');
  const compIds = new Set();
  for (const comp of project.compositions) {
    if (compIds.has(comp.id)) errors.push(`duplicate composition id: ${comp.id}`);
    compIds.add(comp.id);
    if (!Number.isFinite(comp.width) || comp.width <= 0 || !Number.isFinite(comp.height) || comp.height <= 0) errors.push(`${comp.id}: invalid dimensions`);
    if (comp.fps !== 30) errors.push(`${comp.id}: Stage 2A currently requires 30 fps for frozen QA compatibility`);
    if (!comp.scenes.length) errors.push(`${comp.id}: requires at least one scene`);

    const ids = new Set();
    const sceneIntervals = [];
    const mediaIntervals = [];
    let maxEnd = 0;
    for (let i = 0; i < comp.scenes.length; i++) {
      const scene = comp.scenes[i];
      if (ids.has(scene.id)) errors.push(`${comp.id}: duplicate scene id ${scene.id}`);
      ids.add(scene.id);
      if (!allowedSceneKinds.has(scene.kind)) errors.push(`${comp.id}/${scene.id}: unsupported kind ${scene.kind}`);
      if (!allowedLayouts.has(scene.layout)) errors.push(`${comp.id}/${scene.id}: unsupported layout ${scene.layout}`);
      if (!Number.isFinite(scene.start) || scene.start < 0) errors.push(`${comp.id}/${scene.id}: invalid start`);
      if (!Number.isFinite(scene.duration) || scene.duration <= 0) errors.push(`${comp.id}/${scene.id}: duration must be > 0`);
      if (!Number.isInteger(scene.track) || scene.track < 0) errors.push(`${comp.id}/${scene.id}: invalid track`);
      if (!Number.isInteger(scene.mediaTrack) || scene.mediaTrack < 0) errors.push(`${comp.id}/${scene.id}: invalid mediaTrack`);
      if (scene.asset && !project.assets[scene.asset]) errors.push(`${comp.id}/${scene.id}: unknown asset ${scene.asset}`);
      if (scene.kind === 'media' && !scene.asset) errors.push(`${comp.id}/${scene.id}: media scene requires asset`);
      if (!allowedTransitions.has(scene.transition.type)) errors.push(`${comp.id}/${scene.id}: unsupported transition ${scene.transition.type}`);
      if (!Number.isFinite(scene.transition.duration) || scene.transition.duration < 0) errors.push(`${comp.id}/${scene.id}: invalid transition duration`);
      const end = scene.start + scene.duration;
      maxEnd = Math.max(maxEnd, end);
      sceneIntervals.push({ id: scene.id, start: scene.start, end, track: scene.track });
      if (scene.asset) mediaIntervals.push({ id: `media:${scene.id}`, start: scene.start, end, track: scene.mediaTrack });

      if (i < comp.scenes.length - 1 && scene.transition.type !== 'cut') {
        const next = comp.scenes[i + 1];
        const safe = Math.min(scene.duration, next.duration) / 2;
        if (scene.transition.duration > safe + EPS) {
          errors.push(`${comp.id}/${scene.id}: transition ${scene.transition.duration}s exceeds safe half-scene window ${safe.toFixed(3)}s`);
        }
        const boundary = scene.start + scene.duration;
        const trStart = boundary - scene.transition.duration / 2;
        if (trStart < scene.start - EPS) errors.push(`${comp.id}/${scene.id}: transition starts before scene`);
      }
    }
    checkIntervals(sceneIntervals, `${comp.id} scenes`, errors);
    checkIntervals(mediaIntervals, `${comp.id} media`, errors);
    if (!Number.isFinite(comp.duration) || comp.duration <= 0) errors.push(`${comp.id}: invalid composition duration`);
    if (comp.durationMode === 'fixed' && Math.abs(comp.duration - maxEnd) > 0.02) {
      errors.push(`${comp.id}: declared duration ${comp.duration}s does not match timeline end ${maxEnd}s`);
    }
    if (comp.durationMode === 'auto' && Math.abs(comp.duration - maxEnd) > 0.02) {
      errors.push(`${comp.id}: auto duration resolution failed (${comp.duration} vs ${maxEnd})`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function projectSummary(project) {
  return {
    schemaVersion: project.schemaVersion,
    id: project.id,
    quality: project.quality,
    presets: project.presets,
    audio: project.audio,
    assets: Object.keys(project.assets).length,
    compositions: project.compositions.map(c => ({
      id: c.id,
      width: c.width,
      height: c.height,
      fps: c.fps,
      duration: c.duration,
      scenes: c.scenes.length,
    })),
  };
}
