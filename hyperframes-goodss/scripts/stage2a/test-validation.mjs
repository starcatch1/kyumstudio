import { normalizeProject, validateProject, engineRoot } from './project-lib.mjs';

async function expect(name, raw, expectedOk, match = '') {
  const project = normalizeProject(raw);
  const result = await validateProject(project, { projectDir: engineRoot, checkAssets: false });
  const has = !match || result.errors.some(e => e.includes(match));
  if (result.ok !== expectedOk || !has) {
    console.error(`[P2A TEST] FAIL ${name}`);
    console.error(JSON.stringify(result, null, 2));
    process.exit(2);
  }
  console.log(`[P2A TEST] PASS ${name}`);
}

const base = {
  schemaVersion: 2,
  id: 'validation-fixture',
  quality: 'draft',
  audio: { mode: 'silent' },
  assets: {},
  compositions: [{
    id: 'main', width: 1280, height: 720, fps: 30, duration: 'auto',
    scenes: [
      { id: 'a', kind: 'text', duration: 2, layout: 'center', transition: { type: 'lime-wipe', duration: 0.4 }, text: { title: 'A' } },
      { id: 'b', kind: 'text', duration: 2, layout: 'center', transition: 'cut', text: { title: 'B' } }
    ]
  }]
};

await expect('valid sequential timeline', base, true);

await expect('same-track overlap rejected', {
  ...base,
  id: 'overlap-fixture',
  compositions: [{ id: 'main', width: 1280, height: 720, fps: 30, duration: 3, scenes: [
    { id: 'a', kind: 'text', start: 0, duration: 2, track: 1, text: { title: 'A' } },
    { id: 'b', kind: 'text', start: 1, duration: 2, track: 1, text: { title: 'B' } }
  ] }]
}, false, 'overlap');

await expect('declared duration mismatch rejected', {
  ...base,
  id: 'duration-fixture',
  compositions: [{ id: 'main', width: 1280, height: 720, fps: 30, duration: 9, scenes: [
    { id: 'a', kind: 'text', duration: 2, text: { title: 'A' } },
    { id: 'b', kind: 'text', duration: 2, text: { title: 'B' } }
  ] }]
}, false, 'does not match timeline end');

await expect('unsafe transition rejected', {
  ...base,
  id: 'transition-fixture',
  compositions: [{ id: 'main', width: 1280, height: 720, fps: 30, duration: 'auto', scenes: [
    { id: 'a', kind: 'text', duration: 1, transition: { type: 'lime-wipe', duration: 0.8 }, text: { title: 'A' } },
    { id: 'b', kind: 'text', duration: 1, text: { title: 'B' } }
  ] }]
}, false, 'exceeds safe half-scene');

await expect('video asset type accepted', {
  schemaVersion: 2,
  id: 'video-type-fixture',
  quality: 'draft',
  audio: { mode: 'silent' },
  assets: { clip: { type: 'video', src: 'generated/nonexistent-but-schema-valid.mp4' } },
  compositions: [{ id: 'main', width: 1280, height: 720, fps: 30, duration: 'auto', scenes: [
    { id: 'video', kind: 'media', asset: 'clip', duration: 2, layout: 'full', text: { title: 'Video' } }
  ] }]
}, true);

console.log('[P2A TEST] All validation regression tests PASS.');
