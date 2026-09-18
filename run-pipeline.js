// run-pipeline.js
// Owner: Role 5 — Pipeline Orchestration & Reporting
//
// The orchestrator. ONE command runs the whole thing:
//
//   node run-pipeline.js                                # scans A11yGoat (default)
//   node run-pipeline.js --url http://localhost:8001/   # any target
//   node run-pipeline.js --mock                         # force placeholder fixes
//   node run-pipeline.js --real                         # force real LLM fixers
//
// Flow:  receive site  ->  scan (find + categorize)  ->  fix  ->  gate  ->
//        apply (write fixed HTML)  ->  serve + verify  ->  report
//
// Design decisions (locked with the team):
//  - Fixed copy is served automatically on :8002 for the verify re-scan,
//    then torn down. Fully hands-free.
//  - Target site comes in as --url / TARGET_SITE_URL, default A11yGoat.
//  - Confidence gate is NON-BLOCKING: high/medium auto-apply, low is written
//    to reports/held-for-review.json for Role 6 and the run keeps going.
//  - Fixer + apply may not be finished (Role 3/4). Those stages are wrapped
//    so an unfinished/failing stage degrades gracefully instead of killing
//    the whole demo. When no valid ANTHROPIC_API_KEY is present we fall back
//    to fixer-mock.js so the pipeline still runs end-to-end.

import fs from 'fs/promises';
import { spawn } from 'child_process';
import { runScan, writeBaseline } from './scan.js';
import { runFixer } from './fixer.js';
import { runMockFixer } from './fixer-mock.js';
import { runOpenRouterFixer, runHybridFixer } from './fixer-openrouter.js';
import { fixWithRules } from './fixer-rules.js';
import { hasOpenRouterKey } from './openrouter.js';
import { applyFixes } from './apply-fixes.js';
import { runVerify, writeAfter } from './verify.js';
import { buildSummary, buildPrDescription, buildFixDiff } from './report.js';
import 'dotenv/config';

// ---------------------------------------------------------------------------
// Config / CLI args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { url: undefined, siteDir: undefined, mock: false, real: false, openrouter: false, hybrid: false, rules: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') args.url = argv[++i];
    else if (a.startsWith('--url=')) args.url = a.slice('--url='.length);
    else if (a === '--site-dir') args.siteDir = argv[++i];
    else if (a.startsWith('--site-dir=')) args.siteDir = a.slice('--site-dir='.length);
    else if (a === '--mock') args.mock = true;
    else if (a === '--real') args.real = true;
    else if (a === '--openrouter') args.openrouter = true;
    else if (a === '--hybrid' || a === '--ai') args.hybrid = true;
    else if (a === '--rules') args.rules = true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const TARGET_URL =
  args.url || process.env.TARGET_SITE_URL || 'http://localhost:8000/A11yGoat/';

// SITE_DIR is the folder on disk that the target URL's server is serving from.
// It MUST line up with the target URL or verify compares two different things:
//   python3 -m http.server 8001   (run inside target-site/bada11y)
//     -> TARGET_URL http://localhost:8001/   + SITE_DIR target-site/bada11y
//   python3 -m http.server 8000   (run inside target-site)
//     -> TARGET_URL http://localhost:8000/A11yGoat/ + SITE_DIR target-site
const SITE_DIR = args.siteDir || process.env.SITE_DIR || 'target-site/bada11y';

const FIXED_DIR = 'target-site-fixed';
const FIXED_PORT = 8002;

// The verify server serves FIXED_DIR at :8002 root. To re-scan the SAME page
// we scanned, reuse the target URL's path under the new host:port. e.g.
// http://localhost:8000/A11yGoat/  ->  http://localhost:8002/A11yGoat/
function deriveFixedUrl(targetUrl, port) {
  try {
    const u = new URL(targetUrl);
    return `http://localhost:${port}${u.pathname}`;
  } catch {
    return `http://localhost:${port}/`;
  }
}
const FIXED_URL = process.env.FIXED_SITE_URL || deriveFixedUrl(TARGET_URL, FIXED_PORT);

// Choose the fixer.
//   (default)    -> HYBRID when an OpenRouter key is present, else RULES.
//   --hybrid/--ai-> fixer-rules.js for every fix, then OpenRouter upgrades the
//                   ALT-TEXT quality. Deterministic backbone (guaranteed real
//                   before/after) + human-quality image descriptions.
//   --rules      -> fixer-rules.js only: deterministic WCAG fixes, no API key.
//   --openrouter -> full AI: one OpenRouter call per violation (slow on big
//                   sites, subject to rate limits).
//   --real       -> teammates' Anthropic-SDK fixers (fixer-structural/content)
//   --mock       -> placeholder fixes (fixer-mock), fixes nothing on purpose
function pickFixerMode() {
  if (args.rules) return 'rules';
  if (args.real) return 'real';
  if (args.mock) return 'mock';
  if (args.openrouter) return 'openrouter';
  if (args.hybrid) return 'hybrid';
  return hasOpenRouterKey() ? 'hybrid' : 'rules';
}
const FIXER_MODE = pickFixerMode();

const FIXER_LABEL = {
  hybrid: 'HYBRID (deterministic rules + OpenRouter alt-text quality)',
  rules: 'RULES (deterministic WCAG fixes, no API key needed)',
  real: 'REAL (teammates\u2019 Anthropic fixers)',
  openrouter: 'OPENROUTER (real AI, one call per violation)',
  mock: 'MOCK (placeholder fixes \u2014 fixes nothing, for testing the plumbing)'
};

async function runSelectedFixer(baseline) {
  if (FIXER_MODE === 'rules') return fixWithRules(baseline, { siteDir: SITE_DIR });
  if (FIXER_MODE === 'hybrid') {
    if (!hasOpenRouterKey()) return fixWithRules(baseline, { siteDir: SITE_DIR });
    return runHybridFixer(baseline, { siteDir: SITE_DIR });
  }
  if (FIXER_MODE === 'real') return runFixer(baseline);
  if (FIXER_MODE === 'openrouter') {
    if (!hasOpenRouterKey()) throw new Error('OPENROUTER_API_KEY is not set');
    return runOpenRouterFixer(baseline);
  }
  return runMockFixer(baseline);
}

// ---------------------------------------------------------------------------
// Verify-server helpers (auto-serve :8002, wait, tear down)
// ---------------------------------------------------------------------------
async function waitForServer(url, { tries = 40, delayMs = 250 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok || res.status < 500) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

async function withFixedServer(fn) {
  // Serve the fixed copy on :8002 using Python's stdlib http.server (already
  // how Role 1 serves the static site — no extra npm package needed).
  const server = spawn('python3', ['-m', 'http.server', String(FIXED_PORT)], {
    cwd: FIXED_DIR,
    stdio: 'ignore'
  });

  try {
    const ready = await waitForServer(`http://localhost:${FIXED_PORT}/`);
    if (!ready) {
      throw new Error(`Verify server never became ready on :${FIXED_PORT}`);
    }
    return await fn();
  } finally {
    server.kill('SIGTERM');
  }
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------
async function main() {
  await fs.mkdir('reports', { recursive: true });

  console.log('Accessibility Fixer — full pipeline');
  console.log(`  target site : ${TARGET_URL}`);
  console.log(`  site files  : ${SITE_DIR}`);
  console.log(`  fixer mode  : ${FIXER_LABEL[FIXER_MODE]}`);
  console.log(`  verify url  : ${FIXED_URL}`);
  console.log('');

  // 1/6 — Receive site + scan (find + categorize).
  console.log('1/6 Scanning baseline (find + categorize)...');
  const baseline = await runScan(TARGET_URL);
  await writeBaseline(baseline);
  console.log(`   -> ${baseline.length} violations found and categorized`);

  // 2/6 — Fix. Real fixers if available, else mock. Never fatal.
  console.log('2/6 Running fixer agent...');
  let fixes = [];
  try {
    fixes = await runSelectedFixer(baseline);
  } catch (err) {
    console.warn(`   !! fixer stage failed (${err.message}); falling back to mock fixes`);
    fixes = await runMockFixer(baseline);
  }
  await fs.writeFile('reports/fixes.json', JSON.stringify(fixes, null, 2));
  console.log(`   -> ${fixes.length} fixes proposed`);

  // 3/6 — Confidence gate (NON-BLOCKING).
  console.log('3/6 Applying confidence gate...');
  const approved = fixes.filter((f) => f.confidence !== 'low');
  const heldForReview = fixes.filter((f) => f.confidence === 'low');
  await fs.writeFile('reports/held-for-review.json', JSON.stringify(heldForReview, null, 2));
  console.log(`   -> ${approved.length} auto-applied, ${heldForReview.length} held for human review`);
  if (heldForReview.length) {
    console.log('   -> Role 6: review reports/held-for-review.json before the demo.');
  }

  // 4/6 — Apply approved fixes to a clean copy (writes target-site-fixed/).
  console.log('4/6 Applying approved fixes to a clean copy...');
  let applyStats = null;
  try {
    applyStats = await applyFixes(approved, SITE_DIR, FIXED_DIR);
  } catch (err) {
    console.warn(`   !! apply stage incomplete (${err.message}); verify will re-scan the copied site as-is`);
  }

  // 5/6 — Serve fixed copy + verify (re-scan).
  console.log('5/6 Serving fixed copy on :8002 and re-scanning...');
  let after = baseline; // safe default if verify can't run
  try {
    after = await withFixedServer(async () => {
      // Guard the #1 way a before/after comparison lies: the verify URL must
      // actually resolve to the fixed PAGE, not a directory listing or a 404.
      const probe = await fetch(FIXED_URL).catch(() => null);
      if (!probe || !probe.ok) {
        throw new Error(
          `${FIXED_URL} did not respond OK. SITE_DIR (${SITE_DIR}) probably does not ` +
          `match the target URL's server root — pass --site-dir or set FIXED_SITE_URL.`
        );
      }
      return runVerify(FIXED_URL);
    });
    await writeAfter(after);
    console.log(`   -> ${after.length} violations remain`);
  } catch (err) {
    console.warn(`   !! verify stage failed (${err.message}); using baseline as 'after' placeholder`);
    await writeAfter(after);
  }

  // 6/6 — Report.
  console.log('6/6 Writing reports...');
  const summary = buildSummary(baseline, after, fixes, {
    target: TARGET_URL,
    siteDir: SITE_DIR,
    fixerMode: FIXER_MODE,
    applied: approved.length,
    held: heldForReview.length,
    apply: applyStats
  });
  await fs.writeFile('reports/summary.json', JSON.stringify(summary, null, 2));

  const fixDiff = buildFixDiff(fixes, approved, heldForReview);
  await fs.writeFile('reports/fix-diff.json', JSON.stringify(fixDiff, null, 2));

  const prDescription = buildPrDescription(summary);
  await fs.writeFile('reports/pr-description.md', prDescription);

  console.log('');
  console.log('Done. Reports written to reports/:');
  console.log('  baseline.json        — all violations found (categorized)');
  console.log('  fixes.json           — every proposed fix');
  console.log('  held-for-review.json — low-confidence fixes for Role 6');
  console.log('  after.json           — violations remaining after fixes');
  console.log('  fix-diff.json        — per-fix before/after detail');
  console.log('  summary.json         — before/after counts by category');
  console.log('  pr-description.md     — ready-to-paste PR text');
  console.log('');
  console.log(`Fixed ${summary.totalFixed} of ${summary.totalBefore} violations.`);
  console.log('View it: serve the project root over http and open dashboard.html');
  console.log('  python3 -m http.server 8080   # then open http://localhost:8080/dashboard.html');
}

main().catch((err) => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
