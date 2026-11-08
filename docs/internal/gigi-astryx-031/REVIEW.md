# GiGi 0.3.1 full React / Astryx rewrite — CRE-2373

[PR #2216](https://github.com/createsomethingtoday/create-something-monorepo/pull/2216) implements the user's full-rewrite instruction. [CRE-2373](https://linear.app/createsomething/issue/CRE-2373/gigi-full-react-and-astryx-application-rewrite) owns final CI, artifact publication, independent download, merge, Agency deployment and canonical-page readback. This packet records the qualified local installer. Publication and production closeout are recorded in that issue after the normal review/check gate.

## Scope and authority

React 19 and actual Meta Astryx Core/Neutral components replace GiGi's complete frontend: onboarding, shell/Today/attention, record collections/editors/relations, agenda/history, settings/consent/import, Appearance, chat/search/approvals, Music/artwork and Instagram. Tauri ships Vite-built dist. The legacy renderer remains a regression reference and is excluded from the shipped entry. Fonts and notices are local.

Database: no schema or record migration. Automation: replace rendering while preserving native transactions. Judgment: preserve source consent, stale-write checks, approvals, exact retry/receipt recovery and navigation guards. Theme IDs and preference schemas stay compatible. Authority is the user's full-rewrite request and repository production-closeout instructions. No provider send, new consent, credentials, billing or real-profile mutation is included.

## Exact local artifact

Frozen runtime source `f62331cb267e1e6f446d216364f6c272db630beb` is embedded in the signed executable and independently checked. Both compiler manifests recorded dirty=false for app/integrations inputs; see [build-source.json](build-source.json). Subsequent metadata/evidence commits do not alter this payload.

`GiGi-0.3.1-arm64-private-beta.dmg`: **85,090,374 bytes**; SHA-256 `6cc6de0975e1f2819d351c991df5b783352c32377e0bbe5df133061b1555d091`. Main executable SHA-256 `b23a25e7c3bf886d6928eceb5a17c2e2f0d2d6dfff8a77d6dcfc5515b7425bda`. Bundle version is 0.3.1. Developer ID Create Something LLC, team PRP5VQQPPB. Apple accepted app `787ebde3-5e31-4a6b-b8c5-2e1c56f38bfc` and DMG `9a66eb4b-3571-40c3-bd33-ce3e93a6b9cc`; both have stapled tickets.

The [release verifier](verification.json) passed signatures, hardened runtime and team on both MacOS binaries and all first-party Resources companions, upstream CTX identity, Gatekeeper, staples, disk-image integrity and mounted-app byte/mode equality. Its source-SHA argument is only a caller assertion; embedded-SHA and compiler evidence separately establish provenance.

Planned immutable destination: `https://media.createsomething.io/releases/gigi/0.3.1/GiGi-0.3.1-arm64-private-beta.dmg` in create-something-assets, Create Something account. The 0.3.1 key was absent during preparation. Upload is held until required CI/review passes; it must independently prove absence again, never overwrite, download the entire object and repeat the full verifier before canonical promotion. Publication/download receipts belong in CRE-2373.

## Three gates

| Gate | Result at packet preparation | Evidence and limits |
| --- | --- | --- |
| Functional correctness | Passed within tested scope | Independent 346/346 desktop checks with exact signed MCP, 11/11 actual React regressions and zero browser errors. Browser acceptance: 19 routes/12 appearances and 16 creator safety checks. Unchanged integration/domain code passed 325 integrations with real bundled CTX, typecheck and 175 Rust tests. Signed source-conversion process acceptance: 39 synthetic calls and zero providers; real companion/CTX helper passed. |
| Perceptual/product quality | Passed within inspected scope | Parent and independent Sol 6.1 directly viewed native output. Incremental native qualification covered three themes, comfortable/compact, 1280x840 and approximately 880x620 content, records/guards/search, local pickers/audio/artwork and Instagram drafts. The 0.3.1 link flow was independently retested and captured below. Final Music/summary native re-test passed on the frozen source; captures and limits are recorded below. |
| Release readiness | Local installer passed; publication/production pending | Exact app and DMG verification passed. Agency checks/build and 27 release/landing tests pass; Svelte has 0 errors/0 warnings. Static beta HTML passes six widths with JavaScript disabled. Required PR checks/reviews, immutable upload/download, merge/deploy and canonical readback remain before closeout. |

Node's baseline includes legacy-renderer fixtures; the actual React harnesses separately exercise the new entry. Provider/publication fixtures do not prove live outcomes. Astryx doctor: 20 pass, 0 fail, 2 font-proof warnings; local font loading and zero external requests are separately checked. Theme drift and retired-provider checks passed; auth code and dependencies did not change in 0.3.1.

## Review corrections and final native re-test

Earlier independent native passes found unsupported artwork actions, window scrolling that missed AppShell's main scroller, and collapsed Gigs Filters on Back. Corrections were independently retested through the 0.3.0 candidate. Native selectors use Astryx sheets because the anchored WebKit currency menu did not display; ISO date input shares that native fallback. Prior evidence and negative/positive regressions are retained in [the superseded candidate packet](../gigi-astryx-030/REVIEW.md).

GitHub then found a stale link-record selection after changing entity. The current public UI regression failed with `person-1 !== ''`. 0.3.1 keys the relationship and record Choices by entity, clearing stale state. All 11 regressions pass. On the earlier signed 0.3.1 candidate (`4a2d8ed`), Sol 6.1 selected a Person, changed Record type to Tasks, observed the old record clear and Relationship reset, confirmed an empty replacement blocks submission, then selected a synthetic Task and saved. Readback and navigation confirmed the exact Task and reciprocal gig relation. [Cleared selection](native-link-cleared.png) and [saved relation](native-link-saved.png) are exact captures of that candidate; this flow is unchanged in the final payload. The parent directly viewed both. The final affected-flow re-test is recorded separately below.

Further GitHub review found that Music Clear filters left the old search visible and that Today omitted income/expense direction. An independent parity audit also confirmed missing event kinds, call/set times, calendar ranges/all-day meaning and original gig type in Today/Gigs. These findings were corrected in frozen source `f62331c`: Music holds its editable search draft separately from the applied query, explicit Clear resets both, and ordinary refreshes preserve unsent text; event rows use the shared schedule model and attach metadata as accessible descriptions. Today money reads direction from the supplied fields, while compact Money projections do not invent an unknown label. Actual React checks failed before and passed after: [Music before](music-query-before.json), [Music after](creator-result.json), [summary before](summary-labels-before.json), [summary after](regressions-after.json). The independent rendered audit confirmed all event/date/time/direction presentations and zero browser errors: [audit](parity-audit-result.json).

Final native affected-flow re-test passed on the exact signed frozen source. Sol 6.1 verified visible Music clearing and focus retention, Income, Calendar/all-day and Performance/call/set/original-type labels. All 346 exact-MCP baseline checks, 11 actual React regressions and 16 creator checks passed independently. The parent directly viewed final [Music](native-music-cleared.png), [Gigs](native-event-metadata.png) and [Today](native-today-metadata.png) captures. No unresolved findings remain. [INDEPENDENT_RETEST.md](INDEPENDENT_RETEST.md) distinguishes the final native states from synthetic-only expense/unknown/crew/range variants and prior incremental native coverage.

The 0.3.0 object had already been uploaded before that finding; it remains immutable and was never promoted to canonical pages. 0.3.1 supersedes it. The same disposable QA profile was used to verify compatible saved records; /Applications/GiGi.app and user data were not replaced. QA app and launcher safely quit.

## Promotion and recovery

After normal CI/review, upload only the exact local identity above and independently verify full download bytes and the mounted app. Merge PR 2216 through its normal gate, allow the existing Agency Pages workflow, then read both canonical /gigi and /gigi/beta for 0.3.1, filename, size, hash and rollback. Record deployment ID/source and repeated canonical readback in CRE-2373. A CI or deployment receipt alone is not live acceptance.

Rollback is the existing [0.2.24 installer](https://media.createsomething.io/releases/gigi/0.2.24/GiGi-0.2.24-arm64-private-beta.dmg), SHA-256 `be95fbe0dd11cfeb06e7455cd662a3a5b1406d6f3c29d02d772f59f19c2e0e62`, plus scoped source/pointer revert through review/deploy. Do not use the superseded 0.3.0 candidate as rollback. Manual updates require a local backup and app quit.

Fresh installation, older macOS floor, real Google/provider execution, phone access, notification clicks, screen-reader speech/IME, audible quality and human acceptance remain unverified. Native background-refresh failure injection was not repeated; fixtures cover that behavior. These limits do not authorize extra provider or user-profile actions.

Worktree disposition: preserved at `/tmp/cre-2373-gigi-astryx`, branch `codex/cre-2373-gigi-astryx`, through production closeout and for rollback evidence. Unrelated checkout work was not edited.
