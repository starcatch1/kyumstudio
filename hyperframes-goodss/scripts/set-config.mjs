import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadResolvedConfig } from './preset-lib.mjs';

const root = path.resolve(import.meta.dirname, '..');
const file = path.join(root, 'config', 'project.json');
const args = process.argv.slice(2);
const patch = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i]?.replace(/^--/, '');
  const value = args[i + 1];
  if (!key || value == null) throw new Error(`Invalid config argument near ${args[i]}`);
  if (['bgmVolume','sfxVolume'].includes(key)) patch[key] = Number(value);
  else patch[key] = value;
}

const current = JSON.parse(await readFile(file, 'utf8'));
await writeFile(file, JSON.stringify({ ...current, ...patch }, null, 2) + '\n', 'utf8');
const resolved = await loadResolvedConfig();
console.log('[P1.1] Active config:', JSON.stringify(resolved.project));
