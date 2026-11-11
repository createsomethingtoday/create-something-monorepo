# NPG analyst migration — CRE-2409

Implementation only. Parent owns integration with current origin/main, independent final re-test, live parity, and release. No Dify archival, other-agent changes, invitations, outreach, secrets removal, PR, push, or deployment is part of this implementation pass.

## Scope and source

The existing `/delivery/abundance/healthcare-analyst` entry becomes an authenticated private chat when `NPG_HEALTHCARE_CHAT_ENABLED=true`. Otherwise it retains the validated `NPG_HEALTHCARE_ANALYST_URL` Dify redirect. The same-origin API lives below that protected entry. Existing authenticated sourcing/travel CSV routes and access domains remain unchanged.

Database: additive conversation, action, admission, lease and minimized receipt tables. Automation: fixed Healthcare MCP transport plus bounded Responses function loop. Judgment: exact published V8 prompt, explicit one-use approval and stop policies. Nothing is added to the public owned-agent-runtime registry or its public CORS/conversation policy.

`src/lib/server/npg/policy.ts` preserves the parent's credential-free live capture `/tmp/npg-dify-migration-source-safe.json`: published Dify snapshot `01a1403e-5c50-77a2-997e-47c658b975dd`, V8, 8,052-character prompt, all 12 enabled tool names, default `gpt-5.6-luna`, and prompt SHA-256. The snapshot identifier is provenance, not a credential. No knowledge spaces or memory artifacts existed in that capture. Fixed MCP URL and bearer contract match the repository fleet registry and `packages/abundance-healthcare-mcp/worker/index.ts`.

The Responses implementation follows [official OpenAI function-calling documentation](https://developers.openai.com/api/docs/guides/function-calling): server-side `previous_response_id`, function calls and `function_call_output`. No new OpenAI SDK dependency; the MCP SDK reuses the existing patched 1.32.0 dependency graph and its Worker-compatible schema validator.

## Release prerequisites — parent

1. Integrate current origin/main in the managed checkout. Resolve any migration-number conflict before applying `0060_npg_private_analyst.sql`. Root checkout remains untouched.
2. Apply the additive migration to the intended Agency DB through the owning release workflow. Do not apply every pending migration blindly.
3. Provision/check server-only `ABUNDANCE_HEALTHCARE_MCP_API_KEY` on Agency, accepted by the fixed Healthcare MCP endpoint. Reuse existing `OPENAI_API_KEY`, DB, verified Identity locals and exact existing client-workspace audience. `NPG_HEALTHCARE_MODEL` is optional and server-only; verify the captured default's availability live without silently substituting it.
4. Inspect the deployed optional `get_enrichment_readiness` tool and compare its actual schema/result with `review()` / `enrichmentReview()` in `runner.ts`. The local MCP source has 11 tools; this migration discovers the live optional 12th tool and never invents it in Healthcare MCP. Unknown/missing/blocked readiness MUST remain blocked.
5. Verify the readiness adapter against the real read-only result before approving any enrichment. Its deliberately conservative accepted shape is `{ready:true, provider:'pdl'|'clay'|'exa', budget:{currency:'USD',limit:100,spent:<finite nonnegative>,reconciled:true}, cost:{maximum_usd:<finite positive>}}`. `spent + maximum_usd` must not exceed 100. Optional `reason` is surfaced for blockers. This shape is an internal conservative acceptance condition, **not a claim about the current live tool schema**. Map actual authoritative fields only after inspecting evidence. Unknown costs or unreconciled spending block. Do not fabricate readiness/costs or replace the total one-time shared allowance with a daily reset. Budget authority remains the source; the application also serializes paid preflight/dispatch across NPG users.
6. After independent review and live read-only parity, enable `NPG_HEALTHCARE_CHAT_ENABLED=true` only in the authorized shipping environment. Keep Dify URL/config for rollback. Do not archive Dify as part of this change.

## Security and lifecycle

- Verified Identity `locals.user.id` plus fixed `npg` scope binds every conversation and action. The existing NPG email predicate is unchanged. Anonymous/disallowed access is rejected in loaders and APIs as well as the existing protected hook. No additional provider, audience, or invitation path.
- No wildcard CORS. JSON mutations require the exact same Origin and reject cross-site fetch metadata. Readbacks are private/no-store. Server-generated conversation/action/run IDs and provider response IDs never come from the client. Browser reads omit owner IDs, credentials, model configuration and provider-chain state.
- Requests: 16 KB actual streamed JSON; message 6,000 characters; 10 admitted mutations/minute/user; 100 conversations/user; 60 chat messages/conversation; 280 KB preflight state ceiling and 450 KB terminal-state ceiling. Each provider JSON/MCP stream is bounded. Responses: 3,000 output tokens, one action at a time, at most six ordinary tool calls per request (bounded readiness preflights are additional). Request cancellation at 110 seconds; conversation lease 145 seconds; admission and shared paid leases 150 seconds. No automatic retry/resume on either provider.
- A review stores exact validated tool arguments, provider/cost/scope review, owner, conversation version, server call/response IDs and a ten-minute expiry. Client submits only action ID, version, decision. DB triggers prohibit changing review inputs. Approval CAS consumes it once; live tool schema/readiness is rechecked before dispatch. Changed costs/spend need a new review. Reject/expiry close the paused provider chain without dispatch. PDL personal-contact scope must be explicitly true/false and is named in the review, rather than silently using an upstream default. All four credit/write-capable tools pause, including travel. The model's `confirm_paid_enrichment=true` does not authorize anything.
- Travel requires exact NPIs supplied by the user or returned in this conversation, plus operator-supplied full clinic street addresses, 1–50 NPIs, 1–3 clinics, 30/45 minutes and any/all policy. Source geocoding/routing quota enforcement remains authoritative; no population fan-out or invented clinics.
- Record dispatch intent before sending a paid request. An uncertain error is terminal `ambiguous`, never reopened or automatically replayed. Confirmed returned evidence is checkpointed before model summarization. A crash/expired lease becomes `interrupted` or `ambiguous`; late writes/dispatch are rejected. A recorded ambiguous/stranded dispatch blocks further paid admission across NPG users until operator reconciliation; returned paid `ambiguous`/`unavailable` outcomes also stop and retain evidence. Refreshing history does not dispatch tools. Do not interpret a provider timeout as no-match or no-charge.
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

`test/npg-ui/serve.mjs` serves the actual Svelte page component with Agency CSS and in-memory browser fixtures at `http://127.0.0.1:4197`. Run using `pnpm --filter @create-something/agency exec node test/npg-ui/serve.mjs`. States: `?state=review`, `?state=ambiguous`, `?state=error`; no query means empty chat. It mounts no production auth bypass or fixture route. Fixture approval/rejection never calls a vendor. This is component/runtime evidence, not full Agency layout or live authentication acceptance.

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
