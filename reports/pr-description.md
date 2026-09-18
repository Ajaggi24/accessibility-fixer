## Accessibility fixes

This PR fixes **74 of 85** accessibility violations found by pa11y + axe-core.

- **Target:** http://localhost:8001/
- **Fixer mode:** rules
- **Fixes proposed:** 82
- **Auto-applied (high/medium):** 76
- **Held for human review (low):** 6

### Before / after by category

| Category | Before | After | Fixed |
|---|---:|---:|---:|
| contrast | 48 | 2 | 46 |
| uncategorized | 5 | 3 | 2 |
| heading-order | 7 | 6 | 1 |
| alt-text | 18 | 0 | 18 |
| labels | 5 | 0 | 5 |
| keyboard-focus | 2 | 0 | 2 |
| **Total** | **85** | **11** | **74** |

### Flagged for human review

- `region` on `#home` — WCAG 1.3.1: this content sits outside any landmark, so screen-reader users can't jump to it with landmark navigation. Which landmark is correct depends on the block's purpose, and wrapping markup automatically risks breaking the layout — held for a human.
- `region` on `.stats-bar` — WCAG 1.3.1: this content sits outside any landmark, so screen-reader users can't jump to it with landmark navigation. Which landmark is correct depends on the block's purpose, and wrapping markup automatically risks breaking the layout — held for a human.
- `region` on `.newsletter > h2` — WCAG 1.3.1: this content sits outside any landmark, so screen-reader users can't jump to it with landmark navigation. Which landmark is correct depends on the block's purpose, and wrapping markup automatically risks breaking the layout — held for a human.
- `region` on `.newsletter > p:nth-child(2)` — WCAG 1.3.1: this content sits outside any landmark, so screen-reader users can't jump to it with landmark navigation. Which landmark is correct depends on the block's purpose, and wrapping markup automatically risks breaking the layout — held for a human.
- `region` on `input[placeholder="Your email address"]` — WCAG 1.3.1: this content sits outside any landmark, so screen-reader users can't jump to it with landmark navigation. Which landmark is correct depends on the block's purpose, and wrapping markup automatically risks breaking the layout — held for a human.
- `region` on `.legal` — WCAG 1.3.1: this content sits outside any landmark, so screen-reader users can't jump to it with landmark navigation. Which landmark is correct depends on the block's purpose, and wrapping markup automatically risks breaking the layout — held for a human.

---
_Generated 2026-09-18T20:44:37.709Z by run-pipeline.js_