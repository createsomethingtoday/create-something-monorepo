# GiGi 0.2.23 workspace search — CRE-2365

User authority: import Danny's global search into regular GiGi. [Source handoff](https://halfdozensolutions.slack.com/archives/D07NUM2EAP8/p1793988102086709). Owning tracking: [CRE-2365](https://linear.app/createsomething/issue/CRE-2365/import-danny-global-search-into-regular-gigi).

Runtime source is clean `9cc6800c5dca846c0aa1b3a0cfc0de773f0e0b48`. Both compiler manifests recorded that SHA and `GIGI_BUILD_SOURCE_DIRTY=false`; the signed executable contains the SHA. Later receipt and Agency metadata commits do not change desktop runtime. Artifact: 84,790,943 bytes; SHA-256 `372a4e754fd98530ca48f0af823f7002b4f135bdece09e80cfa2e5a60b0f4bdc`. The public pointer and production promotion require the normal PR/check/merge/deploy path.

## Scope and acceptance

Selected feature commit `b76d3d03c13eb098dff2edc26e809fec0a2e9cf9` from [Grantbot #1426](https://github.com/gigi-team/grantbot/pull/1426) was exported with `git diff --binary --relative=sandbox/gigi-desktop <commit>^ <commit> -- sandbox/gigi-desktop/apps/gigi-desktop` and applied with reviewed three-way reconciliation. Only search was imported. Onboarding context in three conflicting hunks was excluded; Grantbot navigation #1424 and concurrent chat/Today changes remain separate. Current regular navigation and setup are retained.

This serves Database (workspace-owned, bounded local reads) and Automation (Search UI/tool execution); the existing unsaved-edit Judgment guard remains authoritative. Search button and Command/Control-F open without navigation; grouped People/Gigs/Finances/Tasks matches page independently; selection uses guarded record navigation. Empty, retry, timeout/stale reads, focus containment, arrow/Enter/Escape behavior and private workspace isolation are required. Search adds no provider connection, migration, financial write or record import.

## Three quality gates

| Gate | Result at candidate checkpoint | Evidence and limits |
| --- | --- | --- |
| Functional correctness | Passed | 345/345 desktop checks with signed companion; 325/325 integrations with bundled CTX; integration typecheck; 175 Rust checks on imported Rust logic, selected search regression repeated on final source. Exact companion source-proposal process acceptance passed 39 calls with synthetic profiles and no provider calls. Independent final Sol repeated all desktop tests, 27 focused regressions, Rust search and async input fixture; exercised native destinations and unsaved-edit protection. |
| Perceptual/product quality | Passed within measured scope | Actual native Studio/Paper/Midnight, grouped/empty results, scrolling, paging, keyboard focus and unsaved draft guard viewed. First review exercised 1280x840 and found a clipped Settings button at 880x620 on Appearance. Final rebuilt app shows all header controls at measured 881x621 with about 20px right clearance. Exact final 880x620 remains untested after bounded window-tool attempts; no CSS breakpoint exists between those widths. OS IME input and screen-reader speech remain untested. |
| Release readiness | Installer passed; production promotion pending | Developer ID PRP5VQQPPB, both notarizations Accepted/stapled; deep/strict signatures, Gatekeeper, image integrity and mounted-app equality pass in release-verification.json. Immutable upload and independent full-download hash/signature verification passed. The pre-upload 404 was cached at the canonical URL (HIT); an exact-URL purge cleared it. Canonical HEAD returned 200 and GET range returned the expected file prefix, while the complete query-qualified download matched the exact size/hash and passed the installer verifier. Required CI, merge, Agency deployment and canonical page verification remain before closeout. |

See [independent final report](INDEPENDENT_RETEST.md), [repaired header](native-header-881x621.png), [actual search](native-search-881x621.png), and [failing header before repair](before-header-clipping.png). Screenshot dimensions include the native window at 2x; retain the final measurement limit.

## Review findings and regression checks

1. Result refresh replaced the composing input. `workspace-search.test.mjs` input-retention test failed on import source f252dbe6a and passed after f3c4e1e7. Results now update without replacing the live input; page redraws defer until closing Search.
2. Async page completion could detach the input ancestor. Independent `async-page-refresh.mjs` failed on f252dbe6a and passed on current source. Retained here for reproduction: `node docs/internal/gigi-search-0223/async-page-refresh.mjs "$PWD/apps/gigi-desktop/web/app.mjs"`. This is an offline app-entrypoint fixture, not OS IME acceptance.
3. At minimum width, the imported 68px Search trigger clipped Settings on a long active navigation label. 9cc6800 restores the existing 30px compact icon-only trigger at <=1000px. Native re-test: open Appearance, verify all header controls without horizontal scrolling, open Search, query Micah, page Tasks and check focus; repeat all themes. The rebuilt header passed within the measured limit above.

Ground advisory: 7 analyzable files, 0 findings; duplicate/orphan coverage partial. Rust, CSS, HTML and metadata are excluded by the requested Ground checks and were assessed by their own tests/rendered checks. Ground does not establish those files checked-clean.

## Comparative review

Initial approach: retain GiGi's existing header and themes; overlay workspace-scoped groups, keep keyboard instructions visible, and route results through the existing record guard. The following low-resolution reference images were directly inspected in authenticated Mobbin standard search `workspace search dialog grouped results`. Static references inform hierarchy and states, not motion timing. No reference images, source assets, copy or layouts were imported.

| Reference | Why | Adopt/adapt | Avoid | Source |
| --- | --- | --- | --- | --- |
| Stripe | Categories make broad results legible | Adapt clear group headings | Extra tabs and Stripe styling | https://mobbin.com/screens/86771aa2-510b-484f-988e-d4a76085a01a |
| incident.io | Keyboard hints explain selection | Adapt visible move/select hints | Incident severity and action semantics | https://mobbin.com/screens/f1b4ccbd-d6f6-4ccb-89b5-3c48d9fd2151 |
| Base44 | Global search spans object types | Adapt named result groups | Product-specific page shortcuts and visual treatment | https://mobbin.com/screens/75879dec-40ee-4ccb-adc3-0afc8c63c668 |

## Recovery and ownership

Do not overwrite immutable version objects. Rollback is the existing 0.2.22 installer (`dd159be1c8ccc122692efbd913d69cb152659facfec4e06be93e2d97ba40eb4e`) and reverting the scoped source/pointer changes through the regular review/deploy path. Beta updates are manual: back up the workspace and quit GiGi before installing. This task did not replace /Applications/GiGi.app. Fresh Mac setup, live Google imports, subscribed-provider chat requalification and physical-phone acceptance were not repeated.

Worktree disposition: preserved at `/private/tmp/cre-2365-gigi-global-search`, branch `codex/cre-2365-gigi-global-search`, until production promotion and durable Linear closeout.
