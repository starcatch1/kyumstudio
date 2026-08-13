import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { loadResolvedConfig, cssVarBlock } from './preset-lib.mjs';

const { root, project, visual, caption } = await loadResolvedConfig();
const looks = JSON.parse(await readFile(path.join(root, 'data', 'looks.json'), 'utf8'));
await mkdir(path.join(root, 'compositions'), { recursive: true });

const byId = new Map(looks.map(x => [x.id, x]));
const longLooks = [1,2,3,4,5,6,10,11].map(id => byId.get(id));
const shortLooks = [5,3,10,4].map(id => byId.get(id));
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const tagHtml = look => caption.showTags ? look.tags.map(t => `<span class="tag">#${esc(t)}</span>`).join('') : '';
const chapterHtml = look => caption.showChapterCircle ? `<div class="chapter">${String(look.id).padStart(2,'0')}</div>` : '';
const presetClass = `visual-${project.visualPreset} caption-${caption.mode}`;

function transitionClip(id, start, mode) {
  const cls = ['accent','reverse','split'][mode];
  const body = mode === 2 ? '<div class="half left"></div><div class="half right"></div>' : '<div class="wipe"></div><div class="accent-line"></div>';
  return `<div id="tr-${id}" class="transition ${cls}" data-layout-ignore data-start="${start.toFixed(2)}" data-duration="0.70" data-track-index="8">${body}</div>`;
}

function longLookScene(look, index, start) {
  return `<div id="scene-${index}" class="scene look-scene" data-start="${start.toFixed(2)}" data-duration="3" data-track-index="1"><div class="scene-content long-layout">
    <div class="image-panel"><div class="image-stage"><img class="look-image" src="${esc(look.image)}" alt="${esc(look.name)}"></div></div>
    <div class="info-panel"><div class="meta-row"><span class="look-label">LOOK ${String(look.id).padStart(2,'0')}</span><span class="hair-note">HAIR · OUTFIT</span></div>${chapterHtml(look)}<div class="eyebrow">${esc(look.headline)}</div><h2>${esc(look.name)}</h2><p>${esc(look.description)}</p><div class="tags">${tagHtml(look)}</div></div>
  </div></div>`;
}

function shortLookScene(look, index, start) {
  const variation = ['caption-a','caption-b','caption-c','caption-d'][(index - 1) % 4];
  return `<div id="scene-${index}" class="scene short-scene ${variation}" data-start="${start.toFixed(2)}" data-duration="3" data-track-index="1"><div class="scene-content short-layout">
    <div class="short-topline"><span>STYLE SHIFT</span><span>${String(index).padStart(2,'0')} / 04</span></div>
    <div class="short-image"><div class="image-stage"><img class="look-image" src="${esc(look.image)}" alt="${esc(look.name)}"></div></div>
    <div class="short-caption"><div class="caption-meta">${chapterHtml(look)}<div class="eyebrow">${esc(look.headline)}</div></div><h2>${esc(look.name)}</h2><p>${esc(look.description)}</p><div class="tags">${tagHtml(look)}</div></div>
  </div></div>`;
}

function commonStyle(width, height) {
  const vars = cssVarBlock(visual, caption);
  return `${vars}
  *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:var(--canvas);font-family:"Noto Sans KR","Noto Sans CJK KR",Arial,sans-serif;color:var(--text)}
  [data-composition-id]{position:relative;overflow:hidden;background:var(--canvas);width:${width}px;height:${height}px}.scene{position:absolute;inset:0;overflow:hidden;background:var(--canvas)}.scene-content{display:flex;width:100%;height:100%;box-sizing:border-box}
  h1,h2,p{margin:0}h1{font-size:104px;line-height:.98;letter-spacing:-.055em;font-weight:900}h2{font-size:calc(64px * var(--headline-scale));line-height:1.05;letter-spacing:-.045em;font-weight:900;word-break:keep-all}p{font-size:calc(27px * var(--body-scale));line-height:1.45;color:var(--muted);word-break:keep-all}.title-line{display:block}
  .chapter{display:inline-flex;align-items:center;justify-content:center;width:78px;height:78px;background:var(--accent);color:${project.visualPreset === 'fashion-luxury' ? '#111111' : 'var(--text)'};font-size:34px;font-weight:900;border-radius:50%;line-height:1}.eyebrow{font-size:24px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--text)}
  .tags{display:flex;gap:10px;flex-wrap:wrap}.tag{padding:9px 15px;border:1.5px solid var(--text);border-radius:999px;font-size:20px;font-weight:750;background:var(--panel);color:var(--text)}
  .image-stage{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--panel)}.look-image{transform-origin:center;filter:saturate(${visual.imageSaturate}) contrast(${visual.imageContrast})}
  .transition{position:absolute;inset:0;z-index:50;overflow:hidden;pointer-events:none}.transition .wipe{position:absolute;inset:0;background:var(--accent)}.transition.reverse .wipe{background:var(--text)}.transition .accent-line{position:absolute;top:0;bottom:0;width:14px;left:50%;background:var(--panel)}.transition.reverse .accent-line{background:var(--accent)}.transition.split .half{position:absolute;top:0;bottom:0;width:50%;background:var(--panel)}.transition.split .left{left:0;border-right:7px solid var(--accent)}.transition.split .right{right:0;border-left:7px solid var(--accent)}
  .progress{position:absolute;left:0;right:0;bottom:0;height:8px;z-index:60;background:var(--divider)}.progress-fill{width:100%;height:100%;background:var(--accent);transform-origin:left center}
  .intro,.ending{background:var(--canvas)}.intro-content,.ending-content{padding:96px;display:flex;flex-direction:column;justify-content:center;gap:26px}.intro-kicker{font-size:24px;font-weight:900;letter-spacing:.15em}.intro-accent{display:inline-block;background:var(--text);color:var(--canvas);padding:10px 20px;border-radius:12px;width:max-content;font-size:27px;font-weight:850}.preset-note{font-size:18px;letter-spacing:.08em;color:var(--muted);font-weight:700}.ending-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:24px}.ending-grid img{width:100%;height:320px;object-fit:contain;background:var(--panel);border:1px solid var(--divider);border-radius:calc(var(--radius) * .6)}
  .caption-minimal .chapter,.caption-minimal .tags{display:none}.caption-minimal .eyebrow{font-size:19px}.caption-minimal .info-panel,.caption-minimal .short-caption{border-left:7px solid var(--accent);padding-left:24px}.caption-kinetic h2{display:inline-block;background:var(--text);color:var(--canvas);padding:10px 16px;border-radius:12px;width:max-content;max-width:100%}.caption-kinetic .tag{background:var(--accent);border-color:var(--accent);color:#111}
  .visual-fashion-luxury .image-panel,.visual-fashion-luxury .short-image{box-shadow:0 28px 80px rgba(0,0,0,.34)}.visual-fashion-luxury .intro-accent{background:var(--accent);color:#111}.visual-social-dynamic .meta-row,.visual-social-dynamic .short-topline{color:var(--accent)}.visual-social-dynamic .image-panel,.visual-social-dynamic .short-image{box-shadow:0 20px 60px rgba(32,50,110,.14)}
  `;
}

function transitionTimeline(boundaries) {
  const d = Number(visual.transitionSpeed);
  return boundaries.map((b,k) => {
    const id = k + 1, mode = id % 3, s = (b - d).toFixed(2), mid = b.toFixed(2);
    if (mode === 0) return `tl.fromTo('#tr-${id} .wipe',{scaleX:0,transformOrigin:'left center'},{scaleX:1,duration:${d},ease:'power3.inOut'},${s}).to('#tr-${id} .wipe',{scaleX:0,transformOrigin:'right center',duration:${d},ease:'power3.inOut'},${mid});`;
    if (mode === 1) return `tl.fromTo('#tr-${id} .wipe',{scaleX:0,transformOrigin:'right center'},{scaleX:1,duration:${d},ease:'power3.inOut'},${s}).to('#tr-${id} .wipe',{scaleX:0,transformOrigin:'left center',duration:${d},ease:'power3.inOut'},${mid});`;
    return `tl.fromTo('#tr-${id} .left',{scaleX:0,transformOrigin:'right center'},{scaleX:1,duration:${d},ease:'power3.inOut'},${s}).fromTo('#tr-${id} .right',{scaleX:0,transformOrigin:'left center'},{scaleX:1,duration:${d},ease:'power3.inOut'},${s}).to('#tr-${id} .left',{scaleX:0,transformOrigin:'left center',duration:${d},ease:'power3.inOut'},${mid}).to('#tr-${id} .right',{scaleX:0,transformOrigin:'right center',duration:${d},ease:'power3.inOut'},${mid});`;
  }).join('');
}

function entranceTimeline(starts, endingIndex) {
  return `starts.forEach((s,i)=>{const sel=i===0?'#intro':i===${endingIndex}?'#ending':'#scene-'+i;tl.from(sel+' .chapter',{scale:.78,opacity:0,duration:.44,ease:'back.out(1.25)'},s+.16);tl.from(sel+' .meta-row, '+sel+' .short-topline, '+sel+' .eyebrow, '+sel+' .intro-kicker',{x:28,opacity:0,duration:.42,ease:'power3.out'},s+.20);tl.from(sel+' h1, '+sel+' h2',{y:34,opacity:0,duration:.52,ease:'expo.out'},s+.26);tl.from(sel+' p',{y:18,opacity:0,duration:.38,ease:'power2.out'},s+.42);tl.from(sel+' .tag',{y:12,opacity:0,duration:.28,stagger:.055,ease:'power2.out'},s+.50);tl.from(sel+' .look-image',{scale:.985,opacity:0,duration:.62,ease:'sine.out'},s+.14);tl.to(sel+' .look-image',{scale:${visual.motionScale},duration:2.2,ease:'sine.inOut'},s+.60);});`;
}

function longHtml() {
  const duration=30, boundaries=[3,6,9,12,15,18,21,24,27];
  let clips=`<audio id="audio-long" src="audio/style-long.wav" data-start="0" data-duration="30" data-track-index="3" data-volume="1"></audio>`;
  clips += `<div id="intro" class="scene intro" data-start="0" data-duration="3" data-track-index="1"><div class="scene-content intro-content"><div class="intro-kicker">CHARACTER STYLE SYSTEM · STAGE 1.1</div><h1><span class="title-line">이서영</span><span class="title-line">헤어 & 스타일 가이드</span></h1><div class="intro-accent">8 LOOKS · LONG SHOWCASE</div><p>한 캐릭터의 헤어와 의상 무드를 전신 이미지와 에디토리얼 자막으로 소개합니다.</p><div class="preset-note">${esc(project.visualPreset)} · ${esc(project.captionPreset)} · ${esc(project.audioPreset)}</div></div></div>`;
  longLooks.forEach((look,i)=>{ clips += longLookScene(look,i+1,(i+1)*3); });
  clips += `<div id="ending" class="scene ending" data-start="27" data-duration="3" data-track-index="1"><div class="scene-content ending-content"><div class="intro-kicker">STAGE 1.1 PRESET SYSTEM</div><h2>어떤 룩이 가장 마음에 드나요?</h2><p>안정화된 Stage 1 렌더/QA 코어 위에 선택 가능한 디자인과 오디오 프리셋을 적용했습니다.</p><div class="ending-grid">${[1,3,5,10].map(id=>`<img src="${byId.get(id).image}" alt="look ${id}">`).join('')}</div></div></div>`;
  boundaries.forEach((b,i)=>clips += transitionClip(i+1,b-visual.transitionSpeed,(i+1)%3));
  clips += `<div id="progress" class="progress" data-layout-ignore data-start="0" data-duration="30" data-track-index="9"><div class="progress-fill"></div></div>`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Style showcase long</title><style>${commonStyle(1920,1080)}.long-layout{padding:72px 96px;gap:70px;align-items:stretch}.image-panel{width:${visual.longImagePct}%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--panel);border:1px solid var(--divider);border-radius:var(--radius);overflow:hidden;padding:20px}.image-panel img{width:100%;height:100%;object-fit:contain}.info-panel{width:${100-visual.longImagePct}%;display:flex;flex-direction:column;justify-content:center;gap:21px;padding-right:24px}.meta-row{display:flex;align-items:center;justify-content:space-between;max-width:690px}.look-label{font-size:20px;font-weight:900;letter-spacing:.12em}.hair-note{font-size:17px;font-weight:750;color:var(--muted);letter-spacing:.1em}.info-panel .chapter{margin:8px 0}.info-panel p{max-width:680px}.info-panel h2{max-width:720px}</style></head><body><div id="root-long" class="${presetClass}" data-composition-id="style-long" data-start="0" data-duration="30" data-track-index="0" data-width="1920" data-height="1080">${clips}<script src="vendor/gsap.min.js"></script><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});const starts=[0,3,6,9,12,15,18,21,24,27];${entranceTimeline([0,3,6,9,12,15,18,21,24,27],9)}${transitionTimeline(boundaries)}tl.fromTo('#progress .progress-fill',{scaleX:0},{scaleX:1,duration:30,ease:'none'},0);window.__timelines['style-long']=tl;</script></div></body></html>`;
}

function shortHtml() {
  const duration=17, boundaries=[2.5,5.5,8.5,11.5,14.5];
  let clips=`<audio id="audio-short" src="audio/style-short.wav" data-start="0" data-duration="17" data-track-index="3" data-volume="1"></audio>`;
  clips += `<div id="intro" class="scene intro" data-start="0" data-duration="2.5" data-track-index="1"><div class="scene-content intro-content"><div class="intro-kicker">STYLE SHIFT · STAGE 1.1</div><h1><span class="title-line">한 캐릭터,</span><span class="title-line">다양한 무드</span></h1><div class="intro-accent">HAIR × OUTFIT</div><p>출근 · 운동 · 데이트 · 스트릿</p><div class="preset-note">${esc(project.visualPreset)} · ${esc(project.captionPreset)}</div></div></div>`;
  let cursor=2.5; shortLooks.forEach((look,i)=>{ clips += shortLookScene(look,i+1,cursor); cursor += 3; });
  clips += `<div id="ending" class="scene ending" data-start="14.5" data-duration="2.5" data-track-index="1"><div class="scene-content ending-content"><div class="intro-kicker">YOUR PICK?</div><h2><span class="title-line">어떤 룩이</span><span class="title-line">가장 마음에 드나요?</span></h2><div class="ending-grid">${shortLooks.map(x=>`<img src="${x.image}" alt="${esc(x.name)}">`).join('')}</div></div></div>`;
  boundaries.forEach((b,i)=>clips += transitionClip(i+1,b-visual.transitionSpeed,(i+1)%3));
  clips += `<div id="progress" class="progress" data-layout-ignore data-start="0" data-duration="17" data-track-index="9"><div class="progress-fill"></div></div>`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Style showcase short</title><style>${commonStyle(1080,1920)}h1{font-size:108px}h2{font-size:calc(72px * var(--headline-scale))}.intro-content,.ending-content{padding:110px 72px}.short-layout{padding:64px 58px 74px;display:flex;flex-direction:column;gap:18px}.short-topline{height:42px;display:flex;justify-content:space-between;align-items:center;font-size:18px;font-weight:850;letter-spacing:.12em;color:var(--muted)}.short-image{height:${visual.shortImagePct}%;display:flex;align-items:center;justify-content:center;background:var(--panel);border:1px solid var(--divider);border-radius:var(--radius);overflow:hidden;padding:16px}.short-image img{width:100%;height:100%;object-fit:contain}.short-caption{height:${100-visual.shortImagePct}%;display:flex;flex-direction:column;justify-content:center;gap:13px;position:relative}.caption-meta{display:flex;align-items:center;gap:16px}.short-caption .chapter{width:66px;height:66px;font-size:29px}.short-caption .eyebrow{font-size:20px}.short-caption p{font-size:calc(24px * var(--body-scale));line-height:1.34}.short-caption .tag{font-size:17px;padding:7px 11px}.caption-b .short-caption{border-left:10px solid var(--accent);padding-left:22px}.caption-c .short-caption h2{width:max-content;max-width:100%}.caption-d .short-caption .eyebrow{letter-spacing:.18em}.ending-grid{grid-template-columns:repeat(2,1fr);gap:12px}.ending-grid img{height:330px}</style></head><body><div id="root-short" class="${presetClass}" data-composition-id="style-short" data-start="0" data-duration="17" data-track-index="0" data-width="1080" data-height="1920">${clips}<script src="../vendor/gsap.min.js"></script><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});const starts=[0,2.5,5.5,8.5,11.5,14.5];${entranceTimeline([0,2.5,5.5,8.5,11.5,14.5],5)}${transitionTimeline(boundaries)}tl.fromTo('#progress .progress-fill',{scaleX:0},{scaleX:1,duration:17,ease:'none'},0);window.__timelines['style-short']=tl;</script></div></body></html>`;
}

await writeFile(path.join(root, 'index.html'), longHtml(), 'utf8');
await writeFile(path.join(root, 'compositions', 'style-short.html'), shortHtml(), 'utf8');
console.log(`[P1.1] Generated presets visual=${project.visualPreset} caption=${project.captionPreset}`);
