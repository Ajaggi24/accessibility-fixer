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

export function buildSummary(baseline, after, fixes) {
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

  return {
    totalBefore: baseline.length,
    totalAfter: after.length,
    totalFixed: baseline.length - after.length,
    byCategory,
    lowConfidenceFixes: lowConfidence
  };
}

export function buildPrDescription(summary) {
  const lines = [
    '## Accessibility fixes',
    '',
    `This PR fixes ${summary.totalFixed} of ${summary.totalBefore} accessibility violations found by pa11y and axe-core.`,
    '',
    '### Breakdown by category',
    ''
  ];

  for (const row of summary.byCategory) {
    lines.push(`- **${row.category}**: ${row.fixed} of ${row.before} fixed (${row.after} remaining)`);
  }

  if (summary.lowConfidenceFixes.length) {
    lines.push('', '### Flagged for human review', '');
    for (const fix of summary.lowConfidenceFixes) {
      lines.push(`- ${fix.rule}: ${fix.reasoning}`);
    }
  }

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
