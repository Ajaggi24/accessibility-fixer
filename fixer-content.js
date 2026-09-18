// fixer-content.js
// Owner: Role 4 — Fixer Agent (Content / Judgment)
//
// Handles the judgment-call fixes: alt text and color contrast. This is
// the harder fixer role — there's no single correct answer, so prompt
// quality and evaluation matter a lot more here than in fixer-structural.js.
//
// Every fix MUST return this shape (agreed team-wide contract):
// {
//   rule, category, element,   // copied over from the violation
//   fix: string,                // the proposed replacement value/content
//   reasoning: string,          // why the agent chose this fix
//   confidence: "high" | "medium" | "low"
// }

import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const CONTENT_CATEGORIES = ['alt-text', 'contrast'];

// TODO: Role 4 — real WCAG contrast math. This is a placeholder so the
// pipeline runs end to end before you've built the real thing.
function contrastRatio(fgHex, bgHex) {
  // Replace with a real luminance-based WCAG contrast ratio calculation.
  return 4.5; // stub value
}

export async function fixContent(violations) {
  const contentViolations = violations.filter(v =>
    CONTENT_CATEGORIES.includes(v.category)
  );

  const fixes = [];
  for (const violation of contentViolations) {
    // TODO: Role 4 — for alt-text violations, pass real image context
    // (surrounding text, page section, or the image itself if you wire up
    // vision input) instead of just the bare element string.
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Accessibility violation: ${violation.rule} (${violation.category})
Element: ${violation.element}

If this is alt text: write a specific, accurate description of what the
image shows in context. Never use generic text like "image" or "photo".

If this is a contrast issue: propose a new color that meets WCAG AA
(4.5:1 for normal text, 3:1 for large text).

Return ONLY valid JSON, no other text:
{"fix": "the corrected value", "reasoning": "brief reason", "confidence": "high" | "medium" | "low"}`
        }
      ]
    });

    let parsed;
    try {
      parsed = JSON.parse(response.content[0].text);
    } catch (err) {
      console.error(`[fixer-content.js] Failed to parse LLM response for ${violation.rule}:`, err);
      continue;
    }

    fixes.push({ ...violation, ...parsed });
  }

  return fixes;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('fs/promises');
  const baseline = JSON.parse(await fs.readFile('reports/baseline.json', 'utf-8'));
  const fixes = await fixContent(baseline);
  console.log(`[fixer-content.js] Produced ${fixes.length} fixes`);
  console.log(JSON.stringify(fixes, null, 2));
}
