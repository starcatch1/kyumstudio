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
  const cls = ['lime','black','split'][mode];
  const body = mode === 2
    ? '<div class="half left"></div><div class="half right"></div>'
    : '<div class="wipe"></div><div class="accent-line"></div>';
  return `<div id="tr-${id}" class="transition ${cls}" data-layout-ignore data-start="${start.toFixed(2)}" data-duration="0.56" data-track-index="8">${body}</div>`;
}

function longLookScene(look, sceneIndex, start) {
  return `<div id="scene-${sceneIndex}" class="scene look-scene" data-start="${start.toFixed(2)}" data-duration="3.00" data-track-index="1">
    <div class="scene-content long-layout">
      <div class="image-panel"><div class="image-stage"><img class="look-image" src="${esc(look.image)}" alt="${esc(look.name)}"></div></div>
      <div class="info-panel">
        <div class="meta-row"><span class="look-label">LOOK ${String(look.id).padStart(2,'0')}</span><span class="hair-note">HAIR · OUTFIT</span></div>
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
      <div class="short-topline"><span>STYLE SHIFT</span><span>${String(sceneIndex).padStart(2,'0')} / 04</span></div>
      <div class="short-image"><div class="image-stage"><img class="look-image" src="${esc(look.image)}" alt="${esc(look.name)}"></div></div>
      <div class="short-caption">
        <div class="caption-meta"><div class="chapter">${String(look.id).padStart(2,'0')}</div><div class="eyebrow">${esc(look.headline)}</div></div>
        <h2>${esc(look.name)}</h2>
        <p>${esc(look.description)}</p>
        <div class="tags">${tags(look)}</div>
      </div>
    </div>
  </div>`;
}

function commonStyle(width, height) {
  return `
  *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#F6F4F0;font-family:"Noto Sans KR","Noto Sans CJK KR",Arial,sans-serif;color:#111}
  [data-composition-id]{position:relative;overflow:hidden;background:#F6F4F0;width:${width}px;height:${height}px}
  .scene{position:absolute;inset:0;overflow:hidden;background:#F6F4F0}.scene-content{display:flex;width:100%;height:100%;box-sizing:border-box}
  .chapter{display:inline-flex;align-items:center;justify-content:center;width:78px;height:78px;background:#C8FF3D;color:#111;font-size:34px;font-weight:900;border-radius:50%;line-height:1}
  .eyebrow{font-size:24px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#111}h1,h2,p{margin:0}h1{font-size:104px;line-height:.98;letter-spacing:-.055em;font-weight:900}h2{font-size:64px;line-height:1.05;letter-spacing:-.045em;font-weight:900;word-break:keep-all}
  .title-line{display:block}p{font-size:27px;line-height:1.45;color:#505050;word-break:keep-all}.tags{display:flex;gap:10px;flex-wrap:wrap}.tag{padding:9px 15px;border:1.5px solid #111;border-radius:999px;font-size:20px;font-weight:750;background:#fff}
  .transition{position:absolute;inset:0;z-index:50;overflow:hidden;pointer-events:none}.transition .wipe{position:absolute;inset:0;background:#C8FF3D}.transition.black .wipe{background:#111}.transition .accent-line{position:absolute;top:0;bottom:0;width:16px;left:50%;background:#fff}.transition.black .accent-line{background:#C8FF3D}.transition.split .half{position:absolute;top:0;bottom:0;width:50%;background:#fff}.transition.split .left{left:0;border-right:8px solid #C8FF3D}.transition.split .right{right:0;border-left:8px solid #C8FF3D}
  .progress{position:absolute;left:0;right:0;bottom:0;height:8px;z-index:60;background:#E0E0DC}.progress-fill{width:100%;height:100%;background:#C8FF3D;transform-origin:left center}
  .intro,.ending{background:#F6F4F0}.intro-content,.ending-content{padding:96px;display:flex;flex-direction:column;justify-content:center;gap:26px}.intro-kicker{font-size:24px;font-weight:900;letter-spacing:.15em}.intro-accent{display:inline-block;background:#111;color:#fff;padding:10px 20px;border-radius:12px;width:max-content;font-size:27px;font-weight:850}.ending-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:24px}.ending-grid img{width:100%;height:320px;object-fit:contain;background:#fff;border:1px solid #D9D9D9;border-radius:18px}
  .image-stage{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fff}.look-image{transform-origin:center;filter:saturate(.96) contrast(1.02)}
  `;
}

function transitionTimeline(boundaries) {
  return boundaries.map((b,k) => {
    const id=k+1, mode=id%3, s=(b-.28).toFixed(2), mid=(b-.02).toFixed(2);
    if (mode === 0) return `tl.fromTo('#tr-${id} .wipe',{scaleX:0,transformOrigin:'left center'},{scaleX:1,duration:.26,ease:'power3.inOut'},${s}).to('#tr-${id} .wipe',{scaleX:0,transformOrigin:'right center',duration:.26,ease:'power3.inOut'},${mid});`;
    if (mode === 1) return `tl.fromTo('#tr-${id} .wipe',{scaleX:0,transformOrigin:'right center'},{scaleX:1,duration:.26,ease:'power3.inOut'},${s}).to('#tr-${id} .wipe',{scaleX:0,transformOrigin:'left center',duration:.26,ease:'power3.inOut'},${mid});`;
    return `tl.fromTo('#tr-${id} .left',{scaleX:0,transformOrigin:'right center'},{scaleX:1,duration:.26,ease:'power3.inOut'},${s}).fromTo('#tr-${id} .right',{scaleX:0,transformOrigin:'left center'},{scaleX:1,duration:.26,ease:'power3.inOut'},${s}).to('#tr-${id} .left',{scaleX:0,transformOrigin:'left center',duration:.26,ease:'power3.inOut'},${mid}).to('#tr-${id} .right',{scaleX:0,transformOrigin:'right center',duration:.26,ease:'power3.inOut'},${mid});`;
  }).join('');
}

function longHtml() {
  const duration=30; const boundaries=[3,6,9,12,15,18,21,24,27];
  let clips=`<audio id="audio-long" src="audio/style-long.wav" data-start="0" data-duration="30" data-track-index="3" data-volume="1"></audio>`;
  clips += `<div id="intro" class="scene intro" data-start="0" data-duration="3" data-track-index="1"><div class="scene-content intro-content"><div class="intro-kicker">CHARACTER STYLE SYSTEM · STAGE 1</div><h1><span class="title-line">이서영</span><span class="title-line">헤어 & 스타일 가이드</span></h1><div class="intro-accent">8 LOOKS · LONG SHOWCASE</div><p>한 캐릭터의 헤어와 의상 무드를 전신 이미지와 에디토리얼 자막으로 소개합니다.</p></div></div>`;
  longLooks.forEach((look,i)=>{clips+=longLookScene(look,i+1,(i+1)*3);});
  clips += `<div id="ending" class="scene ending" data-start="27" data-duration="3" data-track-index="1"><div class="scene-content ending-content"><div class="intro-kicker">STAGE 1 COMPLETE</div><h2>어떤 룩이 가장 마음에 드나요?</h2><p>재생 안정성, 고화질 출력, 자막, 전환, BGM/SFX까지 하나의 반복 가능한 파이프라인으로 정리했습니다.</p><div class="ending-grid">${[1,3,5,10].map(id=>`<img src="${byId.get(id).image}" alt="look ${id}">`).join('')}</div></div></div>`;
  boundaries.forEach((b,i)=>clips+=transitionClip(i+1,b-.28,(i+1)%3));
  clips += `<div id="progress" class="progress" data-layout-ignore data-start="0" data-duration="30" data-track-index="9"><div class="progress-fill"></div></div>`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Style showcase long</title><style>${commonStyle(1920,1080)}
  .long-layout{padding:72px 96px;gap:70px;align-items:stretch}.image-panel{width:53%;height:100%;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #D9D9D9;border-radius:30px;overflow:hidden;padding:20px}.image-panel img{width:100%;height:100%;object-fit:contain}.info-panel{width:47%;display:flex;flex-direction:column;justify-content:center;gap:21px;padding-right:24px}.meta-row{display:flex;align-items:center;justify-content:space-between;max-width:690px}.look-label{font-size:20px;font-weight:900;letter-spacing:.12em}.hair-note{font-size:17px;font-weight:750;color:#777;letter-spacing:.1em}.info-panel .chapter{margin:8px 0}.info-panel p{max-width:680px}.info-panel h2{max-width:720px}
  </style></head><body><div id="root-long" data-composition-id="style-long" data-start="0" data-duration="${duration}" data-track-index="0" data-width="1920" data-height="1080">${clips}<script src="vendor/gsap.min.js"></script><script>
  window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});const starts=[0,3,6,9,12,15,18,21,24,27];
  starts.forEach((s,i)=>{const sel=i===0?'#intro':i===9?'#ending':'#scene-'+i;tl.from(sel+' .chapter',{scale:.78,opacity:0,duration:.44,ease:'back.out(1.25)'},s+.16);tl.from(sel+' .meta-row, '+sel+' .eyebrow, '+sel+' .intro-kicker',{x:28,opacity:0,duration:.42,ease:'power3.out'},s+.20);tl.from(sel+' h1, '+sel+' h2',{y:34,opacity:0,duration:.52,ease:'expo.out'},s+.26);tl.from(sel+' p',{y:18,opacity:0,duration:.38,ease:'power2.out'},s+.42);tl.from(sel+' .tag',{y:12,opacity:0,duration:.28,stagger:.055,ease:'power2.out'},s+.50);tl.from(sel+' .look-image',{scale:.985,opacity:0,duration:.62,ease:'sine.out'},s+.14);tl.to(sel+' .look-image',{scale:1.018,duration:2.2,ease:'sine.inOut'},s+.60);});
  ${transitionTimeline(boundaries)}tl.fromTo('#progress .progress-fill',{scaleX:0},{scaleX:1,duration:30,ease:'none'},0);window.__timelines['style-long']=tl;
  </script></div></body></html>`;
}

function shortHtml() {
  const duration=17; const boundaries=[2.5,5.5,8.5,11.5,14.5];
  let clips=`<audio id="audio-short" src="audio/style-short.wav" data-start="0" data-duration="17" data-track-index="3" data-volume="1"></audio>`;
  clips += `<div id="intro" class="scene intro" data-start="0" data-duration="2.5" data-track-index="1"><div class="scene-content intro-content"><div class="intro-kicker">STYLE SHIFT · 4 LOOKS</div><h1><span class="title-line">한 캐릭터,</span><span class="title-line">다양한 무드</span></h1><div class="intro-accent">HAIR × OUTFIT</div><p>출근 · 운동 · 데이트 · 스트릿</p></div></div>`;
  let cursor=2.5;shortLooks.forEach((look,i)=>{clips+=shortLookScene(look,i+1,cursor);cursor+=3;});
  clips += `<div id="ending" class="scene ending" data-start="14.5" data-duration="2.5" data-track-index="1"><div class="scene-content ending-content"><div class="intro-kicker">YOUR PICK?</div><h2><span class="title-line">어떤 룩이</span><span class="title-line">가장 마음에 드나요?</span></h2><div class="ending-grid">${shortLooks.map(x=>`<img src="${x.image}" alt="${esc(x.name)}">`).join('')}</div></div></div>`;
  boundaries.forEach((b,i)=>clips+=transitionClip(i+1,b-.28,(i+1)%3));
  clips += `<div id="progress" class="progress" data-layout-ignore data-start="0" data-duration="17" data-track-index="9"><div class="progress-fill"></div></div>`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Style showcase short</title><style>${commonStyle(1080,1920)}
  h1{font-size:108px}h2{font-size:72px}.intro-content,.ending-content{padding:110px 72px}.short-layout{padding:64px 58px 74px;display:flex;flex-direction:column;gap:18px}.short-topline{height:42px;display:flex;justify-content:space-between;align-items:center;font-size:18px;font-weight:850;letter-spacing:.12em;color:#555}.short-image{height:66%;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #D9D9D9;border-radius:30px;overflow:hidden;padding:12px}.short-image img{width:100%;height:100%;object-fit:contain}.short-caption{height:30%;display:flex;flex-direction:column;justify-content:center;gap:12px;position:relative}.caption-meta{display:flex;align-items:center;gap:18px}.short-caption .chapter{width:66px;height:66px;font-size:29px}.short-caption .eyebrow{font-size:20px}.short-caption h2{font-size:50px}.short-caption p{font-size:23px;line-height:1.34;max-width:870px}.short-caption .tag{font-size:17px;padding:7px 11px}.caption-b .short-caption{border-left:10px solid #C8FF3D;padding-left:22px}.caption-c .short-caption h2{background:#111;color:#fff;width:max-content;max-width:100%;padding:9px 15px;border-radius:10px}.caption-d .short-caption .eyebrow{writing-mode:vertical-rl;position:absolute;right:0;top:12px}.ending-grid{grid-template-columns:repeat(2,1fr);gap:12px}.ending-grid img{height:330px}
  </style></head><body><div id="root-short" data-composition-id="style-short" data-start="0" data-duration="${duration}" data-track-index="0" data-width="1080" data-height="1920">${clips}<script src="../vendor/gsap.min.js"></script><script>
  window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});const starts=[0,2.5,5.5,8.5,11.5,14.5];
  starts.forEach((s,i)=>{const sel=i===0?'#intro':i===5?'#ending':'#scene-'+i;tl.from(sel+' .short-topline, '+sel+' .caption-meta, '+sel+' .intro-kicker',{y:18,opacity:0,duration:.36,ease:'power3.out'},s+.16);tl.from(sel+' h1, '+sel+' h2',{y:30,opacity:0,duration:.46,ease:'expo.out'},s+.22);tl.from(sel+' p',{y:16,opacity:0,duration:.34,ease:'power2.out'},s+.38);tl.from(sel+' .tag',{y:10,opacity:0,duration:.26,stagger:.05,ease:'power2.out'},s+.46);tl.from(sel+' .look-image',{scale:.982,opacity:0,duration:.54,ease:'sine.out'},s+.12);tl.to(sel+' .look-image',{scale:1.014,duration:2.05,ease:'sine.inOut'},s+.55);});
  ${transitionTimeline(boundaries)}tl.fromTo('#progress .progress-fill',{scaleX:0},{scaleX:1,duration:17,ease:'none'},0);window.__timelines['style-short']=tl;
  </script></div></body></html>`;
}

await writeFile(path.join(root,'index.html'),longHtml(),'utf8');
await writeFile(path.join(root,'compositions','style-short.html'),shortHtml(),'utf8');
console.log('[P1] Generated refined Long/Short compositions with enhanced captions, transitions and audio tracks.');
