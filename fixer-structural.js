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

export async function fixStructural(allViolations) {
  const myViolations = allViolations.filter(v => STRUCTURAL_CATEGORIES.includes(v.category));

  if (myViolations.length === 0) {
    console.log('[fixer-structural.js] No labels/landmark violations. Nothing to do.');
    return { fixes: [], correctedHtml: null };
  }

  console.log(`[fixer-structural.js] Sending ${myViolations.length} violations to the model.`);

  const htmlSource = await fs.readFile(path.join(A11YGOAT_DIR, 'index.html'), 'utf-8');
  const userText = buildUserMessage(myViolations, htmlSource);

  const response = await client.chat.completions.create({
    model: 'anthropic/claude-sonnet-4.5',
    max_tokens: 8000,
    messages: [
      { role: 'system', content: STRUCTURAL_SYSTEM_PROMPT },
      { role: 'user', content: userText }
    ]
  });

  const raw = response.choices[0].message.content;
  const { changelogText, correctedHtml, fixes } = parseChangelogResponse(raw);

  console.log(`[fixer-structural.js] Parsed ${fixes.length} changelog entries (${fixes.filter(f => f.skipped).length} skipped)`);

  if (fixes.length < myViolations.length) {
    console.warn(`[fixer-structural.js] WARNING: sent ${myViolations.length} violations but only got ${fixes.length} changelog entries back. Some violations may have been silently dropped by the model.`);
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