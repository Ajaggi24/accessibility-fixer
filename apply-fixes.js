// apply-fixes.js
// Owner: Role 3 (primary) — REWRITTEN by Role 5 under hackathon time pressure.
// Role 3: read the "What changed" note at the bottom before you touch this.
//
// Job: take the approved fixes and actually edit the HTML in a CLEAN copy of
// the target site (never mutate the source — the pipeline must be re-runnable
// from a pristine baseline every run).
//
// It applies a fix in one of two ways:
//   1. `fix.apply` present (fixer-rules.js) — a precise, machine-readable
//      instruction: set this attribute / set this CSS property / rename this
//      tag / insert a <title>.
//   2. `fix.apply` absent (fixer-mock.js, or the LLM fixers) — fall back to a
//      per-category heuristic that reads the human-readable `fix` string.
//
// Anything it cannot resolve is COUNTED and REPORTED, never silently dropped.
// A stage that lies about what it did is worse than one that does nothing.

import fs from 'fs/promises';
import { copyDir, loadDocs, saveDocs, resolveSelector, mergeInlineStyle } from './site-files.js';

const SOURCE_DIR = process.env.SITE_DIR || 'target-site';
const OUTPUT_DIR = 'target-site-fixed';

// ---------------------------------------------------------------------------
// Turning a legacy/human-readable fix string into a real edit
// ---------------------------------------------------------------------------

// e.g. `alt="Snow-capped peak"` -> { attr: 'alt', value: 'Snow-capped peak' }
function parseAttrString(str) {
  const m = String(str || '').match(/^\s*([a-z-]+)\s*=\s*["']([\s\S]*)["']\s*$/i);
  return m ? { attr: m[1], value: m[2] } : null;
}

function parseCssString(str) {
  const m = String(str || '').match(/^\s*([a-z-]+)\s*:\s*([^;]+);?\s*$/i);
  if (m) return { prop: m[1].toLowerCase(), value: m[2].trim() };
  const hex = String(str || '').match(/^\s*(#[0-9a-f]{3,6})\s*$/i);
  return hex ? { prop: 'color', value: hex[1] } : null;
}

// Best-effort interpretation of a fix that arrived without an `apply` block.
function inferApply(fix) {
  const asAttr = parseAttrString(fix.fix);
  const asCss = parseCssString(fix.fix);

  switch (fix.category) {
    case 'alt-text':
      if (asAttr && asAttr.attr === 'alt') return { action: 'setAttr', ...asAttr };
      return { action: 'setAttr', attr: 'alt', value: String(fix.fix || '') };

    case 'labels':
      if (asAttr) return { action: 'setAttr', ...asAttr };
      return { action: 'setAttr', attr: 'aria-label', value: String(fix.fix || '') };

    case 'contrast':
      if (asCss) return { action: 'setStyle', ...asCss };
      return null;

    case 'keyboard-focus':
      if (asAttr) return { action: 'setAttr', ...asAttr };
      return { action: 'setAttr', attr: 'tabindex', value: '0' };

    default:
      // heading-order and anything else: too risky to guess at markup surgery.
      return null;
  }
}

// ---------------------------------------------------------------------------
// The four edit primitives
// ---------------------------------------------------------------------------

function applyOne(doc, $el, instr, state) {
  const $ = doc.$;

  switch (instr.action) {
    case 'setAttr': {
      if (!$el) return { ok: false, reason: 'element not found' };
      const existing = $el.attr(instr.attr);
      // Idempotent: several violation records (axe + pa11y, different
      // selectors) point at the SAME element. The first fix wins; the rest
      // report as already-fixed instead of double-writing.
      if (existing !== undefined && String(existing).trim() === String(instr.value).trim()) {
        return { ok: true, already: true };
      }
      $el.attr(instr.attr, instr.value);
      return { ok: true };
    }

    case 'setStyle': {
      if (!$el) return { ok: false, reason: 'element not found' };
      const node = $el.get(0);

      // One contrast repair per element, whichever arrives first. axe fixes
      // the TEXT color and pa11y sometimes recommends a BACKGROUND change for
      // the same element under a different selector; applying both would stack
      // a dark box behind already-recolored text and wreck the look of the
      // "after" page for no accessibility gain.
      const isContrastProp = instr.prop === 'color' || instr.prop === 'background-color';
      if (isContrastProp && state?.contrastFixed?.has(node)) {
        return { ok: true, already: true };
      }

      const style = $el.attr('style') || '';
      const declRe = new RegExp(`(^|;)\\s*${instr.prop}\\s*:`, 'i');
      if (declRe.test(style)) return { ok: true, already: true };

      mergeInlineStyle($el, instr.prop, instr.value);
      if (isContrastProp) state?.contrastFixed?.add(node);
      return { ok: true };
    }

    case 'renameTag': {
      if (!$el) return { ok: false, reason: 'element not found' };
      const node = $el.get(0);
      if (!node || !node.tagName) return { ok: false, reason: 'not an element node' };
      if (node.tagName.toLowerCase() === instr.tag.toLowerCase()) return { ok: true, already: true };
      node.tagName = instr.tag.toLowerCase();
      return { ok: true };
    }

    case 'insertTitle': {
      const $head = $('head');
      if (!$head.length) return { ok: false, reason: 'page has no <head>' };
      if ($('head title').length) return { ok: true, already: true };
      $head.append(`<title>${instr.value}</title>`);
      return { ok: true };
    }

    default:
      return { ok: false, reason: `unknown action "${instr.action}"` };
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * @returns stats { requested, applied, alreadyFixed, unresolved, unsupported,
 *                  filesChanged, outputDir }
 */
export async function applyFixes(fixes, sourceDir = SOURCE_DIR, outputDir = OUTPUT_DIR) {
  // Start from a clean copy every run.
  await fs.rm(outputDir, { recursive: true, force: true });
  await copyDir(sourceDir, outputDir);

  const docs = await loadDocs(outputDir);
  if (!docs.length) {
    throw new Error(`no HTML files found in ${outputDir} — is SITE_DIR pointing at a real site?`);
  }

  const stats = {
    requested: fixes.length,
    applied: 0,
    alreadyFixed: 0,
    unresolved: 0,
    unsupported: 0,
    filesChanged: 0,
    outputDir
  };

  const state = { contrastFixed: new Set() };

  for (const fix of fixes) {
    const instr = fix.apply || inferApply(fix);
    if (!instr) {
      stats.unsupported++;
      continue;
    }

    // insertTitle is document-level, so a missing element match is fine there.
    const hit = resolveSelector(docs, fix.element);
    const doc = hit?.doc || docs[0];
    const $el = hit?.el || null;

    const result = applyOne(doc, $el, instr, state);
    if (result.ok && result.already) {
      stats.alreadyFixed++;
    } else if (result.ok) {
      stats.applied++;
      doc.dirty = true;
    } else {
      stats.unresolved++;
    }
  }

  await saveDocs(docs);
  stats.filesChanged = docs.filter((d) => d.dirty).length;

  console.log(
    `[apply-fixes.js] ${stats.applied} edits written to ${stats.filesChanged} file(s) in ${outputDir}/ ` +
    `(${stats.alreadyFixed} duplicate targets, ${stats.unresolved} selectors not found, ` +
    `${stats.unsupported} fixes with no safe automatic edit)`
  );
  return stats;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fixes = JSON.parse(await fs.readFile('reports/fixes.json', 'utf-8'));
  // Only apply high/medium confidence automatically — low confidence should
  // already have been filtered out by run-pipeline.js's gate.
  const approved = fixes.filter((f) => f.confidence !== 'low');
  await applyFixes(approved, process.argv[2] || SOURCE_DIR);
}

// What changed (Role 3, read this):
//  - The old version copied the site, looped over the fixes printing
//    "STUB: would apply fix", and wrote the file back UNCHANGED. That is why
//    every report said "Fixed 0 of 85" — the fix stage never touched the HTML.
//  - It also only ever opened `<outputDir>/index.html`. It now walks every
//    .html file in the site and matches each fix to the file its selector
//    actually resolves in.
//  - `fix.apply` is an additive field. Your fixers can keep returning the
//    plain contract and the heuristic path handles them; return `apply` when
//    you want exact control over the edit.
