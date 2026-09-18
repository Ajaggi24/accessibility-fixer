// scan.js
// Owner: Role 2 — Scanner & Triage Engineer
//
// Job: call pa11y + axe-core programmatically against a URL, merge and
// dedupe their results, tag each violation with a category, and write
// reports/baseline.json.
//
// Output shape per violation:
// {
//   rule: string,          // e.g. "image-alt", "color-contrast"
//   category: "alt-text" | "contrast" | "labels" | "landmark" | "heading-order" | "keyboard-focus" | "uncategorized",
//   element: string,       // selector identifying the element
//   snippet: string,       // HTML snippet for context, when available
//   message: string,       // human-readable description of the problem
//   severity: string,      // "error" | "warning" | "notice"
//   source: "pa11y" | "axe" | "both"
// }

import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import pa11y from 'pa11y';
import 'dotenv/config';

const TARGET_URL = process.env.TARGET_SITE_URL || 'http://localhost:8000/A11yGoat/';

// Puppeteer's own auto-downloaded Chrome build didn't run cleanly in this
// environment; fall back to the system Google Chrome install if present.
// Override with PUPPETEER_EXECUTABLE_PATH in .env if your machine differs.
const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);

async function findChromePath() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  return undefined; // let puppeteer use its own default
}

// Rough rule-id -> our-category map. axe-core and pa11y (which itself wraps
// HTML_CodeSniffer or axe rulesets) use slightly different rule ids, so we
// match on substrings to keep this resilient.
//
// UPDATED: the original pattern list only covered generic/textbook rule
// names (image-alt, color-contrast, etc). Our real A11yGoat scan came back
// with 11 of 12 violations landing in "uncategorized" because axe-core's
// actual rule ids for this site (aria-required-children, html-has-lang,
// link-in-text-block, region) weren't matched by anything below. Added
// explicit patterns for all of them, mapped to the closest-fit category.
const CATEGORY_PATTERNS = [
  // axe-core ids, plus HTML_CodeSniffer (pa11y) technique ids for the same failures.
  { category: 'alt-text', patterns: ['image-alt', 'img-alt', 'alt-text', 'area-alt', 'input-image-alt', 'role-img-alt', 'object-alt', '.h37', '1_1_1.1.1.1.h37'] },

  { category: 'contrast', patterns: [
    'color-contrast', 'contrast', '.g18', '.g145', '1_4_3.g18', '1_4_3.g145',
    // Visual-distinguishability issues that aren't literal color-contrast
    // checks but are the same underlying problem (relying on color alone).
    'link-in-text-block'
  ] },

  { category: 'labels', patterns: [
    'label', 'aria-label', 'form-field-multiple-labels', 'select-name', 'button-name', 'link-name', '.h91', '.f68', '4_1_2.h91', '1_3_1.f68',
    // ARIA name/role/value and document-language issues — both fall under
    // WCAG 4.1.2 (Name, Role, Value) in spirit, closest fit to "labels".
    'aria-required-children', 'aria-required-parent', 'html-has-lang', 'lang',
    // Covers aria-input-field-name and pa11y's standalone H57.2 variant of
    // the same html-lang failure (appears alone when dedupe doesn't merge
    // it with axe's html-has-lang on the same run).
    'aria-input-field-name', 'h57'
  ] },

  // UPDATED: previously "region"/"landmark" violations were folded into
  // heading-order. The model kept reading the field name and "fixing"
  // literal h1-h6 levels instead of wrapping content in landmarks — a
  // real bug caught by checking its output. Split into an honest,
  // separate category so the field name can't mislead the fixer prompt.
  { category: 'landmark', patterns: ['region', 'landmark', 'bypass'] },

  { category: 'heading-order', patterns: [
    'heading-order', 'empty-heading', 'page-has-heading', 'p-as-heading'
  ] },

  { category: 'keyboard-focus', patterns: ['tabindex', 'focus-order', 'focusable', 'keyboard', 'accesskeys'] }
];

function categorize(ruleId = '') {
  const id = ruleId.toLowerCase();
  for (const { category, patterns } of CATEGORY_PATTERNS) {
    if (patterns.some((p) => id.includes(p))) return category;
  }
  return 'uncategorized';
}

// axe attaches machine-readable evidence to each check result (`any`/`all`/
// `none`). For color-contrast that is the gold we need to compute a REAL fix:
// { fgColor, bgColor, contrastRatio, expectedContrastRatio, fontSize, fontWeight }.
// Without this the fixer can only guess a color. Pull the first non-empty
// data blob off the node and carry it through as violation.data.
function extractCheckData(node) {
  for (const group of [node.any, node.all, node.none]) {
    for (const check of group || []) {
      if (check?.data && typeof check.data === 'object') return check.data;
    }
  }
  return null;
}

// Normalize a raw axe-core violation (which nests multiple `nodes`) into one
// flat record per affected element.
function normalizeAxeResults(axeResults) {
  const out = [];
  for (const violation of axeResults.violations || []) {
    for (const node of violation.nodes || []) {
      out.push({
        rule: violation.id,
        category: categorize(violation.id),
        element: node.target?.join(' ') || '',
        snippet: node.html || '',
        message: violation.help || violation.description || '',
        severity: violation.impact || 'unknown',
        source: 'axe',
        data: extractCheckData(node)
      });
    }
  }
  return out;
}

// Normalize raw pa11y issues into the same flat shape.
function normalizePa11yResults(pa11yResults) {
  return (pa11yResults.issues || []).map((issue) => ({
    rule: issue.code || 'unknown',
    category: categorize(issue.code || ''),
    element: issue.selector || '',
    snippet: issue.context || '',
    message: issue.message || '',
    severity: issue.type || 'unknown', // pa11y: error | warning | notice
    source: 'pa11y'
  }));
}

// Two violations are "the same" if they point at the same element AND land
// in the same category (rule ids differ between scanners, e.g. axe's
// "image-alt" vs pa11y/HTML_CS's "1_1_1.1.1.1.H37", but the category map
// normalizes that). When both scanners flag it, keep one record tagged
// source: "both" and prefer axe's richer message/snippet.
function mergeAndDedupe(axeViolations, pa11yViolations) {
  const merged = new Map();
  const keyFor = (v) => `${v.category}::${v.element}`;

  for (const v of axeViolations) {
    merged.set(keyFor(v), { ...v });
  }

  for (const v of pa11yViolations) {
    const key = keyFor(v);
    if (merged.has(key)) {
      const existing = merged.get(key);
      existing.source = 'both';
      // keep axe's message/snippet (already there), but merge rule ids so
      // downstream triage can see both scanners' rule codes.
      existing.rule = existing.rule.includes(v.rule) ? existing.rule : `${existing.rule} | ${v.rule}`;
    } else {
      merged.set(key, { ...v });
    }
  }

  return [...merged.values()];
}

async function runAxeScan(url, executablePath) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const axeSource = await fs.readFile(
      path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js'),
      'utf8'
    );
    await page.evaluate(axeSource);
    const axeResults = await page.evaluate(async () => {
      // eslint-disable-next-line no-undef
      return await axe.run();
    });
    return normalizeAxeResults(axeResults);
  } finally {
    await browser.close();
  }
}

async function runPa11yScan(url, executablePath) {
  const results = await pa11y(url, {
    chromeLaunchConfig: { executablePath }
  });
  return normalizePa11yResults(results);
}

export async function runScan(url = TARGET_URL) {
  const executablePath = await findChromePath();

  console.log(`[scan.js] Scanning ${url} with axe-core + pa11y...`);
  const [axeViolations, pa11yViolations] = await Promise.all([
    runAxeScan(url, executablePath),
    runPa11yScan(url, executablePath)
  ]);

  console.log(`[scan.js] axe found ${axeViolations.length} issues, pa11y found ${pa11yViolations.length} issues`);

  const violations = mergeAndDedupe(axeViolations, pa11yViolations);
  console.log(`[scan.js] ${violations.length} after merge/dedupe`);

  const uncategorizedCount = violations.filter(v => v.category === 'uncategorized').length;
  if (uncategorizedCount > 0) {
    console.warn(`[scan.js] WARNING: ${uncategorizedCount} violation(s) still uncategorized — check CATEGORY_PATTERNS for missing rule ids:`);
    violations.filter(v => v.category === 'uncategorized').forEach(v => console.warn(`  - ${v.rule}`));
  }

  return violations;
}

export async function writeBaseline(violations) {
  await fs.mkdir('reports', { recursive: true });
  await fs.writeFile(
    'reports/baseline.json',
    JSON.stringify(violations, null, 2)
  );
}

// Allow running this file directly: `node scan.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  const violations = await runScan();
  await writeBaseline(violations);
  console.log(`[scan.js] Wrote ${violations.length} violations to reports/baseline.json`);
}