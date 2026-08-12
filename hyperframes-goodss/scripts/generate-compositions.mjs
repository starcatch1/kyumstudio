import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const looks = JSON.parse(await readFile(path.join(root, 'data', 'looks.json'), 'utf8'));
await mkdir(path.join(root, 'compositions'), { recursive: true });

const byId = new Map(looks.map(x => [x.id, x]));
const longLooks = [1,2,3,4,5,6,10,11].map(id => byId.get(id));
const shortLooks = [5,3,10,4].map(id => byId.get(id));

const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const tags = look => look.tags.map(t => `<span class="tag">#${esc(t)}</span>`).join('');

function transitionClip(id, start, mode) {
  const cls = mode === 0 ? 'lime' : mode === 1 ? 'black' : 'split';
  return `<div id="tr-${id}" class="transition ${cls}" data-layout-ignore data-start="${start.toFixed(2)}" data-duration="0.60" data-track-index="8"><div class="wipe"></div></div>`;
}

function longLookScene(look, sceneIndex, start) {
  return `<div id="scene-${sceneIndex}" class="scene look-scene" data-start="${start.toFixed(2)}" data-duration="3.00" data-track-index="1">
    <div class="scene-content long-layout">
      <div class="image-panel"><img class="look-image" src="${esc(look.image)}" alt="${esc(look.name)}"></div>
      <div class="info-panel">
        <div class="chapter">${String(look.id).padStart(2,'0')}</div>
        <div class="eyebrow">${esc(look.headline)}</div>
        <h2>${esc(look.name)}</h2>
        <p>${esc(look.description)}</p>
        <div class="tags">${tags(look)}</div>
      </div>
    </div>
  </div>`;
}

function shortLookScene(look, sceneIndex, start) {
  const style = ['caption-a','caption-b','caption-c','caption-d'][sceneIndex % 4];
  return `<div id="scene-${sceneIndex}" class="scene short-scene ${style}" data-start="${start.toFixed(2)}" data-duration="3.00" data-track-index="1">
    <div class="scene-content short-layout">
      <div class="short-image"><img class="look-image" src="${esc(look.image)}" alt="${esc(look.name)}"></div>
      <div class="short-caption">
        <div class="chapter">${String(look.id).padStart(2,'0')}</div>
        <div class="eyebrow">${esc(look.headline)}</div>
        <h2>${esc(look.name)}</h2>
        <p>${esc(look.description)}</p>
        <div class="tags">${tags(look)}</div>
      </div>
    </div>
  </div>`;
}

function commonStyle(width, height) {
  return `
  *{box-sizing:border-box} html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#F6F4F0;font-family:"Noto Sans KR","Noto Sans CJK KR",Arial,sans-serif;color:#111}
  [data-composition-id]{position:relative;overflow:hidden;background:#F6F4F0;width:${width}px;height:${height}px}
  .scene{position:absolute;inset:0;overflow:hidden;background:#F6F4F0}
  .scene-content{display:flex;width:100%;height:100%;box-sizing:border-box}
  .chapter{display:inline-flex;align-items:center;justify-content:center;width:92px;height:92px;background:#C8FF3D;color:#111;font-size:42px;font-weight:900;border-radius:50%;line-height:1}
  .eyebrow{font-size:25px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}
  h1,h2,p{margin:0} h1{font-size:104px;line-height:.98;letter-spacing:-.055em;font-weight:900} h2{font-size:68px;line-height:1.05;letter-spacing:-.045em;font-weight:900;word-break:keep-all}
  .title-line{display:block}
  p{font-size:30px;line-height:1.45;color:#4A4A4A;word-break:keep-all}
  .tags{display:flex;gap:12px;flex-wrap:wrap}.tag{padding:10px 16px;border:2px solid #111;border-radius:999px;font-size:22px;font-weight:700;background:#fff}
  .transition{position:absolute;inset:0;z-index:50;overflow:hidden;pointer-events:none}.transition .wipe{position:absolute;inset:0;background:#C8FF3D}.transition.black .wipe{background:#111}.transition.split .wipe{background:#fff;border-left:16px solid #C8FF3D;border-right:16px solid #C8FF3D}
  .intro,.ending{background:#F6F4F0}.intro-content,.ending-content{padding:96px;display:flex;flex-direction:column;justify-content:center;gap:28px}.intro-kicker{font-size:26px;font-weight:800;letter-spacing:.14em}.intro-accent{display:inline-block;background:#111;color:#fff;padding:10px 20px;border-radius:12px;width:max-content;font-size:28px;font-weight:800}.ending-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:28px}.ending-grid img{width:100%;height:330px;object-fit:contain;background:#fff;border:1px solid #D9D9D9;border-radius:18px}
  `;
}

function longHtml() {
  const duration = 30;
  let clips = `<div id="intro" class="scene intro" data-start="0" data-duration="3" data-track-index="1"><div class="scene-content intro-content"><div class="intro-kicker">CHARACTER STYLE SYSTEM · STAGE 1</div><h1><span class="title-line">이서영</span><span class="title-line">헤어 & 스타일 가이드</span></h1><div class="intro-accent">8 LOOKS · LONG SHOWCASE</div><p>한 캐릭터의 다양한 스타일을 전신 이미지와 에디토리얼 자막으로 소개합니다.</p></div></div>`;
  longLooks.forEach((look,i) => { clips += longLookScene(look, i+1, (i+1)*3); });
  clips += `<div id="ending" class="scene ending" data-start="27" data-duration="3" data-track-index="1"><div class="scene-content ending-content"><div class="intro-kicker">ENDING</div><h2>어떤 룩이 가장 마음에 드나요?</h2><p>Stage 1에서는 재생 안정성과 반복 생성 가능성을 먼저 검증합니다.</p><div class="ending-grid">${[1,3,5,10].map(id=>`<img src="${byId.get(id).image}" alt="look ${id}">`).join('')}</div></div></div>`;
  for (let i=1;i<10;i++) clips += transitionClip(i, i*3-0.30, i%3);

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Style showcase long</title><style>${commonStyle(1920,1080)}
  .long-layout{padding:72px 96px;gap:78px;align-items:stretch}.image-panel{width:54%;height:100%;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #D9D9D9;border-radius:28px;overflow:hidden}.image-panel img{width:100%;height:100%;object-fit:contain;transform-origin:center}.info-panel{width:46%;display:flex;flex-direction:column;justify-content:center;gap:24px;padding-right:36px}.info-panel .chapter{margin-bottom:14px}.info-panel p{max-width:680px}
  </style></head><body><div id="root-long" data-composition-id="style-long" data-start="0" data-duration="${duration}" data-track-index="0" data-width="1920" data-height="1080">${clips}<script src="vendor/gsap.min.js"></script><script>
  window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});
  const starts=[0,3,6,9,12,15,18,21,24,27];
  starts.forEach((s,i)=>{const sel=i===0?'#intro':i===9?'#ending':'#scene-'+i;tl.from(sel+' .chapter',{scale:.72,opacity:0,duration:.55,ease:'back.out(1.35)'},s+.18);tl.from(sel+' .eyebrow, '+sel+' .intro-kicker',{x:42,opacity:0,duration:.50,ease:'power3.out'},s+.24);tl.from(sel+' h1, '+sel+' h2',{y:46,opacity:0,duration:.62,ease:'expo.out'},s+.30);tl.from(sel+' p',{y:24,opacity:0,duration:.48,ease:'power2.out'},s+.46);tl.from(sel+' .tag',{y:18,opacity:0,duration:.35,stagger:.07,ease:'power2.out'},s+.56);tl.from(sel+' .look-image',{scale:.975,opacity:0,duration:.70,ease:'sine.out'},s+.18);});
  ${Array.from({length:9},(_,k)=>{const i=k+1,s=(i*3-.30).toFixed(2);return `tl.fromTo('#tr-${i} .wipe',{scaleX:0,transformOrigin:'left center'},{scaleX:1,duration:.30,ease:'power3.inOut'},${s}).to('#tr-${i} .wipe',{scaleX:0,transformOrigin:'right center',duration:.30,ease:'power3.inOut'},${(Number(s)+.30).toFixed(2)});`}).join('')}
  tl.to('#ending',{opacity:0,duration:.5,ease:'power2.in'},29.45);window.__timelines['style-long']=tl;
  </script></div></body></html>`;
}

function shortHtml() {
  const duration = 17;
  let clips = `<div id="intro" class="scene intro" data-start="0" data-duration="2.5" data-track-index="1"><div class="scene-content intro-content"><div class="intro-kicker">15 SEC STYLE TEST</div><h1><span class="title-line">한 캐릭터,</span><span class="title-line">다양한 무드</span></h1><div class="intro-accent">STYLE SHIFT</div><p>출근 · 운동 · 데이트 · 스트릿</p></div></div>`;
  let cursor=2.5; shortLooks.forEach((look,i)=>{clips += shortLookScene(look,i+1,cursor);cursor+=3;});
  clips += `<div id="ending" class="scene ending" data-start="14.5" data-duration="2.5" data-track-index="1"><div class="scene-content ending-content"><div class="intro-kicker">YOUR PICK?</div><h2><span class="title-line">어떤 룩이</span><span class="title-line">가장 마음에 드나요?</span></h2><div class="ending-grid">${shortLooks.map(x=>`<img src="${x.image}" alt="${esc(x.name)}">`).join('')}</div></div></div>`;
  const boundaries=[2.5,5.5,8.5,11.5,14.5]; boundaries.forEach((b,i)=>clips+=transitionClip(i+1,b-.30,(i+1)%3));
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Style showcase short</title><style>${commonStyle(1080,1920)}
  h1{font-size:112px}h2{font-size:78px}.intro-content,.ending-content{padding:110px 72px}.short-layout{padding:72px 58px;display:flex;flex-direction:column;gap:22px}.short-image{height:67%;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #D9D9D9;border-radius:30px;overflow:hidden}.short-image img{width:100%;height:100%;object-fit:contain}.short-caption{height:33%;display:flex;flex-direction:column;justify-content:center;gap:14px;position:relative}.short-caption .chapter{width:72px;height:72px;font-size:32px}.short-caption .eyebrow{font-size:21px}.short-caption h2{font-size:54px}.short-caption p{font-size:25px;line-height:1.34}.short-caption .tag{font-size:18px;padding:7px 12px}.caption-b .short-caption{border-left:12px solid #C8FF3D;padding-left:24px}.caption-c .short-caption h2{background:#111;color:#fff;width:max-content;max-width:100%;padding:10px 16px;border-radius:10px}.caption-d .short-caption .eyebrow{writing-mode:vertical-rl;position:absolute;right:0;top:18px}.ending-grid{grid-template-columns:repeat(2,1fr);gap:12px}.ending-grid img{height:330px}
  </style></head><body><div id="root-short" data-composition-id="style-short" data-start="0" data-duration="${duration}" data-track-index="0" data-width="1080" data-height="1920">${clips}<script src="../vendor/gsap.min.js"></script><script>
  window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});const starts=[0,2.5,5.5,8.5,11.5,14.5];
  starts.forEach((s,i)=>{const sel=i===0?'#intro':i===5?'#ending':'#scene-'+i;tl.from(sel+' .chapter',{scale:.70,opacity:0,duration:.48,ease:'back.out(1.4)'},s+.16);tl.from(sel+' .eyebrow, '+sel+' .intro-kicker',{x:36,opacity:0,duration:.42,ease:'power3.out'},s+.22);tl.from(sel+' h1, '+sel+' h2',{y:44,opacity:0,duration:.55,ease:'expo.out'},s+.27);tl.from(sel+' p',{y:22,opacity:0,duration:.42,ease:'power2.out'},s+.42);tl.from(sel+' .tag',{y:16,opacity:0,duration:.30,stagger:.06,ease:'power2.out'},s+.50);tl.from(sel+' .look-image',{scale:.97,opacity:0,duration:.62,ease:'sine.out'},s+.16);});
  ${boundaries.map((b,k)=>{const i=k+1,s=(b-.30).toFixed(2);return `tl.fromTo('#tr-${i} .wipe',{scaleX:0,transformOrigin:'left center'},{scaleX:1,duration:.30,ease:'power3.inOut'},${s}).to('#tr-${i} .wipe',{scaleX:0,transformOrigin:'right center',duration:.30,ease:'power3.inOut'},${b.toFixed(2)});`}).join('')}
  tl.to('#ending',{opacity:0,duration:.45,ease:'power2.in'},16.48);window.__timelines['style-short']=tl;
  </script></div></body></html>`;
}

await writeFile(path.join(root, 'index.html'), longHtml(), 'utf8');
await writeFile(path.join(root, 'compositions', 'style-short.html'), shortHtml(), 'utf8');
console.log('[P0] Generated index.html (long) and compositions/style-short.html.');
