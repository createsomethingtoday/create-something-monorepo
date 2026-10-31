# Inline repair validation

The inline repair is local and uncommitted. Independent Sol 6.1 review passes 17 focused tests and TypeScript checks. Coverage includes one readable section, long transcript pagination, corrections, A-B-A restoration, committed lost responses, unknown absent responses, stale owner rejection and shared continuation budgets. Six finalization regressions verify that partial projections retain an updating label and completed response-loss retries do not duplicate writes.

The full package passes 74/74 tests. The local workerd/D1 suite passes 13/13 tests, including twelve scenarios and their parent. TypeScript and scoped diff checks pass. These use intercepted deterministic providers. They do not establish live Notion positioning, archived-block behavior, latency or UI acceptance.

See [PRESENTATION_REMEDY.md](PRESENTATION_REMEDY.md) for the bounded provider acceptance plan. Live inline core acceptance passed through the existing CLI and local D1; see [LIVE_INLINE_ACCEPTANCE.md](LIVE_INLINE_ACCEPTANCE.md). The final top and bottom UI checks pass. Repair deployment and one-meeting replacement remain pending. Prior v2 evidence below is historical and must not be presented as inline acceptance.

---

# Latest local validation

The latest local revision passes synthetic validation through workerd and local D1. Provider responses are simulated. Live synthetic acceptance is recorded separately in LIVE_ACCEPTANCE.md. No extraction-quality result is claimed.

The validated implementation includes the forward-only cutoff gate, not just the original PR head. No production cutoff is selected. The revised changes are being published to the existing draft PR. Revised-head CI is required before release.

## Results

| Check | Result | Evidence and limit |
| --- | --- | --- |
| Primary rendition and original preservation | Pass | Local cron selects primary VTT over alternate CC. The complete 478-cue original, including BOM, CRLF, and emoji, reconstructs exactly. |
| Bounded parts and ordered index | Pass | Local Worker writes timestamp-bound parts. The simulator checks rich-text, child-count, and request-size budgets. Read-back reconstructs canonical text and checks the version hash. Simulator limits are not proof of live Notion behavior. |
| Long transcript and pagination | Pass | A 2,000-cue update leaves more than 100 stored artifacts. Worker verification and the test consumer traverse cursor-based responses. |
| Partial write and uncertain response | Pass | The simulator commits an append then returns 503. Readiness stays empty; retry reuses the exact receipt without duplicate artifacts. This models an unknown write outcome, not a measured production network failure. |
| Uncertain absent write | Pass | A reserved append with no visible receipt is never resent. Readiness stays empty and operator reconciliation remains necessary. |
| Duplicate delivery and source updates | Pass | Existing operator properties survive corrections. Unchanged verification performs zero provider mutations. Repeated and concurrent local queue events create no duplicate artifacts. Source corrections create new versions and preserve old versions. |
| Readiness races | Pass | Lease expiry and a source change during ingestion withhold readiness. Retry verifies the corrected source. Node/SQLite regressions also prove that disappearance revokes stale ownership. |
| Missing, duplicated, or altered text | Pass | Ingestion receipt checks reject missing and duplicate children. The test consumer rejects changed content under an unchanged version label. |
| Legacy exclusions | Pass | Synthetic pre-cutoff records are excluded from cron, replay, and stale queues. A pre-cutoff Notion page receives no mutation. Node regressions also cover old first-seen times, malformed timestamps, forged envelope identities, and missing or different cutoff markers. |
| Downstream version pre/post check | Pass in test consumer | The test-only consumer rebuilds original and canonical text from persisted index links, recomputes the version, and checks D1 before and after retrieval. Changed readiness or versions reject consumption. No production downstream consumer is connected. |
| Latest local TypeScript check | Pass | `tsc --noEmit`. |
| Latest local CI | Not run | Revised-head CI is pending publication. All seven CI checks passed on original PR head `1ffcf2096358100a863bc79a67f99eabdda64960`; that is separate evidence. |
| Live provider acceptance | See LIVE_ACCEPTANCE.md | One approved synthetic Notion fixture uses the actual core through the existing CLI. No live Zoom transcript is fetched. The retired Hub is not a dependency. |
| Task-extraction quality | Not tested | Retrieval correctness does not establish which tasks should be extracted. |

## Runtime and reproduction

Validation used Node 22.23.4, pnpm 9.15.0, installed Wrangler 4.110.0, and its Miniflare 4.20260708.1. The Worker retains its configured compatibility date, 2026-03-10, with `nodejs_compat`.

After the repository bootstrap, run these commands with the pinned Node runtime:

```sh
pnpm --filter @create-something/halfdozen-zoom-transcript-sync check
pnpm --filter @create-something/halfdozen-zoom-transcript-sync test
pnpm --filter @create-something/halfdozen-zoom-transcript-sync test:runtime
```

All 49 Node tests and all 12 runtime scenarios passed. Node reports 13 runtime tests because it also counts their parent test. The workerd run took about two seconds locally; this is not a production performance measurement.

The runtime harness bundles the current source and uses a programmatic Miniflare configuration. Its D1 database, credentials, queue, and provider data are synthetic. It does not load production bindings or secret files. Every outbound Worker request is intercepted; destinations outside the simulator are rejected. No external provider connection is made.

Scheduled events and queue deliveries use the supported local Worker APIs. The real local queue producer sends to a capture consumer. Tests then deliver captured payloads to the ingestion Worker with `Fetcher.queue` so failures and retries remain deterministic. This verifies the Worker handler and local D1 behavior. It does not verify elapsed retry delays, broker redelivery policy, or dead-letter delivery.

The test consumer calls the simulator's paginated REST handler and uses persisted data rather than a fixture plan as its checksum oracle. It is validation code for the proposed readiness contract, not a deployed downstream integration.

Implementation fingerprint: `467a347533c6994562e994e5ca1151e0af6119833146ce950bb8ed211bf97732`. This SHA-256 covers sorted package-relative paths and contents for `src/*.ts`, `package.json`, and `wrangler.toml`, with a NUL after each path and content. Documentation and test files are outside that implementation fingerprint.

Independent Sol 6.1 adversarial validation added four stream/content-tampering cases and reviewed the runtime harness. Those cases cover byte-by-byte UTF-8 reconstruction, malformed UTF-8, the 4 MiB limit, and same-size artifact changes. Earlier independent passes found and verified fixes for readiness revocation, stale-envelope page hints, and inconsistent timestamp admission.

## Smallest remaining acceptance step

The approved single synthetic fixture passed nested artifact writes, exact reconstruction, controlled response-loss recovery, idempotent repeats, and source correction through the CLI adapter. See LIVE_ACCEPTANCE.md for evidence and limits. The retired Hub is not used by the active direct Worker. A genuine provider timeout cannot be inferred from the simulated 503-after-commit case.

Production rollout still needs approval for the exact UTC cutoff in [ROLLOUT.md](./ROLLOUT.md), publication of the revised branch, and CI on that revised head. A live new-meeting ingestion check needs separate authorization. It must not use OD x DM, the manual fixture, a real historical transcript, or a broad backfill. The readiness design still needs agreement before any Notion property or downstream-trigger changes.
