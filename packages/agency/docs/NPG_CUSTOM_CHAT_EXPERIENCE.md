# NPG custom chat workspace — CRE-2409

Implementation checkpoint: 2026-11-11. Original Canon/Svelte product workspace over the existing private NPG backend. Parent owns integration, independent final Sol 6.1 re-test, credentials, Ego, release, and activation. No commit, push, PR, deploy, provider/model call, invitation, grant, or secret change occurred in this implementation pass. Dify remains available for rollback.

## Checkout and scope

- Managed checkout: `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-7fb0f744-b3a59e76dfb75144`, branch `t3/npg-custom-chat`.
- Fast-forwarded from `5f9bfab3` to fetched `origin/main` `842f6ab946781a5ab17379516efac16c76bf3a1f` before edits. Verified required merged NPG base `6c6d6f1a8119ebe34dfba88cca596c6c65a404b6` is an ancestor. No edits in the shared root checkout.
- Ran `bootstrap:worktree` successfully before checks. Ran `agent:claim-worktree --issue CRE-2409 --register-existing --worktree "$PWD" --base origin/main`; it validated the actual checkout, but its identifier-based Linear comment failed because `IssueFilter.identifier` was rejected. The canonical UUID claim and registration receipt succeeded using the existing Linear wrapper. No coordination tooling was modified and no extra checkout was created.
- Registration receipt: https://linear.app/createsomething/issue/CRE-2409/migrate-npg-healthcare-coverage-analyst-from-dify-to-owned-runtime#comment-062bf3f2
- Tier: Automation (operator interface) plus a narrow Database read projection. No schema, runner, provider, policy, authorization, or model changes.

## Implemented behavior

| Acceptance | Implementation and evidence |
| --- | --- |
| Dedicated app | Root layout has an exact NPG-route rendering branch. It renders the existing child directly with a skip link to the child's sole `main#main-content`, outside Agency Navigation/Footer/ModeIndicator, search, and campaign chrome. Other routes retain the original layout branch. Root server loader and Identity policy are unchanged. Source-contract test and full production build pass; authenticated full-layout behavior remains a parent check. |
| Useful history | Owner-and-`npg`-scoped SQL projects only the first user question. Whitespace is normalized and titles are bounded to 96 characters plus ellipsis. Empty histories use “New conversation.” No schema or model calls. Real local workerd D1 test verifies first-question selection, cross-owner isolation, and absence of private provider state. |
| Persistent artifacts | Desktop evidence rail; responsive results disclosure at 1024px and below. Readable totals vs shown records, run/date, taxonomy/scope, completeness, unknowns, and status are projected only when supplied. Up to five returned records have a labeled preview; original source data remains inspectable. Complete safe CSV paths and query strings are retained, without re-running a tool. Unsupported shapes remain inspectable rather than inventing fields/counts. |
| Exact review | Review remains in the central thread, with provider/scope/cost, exact arguments, NPIs/addresses/limits, expiry, and one approve/reject pair. Expired approval is disabled; rejection remains available. Client still submits only existing conversation ID/version/action ID/decision. No always-allow, client tool dispatch, readiness bypass, or cancellation claim. New browser tests only reject actions; enrichment review is synthetic and never approved. |
| Honest state and recovery | Submitted question remains visible while the nonstreaming response is pending. Actual working, review, interrupted, ambiguous, readback-required, and completed states use text plus Canon state color. No generated token stream, thinking trace, or simulated tool progress. Existing duplicate suppression and explicit refresh-before-resend remain. Drafts survive errors, per-conversation switching, and same-tab reload, scoped to the signed-in owner in session storage. |
| Mobile and keyboard | History and results disclose independently of the thread; opening one closes the other on narrow screens. Composer stays in the app viewport. History selection restores composer focus without forcing focus on initial reload. Keyboard shortcut respects IME composition. Browser checks cover six actual CSS widths, keyboard traversal/rejection, no horizontal overflow, error/readback, expiry, and reduced motion. |
| Protected runtime | Published V8/host policy, Canon key/Astra, access domains, owner checks, exact approvals, private/no-store/noindex, CSV backend, and Dify rollback are unchanged. The only backend change is the safe owner-scoped list-title projection. |

## Research decision and provenance

Parent supplied `/tmp/npg-chat-ux-direction.md` before implementation. GitHub observations below are from the parent's 2026-11-11 research, not a second live survey by the builder. Cumulative stars are adoption evidence, not a recent-growth ranking.

- [assistant-ui](https://github.com/assistant-ui/assistant-ui): 13,071 stars, MIT, pushed Nov 11. Strong conversation/runtime and review reference; [Svelte package](https://github.com/assistant-ui/assistant-ui/blob/main/packages/svelte/README.md) is private/incomplete while published core is React. Adopt the interaction principles, retain original native Svelte implementation.
- [Vercel AI SDK](https://github.com/vercel/ai): 27,870 stars; [TanStack AI](https://github.com/TanStack/ai): 3,347 stars. Both have Svelte support, but their transports/protocols add no benefit to this initial nonstreaming JSON endpoint.
- [OpenWebUI](https://github.com/open-webui/open-webui): 158,396 stars and +4,640 on the parent's [monthly Svelte Trending](https://github.com/trending/svelte?since=monthly) observation; full Python-backed platform and branding-license conditions. [LibreChat](https://github.com/danny-avila/LibreChat): 46,995 stars, full React/Express/Mongo platform. Neither warrants replacing the owned stack.
- [LangChain agent-chat-ui](https://github.com/langchain-ai/agent-chat-ui) was archived. [AI Elements](https://github.com/vercel/ai-elements#readme) announced registry deprecation at the end of Nov 2026. [Unofficial Svelte AI Elements](https://github.com/SikandarJODD/ai-elements) had 319 stars and a smaller maintenance base. No new framework/backend/auth/model dependency was added.

Parent directly inspected the following Mobbin images. Builder used the supplied conclusions, not copied media. Static screenshots establish hierarchy/state evidence only; no motion timing or paid-action policy is inferred. Decision: **adapt** recurring task patterns into Canon utility paper/ink, existing typography/tokens, and the owned NPG policy.

| Reference | Why / adopt | Avoid |
| --- | --- | --- |
| [Upwork conversation](https://mobbin.com/screens/f0b50d92-9893-4cbd-9d62-873fb45e0c53) | Focused thread, history, and composer | Product-specific composition and broad marketplace navigation |
| [Remote](https://mobbin.com/screens/9effb1a2-c07f-4697-b046-99a47370714f) | Clear task context | Unrelated product menus |
| [Searchable workspace](https://mobbin.com/screens/5b1c6193-7557-47b2-9c17-f5fb0d2e10d2) | Persistent artifacts beside conversation | Copying a whole layout |
| [n8n human-input pause](https://mobbin.com/screens/6bc98265-b7c3-436a-8a07-4064b7907721) | Explicit human decision state | Claiming static media proves backend authorization |
| [Searchable prompt review](https://mobbin.com/screens/b464059d-a3eb-4a85-9a34-e3be6ca0b54b) | Exact content before decision | Duplicate/ambiguous confirmations |
| [Wix content decision](https://mobbin.com/screens/35f261f5-eab7-4824-8575-661043bd2341) | Review the actual proposed content | Product trade dress or unsupported paid-action claims |

No third-party composition, code, or asset was copied. No Mobbin media is retained. Canon Performance contracts and the existing NPG task order govern the implementation.

## Validation receipts

Final owned screenshots and browser report are in [evidence/npg-chat-2026-11-11](./evidence/npg-chat-2026-11-11/). They contain synthetic fixtures only, with no private real-candidate captures. Directly viewed desktop/mobile review, empty, completed, working, error, and source states. Corrected 320px Account wrapping, nonstreaming submitted-question visibility, and misleading ready status during readback recovery.

From repo root, prefix commands with `bash scripts/ona-bootstrap-local.sh` when using the pinned toolchain:

```sh
pnpm bootstrap:worktree
pnpm --filter @create-something/agency exec node --import ./test/register-sveltekit-test-loader.mjs --import tsx --test test/npg-analyst.test.ts test/npg-display.test.ts test/abundance-delivery-context.test.ts test/abundance-sourcing-access.test.ts test/abundance-sourcing-csv.test.ts test/abundance-sourcing-geo.test.ts test/abundance-travel-access.test.ts
pnpm --filter @create-something/agency check
pnpm --filter @create-something/agency build
pnpm auth:retired-provider:check
NPG_UI_PORT=4217 pnpm --filter @create-something/agency exec node test/npg-ui/serve.mjs
NPG_UI_URL=http://127.0.0.1:4217 pnpm --filter @create-something/agency exec node test/npg-ui/browser.mjs
```

The harness uses the actual page component and Agency CSS with in-memory browser fixtures, not a production fixture route/auth bypass. Supported states: `?state=new`, `review`, `enrichment`, `expired`, `error`, `ambiguous`, `interrupted`, `running`; no query gives an empty conversation. Port is configurable because 4197 and 4198 were occupied and left untouched. All browser network access is bounded to the local fixture origin.

- Before changes: 34 existing NPG tests passed; four new regressions failed (title projection, two source projections, scoped app shell). `/tmp/npg-chat-before.log`.
- After changes: 53 focused NPG/access/source/CSV tests passed. `/tmp/npg-chat-focused.log`.
- Agency full `check` passed, Svelte diagnostics zero errors/warnings. `/tmp/npg-chat-check.log`.
- Agency production build passed with Cloudflare adapter output. `/tmp/npg-chat-build.log`.
- Retired-provider policy check passed (16,539 tracked files). `/tmp/npg-chat-auth-policy.log`.
- Browser scenarios and exact widths are recorded in `browser-report.json`; no approval or vendor dispatch was exercised by these new browser tests.
- `git diff --check` passed. Parent performs the final independent re-test; this builder's checks are not independent acceptance.

| Quality gate | Status | Evidence and limit |
| --- | --- | --- |
| Functional correctness | Passed locally | Real workerd D1 plus provider/transport fixtures; local browser behavior and package check/build. No live Identity, model, MCP, registry, readiness, or CSV authentication exercise. |
| Perceptual/product quality | Passed for local fixtures | Directly viewed actual rendered desktop/mobile states; Canon paper/ink and semantic state; six-width geometry, keyboard/reduced-motion checks. Authenticated full-root-layout review and no-JS full-route rendering remain untested by this builder. |
| Release readiness | Untested | Local artifact builds and scoped changes are reviewable. Independent final Sol re-test, parent integration, authenticated full-layout/mobile/skip-link review, live read-only parity, and activation are outstanding. No publishing permission is inferred. |

## Parent handoff and rollback

Keep CRE-2409 In Progress. Review the uncommitted patch, independently re-test it, and verify the actual signed-in route with one main landmark and working skip link. Verify another Agency route still has its existing shell. Exercise live read-only source/CSV parity and readiness through the parent's authorized workflow; no paid enrichment or travel is required as QA. Preserve source/privacy controls and confirm the intended environment before activation.

UI rollback is the scoped patch reversal through parent integration. Existing runtime rollback remains `NPG_HEALTHCARE_CHAT_ENABLED=false`/unset with the Dify URL retained; stored data and paid action outcomes are not undone by UI rollback. No Dify archive or configuration change occurred.

Worktree disposition: **preserved at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-7fb0f744-b3a59e76dfb75144`, branch `t3/npg-custom-chat`, for parent integration and independent final re-test.**
