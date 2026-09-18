// run-pipeline.js
// Owner: Role 5 — Pipeline Orchestration & Reporting
//
// The orchestrator. Calls every stage in order and passes each stage's
// output into the next stage's input. This is the ONE file that should
// let the whole pipeline run with a single command: `node run-pipeline.js`

import fs from 'fs/promises';
import { runScan, writeBaseline } from './scan.js';
import { runFixer } from './fixer.js';
import { applyFixes } from './apply-fixes.js';
import { runVerify, writeAfter } from './verify.js';
import { buildSummary, buildPrDescription } from './report.js';

// TODO: Role 5 — swap in chalk/ora/cli-table3/boxen here LAST, once the
// plain version below runs cleanly end to end. Polish is not a blocker.

async function main() {
  console.log('1/6 Scanning baseline...');
  const baseline = await runScan();
  await writeBaseline(baseline);
  console.log(`   -> ${baseline.length} violations found`);

  console.log('2/6 Running fixer agent (structural + content)...');
  const fixes = await runFixer(baseline);
  await fs.writeFile('reports/fixes.json', JSON.stringify(fixes, null, 2));
  console.log(`   -> ${fixes.length} fixes proposed`);

  console.log('3/6 Applying confidence gate...');
  const approved = fixes.filter(f => f.confidence !== 'low');
  const heldForReview = fixes.filter(f => f.confidence === 'low');
  console.log(`   -> ${approved.length} auto-applied, ${heldForReview.length} held for human review`);
  if (heldForReview.length) {
    await fs.writeFile('reports/held-for-review.json', JSON.stringify(heldForReview, null, 2));
    console.log('   -> See reports/held-for-review.json — Role 6 should review before the demo.');
  }

  console.log('4/6 Applying approved fixes to a clean copy...');
  await applyFixes(approved);

  console.log('5/6 Re-scanning fixed copy...');
  const after = await runVerify();
  await writeAfter(after);
  console.log(`   -> ${after.length} violations remain`);

  console.log('6/6 Writing report...');
  const summary = buildSummary(baseline, after, fixes);
  await fs.writeFile('reports/summary.json', JSON.stringify(summary, null, 2));
  const prDescription = buildPrDescription(summary);
  await fs.writeFile('reports/pr-description.md', prDescription);

  console.log('\nDone.');
  console.log(`Fixed ${summary.totalFixed} of ${summary.totalBefore} violations.`);
  console.log('Open dashboard.html to view the results, or check reports/ directly.');
}

main().catch(err => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
