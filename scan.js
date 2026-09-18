// scan.js
// Owner: Role 2 — Scanner & Triage Engineer
//
// Job: call pa11y + axe-core programmatically against a URL, merge and
// dedupe their results, tag each violation with a category, and write
// reports/baseline.json.
//
// Expected output shape per violation:
// {
//   rule: string,          // e.g. "image-alt", "color-contrast"
//   category: "alt-text" | "contrast" | "labels" | "heading-order" | "keyboard-focus",
//   element: string,       // selector or HTML snippet identifying the element
//   severity: string,      // whatever the scanner reports, e.g. "error" | "warning"
//   source: string         // "pa11y" | "axe" | "both"
// }

import fs from 'fs/promises';
import 'dotenv/config';

const TARGET_URL = process.env.TARGET_SITE_URL || 'http://localhost:8000';

function categorize(rule) {
  // TODO: Role 2 — map real pa11y/axe rule ids to our five categories.
  // This is a rough starting point, expand as you see real rule names.
  const map = {
    'image-alt': 'alt-text',
    'color-contrast': 'contrast',
    label: 'labels',
    'heading-order': 'heading-order',
    'focus-order-semantics': 'keyboard-focus'
  };
  return map[rule] || 'uncategorized';
}

export async function runScan(url = TARGET_URL) {
  // TODO: Role 2 — replace this stub with real pa11y + axe-core calls.
  //
  // e.g.
  // import pa11y from 'pa11y';
  // const pa11yResults = await pa11y(url);
  //
  // For axe-core you'll likely want to run it inside a headless browser
  // (puppeteer/playwright) since axe-core itself runs in-page.

  console.log(`[scan.js] STUB: would scan ${url} here`);

  const violations = [
    // Remove this once real scanning is wired up.
    {
      rule: 'image-alt',
      category: categorize('image-alt'),
      element: '<img src="hero.jpg">',
      severity: 'error',
      source: 'stub'
    }
  ];

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
