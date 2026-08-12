import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const projects = [
  { name: 'long', file: path.join(root, 'projects', 'long', 'index.html'), id: 'style-long', width: 1920, height: 1080, duration: 30 },
  { name: 'short', file: path.join(root, 'projects', 'short', 'index.html'), id: 'style-short', width: 1080, height: 1920, duration: 17 }
];

let failed = false;
function fail(msg) { failed = true; console.error(`[P0] ${msg}`); }

for (const project of projects) {
  let html;
  try { html = await readFile(project.file, 'utf8'); }
  catch { fail(`${project.name}: missing ${project.file}`); continue; }

  const rootNeedles = [
    `data-composition-id="${project.id}"`,
    `data-width="${project.width}"`,
    `data-height="${project.height}"`,
    `data-duration="${project.duration}"`,
    `window.__timelines['${project.id}']`
  ];
  for (const needle of rootNeedles) if (!html.includes(needle)) fail(`${project.name}: missing ${needle}`);

  const forbidden = [
    ['Math.random(', 'non-deterministic Math.random'],
    ['Date.now(', 'non-deterministic Date.now'],
    ['repeat:-1', 'infinite repeat'],
    ['repeat: -1', 'infinite repeat'],
    ['<br>', 'forced line break']
  ];
  for (const [needle, label] of forbidden) if (html.includes(needle)) fail(`${project.name}: forbidden ${label}`);

  const srcRegex = /src="([^"#:]+)"/g;
  for (const match of html.matchAll(srcRegex)) {
    const src = match[1];
    if (/^https?:/i.test(src)) continue;
    const resolved = path.resolve(path.dirname(project.file), src);
    try { await access(resolved); }
    catch { fail(`${project.name}: missing referenced asset ${src} -> ${resolved}`); }
  }

  const clips = [];
  const tagRegex = /<[^>]+data-start="([0-9.]+)"[^>]+data-duration="([0-9.]+)"[^>]+data-track-index="([0-9]+)"[^>]*>/g;
  for (const m of html.matchAll(tagRegex)) clips.push({ start: Number(m[1]), duration: Number(m[2]), track: Number(m[3]), raw: m[0].slice(0,120) });
  const byTrack = new Map();
  for (const clip of clips) {
    if (clip.track === 0) continue;
    if (!byTrack.has(clip.track)) byTrack.set(clip.track, []);
    byTrack.get(clip.track).push(clip);
  }
  for (const [track, list] of byTrack) {
    list.sort((a,b)=>a.start-b.start);
    for (let i=1;i<list.length;i++) {
      const prev=list[i-1], cur=list[i];
      if (cur.start < prev.start + prev.duration - 0.0001) {
        fail(`${project.name}: overlap on track ${track} at ${cur.start}s`);
      }
    }
  }

  console.log(`[P0] ${project.name}: static project validation complete.`);
}

if (failed) process.exit(1);
console.log('[P0] Generated project validation PASSED.');
