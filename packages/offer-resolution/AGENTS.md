# Agents: @create-something/offer-resolution

## Agent Entry

- Start with `README.md` for the product boundary and commands.
- Read `src/types.ts` before changing the public evidence or decision schema.
- Read `src/policy.ts` and `src/resolve.ts` together before changing reliability behavior.
- Read `src/agent.ts` before changing model, tool, or public-search behavior.
- Primary entrypoints: `src/index.ts`, `src/agent.ts`, `src/cli.ts`, and `src/http.ts`.

## Ownership

| Tier       | This package owns                                                                                                                                                | This package does not own                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Database   | typed requests, observations, source classifications, canonical receipts, bounded watch records/run history, and synthetic acceptance fixtures                   | private LTK data, retailer inventory, user accounts, external notification state, or live checkout state                     |
| Automation | public-web discovery, deterministic resolution, domain service, HTTP adapter, retry-safe due-watch execution, CLI, Skill validation, and acceptance verification | purchases, cart mutation, subscriptions, unbounded crawling, external notifications, bulk scraping, or access-control bypass |
| Judgment   | source authority, freshness, applicability, fulfillment, hard caps, reason codes, and recommendation thresholds                                                  | model-authored confidence, inferred partnership rights, or unsupported coupon validity                                       |

## Validation

- Boot: `pnpm build`
- Smoke: `pnpm verify`
- Verify public imports with `pnpm exports @create-something/offer-resolution`.
- Verify the repository contract with `pnpm agent:legibility:check -- --target packages/offer-resolution/README.md`.
- The interactive MCP/ChatGPT surface lives in `packages/offer-savings-app`; do not move UI or transport-host policy into the resolver.
- Escalate if a requested change would weaken deterministic caps, trust a model-authored score, require private access, transact, create unbounded monitoring or external notifications, or redistribute third-party data without a separate rights decision.

Develop one public behavior at a time: failing test, minimal implementation, green verifier, then refactor without changing canonical receipts unintentionally.
