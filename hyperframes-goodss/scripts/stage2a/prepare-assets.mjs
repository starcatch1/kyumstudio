import { access } from 'node:fs/promises';
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
  console.error(`[P2A] Unsupported preprocessor: ${item.type}`);
  process.exit(5);
}

console.log(`[P2A] Asset preparation complete (${project.preprocessors.length} preprocessor(s)).`);
