## Accessibility fixes

This PR fixes **0 of 85** accessibility violations found by pa11y + axe-core.

- **Target:** http://localhost:8001/
- **Fixer mode:** mock (placeholder fixes — not real LLM output yet)
- **Fixes proposed:** 74
- **Auto-applied (high/medium):** 72
- **Held for human review (low):** 2

### Before / after by category

| Category | Before | After | Fixed |
|---|---:|---:|---:|
| contrast | 48 | 48 | 0 |
| uncategorized | 11 | 11 | 0 |
| heading-order | 1 | 1 | 0 |
| alt-text | 18 | 18 | 0 |
| labels | 5 | 5 | 0 |
| keyboard-focus | 2 | 2 | 0 |
| **Total** | **85** | **85** | **0** |

### Flagged for human review

- `tabindex` on `#lname` — PLACEHOLDER fix from fixer-mock.js — replace with real Role 3/4 output once their fixers + a valid ANTHROPIC_API_KEY are wired.
- `tabindex` on `#phone` — PLACEHOLDER fix from fixer-mock.js — replace with real Role 3/4 output once their fixers + a valid ANTHROPIC_API_KEY are wired.

---
_Generated 2026-09-18T20:09:33.104Z by run-pipeline.js_