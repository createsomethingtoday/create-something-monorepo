# GiGi 0.3.0 full React / Astryx rewrite — CRE-2373

[PR #2216](https://github.com/createsomethingtoday/create-something-monorepo/pull/2216) implements the user's full-rewrite instruction. [CRE-2373](https://linear.app/createsomething/issue/CRE-2373/gigi-full-react-and-astryx-application-rewrite) owns final CI, merge, Agency deployment and canonical-page readback. This packet records the qualified immutable installer; production closeout is recorded in that issue.

## Intent and authority

The complete GiGi frontend now uses React 19 and actual Meta Astryx Core/Neutral components. Tauri packages Vite-built dist: onboarding, shell/navigation, Today/attention, all record collections/editors/relations, agenda/history, settings/consent/import, Appearance, chat/search/approvals, Music/artwork and Instagram. The legacy renderer remains a regression reference and is excluded from the shipped entry. Fonts and license notices are bundled locally.

Database: no SQLite schema or data migration. Automation: replace the renderer while retaining native APIs and transaction behavior. Judgment: preserve source consent, stale-write checks, approval, exact retry/receipt recovery and navigation guards. Saved theme IDs and preference schemas remain compatible. Authority is the user's full rewrite and repository production-closeout instructions. Scope is CREATE SOMETHING's owned GiGi beta and Agency release pages; no provider send, new consent, credentials, billing or real-profile write.

## Exact artifact

Runtime source `0e18293d04c625435ecc996c2187f6f64341844d` is independently found embedded in the signed executable. Both compiler manifests recorded dirty=false for the app/integrations inputs; [build-source.json](build-source.json) preserves them. Subsequent release metadata/evidence changes do not change the payload source.

[GiGi-0.3.0-arm64-private-beta.dmg](https://media.createsomething.io/releases/gigi/0.3.0/GiGi-0.3.0-arm64-private-beta.dmg): **85,090,921 bytes**, SHA-256 `4f9f25ef6eff3d39010ca35bc14eb2ac784e6c0c40e07482c5e578903215fb01`. Main executable SHA-256 `4558a4468f117e184ddaefd98b0a8c51c76673241964e4c03f610a0c049f2d86`. Developer ID Create Something LLC, team PRP5VQQPPB. Apple accepted app submission `81c4339e-311b-4549-9558-261026babb91` and DMG submission `effcc4fe-d195-4188-ab61-35c6f22ec73a`; both are stapled.

The [local verifier](verification.json) and [independent downloaded-installer verifier](download-verification.json) passed signature/runtime/team checks on both MacOS executables and all first-party Resources companions, upstream CTX identity, Gatekeeper, stapled tickets, disk-image integrity and mounted-app byte/mode equality. The verifier's source SHA argument is a caller assertion; embedded-SHA and compiler-manifest evidence separately establish build provenance.

## Three gates

| Gate | Result | Evidence and limits |
| --- | --- | --- |
| Functional correctness | Passed within tested scope | Independent 346/346 desktop checks with exact signed MCP; 325/325 integrations with bundled CTX; integration typecheck; 175 Rust checks. Actual React browser harness: 19 routes, 12 appearances, 11 creator checks and 8 focused regressions. Signed source-conversion process acceptance: 39 synthetic calls, zero providers. Real bundled CTX helper passed. Native acceptance is incremental and described below. |
| Perceptual/product quality | Passed within directly inspected scope | Parent viewed native onboarding/selection and final Back captures; independent Sol 6.1 viewed Studio/Paper/Midnight, comfortable/compact, 1280x840 and 1762x1242 screenshot pixels (881x621 outer points, approximately 880x620 content). Actual native records,selectors,search,media/artwork and local drafts were exercised. Screen-reader speech,IME and audible quality remain untested. |
| Release readiness | Passed for immutable installer | Exact app/DMG and independently downloaded bytes qualified. Existing authenticated upload path proved the R2 key absent,then created it without overwrite; separate connector readback confirmed 85,090,921 bytes. Agency's 27 release/landing tests,build and full check pass (Svelte 0 errors/0 warnings). Required PR/production closeout and its live evidence are tracked in CRE-2373. |

The baseline Node suite includes legacy-renderer fixtures and does not by itself validate React. The browser harnesses exercise the actual new entry/components; development backends are excluded from production. Provider/publication tests use fake operations and do not establish a real provider outcome. Astryx doctor passed 20 checks with 0 failures and 2 font-proof warnings; Vite's local-font alias and actual local font loading/zero external requests are separately checked. Generated-theme drift and retired-identity-provider checks pass.

## Independent native qualification and fixes

Sol 6.1 first exercised synthetic native task create/edit/date/readback, Keep/Discard, grouped search/Command-F/focus, Music file-picker cancellation/import/organization and playback controls, PNG selection/full-image preview, Instagram local saves/review blocking, source-consent/backup display and three themes at default/minimum sizes. All data belonged to a disposable profile; /Applications/GiGi.app and user records were not replaced.

Review found unsupported task artwork actions and window-scroll calls that missed Astryx AppShell's internal scroller. Those were fixed and independently retested on 39f4128. A subsequent exact Back check found expanded gig filters lost their state; the final 0e18293 candidate retains that per-workspace UI state and independently preserves expanded geometry, visible position and row focus. [Before](native-gigs-before-back.png) and [after](native-gigs-after-back.png) are exact final-app captures. Final 8/8 React regressions and 346/346 exact-MCP checks passed after this fix. No unresolved native findings remain.

Other regressions preserve active Music/Instagram controllers and dirty guards; visible setup errors/retry after partial profile creation; native selector sheets with all choices and focus return; supported artwork destinations; and top-of-page navigation. Native WebKit advertised CSS anchors but failed to display the anchored currency surface, so native controls use Astryx modal sheets and ISO date inputs. See the permanent harness and retained negative/positive JSON receipts. No blind retry or publication bypass was introduced.

## Distribution and recovery

The new object is `releases/gigi/0.3.0/GiGi-0.3.0-arm64-private-beta.dmg` in create-something-assets, Create Something account. [Upload receipt](upload-receipt.json) records backend absence and public 404 immediately before creation. [Independent download](download-receipt.json) returned 200 with exact size/hash; CF-Cache-Status was MISS. Versioned objects are never overwritten. Agency's source pointer is pinned to that exact identity; canonical promotion follows PR2216 and the existing Agency Pages workflow.

Rollback uses the existing [0.2.24 installer](https://media.createsomething.io/releases/gigi/0.2.24/GiGi-0.2.24-arm64-private-beta.dmg), SHA-256 `be95fbe0dd11cfeb06e7455cd662a3a5b1406d6f3c29d02d772f59f19c2e0e62`,plus a scoped source/pointer revert through review/deploy. Beta updates remain manual: back up and quit before installation. Fresh Mac installation, older macOS floor, live Google import/provider execution, notification click routing, physical phone and human acceptance were not requalified. Native background-refresh fault injection and audible quality remain outside this validation.

Worktree disposition: preserved at `/tmp/cre-2373-gigi-astryx`, branch `codex/cre-2373-gigi-astryx`,for release evidence and rollback. Unrelated checkout work was not edited.
