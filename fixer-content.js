// fixer-content.js
// Owner: Role 4 — Fixer Agent (Content / Judgment)
//
// Runs Role 4's WCAG remediation prompt against bada11y (the site that
// actually has real image-alt and color-contrast violations — A11yGoat's
// baseline had none). Sends the real HTML source plus the actual
// referenced images as vision input, so the model can genuinely "look at"
// each image per the prompt's instructions, then parses the two-section
// CHANGELOG + FULL HTML output.
//
// NOTE ON ARCHITECTURE: unlike fixer-structural.js (which returns a small
// JSON array that apply-fixes.js applies via cheerio), this returns a
// complete corrected HTML file directly from the model. That's why this
// file writes target-site-fixed/bada11y/index.html itself rather than
// going through apply-fixes.js. run-pipeline.js needs to call this
// alongside, not instead of, the structural fix + cheerio-apply path for
// A11yGoat — the two sites are fixed independently and can run in
// parallel.

import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import 'dotenv/config';
import { CONTENT_SYSTEM_PROMPT, filterContentViolations, buildUserMessage } from './prompts/prompts-content.js';
import { parseChangelogResponse } from './parse-changelog.js';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const BADA11Y_DIR = 'target-site/bada11y';
const BADA11Y_BASELINE = 'reports/baseline-bada11y.json';
const OUTPUT_HTML_PATH = 'target-site-fixed/bada11y/index.html';

const MIME_TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml'
};

// Pull every unique image src referenced by the filtered alt-text
// violations, so we only read/encode images actually in scope.
function extractImageSrcs(violations) {
  const srcs = new Set();
  for (const v of violations) {
    const match = (v.snippet || '').match(/src="([^"]+)"/i);
    if (match) srcs.add(match[1]);
  }
  return [...srcs];
}

async function loadImageAsDataUrl(srcPath, siteDir) {
  const fullPath = path.join(siteDir, srcPath);
  const ext = path.extname(fullPath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  const buffer = await fs.readFile(fullPath);
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

export async function fixContent(allViolations) {
  const myViolations = filterContentViolations(allViolations);

  if (myViolations.length === 0) {
    console.log('[fixer-content.js] No image-alt / contrast violations in scope. Nothing to do.');
    return { fixes: [], correctedHtml: null };
  }

  const htmlSource = await fs.readFile(path.join(BADA11Y_DIR, 'index.html'), 'utf-8');
  const imageSrcs = extractImageSrcs(myViolations);

  const imageContentBlocks = [];
  for (const src of imageSrcs) {
    try {
      const dataUrl = await loadImageAsDataUrl(src, BADA11Y_DIR);
      imageContentBlocks.push({ type: 'image_url', image_url: { url: dataUrl } });
    } catch (err) {
      console.warn(`[fixer-content.js] Could not load image ${src}:`, err.message);
    }
  }

  const userText = buildUserMessage(myViolations, htmlSource);

  const response = await client.chat.completions.create({
    model: 'anthropic/claude-sonnet-4.5',
    max_tokens: 8000,
    messages: [
      { role: 'system', content: CONTENT_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          ...imageContentBlocks
        ]
      }
    ]
  });

  const raw = response.choices[0].message.content;
  const { changelogText, correctedHtml, fixes } = parseChangelogResponse(raw);

  console.log(`[fixer-content.js] Parsed ${fixes.length} changelog entries (${fixes.filter(f => f.skipped).length} skipped)`);

  return { fixes, correctedHtml, changelogText };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const baseline = JSON.parse(await fs.readFile(BADA11Y_BASELINE, 'utf-8'));
  const { fixes, correctedHtml, changelogText } = await fixContent(baseline);

  await fs.mkdir('reports', { recursive: true });
  await fs.writeFile('reports/fixes-content.json', JSON.stringify(fixes, null, 2));
  await fs.writeFile('reports/changelog-content.md', changelogText || '(no fixes)');
  console.log('[fixer-content.js] Wrote reports/fixes-content.json and reports/changelog-content.md');

  if (correctedHtml) {
    await fs.mkdir(path.dirname(OUTPUT_HTML_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_HTML_PATH, correctedHtml);
    console.log(`[fixer-content.js] Wrote corrected HTML to ${OUTPUT_HTML_PATH}`);
  }
}