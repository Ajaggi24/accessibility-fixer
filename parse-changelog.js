// parse-changelog.js
// Shared by fixer-structural.js and fixer-content.js.
//
// Both fixers now return the model's response in the same two-section
// format: a line-by-line CHANGELOG, then the FULL HTML of the corrected
// file. This parses that response into structured fix records plus the
// corrected HTML string, ready to write straight to disk.

export function parseChangelogResponse(raw) {
  const changelogMatch = raw.match(/====\s*CHANGELOG\s*====([\s\S]*?)====\s*FULL HTML\s*====/i);
  const htmlMatch = raw.match(/====\s*FULL HTML\s*====([\s\S]*)$/i);

  if (!changelogMatch || !htmlMatch) {
    throw new Error('Response missing expected ==== CHANGELOG ==== / ==== FULL HTML ==== sections');
  }

  const changelogText = changelogMatch[1].trim();
  const correctedHtml = htmlMatch[1].trim();

  const lineRe = /^\[([^\]]+)\]\s*-\s*(.*?)\s*-\s*\[([^\]]+)\]\s*-\s*(.*?)\s*-\s*(.*?)\s*-\s*(\d+)%\s*$/;
  const fixes = changelogText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const m = line.match(lineRe);
      if (!m) {
        console.warn(`[parse-changelog.js] Could not parse line: ${line}`);
        return null;
      }
      const [, oldLines, oldCode, newLines, newCode, rationale, confidenceNum] = m;
      const confidence = Number(confidenceNum) >= 80 ? 'high' : Number(confidenceNum) >= 60 ? 'medium' : 'low';
      return {
        oldLines, oldCode, newLines,
        fix: newCode,
        reasoning: rationale,
        confidenceScore: Number(confidenceNum),
        confidence,
        skipped: newCode.trim().toUpperCase() === 'SKIPPED'
      };
    })
    .filter(Boolean);

  return { changelogText, correctedHtml, fixes };
}