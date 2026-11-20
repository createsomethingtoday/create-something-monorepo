# Fixed states

Use existing Astryx fixture runtime at 1280x840 and 390x840, reduced motion. Today, Music, Calendar source preview, Money source preview, Ask GiGi uncertain outcome, onboarding. Baseline current 0.3.7 source from Git HEAD; changes compare same fixture/state/viewport. Mobbin references pending acquisition; preserve GiGi identity.

## Inspected references
- Todoist Today: https://mobbin.com/screens/8514ba3e-5372-4b61-ab79-e11ef6ea7121 — inspected inline image; clear Today title and task grouping, low visual noise. Take hierarchy, preserve GiGi dark olive identity.
- Superlist Today: https://mobbin.com/screens/f3c55a25-0602-4a5c-bd59-f69c38d76a1d — inspected inline image; overdue/today separation and spacious readable tasks. Take explicit time/context grouping, not decorative right-hand art.

Capture harness: `node cook/capture.mjs <app-root> <output-dir>`. Baseline uses an archived source snapshot of exact HEAD 3be4a7bb1; only the development fixture receives identical recovery sample music rows. No second Git checkout/root mutation. Both use fixed viewport390/1280x840, reduced motion, Nov15 Date.now. Scrolling main content captured as detail shots because page fullPage alone cannot expand the inner scroll container. Current primary React source rendered, not mock HTML. Empty music fixtures were rejected as insufficient and replaced with explicit available/changed/missing/reconnect rows.
