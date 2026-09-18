// fixer-structural.js
// Owner: Role 3 — Fixer Agent (Structural)
//
// Handles the rule-based fixes: heading order, missing form labels,
// ARIA roles, keyboard/tab order. These mostly have one correct answer,
// so the LLM call here is lighter-weight than the content fixer's.
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

const STRUCTURAL_CATEGORIES = ['labels', 'heading-order', 'keyboard-focus'];

export async function fixStructural(violations) {
  const structuralViolations = violations.filter(v =>
    STRUCTURAL_CATEGORIES.includes(v.category)
  );

  const fixes = [];
  for (const violation of structuralViolations) {
    // TODO: Role 3 — tune this prompt per category. Heading order, labels,
    // and keyboard focus likely need different instructions.
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Accessibility violation: ${violation.rule} (${violation.category})
Element: ${violation.element}

Return ONLY valid JSON, no other text:
{"fix": "the corrected value or markup", "reasoning": "brief reason", "confidence": "high" | "medium" | "low"}`
        }
      ]
    });

    let parsed;
    try {
      parsed = JSON.parse(response.content[0].text);
    } catch (err) {
      console.error(`[fixer-structural.js] Failed to parse LLM response for ${violation.rule}:`, err);
      continue;
    }

    fixes.push({ ...violation, ...parsed });
  }

  return fixes;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('fs/promises');
  const baseline = JSON.parse(await fs.readFile('reports/baseline.json', 'utf-8'));
  const fixes = await fixStructural(baseline);
  console.log(`[fixer-structural.js] Produced ${fixes.length} fixes`);
  console.log(JSON.stringify(fixes, null, 2));
}
