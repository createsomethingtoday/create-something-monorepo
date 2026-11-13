# Independent text stress review r17

Reviewed frozen local runtime http://localhost:5191, routes /next/components, /next/patterns, /next/filters, /next/timeline. No source edits/builds/tests. Own Ego space44 only.

## Method and limits

At 320 and1280 CSS viewport widths, CDP device metrics were reapplied in each browser invocation and innerWidth checked. This is viewport emulation, NOT browser zoom. For each loaded page, snapshot every element's computed font-size, then set each element's font-size to twice that original value with inline !important. Add page-only universal line-height1.5, letter-spacing.12em, word-spacing.16em and paragraph margin-bottom2em. This deliberately combined CSS 200% font stress with WCAG text-spacing; it is NOT native text-only scaling or evidence of real browser zoom. Navigation removes fixtures. Geometry for all eight combinations: geometry.json. Directly viewed screenshots, not inferred aesthetic success from geometry.

## Findings

1. **Timeline toolbar and accessible summary lose content at320 under text stress (high).** Nested timeline is only about102px wide after owning-surface padding. Toolbar extends horizontally; focusing/scrolling Zoom-in into view hides Zoom-out, time values, and part of percentage. Summary words and nested heading overflow/clipped. Not deliberate canvas overflow: affected DOM toolbar and track/keyframe summary are outside canvas. Selectors: `[aria-label="Nested work surface"]` / `.zoom-controls`, `[aria-label="Zoom in"]`, timeline editor summary. Evidence: timeline-320-zoom.png (dark nested surface), timeline-320-detail.png (explicit Reverse owning palettes, nested light). Both directly viewed. Baseline current-source no-stress screenshot timeline-320-baseline.png shows time values and both controls readable, actual zoom click changes100% to125%. Thus enlargement-triggered versus this runtime's normal-size baseline; no pre-redesign checkout comparison performed.

2. **Decision-state composition overlaps status and overflows viewport at1280 (medium).** /next/patterns `section[aria-label="Decision states"]`, `.clear-decision-panel__tab`, status/header badge. At1280 stress root scrollWidth1552; original measured tabs x897 right1345 (viewport1280). Status badge overlays current-state words; decision panel overflows intended column. Capture scrollIntoView horizontally shifted x to865/right1313, still overflowing; screenshot patterns-1280-detail.png and explicit light patterns-1280-light.png. Both directly viewed. Actual stressed Review tab click succeeds and changes Current state to Review; this is visual/readability failure, not broken callback. Baseline version attribution untested.

3. **Filter Hide label exceeds its control at320 (medium).** /next/filters button text Hide: width44, scrollWidth91 with enlarged text+spacing. Text visibly paints outside border and adjacent panel boundary in dark filters-320-detail.png and explicit light filters-320-light.png. Both directly viewed. Root375px at320; integration headings also have long-word overflow, but those are secondary. Baseline version attribution untested.

Additional geometry: components root499px at320, theme button right499px and inverse card heading right441px. These are further investigation candidates, not independently closed findings. Native select selection changed to Shared library successfully in initial stress session. Modal opened under stress; fully stressed modal capture was inconclusive visually, so no modal pass claimed. Component menu and full keyboard/accessibility paths were not completed after significant findings. This is bounded risk discovery, not full WCAG certification.

## Gates

- Functional correctness: **failed against acceptance**: enlarged-text essential timeline toolbar/summary cannot remain simultaneously readable/reachable in intended surface. Native select and decision tabs callback behavior exercised; baseline timeline zoom125% exercised. Menu/modal and native browser zoom coverage incomplete.
- Perceptual/product quality: **failed**: directly viewed dark/light clipping/overlap in screenshots cited above. Normal-size baseline only for timeline; no pre-redesign comparison.
- Release readiness: **failed for this acceptance scope**: text-stress defects remain; source frozen, no repairs or publication attempted. Parent owns integration and release. Temporary fixtures removed by navigation/space close; no app source changed.

Ego reported update available from0.6.3.12; no upgrade performed.
