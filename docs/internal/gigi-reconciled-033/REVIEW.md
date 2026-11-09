# GiGi 0.3.3 reconciled release qualification

CRE-2377; PR #2220. User authorized both the separate Danny DEV build and public installer. Danny’s published interface remains the visual authority: grouped Work/Admin/Network/Platform navigation, weekly Today and fixed deadlines, Calm Tasks/Gigs, green themes, combined Search and guided setup. The technical foundation supplements it.

## Source and review corrections

Public runtime source `fa37fb904a47b29476bc7a7089bd9438e3a3f781`, clean tree `7ea4f79adf7404dcd9459911217e88b5e8dc34b0`. DEV source `f788f542a79edf140253192e956df98bb26e79b9`, clean tree `8c291a052a23fd4edab250f5aa209342ec13d3bb`, tracked privately in Grantbot PR #1431. The corrected Work, setup, navigation and shared stylesheet are byte-identical; standalone DEV browser harness resolution remains deliberate.

Automated review found two valid gaps in the initial 0.3.2 candidate. Actual Astryx Grid, Stack, Section, ScrollableArea and List/ListItem components now own ordinary Work, setup and navigation layout and spacing. Raw layout/text containers and three per-view stylesheets are removed. Shared product CSS retains state, native menu/calendar positioning and decorative composition. Partial/cancelled imports expose an explicit **Preview remaining records →** action, including a null cursor for the first page, through existing scoped recovery. Previewing does not save records; review and approval remain required. Both regressions were demonstrated before correction. The 0.3.2 public candidate was never uploaded or promoted; its historical qualification packet is retained.

## Exact public artifact

`GiGi-0.3.3-arm64-private-beta.dmg`: **91,823,319 bytes**, SHA-256 `71fbca27313345d00db2a2604a50324e074bd0766aacd49768761fa43576547d`. Signed main SHA-256 `fe1880e5b734e4114e86f0bf82f4e258f4503b7b999c70ad72f54ccd36397851`. Production identity `agency.createsomething.gigi`, version 0.3.3, Developer ID Create Something LLC / PRP5VQQPPB. Original main `c2c0b063fff7650cd7c98a6683c371e879dcc07a6ed1a43f029bc0c645a54fc6` remains unchanged. [Identity](release-identity.json), [compile](build-source.json), [full verifier](verification.json), [signature-only equivalence](payload-equivalence.json).

Apple accepted app `3ceb6a68-672f-49e8-a7ae-fa1c20bc2347` and DMG `95df105b-1249-46fa-92b5-e55d9239d08e`; both are stapled. Upstream CTX bytes/signature are preserved. Both signed MCP locations passed twelve total protocol/readback calls with 41 tools each. Source-proposal acceptance passed 39 calls including process restart, scoped receipt recovery and rejection cases, using temporary synthetic profiles and zero provider calls.

## Three gates

- Functional correctness: **passed within recorded scope**. 410 desktop checks passed, two skipped; 190 current Rust checks passed. Integration source is unchanged by the 0.3.3 review corrections; the reconciled baseline passed 340 integration checks, one skipped, plus typecheck. A fresh independent Sol 6.1 reviewer reran all five actual React suites in both public and DEV trees: 19 routes, 24 appearance combinations, creators, guarded navigation, Work and twelve guided-setup outcomes. Four terminal import/cursor cases passed in both trees.
- Perceptual/product quality: **passed within recorded scope**. Authors, parent and independent reviewer directly viewed actual output against Danny’s baseline, including native-minimum, desktop, narrow, Paper/Midnight and reduced motion. Independent keyboard/dirty-navigation checks passed. Native QA used a separately identified same-source app and synthetic data: saved gig/date/call/status readback, grouped-menu keyboard behavior, exact row focus return, task creation/completion, combined Search, fixed financial deadlines through week navigation and restart persistence. [Native receipt](native-runtime.json). Full-page Chrome screenshots can repeat sticky pixels; viewport captures and DOM checks establish one header.
- Release readiness: **local artifact qualification passed; production promotion conditional**. Exact-source clean compile, independent source/artifact review, signatures/runtime/Bun entitlements, notarization/staples, Gatekeeper, DMG integrity and mounted payload equality passed. The current page identity/copy passed 22 tests, Agency check/build and six-width no-JS rendered review. This packet is a local qualification snapshot, not proof of publication.

Fresh signed-GUI installation, older macOS/macOS 13 floor, live Google consent/import, agent provider turns, physical phone, OS IME/screen-reader speech, audible/notification quality and human acceptance remain unverified. No production backend or database migration is included. Original public installation and existing DEV data are preserved.

## Promotion, recovery and evidence

After current CI/review gates pass, the separate release lane must recheck R2 key absence and anonymous HTTP 404, upload the exact immutable bytes without overwrite, then fully download anonymously and rerun the production verifier before canonical page promotion. Normal PR merge and the existing Agency production workflow must be read back by exact source SHA; repeatedly verify canonical `/gigi` and `/gigi/beta` identity, checksum/bytes/URL and no-store/noindex behavior. Final destination, merge/deploy and Slack receipts belong in CRE-2377 before closeout.

Rollback is the previously qualified 0.3.1 installer at `https://media.createsomething.io/releases/gigi/0.3.1/GiGi-0.3.1-arm64-private-beta.dmg`, 85,090,374 bytes, SHA-256 `6cc6de0975e1f2819d351c991df5b783352c32377e0bbe5df133061b1555d091`; a full rollback download was independently rehashed. Revert only release-page metadata to that qualified identity if promotion recovery is needed; keep immutable release objects and local data.

Full local evidence: `/Users/createsomething/Documents/GiGi Reconciled Release/2026-11-09/{review-fixes,public-release-033,dev-release-033}`. Independent report: [INDEPENDENT_REVIEW.md](INDEPENDENT_REVIEW.md). Source, author, reviewer and release lanes remain distinct. Worktree disposition is recorded in CRE-2377 at final handoff.
