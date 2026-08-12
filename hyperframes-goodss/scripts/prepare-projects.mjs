import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const longSource = path.join(root, 'index.html');
const shortSource = path.join(root, 'compositions', 'style-short.html');
const longDir = path.join(root, 'projects', 'long');
const shortDir = path.join(root, 'projects', 'short');
await mkdir(longDir, { recursive: true });
await mkdir(shortDir, { recursive: true });

function rebase(html) {
  return html
    .replaceAll('src="assets/', 'src="../../assets/')
    .replaceAll('src="audio/', 'src="../../audio/')
    .replaceAll('src="vendor/', 'src="../../vendor/')
    .replaceAll('src="../vendor/', 'src="../../vendor/');
}

const longHtml = rebase(await readFile(longSource, 'utf8'));
const shortHtml = rebase(await readFile(shortSource, 'utf8'));
await writeFile(path.join(longDir, 'index.html'), longHtml, 'utf8');
await writeFile(path.join(shortDir, 'index.html'), shortHtml, 'utf8');
console.log('[P1] Prepared independent Long / Short projects including audio paths.');
