// fixer-openrouter.js
// Owner: Role 5 — INTERIM real fixer.
//
// A real (non-placeholder) fixer that calls OpenRouter, so the pipeline
// produces genuine AI-generated fixes today — before Role 3's
// fixer-structural.js and Role 4's fixer-content.js are finished, and without
// needing an Anthropic key (the team is using OpenRouter instead).
//
// It targets the same 5 categories and returns the exact shared fix JSON
// contract, so apply / verify / report treat its output identically to the
// eventual real fixers. When Role 3/4 land theirs, run with --real to use
// those instead; this file can then be retired.
//
// Contract returned per fix:
// { rule, category, element, fix, reasoning, confidence: "high"|"medium"|"low" }

import { chatJSON, openRouterModel } from './openrouter.js';
import { fixWithRules } from './fixer-rules.js';
import 'dotenv/config';

const TARGET_CATEGORIES = ['alt-text', 'contrast', 'labels', 'heading-order', 'keyboard-focus'];

// One tailored instruction per category. Kept close to what Role 3/4 planned.
function promptFor(v) {
  const common = `Accessibility violation detected by an automated scanner.
- rule: ${v.rule}
- category: ${v.category}
- element selector: ${v.element}
- HTML snippet: ${v.snippet || '(none captured)'}
- scanner message: ${v.message || '(none)'}
`;

  const perCategory = {
    'alt-text':
      `Write a specific, accurate alt text describing what this image most likely shows in context. Never use generic words like "image", "photo", or "picture". The "fix" is the alt text string only.`,
    contrast:
      `Propose a replacement text color (hex) that keeps the design's intent but meets WCAG AA contrast (4.5:1 normal text, 3:1 large text) against its background. The "fix" is the hex color only, e.g. "#595959".`,
    labels:
      `Propose an accessible name for this control. Prefer a matching <label>, else an aria-label. The "fix" is the exact attribute/markup to add, e.g. 'aria-label="Search"'.`,
    'heading-order':
      `The heading level breaks document order. Propose the correct heading tag/level to use. The "fix" is the corrected tag, e.g. "<h2>".`,
    'keyboard-focus':
      `This element has a keyboard/focus problem. Propose the minimal correct change (e.g. remove a positive tabindex, add tabindex="0", or add a visible focus style). The "fix" is the concrete change.`
  };

  return `${common}
${perCategory[v.category] || 'Propose the smallest correct fix for this violation.'}

Set "confidence":
- "high"  = one clearly-correct answer.
- "medium"= reasonable but context-dependent.
- "low"   = a real judgment call a human should approve.

Return ONLY a single JSON object, no prose, no code fences:
{"fix": "...", "reasoning": "one short sentence", "confidence": "high"|"medium"|"low"}`;
}

const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);

// Small delay between requests to respect new-account rate limits (default 20
// req/min on OpenRouter). Tune with OPENROUTER_REQUEST_DELAY_MS. The chat()
// helper also retries on 429, so bursts recover automatically.
const REQUEST_DELAY_MS = Number(process.env.OPENROUTER_REQUEST_DELAY_MS || 1500);

export async function runOpenRouterFixer(violations) {
  const targets = violations.filter((v) => TARGET_CATEGORIES.includes(v.category));
  console.log(`[fixer-openrouter.js] Model ${openRouterModel()} — fixing ${targets.length} violations`);

  const fixes = [];
  for (const v of targets) {
    try {
      const parsed = await chatJSON(promptFor(v), { maxTokens: 300 });
      const confidence = VALID_CONFIDENCE.has(parsed.confidence) ? parsed.confidence : 'low';
      fixes.push({
        rule: v.rule,
        category: v.category,
        element: v.element,
        fix: String(parsed.fix ?? '').trim(),
        reasoning: String(parsed.reasoning ?? '').trim(),
        confidence
      });
    } catch (err) {
      // One bad element must not sink the run — skip it and keep going.
      console.warn(`[fixer-openrouter.js] skipped ${v.rule} on ${v.element}: ${err.message}`);
    }
    if (REQUEST_DELAY_MS > 0) await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }

  console.log(`[fixer-openrouter.js] Produced ${fixes.length} real fixes`);
  return fixes;
}

// ---------------------------------------------------------------------------
// Hybrid fixer: deterministic rules for everything, then upgrade ALT TEXT
// quality with the LLM. Rationale (from fixer-rules.js's own note): the rules
// fixer guarantees a real before/after by reusing text already on the page,
// but the single thing an LLM adds most value on is writing genuinely
// descriptive alt text. So we only spend API calls on alt-text — a handful of
// requests, well under rate limits — and keep every other deterministic win.
// If the API fails or is rate-limited, we keep the rules-derived alt text.
// ---------------------------------------------------------------------------
function altPrompt(fix) {
  return `An image on a web page is missing good alt text.
- element: ${fix.element}
- HTML snippet: ${fix.snippet || '(none)'}
- a rules-based tool's best guess (from nearby text/filename): ${fix.apply?.value || '(none)'}

Write a concise, specific alt text (max ~120 chars) describing what the image most likely shows in this context. Do NOT start with "image", "photo", or "picture".

Return ONLY JSON: {"alt": "your alt text"}`;
}

export async function runHybridFixer(violations, { siteDir = 'target-site' } = {}) {
  const fixes = await fixWithRules(violations, { siteDir });
  const altFixes = fixes.filter((f) => f.category === 'alt-text' && f.apply?.attr === 'alt');
  console.log(`[fixer-openrouter.js] hybrid: refining ${altFixes.length} alt-text fixes with ${openRouterModel()}`);

  for (const f of altFixes) {
    try {
      const parsed = await chatJSON(altPrompt(f), { maxTokens: 150 });
      const alt = String(parsed.alt ?? parsed.fix ?? '').trim();
      if (alt) {
        f.fix = `alt="${alt}"`;
        f.apply.value = alt;
        f.reasoning = `${f.reasoning} (Alt text refined by ${openRouterModel()} for a more descriptive, human-quality description.)`;
      }
    } catch (err) {
      console.warn(`[fixer-openrouter.js] alt refine skipped for ${f.element}: ${err.message} — keeping rules-based alt`);
    }
    if (REQUEST_DELAY_MS > 0) await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }

  return fixes;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('fs/promises');
  const baseline = JSON.parse(await fs.readFile('reports/baseline.json', 'utf-8'));
  const fixes = await runOpenRouterFixer(baseline);
  console.log(JSON.stringify(fixes.slice(0, 5), null, 2));
}
