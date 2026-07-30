# Agents: @create-something/offer-savings-app

## Agent Entry

- Start with `README.md` for the tool, HTTP, widget, and promotion boundaries.
- Read `packages/offer-resolution/AGENTS.md` before changing shared offer schemas or reliability behavior.
- Read `src/index.ts` before changing MCP tools/resource metadata, `src/widget.ts` before changing the mounted UI, and `src/http.ts` before changing transport routing.
- Keep the MCP and widget handlers thin. Scores, caps, verification labels, receipts, and watch identity belong to `@create-something/offer-resolution`.

## Ownership

| Tier       | This package owns                                                                                                             | This package does not own                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Database   | explicit state-file configuration and transport serialization of domain records                                               | reliability policy, private LTK data, accounts, hosted databases, or notification delivery                           |
| Automation | MCP tools, Streamable HTTP, REST composition, live runtime wiring, due-watch executable, fixture harness, and MCP Apps bridge | purchases, cart mutation, private access, public deployment, DNS, ChatGPT registration, or scheduling infrastructure |
| Judgment   | accurate tool annotations, UI disclosures, action availability, and host/promotion boundaries                                 | model-authored scores, source authority changes, or inferred rights                                                  |

## Validation

- Boot: `pnpm build`
- Smoke: `pnpm verify`
- Protocol acceptance: `pnpm test:acceptance`
- UI acceptance: start `pnpm dev:fixture`, then inspect `/widget` with Playwright; verify watch create/retry/restart, console, requests, and a full-page screenshot.
- Verify public imports with `pnpm exports @create-something/offer-savings-app`.
- Verify the repository contract with `pnpm agent:legibility:check -- --target packages/offer-savings-app/README.md`.

Public deployment, stable URLs/DNS, hosted persistence, notifications, and ChatGPT registration remain explicit approval gates.
