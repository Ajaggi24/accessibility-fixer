// site-files.js
// Owner: Role 5 (shared plumbing — no fix logic lives here)
//
// Tiny helper layer so the fixer and the applier agree on:
//   - which files in a site directory are HTML we may edit
//   - how to parse them (cheerio)
//   - how to resolve a violation's CSS selector to a real element
//
// Both fixer-rules.js (read-only, for context) and apply-fixes.js (writes)
// use this, so a selector always resolves the same way in both stages.

import fs from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';

// Directories that are never part of the served site (build caches, VCS).
const SKIP_DIRS = new Set(['.git', 'node_modules', '.jekyll-cache', '_site']);

export async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

export async function listHtmlFiles(dir) {
  const out = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(full);
      } else if (/\.html?$/i.test(entry.name)) {
        out.push(full);
      }
    }
  }
  await walk(dir);
  return out;
}

// Load every HTML file in a site dir as a parsed cheerio document.
// Returns [{ file, $ }]. Callers that only need context should not mutate `$`.
export async function loadDocs(dir) {
  const files = await listHtmlFiles(dir);
  const docs = [];
  for (const file of files) {
    const html = await fs.readFile(file, 'utf-8');
    docs.push({ file, $: cheerio.load(html) });
  }
  return docs;
}

export async function saveDocs(docs) {
  for (const doc of docs) {
    if (doc.dirty) await fs.writeFile(doc.file, doc.$.html());
  }
}

// Resolve a violation's CSS selector against the loaded documents.
//
// Why this can fail: axe and pa11y emit selectors generated against the LIVE
// rendered DOM (e.g. `html > body > header > div > input`, or
// `div:nth-child(8) > input[type="checkbox"]`). Those usually match the source
// HTML too, but not always — browsers insert <tbody>, move stray nodes, etc.
// So every caller must handle `null` instead of assuming a match.
export function resolveSelector(docs, selector) {
  if (!selector) return null;
  for (const doc of docs) {
    let found;
    try {
      found = doc.$(selector);
    } catch {
      continue; // selector cheerio can't parse
    }
    if (found.length) return { doc, el: found.first() };
  }
  return null;
}

// Merge a CSS declaration into an element's inline style attribute without
// clobbering whatever inline style was already there.
export function mergeInlineStyle($el, prop, value) {
  const existing = ($el.attr('style') || '').trim();
  const decls = existing
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .filter((d) => d.split(':')[0].trim().toLowerCase() !== prop.toLowerCase());
  decls.push(`${prop}: ${value}`);
  $el.attr('style', decls.join('; ') + ';');
}
