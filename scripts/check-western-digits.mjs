// Fails when Arabic-Indic (U+0660-0669) or Persian (U+06F0-06F9) digits sit in source.
// Owner rule: digits are 0-9 everywhere, also in Arabic text. Parsers use \u escapes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exts = new Set(['.ts', '.tsx', '.js', '.mjs', '.css', '.json']);
const bad = /[٠-٩۰-۹]/;
const hits = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (exts.has(path.extname(entry.name))) {
      fs.readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
        if (bad.test(line)) hits.push(`${path.relative(root, full)}:${i + 1}`);
      });
    }
  }
}

for (const d of ['app', 'components', 'lib']) if (fs.existsSync(path.join(root, d))) walk(path.join(root, d));
if (hits.length) { console.error('Arabic-Indic digits found (use 0-9):\n' + hits.join('\n')); process.exit(1); }
console.log('check-western-digits: ok');
