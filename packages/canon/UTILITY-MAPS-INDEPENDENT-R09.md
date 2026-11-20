# Independent utility and maps retest R09

Reviewed the actual local fixtures at `http://127.0.0.1:5191/next/utility` and `/next/maps` in my own Ego taskspace 29. Source remained read-only; no package generation, sync, build, deployment, account submission, external navigation, real upload, or Linear close occurred. This is live **local browser** evidence using fictional fixture data, not live Identity or production Atlas evidence. Existing offline test results were not independently rerun.

## Acceptance and result

Both fixtures were exercised at 320, 390, 768, 1024, 1025 and 1440 CSS px, dark and light, including the fixtures' explicit light and nested dark scopes. The utility owning palette was switched with its actual appearance button; `utility-owning-matrix.json` and final `utility-settled-matrix.json` record the owning DIV. All rows show no document horizontal overflow. All enabled visible shared-component controls measured in the initial matrix were at least 44px; the hidden file input is not a separate visible target. Maps node role-buttons are visibly larger than that bound.

**One low-severity fixture finding:** `/next/utility` header `a[href="/next"]` ("Canon") is 46.15 × 20.5px at all six widths. Reproduce by measuring its bounding client rect. This misses the literal 44px target criterion, although it is fixture navigation rather than a migrated utility component. No source repair was made.

Utility actual interactions: PageActions focuses Copy first, ArrowDown reaches Preview, Escape restores Page actions. Preview modal wraps from Close to Copy and Escape restores the persistent Page actions launcher. UserMenu focuses Account settings and Escape restores the account launcher without navigating or logging out. Combobox Clear empties the selected value. Removing synthetic sample.txt removes its list entry. Calendar Next month shows December 2026; Tab from Today wraps to Previous year and Escape restores the date launcher. The 36 actual owning-palette/sign-in/sign-up/magic-mode states had no overflow and no form action shorter than 44px. No credentials were entered or submitted.

Maps actual node selection changes text to `Selected: Draft reading list`. Zoom changes transform scale from 0.9 to 1.08. A native pointer drag with 12 movement steps changes translation from (24,108) to (104,108), retaining scale 0.9. Keyboard Enter on chapter 2 sets its aria-pressed state and produces a visible 2px outline. HTML edge labels use opaque owning pairs: RGB199 on black, and RGB83,89,80 on RGB247,248,246. Small phone canvases remain pannable and deliberately show only a portion of the graph; overview zoom is not full-size label readability.

Reduced motion matches in the real browser: utility menu animation is none; map node transition duration is 0.00001s. Actual no-JavaScript reloads retain utility recovery text/four recovery links and maps ledger/charts/state text with the explicit interaction limitation. Neither no-JS page overflowed. No-JS is a readable fallback, not an authentication or interactive-map test.

## Direct visual assessment

Directly viewed full-page screenshots: utility 320 dark, final settled 320 light, desktop light, utility no-JS; maps 320 light, 1440 dark (including explicit light and nested dark), and maps no-JS. All 24 route/width/theme captures are in the evidence directory. The final settled utility light screenshot shows readable actions and upload instructions; dark foundation, Geist hierarchy, muted diagram series and restrained rounded materials are coherent with this component scope. Character art remains an unapproved prototype and was not accepted by this review.

**Important evidence correction:** Immediate palette-toggle reads and even two animation frames captured ongoing color interpolation (pale magic-link text and dark dropzone). Those were provisional observations, not persistent defects. Final utility screenshots and `utility-settled-matrix.json` wait until magic-link computed color equals its owning foreground. Settled light pairs are magic RGB41,43,40; links RGB83,89,80; clear/remove RGB98,105,94; white dropzone with dark text. Do not use `light-colors.json` or the initial `matrix.json` as final utility contrast evidence: they preserve the diagnostic intermediate state. The final screenshots replace earlier files at the same names. No repair is warranted for those discarded provisional findings.

## Three gates

- Functional correctness: **failed against the literal all-enabled-target 44px criterion**, solely due to the fixture header link above. Migrated shared interaction scope passed the observed browser behaviors. Live external operations and production consumers remain untested.
- Perceptual/product quality: **passed for the directly viewed, settled local utility/maps scope**. Six-width captures and DOM evidence support responsive layout; only representative screenshots were directly viewed. This is not final art acceptance or approval of every production overlay.
- Release readiness: **untested**. Shipping destination and release are unapproved; no promotion action occurred. Parent owns integrated package/release gates.

Evidence: `evidence/utility-maps-independent-r09/` contains owning/settled matrices, 36 auth mode rows, menu/modal/file/calendar receipts, maps selection/focus/pan/zoom/label receipts and screenshots. Worktree disposition: preserved at the existing `t3/canon-design-system-redesign` worktree; source unchanged by this reviewer. Ego taskspace 29 closed at completion. Ego reported an available update; no upgrade was performed.
