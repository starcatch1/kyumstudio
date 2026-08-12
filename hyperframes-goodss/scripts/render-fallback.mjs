import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const [htmlArg, compositionId, durationArg, widthArg, heightArg, outputArg] = process.argv.slice(2);
if (!outputArg) {
  console.error('Usage: node scripts/render-fallback.mjs <html> <compositionId> <duration> <width> <height> <output>');
  process.exit(2);
}

const root = path.resolve(import.meta.dirname, '..');
const htmlPath = path.resolve(root, htmlArg);
const outputPath = path.resolve(root, outputArg);
const duration = Number(durationArg);
const width = Number(widthArg);
const height = Number(heightArg);
const captureFps = Number(process.env.HF_CAPTURE_FPS || 15);
const scale = Number(process.env.HF_CAPTURE_SCALE || 0.5);
const captureWidth = Math.max(320, Math.round(width * scale));
const captureHeight = Math.max(320, Math.round(height * scale));
const frameDir = path.join(root, '.render-frames', compositionId);

function chromeCandidates() {
  const p = [];
  if (process.env.CHROME_PATH) p.push(process.env.CHROME_PATH);
  if (process.platform === 'win32') {
    for (const base of [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]) {
      if (!base) continue;
      p.push(path.join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'));
      p.push(path.join(base, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    }
  } else if (process.platform === 'darwin') {
    p.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    p.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
  } else {
    p.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge');
  }
  return p;
}

const executablePath = chromeCandidates().find(existsSync);
if (!executablePath) {
  console.error('[P0] No Chrome/Edge/Chromium executable found. Set CHROME_PATH to your browser executable.');
  process.exit(3);
}
if (!existsSync(htmlPath)) {
  console.error(`[P0] HTML not found: ${htmlPath}`);
  process.exit(4);
}

await rm(frameDir, { recursive: true, force: true });
await mkdir(frameDir, { recursive: true });
await mkdir(path.dirname(outputPath), { recursive: true });

console.log(`[P0] Fallback renderer: ${compositionId}`);
console.log(`[P0] Browser: ${executablePath}`);
console.log(`[P0] Capture: ${captureWidth}x${captureHeight} @ ${captureFps} fps -> ${width}x${height} @ 30 fps`);

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--allow-file-access-from-files', '--disable-web-security', '--no-sandbox', '--disable-dev-shm-usage']
});

try {
  const page = await browser.newPage({ viewport: { width: captureWidth, height: captureHeight }, deviceScaleFactor: 1 });
  const url = pathToFileURL(htmlPath).href;
  await page.goto(url, { waitUntil: 'load' });

  const ready = await page.evaluate((id) => Boolean(window.__timelines && window.__timelines[id]), compositionId);
  if (!ready) throw new Error(`[P0] Timeline not registered: ${compositionId}`);

  await page.evaluate(({ id, scale, width, height, cw, ch }) => {
    const root = document.querySelector(`[data-composition-id="${id}"]`);
    if (!root) throw new Error(`Composition root not found: ${id}`);
    document.documentElement.style.width = `${cw}px`;
    document.documentElement.style.height = `${ch}px`;
    document.body.style.width = `${cw}px`;
    document.body.style.height = `${ch}px`;
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    root.style.width = `${width}px`;
    root.style.height = `${height}px`;
    root.style.transform = `scale(${scale})`;
    root.style.transformOrigin = 'top left';
  }, { id: compositionId, scale, width, height, cw: captureWidth, ch: captureHeight });

  const totalFrames = Math.ceil(duration * captureFps);
  for (let frame = 0; frame < totalFrames; frame++) {
    const t = Math.min(duration - 0.0001, frame / captureFps);
    await page.evaluate(({ id, t }) => {
      const tl = window.__timelines[id];
      tl.time(t, false).pause();
      const root = document.querySelector(`[data-composition-id="${id}"]`);
      for (const el of root.querySelectorAll('[data-start][data-duration][data-track-index]')) {
        if (el === root) continue;
        const start = Number(el.dataset.start);
        const dur = Number(el.dataset.duration);
        const active = Number.isFinite(start) && Number.isFinite(dur) && t >= start && t < start + dur;
        el.style.visibility = active ? 'visible' : 'hidden';
      }
    }, { id: compositionId, t });
    const name = `frame-${String(frame).padStart(6, '0')}.png`;
    await page.screenshot({ path: path.join(frameDir, name), type: 'png' });
    if (frame % Math.max(1, Math.floor(captureFps * 2)) === 0) {
      console.log(`[P0] ${compositionId}: frame ${frame}/${totalFrames}`);
    }
  }
} finally {
  await browser.close();
}

const ffmpeg = spawnSync('ffmpeg', [
  '-y', '-v', 'warning',
  '-framerate', String(captureFps),
  '-i', path.join(frameDir, 'frame-%06d.png'),
  '-vf', `scale=${width}:${height}:flags=lanczos,fps=30,format=yuv420p`,
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
  '-movflags', '+faststart',
  outputPath
], { stdio: 'inherit' });

if (ffmpeg.status !== 0) {
  console.error(`[P0] ffmpeg failed with exit ${ffmpeg.status}`);
  process.exit(ffmpeg.status || 5);
}

await rm(frameDir, { recursive: true, force: true });
console.log(`[P0] Fallback render complete: ${outputPath}`);
