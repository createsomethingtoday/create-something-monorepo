# Offer Savings Agent Platform Goal

Companion plan: [plan.md](./plan.md)

## Outcome

Deliver a production-quality, API-backed Offer Savings Agent that lets a user describe a purchase need, searches public LTK first, returns deterministically ranked offers with evidence and plain-language reliability, supports non-purchasing verification, and persists a request to watch for a better offer. Expose the same domain capability through a stable TypeScript API, an MCP server, the existing OpenAI Agents SDK agent, and a ChatGPT-compatible interactive widget without duplicating reliability policy.

## Baseline

- `@create-something/offer-resolution` v0.2.0 already provides LTK-first public discovery, bounded health-and-beauty fan-out, deterministic reliability scoring, provenance receipts, a CLI, and a one-agent OpenAI Agents SDK path.
- The package explicitly does not yet own an HTTP API, MCP transport, persistent watches, continuous monitoring, cart verification, notifications, or UI.
- The repo-owned Skill routes conversational requests, but users currently receive machine-readable decisions rather than a polished interactive savings experience.
- CRE-1502 and CRE-1504 established and merged the resolver and LTK-first behavior. CRE-1505 tracks this platform packaging work.

## Product contract

The stable domain surface is:

1. `find_offers(request)` - discover public offers and return ranked deterministic decisions plus receipts.
2. `verify_offer(offer, context)` - re-evaluate supplied public evidence or a previously observed candidate without purchasing, mutating a cart, or claiming success without direct evidence.
3. `watch_offers(request, deadline)` - persist an idempotent watch and expose its status and latest result. Scheduled execution may refresh watches, but external notifications remain separately gated.

Supporting read operations such as `get_watch` or `list_watches` may exist when required by the UI, but callers must not need to understand search-stage ordering, source caps, receipt hashing, persistence internals, or model prompts.

## Tier ownership

- **Database:** versioned offer observations, resolution receipts, watch records, run history, idempotency keys, and a repository interface with a durable local adapter suitable for clean-state tests. A hosted adapter is optional until deployment is approved.
- **Automation:** service/API handlers, LTK-first discovery provider, MCP tools and transport, Agents SDK orchestration, due-watch execution, and widget bridge integration.
- **Judgment:** existing deterministic reliability policy, user-facing confidence labels, expiry/applicability/fulfillment caps, escalation language, and approval boundaries. The model and widget cannot author scores or override resolver decisions.

## Constraints and anti-cheating rules

- Use public data only. Do not access private LTK APIs, bypass app gates, bulk scrape, infer partnership rights, or redistribute a private dataset.
- Do not weaken thresholds, caps, fixtures, tests, or receipts to make acceptance pass.
- Do not replace real MCP/API/widget verification with source inspection or mocks. Deterministic fixtures may stabilize the acceptance path, but a separate live public-search smoke must exercise the real agent.
- Do not purchase, add to cart, submit checkout, send messages, subscribe users, or create external notifications during verification.
- `verify_offer` means evidence verification. If a code cannot be tested through a read-only public surface, return `needs_checkout`, never `verified`.
- Preserve one authoritative resolver implementation. API, MCP, agent, CLI, and widget are adapters around it.
- Tool writes must be bounded, explicit, idempotent where feasible, and correctly annotated.
- Keep secrets in Infisical or the runtime environment; never print, persist, or commit them.
- Preserve unrelated work and use the CRE-1505 isolated worktree.

## Non-goals

- An LTK partnership, private feed, or permission grant.
- Automated purchase or cart mutation.
- Public ChatGPT plugin directory submission.
- Production deployment, DNS changes, public registration, external notification delivery, or new third-party account access without explicit approval.
- Supporting every retail category in the first release; the existing merchant and `health_and_beauty` paths are sufficient for acceptance.

## Primary verifier

From a clean persisted-state directory, start the packaged HTTP/MCP app and exercise the representative health-and-beauty workflow through the public interfaces:

1. MCP initialization and tool listing expose the intended offer tools with accurate schemas, annotations, and the versioned widget resource.
2. `find_offers` returns a deterministic fixture-backed result containing LTK and supplemental lanes, ranked decisions, receipt hashes, estimated savings, plain-language confidence, and no model-authored score.
3. The ChatGPT-compatible widget is opened in a real browser using its standalone/no-host development mode, renders the best offer and evidence disclosure, and exposes `Try this code` and `Watch for a better offer` actions.
4. The watch action calls the same tool contract, creates exactly one watch under retry, and remains present with the same identity after a server restart.
5. An expired candidate stays rejected, an uncorroborated creator code is not displayed as verified, and no purchase/cart tool exists.

Required evidence:

- MCP protocol transcript or Inspector output for initialization, tool listing, `find_offers`, and `watch_offers`.
- API acceptance output and persisted-state readback before and after restart.
- Browser screenshots plus console/network readback for the rendered widget and watch transition.
- Exact commands and exit status recorded in `plan.md` or a linked result artifact.

## Supporting checks

- Package typecheck, unit tests, deterministic acceptance, skill validation, export validation, and agent-legibility contract.
- Contract tests proving API, MCP, agent, and widget consume the same schemas and resolver outputs.
- Retry/idempotency, clean-state, restart persistence, malformed input, expired offer, unknown publication date, and no-evidence tests.
- A live OpenAI Agents SDK smoke using an approved Infisical-provided API key and current public web search. The pass condition is a well-formed deterministic receipt, not finding a coupon.
- Repository CI and security checks on the publication PR.

## Verification capabilities and gaps

- Available: terminal, Node/TypeScript workspace, OpenAI Agents SDK dependency, approved Infisical credential injection, MCP Inspector/SDK installation, and real-browser automation through Playwright.
- ChatGPT Developer Mode connection requires an authenticated ChatGPT host plus a public HTTPS MCP endpoint. That exact host loop is a promotion check, not silently replaced by local browser proof. If it is unavailable, completion may establish a ChatGPT-compatible app through MCP protocol plus standalone browser verification, while the plan records the exact Developer Mode handoff still required before public launch.

## Iteration loop

1. Re-read this goal and `plan.md`.
2. Change one vertical slice through the public contract.
3. Run its cheapest focused failing/passing test.
4. Exercise the public API/MCP boundary for that slice.
5. Record evidence and update phase status and next action.
6. Run the real browser workflow after material widget or state changes.
7. Run the live-search smoke after agent/discovery changes.
8. Publish only after the full verifier passes; repair CI without weakening acceptance.

## Approval gates

Separate approval is required for public deployment, stable public URLs or DNS, ChatGPT app registration/submission, production D1/KV/R2 creation, external notification delivery, purchases/cart mutation, private LTK access, partner outreach, or paid services beyond already-approved API use.

## Blocker standard

A blocker is a concrete external dependency that persists after safe alternatives are exhausted, such as unavailable authenticated ChatGPT Developer Mode access, missing required account permission, or a vendor/API outage. Difficulty, flaky search results, or a failing test are not blockers. Record the exact failed surface, evidence, and smallest user or external action needed.

## Completion proof

The goal is complete only when:

- all required phases in `plan.md` are complete;
- the primary verifier passes on clean state and again after restart;
- the live agent smoke returns a valid deterministic receipt;
- API, MCP, agent, and widget share the authoritative resolver contract;
- tests, package verification, exports, legibility, and repository CI are green;
- implementation is merged through a reviewed PR and CRE-1505 contains the merge SHA, verifier evidence, deployment boundary, rollback note, and worktree disposition;
- any unexecuted public ChatGPT registration or production deployment is clearly reported as an approval-gated promotion step, not represented as completed.
