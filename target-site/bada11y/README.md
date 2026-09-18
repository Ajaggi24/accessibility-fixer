# bada11y

A deliberately inaccessible demo website for accessibility testing and training.

The page is designed to **look like a real, professional website** (a travel company called "Summit Adventures") while containing **50 intentionally embedded WCAG 2.1 violations**.

It is intended for use with automated accessibility scanners (axe, WAVE, Lighthouse, etc.) and for manual audit practice.

---

## Purpose

Most accessibility demo pages look obviously broken. This one is designed to fool you — the layout, typography, and visual design are polished and coherent. The violations are hidden in the markup and CSS in the same ways they appear in real production sites.

---

## What's Inside

| File | Description |
|------|-------------|
| `index.html` | The demo page — all HTML, CSS, and embedded bugs |
| `ACCESSIBILITY_ISSUES.md` | Full catalogue of all 50 issues with WCAG references, descriptions, and fixes |
| `assets/` | Image directory (see below) |

---

## Images

The layout uses CSS gradient placeholders so it renders without images. If you want the full visual, drop the following files into an `assets/` folder:

| File | Used For |
|------|----------|
| `hero-mountains.jpg` | Hero section background |
| `himalaya.jpg` | Himalayan Trek package card |
| `amazon.jpg` | Amazon Rainforest package card |
| `patagonia.jpg` | Patagonia Expedition package card |
| `sahara.jpg` | Sahara Desert package card |
| `gallery-main.jpg` | Large gallery image (2×2 span) |
| `gallery-2.jpg` – `gallery-5.jpg` | Remaining gallery images |

---

## Issues at a Glance

50 violations across 30+ WCAG 2.1 criteria, spanning all four principles:

| Principle | Example Issues |
|-----------|---------------|
| **Perceivable** | Missing alt text, low contrast text, colour-only information, fixed-size tiny text, auto-scrolling content |
| **Operable** | No skip link, no focus indicators, click-only interactive elements, keyboard-inaccessible accordion & dropdown |
| **Understandable** | Foreign language text without `lang` attributes, sensory-characteristic instructions |
| **Robust** | Missing page title, duplicate IDs, unassociated form labels, mismatched `aria-label` |

See [`ACCESSIBILITY_ISSUES.md`](./ACCESSIBILITY_ISSUES.md) for the full list with descriptions and remediation guidance.

---

## Intentional Violations (Summary)

| # | WCAG | Issue |
|---|------|-------|
| 1 | 2.4.2 | No `<title>` element |
| 2 | 2.4.1 | No skip navigation link |
| 3 | 2.4.7 | `*:focus { outline: none }` globally |
| 4 | 4.1.2 | Search input has no label |
| 5 | 4.1.2 | Icon-only search button |
| 6 | 1.1.1 | Hero background image with no text alternative |
| 7 | 1.4.3 | Hero text contrast ~2.5:1 |
| 8 | 2.1.1 | Package cards: `onclick` div, no keyboard handler |
| 9 | 1.4.1 | Badge category conveyed by colour only |
| 10 | 2.4.6 | "Read More" repeated 4× |
| 11 | 1.4.1 | Sale price in red only |
| 12 | 2.2.2 | Auto-scrolling ticker, no pause control |
| 13 | 1.4.3 | Ticker text contrast ~2.4:1 |
| 14 | 1.1.1 | Star ratings `aria-hidden` |
| 15 | 1.3.1 | Table headers use `<td>` not `<th>` |
| 16 | 1.4.1 | Table status colour only |
| 17 | 1.4.1 | Required fields colour only |
| 18 | 1.3.1 | Radio group, no `<fieldset>`/`<legend>` |
| 19 | 1.4.10 | Fixed 1400px promo banner |
| 20 | 4.1.2 | Dismiss button labelled "×" only |
| 21 | 2.1.1 | FAQ accordion, no keyboard access |
| 22 | 1.4.3 | Newsletter text contrast ~3.0:1 |
| 23 | 4.1.2 | Newsletter input has no label |
| 24 | 1.4.4 | Legal text at 9px |
| 25 | 1.4.3 | Footer link contrast ~2.1:1 |
| 26 | 4.1.2 | Social icon links, no accessible name |
| 27 | 3.2.5 | External links open new tab, no warning |
| 28 | 1.3.3 | Instructions reference colour/shape only |
| 29 | 2.4.6 | "Click Here" nav link |
| 30 | 1.3.1 | `role="presentation"` on stats bar |
| 31 | 1.1.1 | Gallery images, no `alt` |
| 32 | 1.1.1 | Feature icons, no `aria-hidden` |
| 33 | 1.3.1 | Heading jumps `<h2>` → `<h4>` |
| 34 | 1.1.1 | Ticker `aria-hidden` hides all testimonials |
| 35 | 3.1.2 | French text, no `lang="fr"` |
| 36 | 1.3.1 | First Name label not associated |
| 37 | 2.4.3 | Positive `tabindex` disrupts tab order |
| 38 | 4.1.1 | `id="email"` used three times |
| 39 | 4.1.2 | Destination select, unassociated label |
| 40 | 4.1.2 | Range sliders, no value announcement |
| 41 | 1.3.1 | Terms checkbox, no label |
| 42 | 2.5.3 | Submit button `aria-label` contradicts visible text |
| 43 | 1.4.4 | Fine print at 8px |
| 44 | 1.3.1 | `display:none` span misused |
| 45 | 4.1.1 | Duplicate `id="departure-info"` |
| 46 | 3.1.2 | German text, no `lang="de"` |
| 47 | 3.2.5 | Footer external links, new tab, no warning |
| 48 | 4.1.1 | Duplicate `id="footer-link-acc"` |
| 49 | 3.1.2 | Spanish text, no `lang="es"` |
| 50 | 1.3.5 | `autocomplete="off"` on name field |

---

## Not a Real Website

Summit Adventures is entirely fictional. All destinations, prices, reviews, and team members are invented for demonstration purposes only.
