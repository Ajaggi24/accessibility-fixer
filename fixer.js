// fixer.js
// Owner: Role 5 (thin wrapper only — do not put fix logic here)
//
// Combines Role 3's structural fixes and Role 4's content fixes into one
// list. Keeping fixer-structural.js and fixer-content.js as separate files
// means Role 3 and Role 4 never touch the same file and can't conflict.

import { fixStructural } from './fixer-structural.js';
import { fixContent } from './fixer-content.js';

export async function runFixer(violations) {
  const [structuralFixes, contentFixes] = await Promise.all([
    fixStructural(violations),
    fixContent(violations)
  ]);

  return [...structuralFixes, ...contentFixes];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('fs/promises');
  const baseline = JSON.parse(await fs.readFile('reports/baseline.json', 'utf-8'));
  const fixes = await runFixer(baseline);
  await fs.writeFile('reports/fixes.json', JSON.stringify(fixes, null, 2));
  console.log(`[fixer.js] Wrote ${fixes.length} total fixes to reports/fixes.json`);
}
