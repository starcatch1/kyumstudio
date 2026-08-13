import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { loadProject, validateProject, engineRoot } from './project-lib.mjs';

const projectArg = process.argv[2] || 'project.json';
const { project, projectDir, projectPath } = await loadProject(projectArg);
const validation = await validateProject(project, { projectDir, checkAssets: true });
if (!validation.ok) {
  console.error('[P2A] Refusing to generate invalid project:');
  for (const e of validation.errors) console.error(` - ${e}`);
  process.exit(2);
}

const presetCatalog = JSON.parse(await readFile(path.join(engineRoot, 'config/presets.json'), 'utf8'));
const visual = presetCatalog.visualPresets?.[project.presets.visual];
const caption = presetCatalog.captionPresets?.[project.presets.caption];
if (!visual) throw new Error(`Unknown visual preset ${project.presets.visual}`);
if (!caption) throw new Error(`Unknown caption preset ${project.presets.caption}`);

const generatedRoot = path.join(engineRoot, 'generated', 'stage2a', project.id);
const audioManifestPath = path.join(generatedRoot, 'audio-manifest.json');
let audioManifest = { files: {} };
try { audioManifest = JSON.parse(await readFile(audioManifestPath, 'utf8')); } catch {}
await mkdir(generatedRoot, { recursive: true });

const esc = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function titleLines(value) {
  return String(value || '').split(/\r?\n/).map(line => `<span class="title-line">${esc(line)}</span>`).join('');
}

function relativeAsset(outputDir, src) {
  const abs = path.resolve(projectDir, src);
  let rel = path.relative(outputDir, abs).replaceAll('\\', '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

function tagsHtml(tags = []) {
  if (!caption.showTags || !tags.length) return '';
  return `<div class="tags">${tags.map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div>`;
}

function textPanel(scene, index) {
  const t = scene.text;
  const chapter = caption.showChapterCircle ? `<div class="chapter">${String(index + 1).padStart(2, '0')}</div>` : '';
  const label = t.label ? `<span class="scene-label">${esc(t.label)}</span>` : '';
  const kicker = t.kicker ? `<div class="kicker">${esc(t.kicker)}</div>` : '';
  const eyebrow = t.eyebrow ? `<div class="eyebrow">${esc(t.eyebrow)}</div>` : '';
  const badge = t.badge ? `<div class="badge">${esc(t.badge)}</div>` : '';
  const title = t.title ? `<h1>${titleLines(t.title)}</h1>` : '';
  const body = t.body ? `<p>${esc(t.body)}</p>` : '';
  return `<div class="text-panel">
    <div class="meta-row">${label}${chapter}</div>
    ${kicker}${eyebrow}${title}${badge}${body}${tagsHtml(t.tags)}
  </div>`;
}

function mediaClip(scene, asset, outputDir) {
  const src = relativeAsset(outputDir, asset.src);
  const cls = `media-clip layout-${scene.layout}`;
  if (asset.type === 'video') {
    return `<video id="media-${esc(scene.id)}" class="${cls}" src="${esc(src)}" muted playsinline preload="auto" data-start="${scene.start.toFixed(3)}" data-duration="${scene.duration.toFixed(3)}" data-track-index="${scene.mediaTrack}" data-media-start="${scene.mediaStart.toFixed(3)}"></video>`;
  }
  return `<img id="media-${esc(scene.id)}" class="${cls}" src="${esc(src)}" alt="${esc(scene.text.title || scene.id)}" data-start="${scene.start.toFixed(3)}" data-duration="${scene.duration.toFixed(3)}" data-track-index="${scene.mediaTrack}">`;
}

function sceneClip(scene, index) {
  const typeClass = scene.asset ? 'has-media' : 'no-media';
  return `<div id="scene-${esc(scene.id)}" class="scene-shell kind-${esc(scene.kind)} layout-${esc(scene.layout)} ${typeClass}" data-start="${scene.start.toFixed(3)}" data-duration="${scene.duration.toFixed(3)}" data-track-index="${scene.track}">
    <div class="scene-content">${textPanel(scene, index)}</div>
  </div>`;
}

function transitionClip(scene, index) {
  if (scene.transition.type === 'cut' || scene.transition.duration <= 0) return '';
  const boundary = scene.start + scene.duration;
  const start = boundary - scene.transition.duration / 2;
  const type = scene.transition.type;
  const body = type === 'center-split'
    ? '<div class="half left"></div><div class="half right"></div>'
    : '<div class="wipe"></div><div class="accent-line"></div>';
  return `<div id="tr-${index}" class="transition ${esc(type)}" data-layout-ignore data-start="${start.toFixed(3)}" data-duration="${scene.transition.duration.toFixed(3)}" data-track-index="8">${body}</div>`;
}

function transitionTimeline(scene, index) {
  if (scene.transition.type === 'cut' || scene.transition.duration <= 0) return '';
  const d = scene.transition.duration;
  const boundary = scene.start + scene.duration;
  const start = boundary - d / 2;
  const half = d / 2;
  if (scene.transition.type === 'center-split') {
    return `tl.fromTo('#tr-${index} .left',{scaleX:0,transformOrigin:'right center'},{scaleX:1,duration:${half.toFixed(3)},ease:'power3.inOut'},${start.toFixed(3)})
      .fromTo('#tr-${index} .right',{scaleX:0,transformOrigin:'left center'},{scaleX:1,duration:${half.toFixed(3)},ease:'power3.inOut'},${start.toFixed(3)})
      .to('#tr-${index} .left',{scaleX:0,transformOrigin:'left center',duration:${half.toFixed(3)},ease:'power3.inOut'},${boundary.toFixed(3)})
      .to('#tr-${index} .right',{scaleX:0,transformOrigin:'right center',duration:${half.toFixed(3)},ease:'power3.inOut'},${boundary.toFixed(3)});`;
  }
  const fromRight = scene.transition.type === 'black-wipe';
  const originIn = fromRight ? 'right center' : 'left center';
  const originOut = fromRight ? 'left center' : 'right center';
  return `tl.fromTo('#tr-${index} .wipe',{scaleX:0,transformOrigin:'${originIn}'},{scaleX:1,duration:${half.toFixed(3)},ease:'power3.inOut'},${start.toFixed(3)})
    .to('#tr-${index} .wipe',{scaleX:0,transformOrigin:'${originOut}',duration:${half.toFixed(3)},ease:'power3.inOut'},${boundary.toFixed(3)});`;
}

function commonStyle(comp) {
  const headlineScale = Number(caption.headlineScale || 1);
  const bodyScale = Number(caption.bodyScale || 1);
  const isPortrait = comp.height > comp.width;
  const h1 = Math.round((isPortrait ? 84 : 82) * headlineScale);
  const body = Math.round((isPortrait ? 30 : 27) * bodyScale);
  const radius = visual.radius;
  return `
  *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${visual.canvas};font-family:"Noto Sans KR","Noto Sans CJK KR",Arial,sans-serif;color:${visual.text}}
  [data-composition-id]{position:relative;overflow:hidden;background:${visual.canvas};width:${comp.width}px;height:${comp.height}px}
  .scene-shell{position:absolute;inset:0;z-index:3;background:transparent;overflow:hidden}.scene-shell.no-media{background:${visual.canvas}}
  .scene-content{display:flex;width:100%;height:100%;padding:${isPortrait ? '86px 68px' : '72px 96px'};box-sizing:border-box}
  .text-panel{display:flex;flex-direction:column;justify-content:center;gap:${isPortrait ? 22 : 18}px;min-width:0}
  .layout-center .scene-content{align-items:center;justify-content:center;text-align:center}.layout-center .text-panel{width:${isPortrait ? '88%' : '76%'};align-items:center}
  .layout-split .scene-content{justify-content:flex-end;align-items:center}.layout-split .text-panel{width:${isPortrait ? '100%' : '41%'};margin-left:auto;padding:${isPortrait ? '0 10px 20px' : '0 12px'}}
  .layout-full .scene-content{align-items:flex-end;justify-content:flex-start}.layout-full .text-panel{width:${isPortrait ? '92%' : '56%'};padding:${isPortrait ? '34px' : '30px 36px'};margin-bottom:${isPortrait ? '54px' : '26px'};background:${visual.panel}E8;border-radius:${radius}px;backdrop-filter:blur(8px)}
  .media-clip{position:absolute;z-index:2;display:block;background:${visual.panel};border:1px solid ${visual.divider};object-fit:contain;filter:saturate(${visual.imageSaturate}) contrast(${visual.imageContrast})}
  .media-clip.layout-split{left:${isPortrait ? '8%' : '5%'};top:${isPortrait ? '7%' : '7%'};width:${isPortrait ? '84%' : `${Math.max(42, visual.longImagePct)}%`};height:${isPortrait ? `${Math.min(67, visual.shortImagePct)}%` : '86%'};border-radius:${radius}px}
  .media-clip.layout-full{inset:0;width:100%;height:100%;object-fit:cover;border:0;border-radius:0}
  .media-clip.layout-center{left:${isPortrait ? '12%' : '18%'};top:${isPortrait ? '12%' : '10%'};width:${isPortrait ? '76%' : '64%'};height:${isPortrait ? '60%' : '72%'};border-radius:${radius}px}
  ${isPortrait ? `.layout-split.has-media .scene-content{align-items:flex-end}.layout-split.has-media .text-panel{height:30%;justify-content:flex-start}` : ''}
  .meta-row{display:flex;align-items:center;gap:16px}.scene-label{font-size:${isPortrait ? 20 : 18}px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.chapter{display:flex;align-items:center;justify-content:center;width:${isPortrait ? 64 : 70}px;height:${isPortrait ? 64 : 70}px;border-radius:50%;background:${visual.accent};color:${visual.text};font-size:${isPortrait ? 27 : 30}px;font-weight:900}
  .kicker,.eyebrow{font-size:${isPortrait ? 24 : 22}px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:${visual.text}}
  h1,p{margin:0;word-break:keep-all}h1{font-size:${h1}px;line-height:1.04;letter-spacing:-.045em;font-weight:900}.title-line{display:block}p{font-size:${body}px;line-height:1.45;color:${visual.muted};max-width:980px}
  .badge{display:inline-flex;width:max-content;padding:10px 17px;border-radius:12px;background:${visual.text};color:${visual.panel};font-size:${isPortrait ? 22 : 20}px;font-weight:850}.tags{display:flex;gap:9px;flex-wrap:wrap}.tag{padding:8px 13px;border:1.5px solid ${visual.text};border-radius:999px;background:${visual.panel};font-size:${isPortrait ? 19 : 18}px;font-weight:750;color:${visual.text}}
  .transition{position:absolute;inset:0;z-index:50;overflow:hidden;pointer-events:none}.transition .wipe{position:absolute;inset:0;background:${visual.accent}}.transition.black-wipe .wipe{background:${visual.text}}.transition .accent-line{position:absolute;top:0;bottom:0;left:50%;width:14px;background:${visual.panel}.transition.black-wipe .accent-line{background:${visual.accent}}
  .transition.center-split .half{position:absolute;top:0;bottom:0;width:50%;background:${visual.panel}}.transition.center-split .left{left:0;border-right:7px solid ${visual.accent}}.transition.center-split .right{right:0;border-left:7px solid ${visual.accent}}
  .progress{position:absolute;left:0;right:0;bottom:0;height:${isPortrait ? 9 : 7}px;z-index:60;background:${visual.divider}}.progress-fill{width:100%;height:100%;background:${visual.accent};transform-origin:left center}
  `;
}

function sceneAnimations(comp) {
  const lines = [];
  comp.scenes.forEach((scene, index) => {
    const s = scene.start;
    const selector = `#scene-${scene.id}`;
    lines.push(`tl.from('${selector} .text-panel',{y:${scene.layout === 'full' ? 34 : 22},opacity:0,duration:.44,ease:'power3.out'},${(s + 0.12).toFixed(3)});`);
    lines.push(`tl.from('${selector} h1',{y:24,opacity:0,duration:.50,ease:'expo.out'},${(s + 0.18).toFixed(3)});`);
    lines.push(`tl.from('${selector} p',{y:14,opacity:0,duration:.34,ease:'power2.out'},${(s + 0.32).toFixed(3)});`);
    lines.push(`tl.from('${selector} .tag',{y:10,opacity:0,duration:.25,stagger:.05,ease:'power2.out'},${(s + 0.38).toFixed(3)});`);
    if (scene.asset) {
      lines.push(`tl.from('#media-${scene.id}',{scale:.992,opacity:0,duration:.48,ease:'sine.out'},${(s + 0.08).toFixed(3)});`);
      if (scene.motion !== 'none') lines.push(`tl.to('#media-${scene.id}',{scale:${visual.motionScale},duration:${Math.max(0.5, scene.duration - 0.7).toFixed(3)},ease:'sine.inOut'},${(s + 0.48).toFixed(3)});`);
    }
    if (index < comp.scenes.length - 1) lines.push(transitionTimeline(scene, index + 1));
  });
  lines.push(`tl.fromTo('#progress .progress-fill',{scaleX:0},{scaleX:1,duration:${comp.duration.toFixed(3)},ease:'none'},0);`);
  return lines.join('\n');
}

const manifest = {
  schemaVersion: 2,
  projectId: project.id,
  sourceProject: path.relative(engineRoot, projectPath).replaceAll('\\', '/'),
  quality: project.quality,
  compositions: [],
};

for (const comp of project.compositions) {
  const outDir = path.join(generatedRoot, comp.id);
  await mkdir(outDir, { recursive: true });
  const media = comp.scenes.filter(s => s.asset).map(s => mediaClip(s, project.assets[s.asset], outDir)).join('\n');
  const scenes = comp.scenes.map(sceneClip).join('\n');
  const transitions = comp.scenes.slice(0, -1).map((s, i) => transitionClip(s, i + 1)).join('\n');
  const audioRelFromRoot = audioManifest.files?.[comp.id];
  let audioHtml = '';
  let audioForManifest = null;
  if (audioRelFromRoot) {
    const audioAbs = path.resolve(engineRoot, audioRelFromRoot);
    let rel = path.relative(outDir, audioAbs).replaceAll('\\', '/');
    if (!rel.startsWith('.')) rel = `./${rel}`;
    audioHtml = `<audio id="audio-${esc(comp.id)}" src="${esc(rel)}" data-start="0" data-duration="${comp.duration.toFixed(3)}" data-track-index="3" data-volume="1"></audio>`;
    audioForManifest = audioRelFromRoot;
  }
  let gsapRel = path.relative(outDir, path.join(engineRoot, 'vendor/gsap.min.js')).replaceAll('\\', '/');
  if (!gsapRel.startsWith('.')) gsapRel = `./${gsapRel}`;
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(comp.title)}</title><style>${commonStyle(comp)}</style></head><body>
  <div id="root-${esc(comp.id)}" data-composition-id="${esc(comp.id)}" data-start="0" data-duration="${comp.duration.toFixed(3)}" data-track-index="0" data-width="${comp.width}" data-height="${comp.height}">
    ${media}\n${scenes}\n${transitions}\n${audioHtml}
    <div id="progress" class="progress" data-layout-ignore data-start="0" data-duration="${comp.duration.toFixed(3)}" data-track-index="9"><div class="progress-fill"></div></div>
    <script src="${esc(gsapRel)}"></script><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});${sceneAnimations(comp)}window.__timelines['${esc(comp.id)}']=tl;</script>
  </div></body></html>`;
  const htmlPath = path.join(outDir, 'index.html');
  await writeFile(htmlPath, html, 'utf8');
  manifest.compositions.push({
    id: comp.id,
    title: comp.title,
    width: comp.width,
    height: comp.height,
    fps: comp.fps,
    duration: comp.duration,
    scenes: comp.scenes.length,
    html: path.relative(engineRoot, htmlPath).replaceAll('\\', '/'),
    directory: path.relative(engineRoot, outDir).replaceAll('\\', '/'),
    audio: audioForManifest,
  });
  console.log(`[P2A] Generated ${comp.id}: ${comp.scenes.length} scene(s), ${comp.duration}s`);
}

const manifestPath = path.join(generatedRoot, 'manifest.json');
await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`[P2A] Project manifest: ${manifestPath}`);
