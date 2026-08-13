import { access, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { loadProject, engineRoot } from './project-lib.mjs';

const projectArg = process.argv[2] || 'project.json';
const { project, projectDir } = await loadProject(projectArg);

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

for (const item of project.preprocessors) {
  if (!item || typeof item !== 'object') continue;

  if (item.type === 'stage1-look-grid') {
    const source = path.resolve(projectDir, item.source || 'assets/source/character-master-sheet.png');
    if (!await exists(source)) {
      console.error(`[P2A] Stage 1 look-grid source missing: ${source}`);
      process.exit(2);
    }
    const expected = path.resolve(engineRoot, 'assets/source/character-master-sheet.png');
    if (source !== expected) {
      console.error('[P2A] stage1-look-grid compatibility preprocessor currently requires the canonical assets/source path.');
      process.exit(3);
    }
    console.log('[P2A] Running frozen Stage 1 look-grid extractor for backward compatibility.');
    const result = spawnSync(process.execPath, [path.join(engineRoot, 'scripts/extract-looks.mjs')], {
      cwd: engineRoot,
      stdio: 'inherit',
    });
    if (result.status !== 0) process.exit(result.status || 4);
    continue;
  }

  if (item.type === 'synthetic-video') {
    const output = path.resolve(projectDir, item.output || 'assets/motion-fixture.mp4');
    const width = Math.max(320, Number(item.width || 1280));
    const height = Math.max(320, Number(item.height || 720));
    const duration = Math.max(0.5, Number(item.duration || 3));
    await mkdir(path.dirname(output), { recursive: true });
    console.log(`[P2A] Generating synthetic video fixture: ${output}`);
    const source = `testsrc2=size=${width}x${height}:rate=30:duration=${duration}`;
    const result = spawnSync('ffmpeg', [
      '-y', '-v', 'error',
      '-f', 'lavfi', '-i', source,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30',
      '-movflags', '+faststart',
      output,
    ], { cwd: engineRoot, stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 5);
    continue;
  }

  console.error(`[P2A] Unsupported preprocessor: ${item.type}`);
  process.exit(6);
}

console.log(`[P2A] Asset preparation complete (${project.preprocessors.length} preprocessor(s)).`);
