// apply-fixes.js
// Owner: Role 3 (primary), used by both fixer roles' output
//
// Job: take the merged fixes array and actually edit the HTML in a CLEAN
// copy of target-site/ (never mutate target-site/ itself — the pipeline
// needs to be re-runnable from a clean baseline every time).

import fs from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';

const SOURCE_DIR = 'target-site';
const OUTPUT_DIR = 'target-site-fixed';

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

export async function applyFixes(fixes, sourceDir = SOURCE_DIR, outputDir = OUTPUT_DIR) {
  // Start from a clean copy every run.
  await fs.rm(outputDir, { recursive: true, force: true });
  await copyDir(sourceDir, outputDir);

  // TODO: Role 3 — this assumes a single index.html for simplicity.
  // If target-site/ has multiple pages, loop over them and only apply
  // each fix to the file its `element` selector actually belongs to.
  const indexPath = path.join(outputDir, 'index.html');
  const html = await fs.readFile(indexPath, 'utf-8');
  const $ = cheerio.load(html);

  for (const fix of fixes) {
    // TODO: Role 3 — real selector-based targeting. This stub just logs;
    // replace with real cheerio edits per category, e.g.:
    //   if (fix.category === 'alt-text') { $(selector).attr('alt', fix.fix); }
    console.log(`[apply-fixes.js] STUB: would apply fix for ${fix.rule} (${fix.category})`);
  }

  await fs.writeFile(indexPath, $.html());
  console.log(`[apply-fixes.js] Applied ${fixes.length} fixes, wrote ${outputDir}/`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fixes = JSON.parse(await fs.readFile('reports/fixes.json', 'utf-8'));
  // Only apply high/medium confidence automatically — low confidence
  // should already have been filtered out by run-pipeline.js's gate.
  const approved = fixes.filter(f => f.confidence !== 'low');
  await applyFixes(approved);
}
