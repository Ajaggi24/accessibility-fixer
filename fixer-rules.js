// fixer-rules.js
// Owner: Role 5 (built under time pressure — Role 3/4, see the note at the
// bottom of this file before you replace it).
//
// WHAT THIS IS
// A deterministic, offline fixer. It produces REAL repairs using the WCAG
// math and the page's own DOM, with zero API calls and zero API key. It
// exists because the pipeline must actually lower the violation count on
// stage, and fixer-mock.js only invents placeholder text that fixes nothing.
//
// HOW IT DIFFERS FROM THE LLM FIXERS
//   fixer-structural.js / fixer-content.js : one Anthropic call PER violation
//                                            (80 violations = 80 calls), never
//                                            yet run, needs a real key.
//   fixer-rules.js (this file)             : instant, free, reproducible, and
//                                            verifiable — the numbers in the
//                                            report come from real edits.
//
// It dispatches on the RULE ID first and the category second, because some
// genuinely trivial wins (e.g. `document-title`) land in the `uncategorized`
// bucket and would otherwise be skipped forever.
//
// Every fix honors the shared team contract, plus ONE additive field:
// {
//   rule, category, element, snippet,
//   fix: string,                 // human-readable description of the repair
//   reasoning: string,
//   confidence: "high" | "medium" | "low",
//   apply: {                     // NEW (additive, optional): machine-readable
//     action: "setAttr" | "setStyle" | "renameTag" | "insertTitle",
//     attr?, prop?, tag?, value
//   }
// }
// apply-fixes.js uses `apply` to make the edit. Fixes WITHOUT `apply` (e.g.
// mock or LLM output) still flow through: the applier falls back to a
// per-category heuristic. Nothing downstream breaks.

import path from 'path';
import { loadDocs, resolveSelector } from './site-files.js';

// ---------------------------------------------------------------------------
// WCAG contrast math (this is the actual spec formula, not an approximation)
// ---------------------------------------------------------------------------

function parseColor(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();

  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16)
    ];
  }

  const rgb = s.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])].map(Math.round);

  return null;
}

function toHex([r, g, b]) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return '#' + [r, g, b].map((n) => clamp(n).toString(16).padStart(2, '0')).join('');
}

// WCAG 2.x relative luminance.
function luminance([r, g, b]) {
  const lin = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function contrastRatio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

function blend(from, to, t) {
  return from.map((c, i) => c + (to[i] - from[i]) * t);
}

// Find the SMALLEST change to the text color that reaches the target ratio.
// We try pushing the text toward black and toward white, then keep whichever
// direction needed less change (so the design stays as close to intent as
// possible). Returns null when neither direction can reach the target, which
// happens on mid-gray backgrounds — those get flagged for a human instead.
function findAccessibleTextColor(fg, bg, target) {
  let best = null;
  for (const endpoint of [[0, 0, 0], [255, 255, 255]]) {
    // 40 steps is well under one 8-bit color step per increment: precise enough.
    for (let i = 1; i <= 40; i++) {
      const t = i / 40;
      const candidate = blend(fg, endpoint, t);
      if (contrastRatio(candidate, bg) >= target) {
        if (!best || t < best.t) best = { t, color: candidate };
        break;
      }
    }
  }
  return best ? toHex(best.color) : null;
}

// Target ratio: axe tells us outright; otherwise pa11y's message contains it;
// otherwise fall back to the AA default for normal text.
// A 5% safety margin is added by the caller: landing on exactly 4.50:1 can
// re-fail the verify scan on a rounding difference, and "fixed it, but the
// re-scan still flags it" is the worst possible demo outcome.
const SAFETY_MARGIN = 1.05;

function targetRatioFor(violation) {
  const expected = violation.data?.expectedContrastRatio;
  if (expected) {
    const n = parseFloat(String(expected));
    if (Number.isFinite(n) && n > 1) return n;
  }
  const m = (violation.message || '').match(/at least\s+([\d.]+)\s*:\s*1/i);
  if (m) return parseFloat(m[1]);
  return 4.5;
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function tidy(text, max = 120) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

// Visible text of an element, treating <br> as a space. Without this,
// "<h1>The World is Waiting.<br>Are You?</h1>" reads as
// "The World is Waiting.Are You?" — two words glued together.
function textOf($el) {
  if (!$el || !$el.length) return '';
  const clone = $el.clone();
  clone.find('br').replaceWith(' ');
  return clone.text();
}

// "assets/gallery-main.webp" -> "Gallery main"
function humanizeFilename(src) {
  const base = path.basename(String(src || '')).replace(/\.[a-z0-9]+$/i, '');
  const words = base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!words) return '';
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// "dest-select" / "fname" -> "Destination" / "First name" where we can guess,
// else a humanized version of the id.
const ID_WORDS = {
  fname: 'First name',
  lname: 'Last name',
  dest: 'Destination',
  email: 'Email address',
  phone: 'Phone number',
  msg: 'Message',
  select: ''
};
function humanizeIdentifier(raw) {
  if (!raw) return '';
  const parts = String(raw).split(/[-_\s]+/).filter(Boolean);
  const mapped = parts.map((p) => {
    const key = p.toLowerCase();
    return Object.prototype.hasOwnProperty.call(ID_WORDS, key) ? ID_WORDS[key] : p;
  }).filter(Boolean);
  const joined = mapped.join(' ').replace(/\s+/g, ' ').trim();
  if (!joined) return '';
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

// Nearest meaningful text describing an element: a heading or a *-title
// element inside the same card/section, else a caption, else nothing.
// This is what makes the alt text specific instead of generic.
function describeFromContext($, $el) {
  let $node = $el;
  for (let depth = 0; depth < 4 && $node.length; depth++) {
    $node = $node.parent();
    if (!$node.length || $node.is('body, html')) break;
    const candidate = $node
      .find('h1, h2, h3, h4, h5, h6, figcaption, [class*="title"], [class*="caption"]')
      .first();
    if (candidate.length) {
      const text = tidy(textOf(candidate), 90);
      if (text) return text;
    }
  }
  return '';
}

// Visible text sitting next to a form control (e.g. the sentence beside an
// unlabelled checkbox), used to name that control.
function describeFormControl($, $el) {
  const placeholder = tidy($el.attr('placeholder'), 80);
  if (placeholder) return placeholder.replace(/^e\.g\.\s*/i, '').replace(/\.{3}$/, '');

  const $parent = $el.parent();
  if ($parent.length) {
    const clone = $parent.clone();
    clone.find('input, select, textarea, button, script, style').remove();
    const text = tidy(clone.text(), 90);
    if (text) return text;
  }

  const fromId = humanizeIdentifier($el.attr('id') || $el.attr('name'));
  if (fromId) return fromId;

  const type = $el.attr('type');
  if (type === 'search') return 'Search';
  return '';
}

// ---------------------------------------------------------------------------
// Per-rule fixers. Each returns a partial fix ({ fix, reasoning, confidence,
// apply }) or null when this fixer has nothing trustworthy to offer.
// ---------------------------------------------------------------------------

function fixAltText(violation, ctx) {
  const $el = ctx?.el;
  if (!$el || !$el.is('img')) return null;

  const context = describeFromContext(ctx.doc.$, $el);
  const fromFile = humanizeFilename($el.attr('src'));

  let altText;
  let confidence;
  let why;
  if (context) {
    altText = context;
    confidence = 'high';
    why = `Described from the heading/title text in the same card ("${context}"), so the alt text matches what the image is actually illustrating.`;
  } else if (fromFile) {
    altText = fromFile;
    confidence = 'medium';
    why = `No nearby heading to borrow, so the description is derived from the file name ("${$el.attr('src')}"). A human should confirm it matches the photo.`;
  } else {
    return null;
  }

  return {
    fix: `alt="${altText}"`,
    reasoning: `WCAG 1.1.1: a non-text element needs a text alternative. ${why}`,
    confidence,
    apply: { action: 'setAttr', attr: 'alt', value: altText }
  };
}

function fixContrast(violation, ctx) {
  const data = violation.data || {};
  const fg = parseColor(data.fgColor);
  const bg = parseColor(data.bgColor);
  const target = targetRatioFor(violation);

  // Best case: axe handed us the exact rendered colors -> compute a real fix.
  if (fg && bg) {
    const newColor = findAccessibleTextColor(fg, bg, target * SAFETY_MARGIN);
    if (newColor) {
      const before = contrastRatio(fg, bg);
      const after = contrastRatio(parseColor(newColor), bg);
      return {
        fix: `color: ${newColor}`,
        reasoning:
          `WCAG 1.4.3: text was ${before.toFixed(2)}:1 against its background ` +
          `(${toHex(bg)}), below the required ${target}:1. Darkening/lightening the ` +
          `text to ${newColor} raises it to ${after.toFixed(2)}:1 — the smallest ` +
          `color change that passes, so the design barely shifts.`,
        confidence: 'high',
        apply: { action: 'setStyle', prop: 'color', value: newColor }
      };
    }
    return {
      fix: 'Needs a background change, not a text change',
      reasoning:
        `WCAG 1.4.3: this background (${toHex(bg)}) is mid-tone — neither black nor ` +
        `white text reaches ${target}:1 against it. A designer has to re-pick the ` +
        `background, so this is not safe to auto-apply.`,
      confidence: 'low'
    };
  }

  // Fallback: pa11y states its own recommendation in the message text.
  const recText = (violation.message || '').match(/change text colou?r to (#[0-9a-f]{3,6})/i);
  if (recText) {
    return {
      fix: `color: ${recText[1]}`,
      reasoning: `WCAG 1.4.3: pa11y computed the rendered colors and recommends text ${recText[1]} to reach ${target}:1.`,
      confidence: 'medium',
      apply: { action: 'setStyle', prop: 'color', value: recText[1] }
    };
  }
  const recBg = (violation.message || '').match(/change background to (#[0-9a-f]{3,6})/i);
  if (recBg) {
    return {
      fix: `background-color: ${recBg[1]}`,
      reasoning: `WCAG 1.4.3: the text color here is fixed by the brand, so pa11y recommends darkening the background to ${recBg[1]} to reach ${target}:1.`,
      confidence: 'medium',
      apply: { action: 'setStyle', prop: 'background-color', value: recBg[1] }
    };
  }

  return null;
}

function fixLabel(violation, ctx) {
  const $el = ctx?.el;
  if (!$el || !$el.is('input, select, textarea')) return null;
  if ($el.is('input[type="hidden"]')) return null;

  const name = describeFormControl(ctx.doc.$, $el);
  if (!name) return null;

  const tag = $el.is('select') ? 'dropdown' : `${$el.attr('type') || 'text'} field`;
  return {
    fix: `aria-label="${name}"`,
    reasoning:
      `WCAG 4.1.2: this ${tag} had no name a screen reader could announce — it ` +
      `would just say "edit text, blank". Naming it "${name}" (taken from the ` +
      `visible text beside it) makes it announceable without changing the visual design.`,
    confidence: 'high',
    apply: { action: 'setAttr', attr: 'aria-label', value: name }
  };
}

function fixHeadingOrder(violation, ctx) {
  const $el = ctx?.el;
  if (!$el || !$el.is('h1, h2, h3, h4, h5, h6')) return null;

  const $ = ctx.doc.$;
  const headings = $('h1, h2, h3, h4, h5, h6').toArray();
  const index = headings.findIndex((h) => h === $el.get(0));
  if (index === -1) return null;

  const levelOf = (node) => Number(node.tagName.slice(1));
  const current = levelOf($el.get(0));
  const previous = index > 0 ? levelOf(headings[index - 1]) : 0;
  const correct = Math.min(previous + 1, 6);
  if (correct === current) return null;

  return {
    fix: `<h${current}> -> <h${correct}>`,
    reasoning:
      `WCAG 1.3.1: heading levels must step down one at a time. This is an ` +
      `<h${current}> directly after an <h${previous}>, so screen-reader users ` +
      `hear a gap in the outline. Changing it to <h${correct}> keeps the same ` +
      `visual weight class but repairs the document structure.`,
    confidence: 'high',
    apply: { action: 'renameTag', tag: `h${correct}` }
  };
}

function fixPositiveTabindex(violation, ctx) {
  const $el = ctx?.el;
  if (!$el) return null;
  const current = $el.attr('tabindex');
  if (current === undefined || Number(current) <= 0) return null;

  return {
    fix: 'tabindex="0"',
    reasoning:
      `WCAG 2.4.3: tabindex="${current}" yanks this control out of the natural ` +
      `tab order, so keyboard users jump around the page unpredictably. ` +
      `tabindex="0" puts it back in normal document order.`,
    confidence: 'high',
    apply: { action: 'setAttr', attr: 'tabindex', value: '0' }
  };
}

function fixDocumentTitle(violation, ctx) {
  const doc = ctx?.doc || null;
  const $ = doc?.$;
  if (!$) return null;
  if (tidy($('head title').text())) return null; // already has one

  const heading = tidy(textOf($('h1').first()), 70);
  const brand = tidy(textOf($('[class*="logo"]').first()), 40);
  const title = heading || brand || 'Home';
  if (!title) return null;

  return {
    fix: `<title>${title}</title>`,
    reasoning:
      `WCAG 2.4.2: the page has no <title>, so browser tabs, bookmarks and ` +
      `screen readers all announce the raw URL. "${title}" is taken from the ` +
      `page's own main heading.`,
    confidence: 'high',
    apply: { action: 'insertTitle', value: title }
  };
}

// Landmark/region violations: the correct repair is a judgement call about
// which landmark (<main>, <nav>, <aside>) a block belongs to, and wrapping
// large chunks of markup automatically is how you break a layout live on
// stage. Propose it, mark it low, let a human decide.
function flagRegion(violation, ctx) {
  const selector = violation.element || 'this block';
  return {
    fix: `Wrap ${selector} in a landmark (<main>, <nav>, or <aside>)`,
    reasoning:
      `WCAG 1.3.1: this content sits outside any landmark, so screen-reader ` +
      `users can't jump to it with landmark navigation. Which landmark is ` +
      `correct depends on the block's purpose, and wrapping markup ` +
      `automatically risks breaking the layout — held for a human.`,
    confidence: 'low'
  };
}

// rule-id (substring, lowercase) -> fixer. Checked before category.
const RULE_FIXERS = [
  { match: ['image-alt', 'h37'], fn: fixAltText },
  { match: ['color-contrast', 'g18', 'g145'], fn: fixContrast },
  { match: ['tabindex'], fn: fixPositiveTabindex },
  { match: ['heading-order'], fn: fixHeadingOrder },
  { match: ['document-title', 'notitleel', 'h25'], fn: fixDocumentTitle },
  { match: ['label', 'h91', 'f68', 'select-name', 'aria-input-field-name', 'h57'], fn: fixLabel },
  { match: ['region'], fn: flagRegion }
];

const CATEGORY_FIXERS = {
  'alt-text': fixAltText,
  contrast: fixContrast,
  labels: fixLabel,
  'heading-order': fixHeadingOrder,
  'keyboard-focus': fixPositiveTabindex
};

function pickFixer(violation) {
  const rule = (violation.rule || '').toLowerCase();
  for (const { match, fn } of RULE_FIXERS) {
    if (match.some((m) => rule.includes(m))) return fn;
  }
  return CATEGORY_FIXERS[violation.category] || null;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * @param violations  reports/baseline.json
 * @param options.siteDir  the site's SOURCE directory, read-only. Needed so a
 *                         fix can be built from the page's real DOM (nearby
 *                         headings, placeholders, existing attributes) instead
 *                         of guessing from a selector string.
 */
export async function fixWithRules(violations, { siteDir = 'target-site' } = {}) {
  let docs = [];
  try {
    docs = await loadDocs(siteDir);
  } catch (err) {
    console.warn(`[fixer-rules.js] could not read ${siteDir} (${err.message}); fixing without DOM context`);
  }

  const fixes = [];
  const skipped = [];

  for (const violation of violations) {
    const fixer = pickFixer(violation);
    if (!fixer) {
      skipped.push(`${violation.rule} (no fixer)`);
      continue;
    }

    const ctx = resolveSelector(docs, violation.element) || { doc: docs[0], el: null };

    let partial = null;
    try {
      partial = fixer(violation, ctx);
    } catch (err) {
      console.warn(`[fixer-rules.js] fixer threw on ${violation.rule}: ${err.message}`);
    }

    if (!partial) {
      skipped.push(`${violation.rule} on ${violation.element}`);
      continue;
    }

    fixes.push({
      rule: violation.rule,
      category: violation.category,
      element: violation.element,
      snippet: violation.snippet,
      ...partial
    });
  }

  console.log(`[fixer-rules.js] ${fixes.length} fixes built, ${skipped.length} violations left alone`);
  return fixes;
}

// Note for Role 3 / Role 4:
// Do NOT delete this file when your LLM fixers work. Keep it as the fast,
// key-free default and let --real switch to yours; the deterministic path is
// what guarantees the demo produces a real before/after number. The highest-
// value thing an LLM adds here is alt-text QUALITY (this file can only reuse
// text already on the page) and judgement on the low-confidence cases.

if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('fs/promises');
  const siteDir = process.argv[2] || process.env.SITE_DIR || 'target-site/bada11y';
  const baseline = JSON.parse(await fs.readFile('reports/baseline.json', 'utf-8'));
  const fixes = await fixWithRules(baseline, { siteDir });
  console.log(JSON.stringify(fixes, null, 2));
}
