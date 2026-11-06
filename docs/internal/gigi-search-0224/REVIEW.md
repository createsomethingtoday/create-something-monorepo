# GiGi 0.2.24 workspace search — CRE-2365

[User handoff](https://halfdozensolutions.slack.com/archives/D07NUM2EAP8/p1793988102086709) authorized import into regular GiGi. [PR #2206](https://github.com/createsomethingtoday/create-something-monorepo/pull/2206) and [CRE-2365](https://linear.app/createsomething/issue/CRE-2365/import-danny-global-search-into-regular-gigi) own promotion and receipts. Source of truth: apps/gigi-desktop; public release pointer: packages/agency/src/lib/data/gigiBeta.ts.

The selected feature is Grantbot commit `b76d3d03c13eb098dff2edc26e809fec0a2e9cf9` only. Onboarding, navigation #1424 and concurrent chat/Today work were excluded. See the [original import/design record](../gigi-search-0223/REVIEW.md) for reconciliation, bounded Ground exclusions, directly inspected Mobbin references and earlier regression evidence. 0.2.23 is a superseded immutable candidate; it was not promoted to canonical pages. 0.2.24 additionally fixes GitHub review's loading-state finding.

## Acceptance and tier ownership

Database: bounded, workspace-owned local reads; no provider connection, migration, financial write or record import. Automation: Search/Command/Control-F opens without page navigation, groups People/Gigs/Finances/Tasks, pages groups independently and handles loading/empty/retry/stale/timeout. Judgment: selecting a result uses the existing unsaved-edit guard. Native keyboard/focus recovery and input preservation during result/page refreshes remain required.

## Exact artifact

Clean runtime source `cdc0dd1953ff6bfc1ec517d56c191362a1f554f0` is embedded in the signed main executable. Both compiler manifests report that SHA and dirty=false; see build-source.json. Main and native companion were built from this frozen source; Resources companions were refreshed before staging/signing. Later receipt and Agency metadata changes do not alter runtime source.

[GiGi-0.2.24-arm64-private-beta.dmg](https://media.createsomething.io/releases/gigi/0.2.24/GiGi-0.2.24-arm64-private-beta.dmg): 84,790,250 bytes; SHA-256 `be95fbe0dd11cfeb06e7455cd662a3a5b1406d6f3c29d02d772f59f19c2e0e62`. Developer ID Create Something LLC, team PRP5VQQPPB. App notarization `e21f5ea8-c95a-49d2-9ea0-012cb72d0243` and DMG `0e7f16e9-6744-48c9-8ba6-7f7ad155f055` are Accepted/stapled. Release verifier checks signatures, Gatekeeper, staple tickets, disk-image integrity and equality of the mounted app with the qualified app.

## Three gates

| Gate | Candidate result | Evidence and limits |
| --- | --- | --- |
| Functional correctness | Passed | 346/346 desktop checks with exact signed companion; 325/325 integrations with bundled CTX; integration typecheck; 175/175 Rust checks on 0.2.24. Signed companion source-proposal process acceptance passed 39 synthetic calls with no provider calls. Independent Sol repeated all desktop checks, independently red/green tested the new loading regression and exercised native behavior. |
| Perceptual/product quality | Passed within measured scope | Independent Sol personally viewed exact 0.2.24 Studio/Paper/Midnight at 881x621 native points (1762x1242 screenshot pixels). Entire long-label header visible; search input/footer contained while results scroll. Button/shortcuts, paging, keyboard focus, grouping/isolation, four destinations and unsaved drafts passed. Exact final 880x620, OS IME and screen-reader speech are untested. |
| Release readiness | Installer passed; production promotion pending | Signed/notarized/stapled app and DMG qualification passed. Immutable upload uses existing authorized Workers token after backend read proves key absent; no credential/permission changes and no overwrite. Canonical full download matched 84,790,250 bytes and be95fbe0... checksum and repeated the complete installer verifier; see download-receipt.json/download-verification.json. Final required CI/review resolution, merge, Agency deploy and canonical page verification remain before closeout. |

See [independent final report](INDEPENDENT_RETEST.md), [native header](native-header-881x621.png), and [native search](native-search-881x621.png). The app was safely quit; test preferences/drafts belonged only to the disposable synthetic profile. Installed /Applications/GiGi.app was not replaced.

## GitHub review correction

[Finding](https://github.com/createsomethingtoday/create-something-monorepo/pull/2206#discussion_r4496265429): opening Search during a run()-wrapped page read retained the root loading class after completion. Since .loading disables pointer events, results, pagination and Close could remain unclickable until Escape.

The new app-entrypoint test holds the actual page navigation read, opens Search, finishes the read and asserts loading=false while retaining the input ancestor, focus and unfinished text. Independent current-fixture/pre-fix-app execution fails on head10c71a9 specifically with loading=true; current source passes. See loading-regression-before.txt and loading-regression-after.txt. Reproduce current: `node --test --test-name-pattern='finishing a page read' apps/gigi-desktop/web/workspace-search.test.mjs`.

Fix 2eb1b7836 moves loading reconciliation before the retained-search early return. cdc0dd195 corrects fixture text entry timing after opening Search. The previous startup input fixture did not assert run()-wrapped navigation loading state; the new regression closes that gap. Held-read failure injection is offline, not native injected latency. Native checks cover the actual signed app's pointer/keyboard interactions and record guard.

## Promotion and recovery

Required PR checks and resolved review threads govern merge; no bypass. Agency production deploy follows its existing main workflow. Verify both /gigi and /gigi/beta point to 0.2.24, and verify version, filename, bytes, checksum and rollback link on canonical responses. These pages use no-store. Preserve production deployment ID/source and live readback in CRE-2365.

Rollback: existing 0.2.22 installer (`dd159be1c8ccc122692efbd913d69cb152659facfec4e06be93e2d97ba40eb4e`) plus scoped source/pointer revert through normal review/deploy. Never replace a versioned object. Beta updates remain manual: back up the workspace and quit before installing. Fresh Mac setup, real Google imports, subscribed-provider chat requalification, physical-phone access and human acceptance were not repeated.

Worktree disposition: preserved at `/private/tmp/cre-2365-gigi-global-search`, branch `codex/cre-2365-gigi-global-search`, until final CI/production verification and durable Linear closeout.
