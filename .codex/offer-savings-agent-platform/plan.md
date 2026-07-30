# Offer Savings Agent Platform Plan

Stable goal: [goal.md](./goal.md)

Linear: [CRE-1505](https://linear.app/createsomething/issue/CRE-1505/package-offer-resolution-as-api-backed-agent-and-mcp)

Worktree: `/var/folders/5v/bcpy60z558b1y2jctfx6108m0000gq/T/cre-1505-agent-worktree`

Branch: `codex/CRE-1505-agent-worktree`

## Phase 1: Ground architecture and acceptance

Status: complete

Implementation

- [x] Inspect the merged Offer Resolution package, AGENTS guidance, public interfaces, tests, and explicit ownership boundaries.
- [x] Confirm CRE-1505 tracking and create an isolated worktree from merged `origin/main` at `fcbeba52067173362140c9a38e3fb2f856dabc60`.
- [x] Review current official OpenAI MCP server, ChatGPT UI, tool planning, quickstart/deployment, and Agents SDK guidance.
- [x] Classify the ChatGPT experience as `interactive-decoupled` and preserve one authoritative deterministic resolver.

Verification

- [x] Baseline confirms LTK-first discovery and deterministic resolver exist while API, MCP, watch persistence, and UI do not.
- [x] Required capabilities are available for TypeScript, MCP protocol/Inspector, approved live-agent smoke, and Playwright browser verification.
- [x] Exact ChatGPT Developer Mode host-loop gap is named as a promotion check rather than replaced silently.

Evidence

- `packages/offer-resolution/AGENTS.md`, `README.md`, `src/agent.ts`, and `src/types.ts` inspected.
- Official docs: `https://developers.openai.com/plugins/build/mcp-server`, `https://developers.openai.com/plugins/build/chatgpt-ui`, `https://developers.openai.com/plugins/plan/tools`, `https://developers.openai.com/plugins/build/app-quickstart`, and `https://developers.openai.com/api/docs/guides/agents`.

Exit criteria

- [x] Goal and plan define the product contract, primary verifier, anti-cheating rules, approval gates, and completion proof.

## Phase 2: Build the deep API and persistent state module

Status: complete

Implementation

- [x] Add failing tests for the stable `find_offers`, `verify_offer`, and `watch_offers` domain service.
- [x] Introduce provider and repository seams without moving scoring or policy out of the existing resolver.
- [x] Implement versioned request/response schemas, plain-language confidence mapping, estimated savings, and evidence disclosures.
- [x] Implement a durable local watch/receipt repository with atomic writes, idempotency keys, run history, and clean-state injection.
- [x] Add an HTTP adapter with health/readiness and versioned endpoints suitable for local and future hosted execution.

Verification

- [x] Focused tests fail before implementation and pass after it.
- [x] HTTP acceptance exercises all three stable operations plus malformed input and unknown watch cases.
- [x] Restart test proves watch identity and latest receipt persist.
- [x] Resolver receipts are byte-stable for the same normalized input.

Exit criteria

- [x] Callers need only the three domain operations and their schemas; persistence and discovery details remain private.
- [x] API core can be consumed without MCP, ChatGPT, or model-specific dependencies.

Evidence

- 2026-07-30: `find_offers returns authoritative receipts as user-ready offer cards` failed first because `createOfferService` was absent, then passed after the minimal service implementation.
- 2026-07-30: `pnpm --filter @create-something/offer-resolution check` passed and `pnpm exports @create-something/offer-resolution createOfferService` confirmed the public export.
- 2026-07-30: `verify_offer never promotes uncorroborated creator evidence to verified` failed first because the operation was absent, then passed with `needs_checkout`; package typecheck remained green.
- 2026-07-30: `watch_offers is idempotent and survives a service restart` first exposed raw-vs-normalized retry comparison and then pre/post-JSON `undefined` drift. Both boundaries were repaired; the watch now reuses one identity, stores no raw idempotency key, and deep-equals its restarted readback.
- 2026-07-30: real-socket HTTP acceptance passed for health, find, verify, watch create/retry/read, missing watch, malformed input, and strict unknown-field rejection.
- 2026-07-30: `pnpm --filter @create-something/offer-resolution verify` passed 41 tests plus deterministic acceptance and Skill validation; `pnpm exports @create-something/offer-resolution` exposed 38 grounded exports; agent legibility passed.

## Phase 3: Add the MCP distribution adapter

Status: complete

Implementation

- [x] Register the offer tools with clear descriptions, bounded schemas, accurate read/write/open-world/idempotency annotations, and structured outputs.
- [x] Expose Streamable HTTP at `/mcp`; in-memory MCP remains available for focused protocol tests, so a separate stdio executable is unnecessary.
- [x] Register a versioned widget resource using the MCP Apps UI MIME contract.
- [x] Keep tool handlers thin adapters over the Phase 2 service.

Verification

- [x] Protocol test initializes the server, lists tools/resources, and calls every required tool.
- [x] An official MCP SDK client records successful in-memory and Streamable HTTP calls plus actionable malformed-input behavior.
- [x] Repeated `watch_offers` calls with one idempotency key create one watch.
- [x] Tool list contains no purchase, cart-mutation, private-access, or unrestricted scraping operation.

Exit criteria

- [x] MCP clients can complete the supported workflow without knowing API or resolver internals.

Evidence

- 2026-07-30: protocol tests first failed because the MCP package/server did not exist, then passed initialization, exact four-tool listing, widget resource read, find, verify, idempotent watch, get-watch, and malformed-input behavior through `@modelcontextprotocol/sdk`.
- 2026-07-30: real-socket `StreamableHTTPClientTransport` passed against `/mcp` while the same process served `/health` and `/v1/offers/find`; an initial cleanup-order hang was preserved and repaired by closing the MCP client before the HTTP server.
- 2026-07-30: `pnpm --filter @create-something/offer-savings-app verify` passed typecheck and four protocol/network tests.

## Phase 4: Build the ChatGPT-compatible interactive widget

Status: complete

Implementation

- [x] Adapt the repo-owned vanilla MCP Apps starter pattern, reconciled with the current official OpenAI MCP server, ChatGPT UI, tool-planning, and quickstart docs inspected in Phase 1.
- [x] Render ranked offer cards from `structuredContent`, including savings, source lane, reliability label, evidence disclosure, and expiry/applicability conditions.
- [x] Add `Try this code` as a safe copy action and `Watch for a better offer` as a component-initiated MCP tool call.
- [x] Use the MCP Apps bridge as the baseline, with `window.openai` only for optional ChatGPT host enhancements.
- [x] Provide standalone/no-host development behavior without making client state authoritative.
- [x] Add exact CSP/resource metadata and version the widget URI.

Verification

- [x] Browser test renders a representative LTK-first result and captures a screenshot.
- [x] Browser action creates a watch, updates mounted state without a full remount, and survives retry, reload, and server restart.
- [x] Expired and low-confidence offers use distinct disclosure and are never mislabeled as verified.
- [x] Console and network logs show no broken resources, unexpected outbound domains, or bridge errors.

Exit criteria

- [x] A user can understand the best offer, uncertainty, source, savings, and next action without reading raw resolver JSON.

Evidence

- 2026-07-30: Playwright rendered five ranked candidates at `/widget`: official evidence appeared as `Verified`, the public LTK creator lead remained `Worth trying`, and the expired creator code appeared as `Do not use` with both actions disabled.
- 2026-07-30: browser calls showed `POST /v1/watches` as `201`, retry as `200`, and post-restart retry as `200`; persisted watch `watch_c28db1049ad20348fe207c52` retained `runCount: 1` and the raw idempotency key was absent from disk.
- 2026-07-30: browser console ended with 0 errors/0 warnings; screenshot: `output/playwright/offer-savings/widget-watch.png`.

## Phase 5: Integrate the agent and watch execution loop

Status: complete

Implementation

- [x] Route the existing Agents SDK flow through the same service contract and schemas.
- [x] Add a bounded due-watch execution path that records each run and latest receipt without sending external notifications.
- [x] Update the repo-owned Skill and prompt metadata for the packaged user experience.
- [x] Add focused eval cases for missing constraints, no evidence, uncorroborated LTK codes, expired offers, watch retries, and forbidden purchase behavior.

Verification

- [x] Agent and MCP contract tests prove identical resolver output for identical observations.
- [x] Due-watch execution is retry-safe and records failure without losing the prior successful receipt.
- [x] Live approved-key smoke exercises public LTK-first discovery and returns a valid deterministic receipt even when no offer qualifies.
- [x] Evals pass without exact-prose grading or weakened source caps.

Exit criteria

- [x] One policy and one service contract govern API, MCP, agent, CLI, Skill, and widget behavior.

Evidence

- 2026-07-30: agent-service parity and due-watch failure/retry/success tests failed before implementation, then passed. Agent evidence must now reproduce the terminal resolver receipt before the service returns user-facing cards.
- 2026-07-30: due-watch run keys create one history record per watch and attempt key; a failed public discovery increments history, preserves the last successful receipt, and a retry skips without duplication.
- 2026-07-30: the repo-owned Skill now permits an explicit deadline-bounded `watch_offers` request while continuing to forbid unbounded monitoring, external notifications, purchases, and private access; 43 package tests and Skill validation passed.
- 2026-07-30: with the user-approved Infisical alias mapped only inside the process, the live health-and-beauty smoke produced `offer_resolution.v0.2`: 12 LTK and 12 supplemental decisions, 0 recommendations, 4 verify, 18 lead, 2 rejected, and valid SHA-256 receipt hashes.

## Phase 6: Run the primary verifier and harden

Status: in progress

Implementation

- [x] Start from a clean state directory and run the packaged HTTP/MCP app.
- [x] Exercise MCP initialization, tool listing, find, verify, and watch operations.
- [x] Exercise the mounted widget in a real browser, including retry, reload, and server restart.
- [x] Repair failures one meaningful change at a time and record evidence without erasing failed-attempt context.

Verification

- [x] Primary verifier passes end to end with protocol transcript, API output, persisted readback, browser screenshots, and console/network evidence.
- [x] Negative paths prove expired/uncorroborated offers remain fail-closed and no purchase surface exists.
- [ ] Package verification, exports, legibility, formatting, and repository-scope checks pass.
- [x] ChatGPT Developer Mode host loop is either exercised on an approved HTTPS endpoint or recorded as the exact approval-gated promotion handoff.

Exit criteria

- [ ] Completion proof in `goal.md` is satisfied except for explicitly approval-gated public promotion steps.

Evidence

- 2026-07-30: `pnpm --filter @create-something/offer-resolution verify` passed typecheck, 43 tests, deterministic acceptance, and Skill validation; `pnpm --filter @create-something/offer-savings-app verify` passed typecheck, five protocol/network tests, and the clean-state/restart acceptance.
- 2026-07-30: MCP acceptance initialized `offer-savings-agent` v0.1.0, listed exactly `find_offers`, `verify_offer`, `watch_offers`, and `get_watch`, read `ui://offer-savings/results-v1.html`, returned five deterministic offer cards, kept the creator code at `needs_checkout`, persisted one hashed idempotency entry, and created no purchase surface.
- 2026-07-30: Playwright rendered all five cards with visible freshness scores. The LTK creator lead remained `Worth trying`; the expired code remained `Do not use` with both actions disabled. Browser console: 0 errors/0 warnings. Network: watch create `201`, retry `200`, and post-restart retry `200`. Screenshot: `output/playwright/offer-savings/widget-watch.png`.
- 2026-07-30: post-restart GET retained watch `watch_c28db1049ad20348fe207c52`, `runCount: 1`, and run `run_0041b37749ffbae6fd0c12ae`; the persisted index contained only a SHA-256 idempotency key.
- 2026-07-30: offline frozen-lockfile installation, both package export checks, agent legibility, `git diff --check`, scoped secret-pattern scan, and `pnpm policy:artifacts:check` passed.
- 2026-07-30: repository `pnpm check` passed platform and product, then failed only in the untouched `packages/webflow-template-search` suite with 18 timeout-only failures after 658 seconds. An isolated rerun reproduced five timeout-only failures in the same untouched suite while 81/86 tests passed. Publication CI remains the authoritative repository gate; this unrelated baseline was not widened into CRE-1505.
- 2026-07-30: authenticated ChatGPT Developer Mode connection remains an explicit approval-gated promotion handoff requiring a public HTTPS MCP endpoint; local MCP Apps bridge and standalone browser compatibility are verified without representing host registration as complete.

## Phase 7: Publish, merge, and close evidence

Status: in progress

Implementation

- [ ] Review diff scope and secret safety, commit intentionally, push the CRE-1505 branch, and open a draft PR.
- [ ] Run and repair required CI without weakening the primary verifier.
- [ ] Move through the repository review gate and merge when green.
- [ ] Record Linear evidence including commands, screenshots/artifacts, live-smoke result, PR, merge SHA, deployment boundary, rollback note, and worktree disposition.

Verification

- [ ] Required GitHub checks are green and the PR is merged to `main`.
- [ ] CRE-1505 is complete with independent evidence and no false production-deployment claim.

Exit criteria

- [ ] No required work remains inside the approved non-public scope; public deployment or ChatGPT submission remains a separately approved promotion action.

## Current next action

Finish the intentional diff review, commit and push the CRE-1505 branch, open the draft PR, and use repository CI to resolve the remaining repository-gate evidence before merge and Linear closeout.
