// verify.js
// Owner: Role 2 — Scanner & Triage Engineer
//
// Job: re-run the same scan logic against the FIXED copy of the site
// and write reports/after.json, so run-pipeline.js can diff it against
// reports/baseline.json.

import fs from 'fs/promises';
import { runScan } from './scan.js';
import 'dotenv/config';

const FIXED_SITE_URL = process.env.FIXED_SITE_URL || 'http://localhost:8002';

export async function runVerify(url = FIXED_SITE_URL) {
  // TODO: Role 2 — make sure the fixed copy (target-site-fixed/) is being
  // served somewhere before this runs. apply-fixes.js should have already
  // written it; you may need to start a second local server pointed at it.
  const violations = await runScan(url);
  return violations;
}

export async function writeAfter(violations) {
  await fs.mkdir('reports', { recursive: true });
  await fs.writeFile(
    'reports/after.json',
    JSON.stringify(violations, null, 2)
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const violations = await runVerify();
  await writeAfter(violations);
  console.log(`[verify.js] Wrote ${violations.length} remaining violations to reports/after.json`);
}
