import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['src'];
const restricted = [
  /\bfrom\s+['"]phaser['"]/,
  /\bimport\s+.*['"]phaser['"]/,
  /\bwindow\b/,
  /\bdocument\b/,
  /\blocalStorage\b/,
  /AudioEngine/
];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    return stat.isDirectory() ? walk(path) : [path];
  });
}

const checked = roots
  .flatMap(walk)
  .filter((path) => path.endsWith('Logic.ts') || path.endsWith('.test.ts'));

const failures = [];
for (const file of checked) {
  const source = readFileSync(file, 'utf8');
  for (const pattern of restricted) {
    if (pattern.test(source)) {
      failures.push(`${file}: restricted logic/test dependency matched ${pattern}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Import boundary passed for ${checked.length} files.`);
