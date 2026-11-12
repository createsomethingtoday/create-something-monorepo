# NPG analyst migration — CRE-2409

NPG-only migration. The private replacement is implemented and independently verified locally; promotion and authenticated live acceptance remain separate checkpoints. Keep Dify available for rollback. This work does not authorize archival, other-agent changes, invitations, outreach, or credential removal.

## Scope and source

The existing `/delivery/abundance/healthcare-analyst` entry becomes an authenticated private chat when `NPG_HEALTHCARE_CHAT_ENABLED=true`. Otherwise it retains the validated `NPG_HEALTHCARE_ANALYST_URL` Dify redirect. The same-origin API lives below that protected entry. Existing authenticated sourcing/travel CSV routes and access domains remain unchanged.

Database: additive conversation, action, admission, lease and minimized receipt tables. Automation: fixed Healthcare MCP transport plus bounded Responses function loop. Judgment: exact published V8 prompt, explicit one-use approval and stop policies. Nothing is added to the public owned-agent-runtime registry or its public CORS/conversation policy.

`src/lib/server/npg/policy.ts` preserves the parent's credential-free live capture `/tmp/npg-dify-migration-source-safe.json`: published Dify snapshot `01a1403e-5c50-77a2-997e-47c658b975dd`, V8, 8,052-character prompt, all 12 enabled tool names, default `gpt-5.6-luna`, and prompt SHA-256. The snapshot identifier is provenance, not a credential. No knowledge spaces or memory artifacts existed in that capture. Fixed MCP URL and bearer contract match the repository fleet registry and `packages/abundance-healthcare-mcp/worker/index.ts`.

The Responses implementation follows [official OpenAI function-calling documentation](https://developers.openai.com/api/docs/guides/function-calling): server-side `previous_response_id`, function calls and `function_call_output`. No new OpenAI SDK dependency; the MCP SDK reuses the existing patched 1.32.0 dependency graph and its Worker-compatible schema validator.

## Release prerequisites — parent

1. Integrate current origin/main in the managed checkout. Apply `0062_npg_private_analyst.sql` through the owning release workflow. Root checkout remains untouched.
2. Apply the additive migration to the intended Agency DB through the owning release workflow. Do not apply every pending migration blindly.
3. Provision/check server-only `ABUNDANCE_HEALTHCARE_MCP_API_KEY` on Agency, accepted by the fixed Healthcare MCP endpoint. Provision the operator-selected Canon credential separately as `NPG_HEALTHCARE_OPENAI_API_KEY`; other Agency consumers retain their existing credentials. Pin the evaluated model explicitly as server-only `NPG_HEALTHCARE_MODEL=gpt-6-astra`. The Canon credential was located at Infisical prod `/canon-slack`, secret `OPENAI_API_KEY`; never copy its value into this document or Git. Both settings are required: there is no fallback to the shared Agency key or a different model. Reuse the existing DB, verified Identity locals and exact existing client-workspace audience. The Dify model remains source provenance, not an implicit runtime choice.
4. Inspect the deployed optional `get_enrichment_readiness` tool and compare its actual schema/result with `review()` / `enrichmentReview()` in `runner.ts`. The local MCP source has 11 tools; this migration discovers the live optional 12th tool and never invents it in Healthcare MCP. Unknown/missing/blocked readiness MUST remain blocked.
5. Verify the readiness adapter against the real read-only result before approving any enrichment. Its deliberately conservative accepted shape is `{ready:true, provider:'pdl'|'clay'|'exa', budget:{currency:'USD',limit:100,spent:<finite nonnegative>,reconciled:true}, cost:{maximum_usd:<finite positive>}}`. `spent + maximum_usd` must not exceed 100. Optional `reason` is surfaced for blockers. This shape is an internal conservative acceptance condition, **not a claim about the current live tool schema**. Map actual authoritative fields only after inspecting evidence. Unknown costs or unreconciled spending block. Do not fabricate readiness/costs or replace the total one-time shared allowance with a daily reset. Budget authority remains the source; the application also serializes paid preflight/dispatch across NPG users.
6. After independent review and live read-only parity, enable `NPG_HEALTHCARE_CHAT_ENABLED=true` only in the authorized shipping environment. Keep Dify URL/config for rollback. Do not archive Dify as part of this change.

## Security and lifecycle

- Verified Identity `locals.user.id` plus fixed `npg` scope binds every conversation and action. The existing NPG email predicate is unchanged. Anonymous/disallowed access is rejected in loaders and APIs as well as the existing protected hook. No additional provider, audience, or invitation path.
- No wildcard CORS. JSON mutations require the exact same Origin and reject cross-site fetch metadata. Readbacks are private/no-store. Server-generated conversation/action/run IDs and provider response IDs never come from the client. Browser reads omit owner IDs, credentials, model configuration and provider-chain state.
- Requests: 16 KB actual streamed JSON; message 6,000 characters; 10 admitted mutations/minute/user; 100 conversations/user; new messages stop at 60 chat messages/conversation while already-offered reviews remain consumable; 280 KB preflight state ceiling and 450 KB terminal-state ceiling. Each provider JSON/MCP stream is bounded. Responses: 3,000 output tokens, one action at a time, at most six ordinary tool calls per request (bounded readiness preflights are additional). Request cancellation at 110 seconds; conversation lease 145 seconds; admission and shared paid leases 150 seconds. No automatic retry/resume on either provider.
- A review stores exact validated tool arguments, provider/cost/scope review, owner, conversation version, server call/response IDs and a ten-minute expiry. Client submits only action ID, version, decision. DB triggers prohibit changing review inputs. Approval CAS consumes it once; live tool schema/readiness is rechecked before dispatch. Changed costs/spend need a new review. Reject/expiry close the paused provider chain without dispatch. PDL personal-contact scope must be explicitly true/false and is named in the review, rather than silently using an upstream default. All four credit/write-capable tools pause, including travel. The model's `confirm_paid_enrichment=true` does not authorize anything.
- Travel requires exact NPIs supplied by the user or returned in this conversation, plus operator-supplied full clinic street addresses in `street, city, two-letter state` format (ZIP optional), 1–50 NPIs, 1–3 clinics, 30/45 minutes and any/all policy. Source geocoding/routing quota enforcement remains authoritative; no population fan-out or invented clinics.
- Record dispatch intent before sending a paid request. An uncertain error is terminal `ambiguous`, never reopened or automatically replayed. Confirmed returned evidence is checkpointed before model summarization. A crash/expired lease becomes `interrupted` or `ambiguous`; late writes/dispatch are rejected. A recorded ambiguous/stranded dispatch blocks further paid admission across NPG users until operator reconciliation; returned paid `ambiguous`/`unavailable`/`delivery_unknown` outcomes also stop and retain evidence. Refreshing history does not dispatch tools. Do not interpret a provider timeout as no-match or no-charge.
- Raw bounded source results are retained separately from the model's prose. Full authenticated CSV URLs, source run/date, totals vs displayed page, taxonomy scope, unresolved counts, field provenance and enrichment status stay inspectable. Oversized results fail rather than silently truncate exports. Contact/qualification unknowns stay explicit in the preserved judgment instructions.
- Messages are escaped text, never model HTML. Only validated HTTPS links are clickable; complete Agency CSV links keep their original queries and become same-origin paths. Credentials, secret-like output keys, fixed MCP URL and configured credential values are redacted before retention/output. Source results are still private candidate data: do not put them in public logs or receipts.
- Immutable terminal receipts contain run/conversation/owner IDs, version, outcome, tool count, policy fingerprint and finish time. Private source/chat state is kept in Agency D1; provider response continuation uses OpenAI `store:true`. Review retention and provider data handling with the owning operator before release. No automatic deletion or historical Dify conversation import is included.

## Verification and limits

From repository root use the paved toolchain:

```sh
bash scripts/ona-bootstrap-local.sh pnpm bootstrap:worktree
bash scripts/ona-bootstrap-local.sh pnpm --filter @create-something/agency exec node --import ./test/register-sveltekit-test-loader.mjs --import tsx --test test/npg-analyst.test.ts test/abundance-delivery-context.test.ts
bash scripts/ona-bootstrap-local.sh pnpm --filter @create-something/agency check
bash scripts/ona-bootstrap-local.sh pnpm --filter @create-something/agency build
bash scripts/ona-bootstrap-local.sh pnpm auth:retired-provider:check
```

The focused suite uses real local workerd D1, fixture providers, and a JSON-RPC transport fixture. It does not prove deployed Identity, credentials, model availability or live registry parity. Includes anonymous/disallowed access, same-origin mutation enforcement, cross-owner reads/approvals, injection rejection, exact immutable/expired/replayed/cross-conversation reviews, concurrent approvals, shared paid lease, readiness absence/cost drift, uncertain paid dispatch, interrupted process recovery, bounds, preserved sourcing CSV/provenance, source status and no-secret views.

The current `test/npg-ui/serve.mjs` serves the exact built React/Astryx client with synthetic HTTP responses and shared production document/CSP headers at `http://127.0.0.1:4227`. Build first with `pnpm --filter @create-something/agency npg:build`, then run `pnpm --filter @create-something/agency exec node --import tsx test/npg-ui/serve.mjs`. It is local-only test code; no production auth bypass or fixture route is added. Browser fixtures reject only and refuse approval; no vendor is contacted. See [NPG_CUSTOM_CHAT_EXPERIENCE.md](./NPG_CUSTOM_CHAT_EXPERIENCE.md) for the current full Astryx implementation and evidence. Earlier Svelte component captures below remain historical, not validation of the new renderer.

Implementation review directly viewed desktop and mobile fixture output; measured no horizontal overflow at actual CSS widths 320, 390, 768, 1024, 1025 and 1440; corrected light-shell contrast with Canon utility paper/ink tokens. Exercised exact review/rejection, complete source links, escaped untrusted text, response loading, draft preservation, duplicate submission and recoverable error. The new flow is derived from the current NPG task order and Canon contracts. A broad Mobbin chat search did not establish a selected comparable approval flow; no outside layout was adopted. Parent still owns actual signed-in full-layout/mobile/keyboard/live-parity review and independent Sol final re-test.

Do not call paid enrichment/travel to manufacture validation. Prepare the pending action; the human decides. Live parity should inspect free market/coverage/registry/contact reads, full CSV authentication and matching counts/snapshot, and readiness only.

## Rollback and reconciliation

Set `NPG_HEALTHCARE_CHAT_ENABLED` false/unset through the authorized environment configuration workflow; the original entry resumes the validated Dify redirect and chat API closes. Keep `NPG_HEALTHCARE_ANALYST_URL` intact. Revert code only through the parent's release workflow. Additive D1 tables need not be dropped; a code/config rollback does not undo paid requests, reservations, stored conversations or provider response state.

For interrupted/ambiguous runs, inspect owner-scoped private conversation, action status and minimized receipt. Preserve IDs/version and source-returned report/job identifiers for reconciliation; do not expose credentials. Check source/provider records before deciding whether a new human-approved action is appropriate. Never reset a consumed action or turn `ambiguous` back into `pending`. After independently reconciling source/provider evidence, the owning operator may mark the recorded action `completed` (with private evidence in the owning issue) to release the application-wide paid hold; this UI intentionally offers no self-service reset. Reconcile every outstanding ambiguous/stranded action before spending again. Existing source CSV links can be used without replaying the paid action.

Worktree disposition: preserved at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-c28b0a9d-5152049fe9a1321d`, branch `t3/migrate-npg-healthcare-analyst`, for parent integration/review. No implementation commit is required to manufacture a checkpoint; parent owns commit and promotion.

## Implementation evidence (local, 2026-11-11)

- 29 focused checks passed (workerd D1 plus provider/transport fixtures); final `/tmp/npg-final-tests.log`.
- Full Agency `check` passed; `/tmp/npg-package-check.log`. Final Svelte check after subsequent bounded changes: 6,742 files, zero errors/warnings; `/tmp/npg-final-svelte-check.log`.
- Final Agency production build passed; `/tmp/npg-final-build.log`.
- Retired-provider check passed (15,980 tracked files); `/tmp/npg-retired-auth.log`.
- Local Wrangler 4.103.0 `deploy --dry-run` packed the built `_worker.js` using a temporary no-bindings config; `/tmp/npg-dryrun.log`. Nothing uploaded. This tests the server bundle, not Pages deployment configuration or remote bindings. Existing bundled `oso-primary` emitted a negative-zero comparison warning.
- Ground's bounded five-file duplicate scan passed; environment analysis was not applicable without entrypoints, so overall Ground outcome was incomplete. `/tmp/npg-ground.log`.
- Desktop and mobile component fixtures viewed; error recovery, keyboard focus styling, rejection, preserved drafts, duplicate-submit suppression and escaped script text exercised. Full Agency layout, live auth/provider parity, model availability and independent final reviewer remain with parent. No paid calls made or approved.

Quality gates: functional correctness **passed for local fixtures**, perceptual/product quality **passed for viewed component fixtures** (full signed-in surface untested), release readiness **untested** pending parent integration, provisioning, actual readiness contract, live parity, independent final review and authorized promotion. This is not a live-success or delivery-status update.


## Integrated checkpoint (2026-11-11)

- Rebased the managed branch onto origin/main `75cffe84a`; the unrelated dirty root checkout is preserved. Renamed the private-state migration to `0062_npg_private_analyst.sql` to avoid existing 0060/0061 names.
- Live read-only dependency checks exposed D1 overloads in broad coverage and city sourcing. The bounded repair selects the existing geographic index for state-filtered sourcing/export, starts readiness evidence from the evidence table, and adds the narrow covering index in `0063_npg_healthcare_query_indexes.sql`. Snapshot choice, OR taxonomy semantics, CSV completeness and recruiting evidence gates stay unchanged. Real SQLite tests cover 1,002-row export and secondary taxonomy membership. Production-volume radius/unfiltered performance remains unverified. Latest live broad NP snapshot is September 14, 2026; no import/refresh was run.
- Independent Sol review reproduced three defects before repair and verified all three afterward: read-only source checkpoint before model summarization; incomplete clinic address blocked before review; uncertain Clay delivery retains the shared paid hold. Local review covered 123 repository checks, three independent boundary checks, and ten actual-component browser checks at six widths. Full signed-in Agency layout remains untested.
- Canon credential supports Responses for both `gpt-6-astra` and `gpt-6.1-sol`; it denies model catalog reads because `api.model.read` is absent. No broader token scope is needed for this implementation. Both models passed five bounded cases using the actual 11-tool catalog and synthetic results: sourcing OR/export/provenance/injection, missing radius address, missing readiness, exact paused travel review, and uncertain Clay status. Initial evaluation exposed a prose-only travel-review dead end; the host instruction now explains that emitting a paid function call opens the separate review without vendor dispatch. Final responses fit the escaped plain-text interface. No MCP/vendor call occurred during model evaluation.
- Selected `gpt-6-astra` for the requested quality-first agent workload using [official current model guidance](https://developers.openai.com/api/docs/guides/latest-model). Both models passed this small set; it does not establish statistical superiority. Default reasoning behavior was evaluated; high-effort tuning was not. [Recorded evaluation](evidence/npg-model-evaluation-2026-11-11.json). Re-run the bounded evaluator with an explicit model list and a freshly captured credential-free catalog: `scripts/evaluate-npg-model.ts <catalog.json> <report.json> <model...>` under the chosen credential's Infisical environment. It never opens an MCP connection or dispatches a paid tool.
- Live Healthcare MCP still does not advertise `get_enrichment_readiness`. Paid enrichment stays blocked until provider access, exact maximum cost and reconciled shared one-time $100 spending are authoritative. Do not manufacture readiness or run a paid action as a smoke test.

Current gates: functional correctness **passed for local fixtures and bounded live model evaluation**; perceptual/product quality **passed for viewed component fixtures**; release readiness **untested** pending PR promotion, deployed bindings/migrations and authenticated live parity. Dify remains the rollback target and is not ready to archive.

Configuration staging: Cloudflare Pages `create-something-agency` production now has encrypted `NPG_HEALTHCARE_OPENAI_API_KEY` (Canon source) and `ABUNDANCE_HEALTHCARE_MCP_API_KEY`, plus `NPG_HEALTHCARE_MODEL=gpt-6-astra`. `NPG_HEALTHCARE_CHAT_ENABLED=false` keeps the replacement disabled. Independent API readback confirmed all prior binding names/types were retained and canonical deployment `0390cd50-9e2a-41d6-b19c-2a62f866a3ac` did not change. No schema was applied or code deployed at this checkpoint. Secret values are not readable from that metadata; the model credential itself was exercised by the bounded evaluation.

The complete Agency check/build passed after integration; the selected-model build and final Svelte check also passed. The integrated Ground advisory receipt reported `no_analyzable_files`, zero duplicate coverage and failed/incomplete duplicate/orphan checks; it is not a clean analysis result. Treat focused tests and the independent rendered review as the available evidence, not Ground coverage.

PR review follow-up: the message-count ceiling previously blocked approval/rejection/expiry when the review notice brought a conversation to 60 messages. The ceiling now applies to new user messages; existing review decisions retain all ownership/version/expiry/one-use checks and the existing state-size bound. Three real-D1 regression cases failed before the change and passed afterward; the full focused NPG suite passed34/34 and Svelte check reported0errors/0warnings. No UI, model, approval policy, credential or vendor behavior changed.

## Dedicated Astryx chat workspace — 2026-11-11

The operator-selected follow-up fully replaces the NPG frontend with actual React/Astryx components in an isolated same-origin document, owner-derived history titles, readable persistent evidence/complete exports, and accessible exact reviews. Backend/provider/prompt/access/approval policy is unchanged except for the owner-scoped history-title read projection. See [NPG_CUSTOM_CHAT_EXPERIENCE.md](./NPG_CUSTOM_CHAT_EXPERIENCE.md) for research provenance, acceptance mapping, fixture receipts, and parent-owned remaining checks. The rollout flag remains parent-owned; Dify is retained for rollback.

Current follow-up worktree disposition: preserved at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-7fb0f744-b3a59e76dfb75144`, branch `t3/npg-custom-chat`, for parent integration and independent final re-test. This supersedes the older implementation-worktree disposition above for the custom-chat follow-up only.

## Workers redirect runtime repair — 2026-11-11

The reported private-chat interruption before the first model/source result has a
reproduced runtime cause in `src/lib/server/npg/providers.ts`: both MCP and Responses
fetches used `redirect: 'error'`. [Cloudflare's Request documentation](https://developers.cloudflare.com/workers/runtime-apis/request/)
states that Workers supports `follow` and `manual`; `error` throws `TypeError` at
request construction, before any network request. The Node fetch fixtures accepted
that option and did not expose the Worker incompatibility.

Before the repair, `test/npg-providers-workerd.test.ts` bundled the production
`createProviders` interface into Agency's pinned Wrangler/Miniflare workerd, using
the unchanged Agency compatibility date/flags and local-only outbound fixtures.
The normal MCP and Responses 200 cases both failed with `Invalid redirect value,
must be one of "follow" or "manual"`; the separate legacy-mode probe confirmed
`TypeError` with zero outbound requests. No provider credentials or live calls
were used.

Both fetches now use `manual`. A shared guard cancels and rejects every status
300–399 before MCP SDK body/session-header access or model JSON consumption.
It does not read Location, follow a redirect, forward credentials, or retry.
Fixed endpoints, response byte caps, caller/transport abort bounds, MCP request
timeouts, model selection, instructions, access/approval policy and UI are unchanged.

Run from the repository root after bootstrap:

```bash
bash scripts/ona-bootstrap-local.sh pnpm --filter @create-something/agency exec node --import tsx --test test/npg-providers-workerd.test.ts
bash scripts/ona-bootstrap-local.sh pnpm --filter @create-something/agency test:npg-analyst
bash scripts/ona-bootstrap-local.sh pnpm --filter @create-something/agency check
bash scripts/ona-bootstrap-local.sh pnpm --filter @create-something/agency build
```

The repaired runtime regression passes 11/11 tests, including all 100 statuses
in each of MCP initialize/list/call and Responses (400 redirect cases), no body
or metadata reads on redirects, body cancellation (including bodyless 304),
no follow/retry, normal 200 results, bodyless MCP initialized notification 202,
fail-closed model 202/204, 180,000-byte caps and pre-aborted caller signals.
The focused NPG suite passed 58/58; the full Agency check passed with zero Svelte
errors/warnings, and the Agency production build passed. Ground's advisory
reported `no_analyzable_files` with incomplete duplicate analysis; it supplies
no clean duplicate-coverage claim.
These are local runtime fixtures, not authenticated production acceptance.
Parent owns independent final review/re-test, merge, deployment and live read-only
chat acceptance. No configuration change, paid action, Dify archival or deployment
is included. Rollback is a revert of this narrow repair through the owning release
workflow; keep Dify available under the existing rollback policy.

## Skip Trace review instruction repair — 2026-11-11

Authenticated acceptance after the redirect repair completed free registry
sourcing: 271 Arlington matches, the complete authenticated CSV with 271 data
rows, the September 14 snapshot and saved source/history survived reload. The
deployed model then refused to prepare a Skip Trace review because the published
V8 general enrichment instruction required the unavailable
`get_enrichment_readiness` tool. The host already has a separate Skip Trace
review path and source-enforced checks; the appended instruction did not clearly
explain that boundary. No paid lookup was sent.

The additive Skip Trace instruction now explicitly scopes the older readiness
prerequisite to PDL, Clay and Exa. A selected-NPI function proposal prepares the
host's exact expiring review; `confirm_paid_enrichment=true` is not approval or
execution. The source still enforces registry identity, provider access, privacy,
maximum charge and shared reservations before billable dispatch. Preparing the
review does not claim those checks have passed. Existing approval/rejection,
unknown-outcome, no-retry and unverified-contact rules remain unchanged. The
published V8 prompt bytes and provenance fingerprint are retained.

The Responses request contract regression failed before this change. A local
D1/public-runner regression verifies that Skip Trace can prepare and reject an
exact ten-cent review without the generic readiness tool and without initializing
providers on rejection or dispatching a vendor call. These fixtures establish the
instruction contract and host boundary; they do not establish model behavior.
Authenticated live proposal/rejection remains the parent release acceptance check.
