// report.js
// Owner: Role 5 — Pipeline Orchestration & Reporting
//
// Job: compare baseline.json vs after.json, produce a category-by-category
// diff, and write a PR description a real maintainer would accept.

import fs from 'fs/promises';

function countByCategory(violations) {
  const counts = {};
  for (const v of violations) {
    counts[v.category] = (counts[v.category] || 0) + 1;
  }
  return counts;
}

// meta (optional): { target, fixerMode, applied, held } from the orchestrator.
export function buildSummary(baseline, after, fixes, meta = {}) {
  const before = countByCategory(baseline);
  const afterCounts = countByCategory(after);
  const categories = new Set([...Object.keys(before), ...Object.keys(afterCounts)]);

  const byCategory = [...categories].map(category => ({
    category,
    before: before[category] || 0,
    after: afterCounts[category] || 0,
    fixed: (before[category] || 0) - (afterCounts[category] || 0)
  }));

  const lowConfidence = fixes.filter(f => f.confidence === 'low');

  // Guard: if the re-scan finds MORE than the baseline, that is almost never a
  // real regression — it means the fixed copy wasn't served the same way the
  // baseline was (e.g. A11yGoat needs a Jekyll build; serving its raw source
  // yields different results). Flag it instead of reporting negative "fixed".
  const warnings = [];
  if (after.length > baseline.length) {
    warnings.push(
      `after (${after.length}) > baseline (${baseline.length}); likely a serving mismatch, not a regression. ` +
      `Ensure the fixed copy is served the same way the target is (static sites match; Jekyll sites must be built first).`
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    target: meta.target || null,
    fixerMode: meta.fixerMode || null,       // "mock" | "real"
    totalBefore: baseline.length,
    totalAfter: after.length,
    totalFixed: baseline.length - after.length,
    fixesProposed: fixes.length,
    fixesApplied: meta.applied ?? fixes.filter(f => f.confidence !== 'low').length,
    fixesHeldForReview: meta.held ?? lowConfidence.length,
    byCategory,
    warnings,
    lowConfidenceFixes: lowConfidence
  };
}

// Per-fix before/after detail: what each fix targets, the proposed value,
// its confidence, and whether the gate auto-applied it or held it for review.
export function buildFixDiff(fixes, approved = [], held = []) {
  const heldSet = new Set(held.map(f => `${f.category}::${f.element}`));
  const approvedSet = new Set(approved.map(f => `${f.category}::${f.element}`));

  return fixes.map(f => {
    const key = `${f.category}::${f.element}`;
    let gate = 'proposed';
    if (heldSet.has(key)) gate = 'held-for-review';
    else if (approvedSet.has(key)) gate = 'auto-applied';
    return {
      rule: f.rule,
      category: f.category,
      element: f.element,
      before: f.snippet || null,      // present when scan.js captured a snippet
      proposedFix: f.fix,
      confidence: f.confidence,
      reasoning: f.reasoning,
      gate
    };
  });
}

export function buildPrDescription(summary) {
  const lines = [
    '## Accessibility fixes',
    '',
    `This PR fixes **${summary.totalFixed} of ${summary.totalBefore}** accessibility violations found by pa11y + axe-core.`,
    ''
  ];

  if (summary.target) {
    lines.push(`- **Target:** ${summary.target}`);
  }
  if (summary.fixerMode) {
    lines.push(`- **Fixer mode:** ${summary.fixerMode}${summary.fixerMode === 'mock' ? ' (placeholder fixes — not real LLM output yet)' : ''}`);
  }
  lines.push(
    `- **Fixes proposed:** ${summary.fixesProposed ?? 'n/a'}`,
    `- **Auto-applied (high/medium):** ${summary.fixesApplied ?? 'n/a'}`,
    `- **Held for human review (low):** ${summary.fixesHeldForReview ?? 'n/a'}`,
    ''
  );

  lines.push('### Before / after by category', '');
  lines.push('| Category | Before | After | Fixed |', '|---|---:|---:|---:|');
  for (const row of summary.byCategory) {
    lines.push(`| ${row.category} | ${row.before} | ${row.after} | ${row.fixed} |`);
  }
  lines.push(`| **Total** | **${summary.totalBefore}** | **${summary.totalAfter}** | **${summary.totalFixed}** |`);

  if (summary.warnings && summary.warnings.length) {
    lines.push('', '### ⚠️ Warnings', '');
    for (const w of summary.warnings) lines.push(`- ${w}`);
  }

  if (summary.lowConfidenceFixes.length) {
    lines.push('', '### Flagged for human review', '');
    for (const fix of summary.lowConfidenceFixes) {
      lines.push(`- \`${fix.rule}\` on \`${fix.element}\` — ${fix.reasoning}`);
    }
  }

  lines.push('', '---', `_Generated ${summary.generatedAt || ''} by run-pipeline.js_`);
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const baseline = JSON.parse(await fs.readFile('reports/baseline.json', 'utf-8'));
  const after = JSON.parse(await fs.readFile('reports/after.json', 'utf-8'));
  const fixes = JSON.parse(await fs.readFile('reports/fixes.json', 'utf-8'));

  const summary = buildSummary(baseline, after, fixes);
  await fs.writeFile('reports/summary.json', JSON.stringify(summary, null, 2));

  const prDescription = buildPrDescription(summary);
  await fs.writeFile('reports/pr-description.md', prDescription);

  console.log('[report.js] Wrote reports/summary.json and reports/pr-description.md');
}
