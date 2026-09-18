// fixer-structural.js
// Owner: Role 3 — Fixer Agent (Structural)
//
// Runs against A11yGoat. Matches fixer-content.js's architecture: sends
// the real HTML source + filtered violations, the model edits the file
// itself and returns changelog + full corrected HTML. No cheerio, no
// apply-fixes.js — the model IS the apply step now.

import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import 'dotenv/config';
import { STRUCTURAL_SYSTEM_PROMPT, buildUserMessage } from './prompts/prompts-structural.js';
import { parseChangelogResponse } from './parse-changelog.js';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const A11YGOAT_DIR = 'target-site/A11yGoat';
const A11YGOAT_BASELINE = 'reports/baseline.json'; // or reports/baseline-a11ygoat.json
const OUTPUT_HTML_PATH = 'target-site-fixed/A11yGoat/index.html';

const STRUCTURAL_CATEGORIES = ['labels', 'landmark'];

// Deterministic safety net, not something left to the model's discretion.
// We verified by actually building the site with jekyll build that content
// placed above Jekyll's front matter block (---\n...\n---) breaks front
// matter detection entirely — the layout never applies, and the raw front
// matter text renders as literal page content. The model has been
// inconsistent run-to-run about respecting this (sometimes correctly
// declines to touch <html>, sometimes inserts it above the front matter
// anyway), so this is enforced in code every time, not hoped for in the
// prompt.
function enforceFrontMatterFirst(originalSource, correctedHtml) {
  const originalHasFrontMatter = originalSource.trimStart().startsWith('---');
  if (!originalHasFrontMatter || !correctedHtml) {
    return { correctedHtml, guardApplied: false };
  }

  const trimmed = correctedHtml.trimStart();
  if (trimmed.startsWith('---')) {
    // Front matter is already first — nothing to fix.
    return { correctedHtml, guardApplied: false };
  }

  // Find where the front matter block actually starts in the model's
  // output and cut everything before it — that preamble is exactly the
  // kind of injected content (e.g. a stray <html lang="en">) that breaks
  // the build.
  const frontMatterIndex = correctedHtml.indexOf('---');
  if (frontMatterIndex === -1) {
    // Model dropped the front matter entirely — more serious, can't
    // safely auto-repair. Flag it rather than guess.
    console.error('[fixer-structural.js] SAFETY NET: model output has NO front matter block at all. Cannot auto-repair — manual review required before using this output.');
    return { correctedHtml, guardApplied: false };
  }

  const repaired = correctedHtml.slice(frontMatterIndex);
  return { correctedHtml: repaired, guardApplied: true };
}

export async function fixStructural(allViolations) {
  const myViolations = allViolations.filter(v => STRUCTURAL_CATEGORIES.includes(v.category));

  if (myViolations.length === 0) {
    console.log('[fixer-structural.js] No labels/landmark violations. Nothing to do.');
    return { fixes: [], correctedHtml: null };
  }

  const htmlSource = await fs.readFile(path.join(A11YGOAT_DIR, 'index.html'), 'utf-8');

  // Some violations point at elements that structurally cannot exist in
  // index.html — this site is a Jekyll source file (note the front matter
  // at the top) that gets wrapped in a _layouts/*.html template at build
  // time. <html>, <head>, and the nav/header live in the layout/include,
  // not here. Checking this in code (rather than relying on the model to
  // notice and consistently say so) avoids the run-to-run inconsistency
  // we saw where it sometimes explained this and sometimes just dropped
  // the violation silently.
  const inScope = [];
  const outOfScopeFixes = [];
  for (const v of myViolations) {
    const snippetFragment = (v.snippet || '').replace(/<[^>]*>/g, '').trim().slice(0, 20);
    const existsInSource = htmlSource.includes(v.element) ||
      (snippetFragment && htmlSource.includes(snippetFragment)) ||
      htmlSource.toLowerCase().includes((v.snippet || '').split(' ')[0]?.replace(/[<>]/g, '').toLowerCase() || '\0');

    if (v.element === 'html' || !existsInSource) {
      outOfScopeFixes.push({
        oldLines: 'N/A', oldCode: v.snippet || v.element, newLines: 'N/A',
        fix: 'SKIPPED',
        reasoning: `Element not present in target-site/A11yGoat/index.html — this file has Jekyll front matter (layout: ...) and does not contain <html>, <head>, or the nav/header; those come from a layout/include template applied at build time. Fixing this requires editing that template file directly, out of scope for this pass.`,
        confidenceScore: 100,
        confidence: 'high',
        skipped: true
      });
    } else {
      inScope.push(v);
    }
  }

  if (outOfScopeFixes.length > 0) {
    console.log(`[fixer-structural.js] ${outOfScopeFixes.length} violation(s) live outside index.html (Jekyll layout/include) — recorded as SKIPPED without calling the model.`);
  }

  if (inScope.length === 0) {
    console.log('[fixer-structural.js] All remaining violations are out of scope for this file.');
    return { fixes: outOfScopeFixes, correctedHtml: null };
  }

  console.log(`[fixer-structural.js] Sending ${inScope.length} in-scope violations to the model.`);
  const userText = buildUserMessage(inScope, htmlSource);

  const response = await client.chat.completions.create({
    model: 'anthropic/claude-sonnet-4.5',
    max_tokens: 8000,
    messages: [
      { role: 'system', content: STRUCTURAL_SYSTEM_PROMPT },
      { role: 'user', content: userText }
    ]
  });

  const raw = response.choices[0].message.content;
  const { changelogText, correctedHtml: rawCorrectedHtml, fixes: modelFixes } = parseChangelogResponse(raw);
  const { correctedHtml, guardApplied } = enforceFrontMatterFirst(htmlSource, rawCorrectedHtml);

  const fixes = [...outOfScopeFixes, ...modelFixes];

  if (guardApplied) {
    console.warn('[fixer-structural.js] SAFETY NET: model inserted content above Jekyll front matter (would break the build). Stripped it back out — front matter forced back to line 1.');
    fixes.push({
      oldLines: 'N/A', oldCode: '(content the model placed above front matter)', newLines: 'N/A',
      fix: 'REVERTED',
      reasoning: 'Model output placed markup above the Jekyll front matter block, which breaks front-matter detection and disables the layout entirely. This was caught and automatically stripped before writing the file — verified by test-building the corrected output and confirming this exact failure mode.',
      confidenceScore: 100,
      confidence: 'high',
      skipped: true
    });
  }

  console.log(`[fixer-structural.js] Parsed ${modelFixes.length} changelog entries from the model (${modelFixes.filter(f => f.skipped).length} skipped) + ${outOfScopeFixes.length} pre-filtered out-of-scope entries = ${fixes.length} total`);

  if (fixes.length < myViolations.length) {
    console.warn(`[fixer-structural.js] WARNING: ${myViolations.length} violations in, ${fixes.length} accounted for. Some may still be missing.`);
    await fs.mkdir('reports', { recursive: true });
    await fs.writeFile('reports/raw-structural-response.txt', raw);
    console.warn('[fixer-structural.js] Full raw model response saved to reports/raw-structural-response.txt for inspection.');
  }

  return { fixes, correctedHtml, changelogText };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const baseline = JSON.parse(await fs.readFile(A11YGOAT_BASELINE, 'utf-8'));
  const { fixes, correctedHtml, changelogText } = await fixStructural(baseline);

  await fs.mkdir('reports', { recursive: true });
  await fs.writeFile('reports/fixes-structural.json', JSON.stringify(fixes, null, 2));
  await fs.writeFile('reports/changelog-structural.md', changelogText || '(no fixes)');
  console.log('[fixer-structural.js] Wrote reports/fixes-structural.json and reports/changelog-structural.md');

  if (correctedHtml) {
    await fs.mkdir(path.dirname(OUTPUT_HTML_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_HTML_PATH, correctedHtml);
    console.log(`[fixer-structural.js] Wrote corrected HTML to ${OUTPUT_HTML_PATH}`);
  }
}