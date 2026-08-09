import { mkdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'assets', 'source', 'character-master-sheet.png');
const outDir = path.join(root, 'assets', 'looks');

await mkdir(outDir, { recursive: true });
try { await access(source); } catch {
  console.error(`[P0] Missing source image: ${source}`);
  console.error('Copy the character master sheet to assets/source/character-master-sheet.png');
  process.exit(2);
}

function run(bin, args) {
  const r = spawnSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(r.status ?? 1);
  }
  return r.stdout.trim();
}

const probe = JSON.parse(run('ffprobe', [
  '-v','error','-select_streams','v:0',
  '-show_entries','stream=width,height', '-of','json', source
]));
const W = probe.streams[0].width;
const H = probe.streams[0].height;

if (!W || !H) throw new Error('Could not detect source dimensions.');
const ratio = W / H;
if (ratio < 1.35 || ratio > 1.65) {
  console.warn(`[P0] Warning: expected master-sheet ratio near 1.5, got ${ratio.toFixed(3)}.`);
}

// Stage 1 master-sheet contract: 6 columns × 2 rows with title/footer bands.
const col = Math.floor(W / 6);
const insetX = Math.max(3, Math.round(col * 0.025));
const topY = Math.round(H * 0.083);
const midY = Math.round(H * 0.511);
const bottomY = Math.round(H * 0.929);

const rows = [
  { y: topY, h: midY - topY },
  { y: midY, h: bottomY - midY },
];

let id = 1;
for (let r = 0; r < 2; r++) {
  for (let c = 0; c < 6; c++) {
    const x = c * col + insetX;
    const y = rows[r].y + 4;
    const w = (c === 5 ? W - c * col : col) - insetX * 2;
    const h = rows[r].h - 8;
    const out = path.join(outDir, `look-${String(id).padStart(2,'0')}.png`);
    run('ffmpeg', ['-y','-v','error','-i',source,'-vf',`crop=${w}:${h}:${x}:${y}`,'-frames:v','1',out]);
    console.log(`[extract] look ${String(id).padStart(2,'0')} -> ${w}x${h}`);
    id++;
  }
}

console.log('[P0] 12 look assets extracted successfully.');
