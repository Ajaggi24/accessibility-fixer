# Accessibility Fixer — TAPIA 2026 Hackathon

Agent pipeline: scan -> fix -> apply -> verify -> report, with a human
sign-off gate on low-confidence fixes.

## Setup (everyone, hour 0)

```bash
git clone <repo-url>
cd accessibility-fixer
npm install
cp .env.example .env        # then paste your real key into .env
```

`.env` is gitignored — never commit it.

## Run the full pipeline

```bash
node run-pipeline.js
```

## Run one stage at a time (useful while building/debugging)

```bash
npm run scan       # writes reports/baseline.json
npm run fix        # writes reports/fixes.json
npm run apply       # writes target-site-fixed/
npm run verify      # writes reports/after.json
npm run report      # writes reports/summary.json + reports/pr-description.md
```

## File ownership (matches the team role breakdown)

| File | Owner |
|---|---|
| `target-site/` | Role 1 — Infra & Target Site |
| `second-site/` | Role 1 — Infra & Target Site (generalization test, added later) |
| `scan.js`, `verify.js` | Role 2 — Scanner & Triage |
| `fixer-structural.js`, part of `apply-fixes.js` | Role 3 — Fixer Agent (Structural) |
| `fixer-content.js` | Role 4 — Fixer Agent (Content/Judgment) |
| `run-pipeline.js`, `report.js` | Role 5 — Pipeline Orchestration |
| `dashboard.html` | Role 6 — Human QA & Demo |

## Shared fix JSON shape — lock this before anyone starts coding fixers

```json
{
  "rule": "string, from the scanner",
  "category": "alt-text | contrast | labels | heading-order | keyboard-focus",
  "element": "string, selector or snippet identifying the element",
  "fix": "string, the proposed replacement value/content",
  "reasoning": "string, why the agent chose this fix",
  "confidence": "high | medium | low"
}
```

Fixes tagged `low` confidence are held by the pipeline for mandatory human
sign-off before being applied — see `run-pipeline.js`.

## Workflow

```bash
git pull
# do your piece
git add .
git commit -m "scan.js: baseline scanning + dedup"
git push
```

Push as soon as your piece works, especially right after each role's
deliverable milestone (hour 1, hour 2.5, hour 3) — those are the points
where the next person is waiting on your output.

# Role 1 — Target Site Setup

## A11yGoat

A11yGoat is a **Jekyll-based accessibility testing site**.

### Setup

From the project root:

```bash
cd target-site/a11ygoat
```

Confirm Jekyll is installed:

```bash
jekyll --version
```

Serve the site:

```bash
jekyll serve --host 0.0.0.0 --port 8000
```

The site is available at:

```text
http://localhost:8000/A11yGoat/
```

> **Note:** The `/A11yGoat/` subpath comes from Jekyll's `baseurl` configuration. Do not use `http://localhost:8000/` for A11yGoat.

Leave the Jekyll server running.

### Verify Accessibility Scanners

In a **second terminal**:

```bash
axe http://localhost:8000/A11yGoat/
```

```bash
pa11y http://localhost:8000/A11yGoat/
```

Both scanners should return accessibility findings.

---

## Bada11y

Bada11y is a **static HTML site**, so it does not require Jekyll. It can be served directly with Python's built-in HTTP server.

From the project directory:

```bash
cd target-site/bada11y
```

Start the server on port `8001`:

```bash
python3 -m http.server 8001
```

The site is available at:

```text
http://localhost:8001/
```

> **Why port 8001?** A11yGoat is already using port `8000`, so bada11y needs a different port if both sites are running at the same time.

### Verify Bada11y

In another terminal:

```bash
axe http://localhost:8001/
```

```bash
pa11y http://localhost:8001/
```

### Confirmed Axe Results

The initial `axe` scan of bada11y detected **58 accessibility issues across 8 rules**:

| WCAG Rule        | Occurrences |
| ---------------- | ----------: |
| `color-contrast` |          37 |
| `image-alt`      |           9 |
| `region`         |           6 |
| `tabindex`       |           2 |
| `document-title` |           1 |
| `heading-order`  |           1 |
| `label`          |           1 |
| `select-name`    |           1 |
| **Total**        |      **58** |

Notably, `image-alt` produced **9 violations**, affecting:

```text
.img-himalaya
.img-amazon
.img-patagonia
.img-sahara
img[src$="gallery-main.webp"]
img[src$="gallery-2.webp"]
img[src$="gallery-3.webp"]
img[src$="gallery-4.webp"]
img[src$="gallery-5.webp"]
```

These are candidate issues for the AI agent to automatically fix by adding descriptive alternative text.

### Environment Variables

The backend can reference the local target sites using:

```env
# Local URL where Role 1 serves A11yGoat
TARGET_SITE_URL=http://localhost:8000/A11yGoat/

# Local URL where Role 1 serves the second/unseen site (generalization test)
SECOND_SITE_URL=http://localhost:8001/
```

### Final Local Setup

When both sites are running:

```text
A11yGoat
Jekyll → port 8000
http://localhost:8000/A11yGoat/

Bada11y
Python HTTP server → port 8001
http://localhost:8001/
```

The accessibility scanner commands are therefore:

```bash
axe http://localhost:8000/A11yGoat/
pa11y http://localhost:8000/A11yGoat/

axe http://localhost:8001/
pa11y http://localhost:8001/
```

> **Important:** Automated scanners do not detect every accessibility problem. The axe output notes that manual testing is still required.
