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
