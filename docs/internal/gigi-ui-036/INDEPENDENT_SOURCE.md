# Independent source re-test: CRE-2406 / GiGi 0.3.6

Reviewed source: `41485b6e8aeecc64979a4ff9ad4defdf05535f94` in the supplied T3 worktree. Read-only source review; no repository edits, promotion, profile changes or installer qualification.

## Finding requiring correction

P2 — Money drops already-loaded rows after a failed view change. `ui/controller.mjs:687-693` caches the first successful page, while `loadMore` at lines 1150-1152 appends visible rows without updating `financeSnapshot`. Reproduction: with the native twenty-results-per-page contract, read 25 Overall records across two successful pages, then make the Receivable read fail. The UI falls back from 25 visible records to 20, retains total25, and disables pagination. Update the workspace/view-scoped snapshot after successful finance pagination and preserve a regression for this sequence.

`review.mjs` exercises the actual React renderer/controller. Its Vite fixture adapter adds only native-equivalent pagination; it writes no repository files. `finance-retention.json` records before rows25/snapshot20 and after rows20/snapshot20; `finance-retention-880.png` shows the result. The original refinement fixture returns all finance rows without pagination, so it cannot detect this defect.

## Independent evidence

- Active renderer `test:refinement`: 14/14 pass (`refinement.txt`). These are synthetic bridge fixtures.
- Release verifier unit suite: 19/19 pass (`verifier.txt`), including new helper absence/executable/signature/team/hardened-runtime rejection. These mock signing commands; they do not qualify a real app.
- Existing locally compiled native test executable: 2 finance, 1 Social MCP search and 2 Maps scope/query tests pass (`native-*.txt`). This re-executes tests without a concurrent cargo build; it does not assert clean compiler provenance.
- Independently hashed 195 protected files against actual checkout plus canonical baseline574adfee: all equal (`protected-source.json`). Approval, memory, source-import/recovery and integration sources remain byte-identical outside the reviewed controller/native additions.
- Actual React output exercised at880x620 for Studio Gigs/Places/Money, Paper Settings and Midnight Profile. Each document width/scrollWidth880; no page-level horizontal overflow. Directly viewed screenshots for Gigs, Settings, Profile and Maps loading/error. Existing calendar has internal horizontal scrolling at minimum width.
- Independent delayed Maps request with same-record address change: stale preview not rendered. Error remains explicit and Open in Maps remains available after preview failure. No page errors.
- Static review: native Maps re-reads saved record under supplied workspace before spawning; fixed Apple Maps URL host with encoded query; no current-location API. Finance segments read the complete workspace before pagination, strict date/timezone criteria. Social query is parameterized literal substring over full workspace with filtered count. Map helper included in first-party executable/signature/runtime and mounted-DMG equality inventory. Build watches native source.

## Gates

- Functional correctness: **failed pending the P2 retained-view fix**; focused existing checks otherwise pass within the limits above.
- Perceptual/product quality: **passed for directly viewed synthetic Chromium states**. Approved green frame, Astryx typography, row hierarchy and explicit Maps feedback remain coherent. Native WebKit, real map image, media and human acceptance untested.
- Release readiness: **untested**, and source-retention finding must be resolved first. Parent owns signed native MapKit behavior, compiler provenance, signing/notarization, exact-DMG verification, downloads and promotion.

Screenshots/logs/scripts are under `/tmp/gigi-036-independent-source-review`. No repository source changed by this review.
