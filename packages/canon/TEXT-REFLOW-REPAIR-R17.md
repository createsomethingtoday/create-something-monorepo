# Enlarged-text layout repair r17

Local Canon source only, served at `http://localhost:5191`. No Git operation, external write, deployment, publication, package/build/sync or full check was performed by this repair pass. Parent retains integrated verification and independent final acceptance. Protected character/world/overview/SceneLead and .ltd documentation were not edited.

Acceptance was communicated before source changes and is preserved at `evidence/text-reflow-repair-r17/acceptance.md`.

## Reproduced before editing

The durable browser algorithm snapshots every element's original computed font size, applies 2x original sizes with inline `!important`, then adds universal line-height 1.5, letter-spacing .12em, word-spacing .16em and paragraph margin-bottom 2em. Viewport metrics are reapplied in each browser invocation, fonts awaited, then two animation frames awaited. This is combined CSS font/spacing stress, **not native browser zoom, text-only browser scaling, or WCAG certification**.

`before-geometry.json` and actual `before-*.png` reproduce root width499 on components320,609 on patterns320,1552 on patterns1280,375 on filters320; nested timeline essential DOM toolbar/summary also overflowed despite root310. Spacing-only filters320 had no listed failure (Hide client56/scroll56). Font-only already failed (Hide client42/scroll78, root321). Combined Hide client42/scroll91, root375. Font enlargement therefore triggers this instance; added spacing worsens it.

`assert-geometry.mjs` uses actual recorded browser geometry, not CSS-string expectations. Before:35 essential-text/root geometry failures. Final after:zero across all16 combined-stress route×width×palette combinations. Internally scrolling table header is deliberately excluded from viewport control assertions; its scroll container remains intact.

## Changes

- TimelineEditor: DOM time/zoom groups wrap independently; text can break within its owning surface; zoom controls retain minimum targets; summary list indentation fits the available surface. No canvas projection or callback code changed.
- FilterTogglePanel: Hide/Show owns its required width, header/price groups wrap and labels shrink safely; range/status/material callback schemas unchanged.
- ClearDecisionPanel: status/header can wrap without overlap, tabs respect track width, and console body responds to its own inline container before becoming two columns. Status semantics and selection callbacks unchanged.
- ClearPageSection, PerformanceThesisConditions, PerformanceEvidenceIndex, PerformanceContrastChapter, PerformanceConversionHandoff: proven enlarged headings/intrinsic grid children can wrap inside their existing surface.
- PerformanceNarrativeStage: proven narrow chapter-index label can wrap without the measured number column consuming its available text width.
- Footer: only the auto-fit grid minimum changes from10rem to `min(100%,10rem)`, retaining an ordinary column's size while permitting a narrower owner. This affects shared Footer consumers and requires parent consumer review. Links, property identity and explicit dark wordmark scope unchanged.
- Four named `/next` fixtures: responsive intrinsic track/header sizing and heading wrapping; no route-level overflow hiding, truncation, reduced fonts, or callback changes.

## Verification

Evidence directory: `evidence/text-reflow-repair-r17/`.

- `browser-regression.mjs`, `before-geometry.json`, `after-geometry.json`, `assertions.log`: actual before-fail/after-pass geometry,320/1280 combined stress in both owning palettes. Final stress captures await finite CSS transitions so colors converge.
- `matrix.json`: all48 ordinary route×320/390/768/1024/1025/1440×palette combinations plus eight1280 stress combinations. No root overflow. First normal-light screenshots caught control transitions; `review-converged-light.mjs` attempted a converged refresh, completed components320/390, then its root-palette wait timed out on components768. The remaining normal-light convergence re-test is explicitly left for the parent reviewer; do not treat all original light screenshot colors as final-state proof.
- `interactions.json`: Hide/Show, material callback, clear callback `{}`, Review current state, status nonoverlap, nested zoom125%, keyboard frame callback13, nested palette reversal all pass using actual browser actions. Ego's offscreen click auto-scroll required explicit instant-scroll recovery before actions; this is recorded test tooling behavior, not a callback failure.
- `focused-tests.log`: direct local Vitest invocation,3 files/7 tests passed (TimelineEditor, narrative SSR, page contract). The `pnpm` shim was absent in this agent shell; direct Node invocation was used. No package scripts ran.
- `footer-normal-320.png`, `footer-normal-1440.png`, `footer-readback.json`: direct normal Footer view and link readback. Editorial styling retained. A separate existing-looking visual issue was reported to parent: the active `.ltd` property-name portion is black on the dark Footer, while its “— Canon” label remains gray. The minmax-only edit does not change those colors.

Directly viewed actual before/after defect screenshots, both final stressed palettes, ordinary-width contact sheets and Footer320/1440. Word splitting under deliberately extreme stress remains vertically tall, but complete essential text and controls stay within their owning horizontal surface; normal typography is preserved.

## Limits and gates

- Functional correctness: **passed for the bounded DOM reflow acceptance**, backed by actual geometry and interactions plus focused tests. Native browser zoom, full keyboard/focus paths, no-JavaScript, reduced-motion and downstream live consumers were not comprehensively requalified.
- Perceptual/product quality: **passed for repaired clipping/overlap and ordinary measured layout in the reviewed fixtures**, subject to independent parent re-test and the remaining normal-light palette convergence review. Extreme stress can produce tall wrapped words; this is not an aesthetic normal-size baseline. The separately flagged Footer active-link contrast needs parent disposition. Its exact selector is `footer a[href="https://createsomething.ltd"]`: computed foreground rgb(0,0,0), transparent link background, closest footer background rgb(0,0,0); `.link-label` and `.link-description` remain rgb(170,170,170).
- Release readiness: **untested**. Source remains local and intentionally dirty; package/artifact checks and independent Sol re-test belong to the parent. No shipping destination authorized by this repair subtask.

The tiny nested timeline canvas can be narrower than the existing140px track-label allocation under the combined stress fixture. Source arithmetic can therefore produce negative pixels-per-frame. This pass did not establish a reliable pointer/ruler regression beyond the geometry/source observation and did not modify canvas math; treat that as an explicit existing canvas/projection limit requiring its own actual-behavior reproduction, not a repaired claim. Intentional two-dimensional canvas/table behavior remains outside the DOM clipping fix.

Rollback is the scoped source CSS additions plus the single Footer grid minimum; no state migration or external resource was changed. Parent owns worktree disposition and release.
