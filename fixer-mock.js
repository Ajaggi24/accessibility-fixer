// fixer-mock.js
// Owner: Role 5 — SCAFFOLDING ONLY (not a real fixer).
//
// Why this exists:
//   The one-command pipeline (run-pipeline.js) must run end-to-end TODAY,
//   before Role 3 (fixer-structural.js) and Role 4 (fixer-content.js) have
//   finished their real LLM fixers, and even on a machine with no valid
//   ANTHROPIC_API_KEY. This module produces PLACEHOLDER fixes that honor the
//   exact shared fix JSON contract, so apply -> verify -> report all run and
//   the reports/dashboard render with realistic shape.
//
// It is intentionally dumb: one canned fix per category. The moment the real
// fixers are wired and a real API key is present, run-pipeline.js uses those
// instead and this file is bypassed. Do NOT build real fix logic here.
//
// Shared fix JSON contract (must match fixer-structural.js / fixer-content.js):
// {
//   rule, category, element,   // copied from the violation
//   fix: string,                // proposed replacement value/content
//   reasoning: string,          // why the agent chose this fix
//   confidence: "high" | "medium" | "low"
// }

// One canned placeholder per category we target. keyboard-focus is
// deliberately "low" so the confidence gate + human-review path is exercised
// in the demo even in mock mode.
const PLACEHOLDER_BY_CATEGORY = {
  'alt-text':       { fix: 'Descriptive alt text for this image', confidence: 'high' },
  'contrast':       { fix: '#595959', confidence: 'medium' },
  'labels':         { fix: 'aria-label="Descriptive label"', confidence: 'high' },
  'heading-order':  { fix: 'Adjust heading level to preserve document order', confidence: 'medium' },
  'keyboard-focus': { fix: 'tabindex="0"', confidence: 'low' }
};

export async function runMockFixer(violations) {
  return violations
    // Only categories the fixer agents are responsible for. Everything else
    // (region, html-has-lang, etc.) is left untouched, same as the real path.
    .filter((v) => PLACEHOLDER_BY_CATEGORY[v.category])
    .map((v) => {
      const canned = PLACEHOLDER_BY_CATEGORY[v.category];
      return {
        rule: v.rule,
        category: v.category,
        element: v.element,
        fix: canned.fix,
        reasoning: `PLACEHOLDER fix from fixer-mock.js — replace with real Role 3/4 output once their fixers + a valid ANTHROPIC_API_KEY are wired.`,
        confidence: canned.confidence
      };
    });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('fs/promises');
  const baseline = JSON.parse(await fs.readFile('reports/baseline.json', 'utf-8'));
  const fixes = await runMockFixer(baseline);
  console.log(`[fixer-mock.js] Produced ${fixes.length} placeholder fixes`);
  console.log(JSON.stringify(fixes, null, 2));
}
