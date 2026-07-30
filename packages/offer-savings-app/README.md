# Offer Savings App

`@create-something/offer-savings-app` packages the LTK-first Offer Savings Agent as one Streamable HTTP process with a versioned REST API, MCP tools, and a ChatGPT-compatible MCP Apps widget. It is an adapter over `@create-something/offer-resolution`; it does not calculate confidence or own offer policy.

## Public surfaces

| Surface                | Contract                                                                     |
| ---------------------- | ---------------------------------------------------------------------------- |
| MCP                    | `/mcp` with `find_offers`, `verify_offer`, `watch_offers`, and `get_watch`   |
| REST                   | `/v1/offers/find`, `/v1/offers/verify`, `/v1/watches`, and `/v1/watches/:id` |
| Readiness              | `/health`                                                                    |
| Widget resource        | `ui://offer-savings/results-v1.html` with `text/html;profile=mcp-app`        |
| Standalone development | `/widget` when the fixture harness supplies bounded initial data             |

The widget uses the standard MCP Apps JSON-RPC bridge (`ui/initialize`, `ui/notifications/tool-result`, and `tools/call`) first. `window.openai` is an optional ChatGPT enhancement. Its only write action is the retry-safe creation of a deadline-bounded watch; it cannot purchase, mutate a cart, access private LTK data, or send a notification.

## Deterministic local loop

```bash
pnpm --filter @create-something/offer-savings-app dev:fixture
```

Open `http://127.0.0.1:8791/widget`. The fixture contains synthetic offers and is not a current coupon claim. State defaults to `.state/fixture-watches.json` unless `OFFER_STATE_FILE` is supplied.

Run protocol and restart acceptance:

```bash
pnpm --filter @create-something/offer-savings-app verify
```

## Live runtime

The live server requires an approved key injected as `OPENAI_API_KEY` and an explicit state file:

```bash
pnpm --filter @create-something/offer-resolution build
pnpm --filter @create-something/offer-savings-app build
# Inject OPENAI_API_KEY with the approved secret manager.
OFFER_STATE_FILE=/absolute/path/to/watches.json \
node packages/offer-savings-app/dist/start.js
```

Run one scheduler attempt with a stable key:

```bash
# Inject OPENAI_API_KEY with the approved secret manager.
OFFER_STATE_FILE=/absolute/path/to/watches.json \
node packages/offer-savings-app/dist/run-watches.js \
  --run-key scheduler-2026-07-30T16:00Z
```

The scheduler records success or failure and preserves the previous successful receipt. It does not send external notifications. In normal operation, inject secrets with the repository-approved secret manager; never commit them or place them in command history.

## ChatGPT promotion boundary

Local MCP protocol and standalone-browser verification prove the app contract, not an authenticated ChatGPT Developer Mode connection. A public HTTPS endpoint, ChatGPT app registration, hosted persistence, DNS, external notifications, and submission require separate approval and promotion evidence.

## Agent Legibility Contract

<!-- prettier-ignore -->
| Field | Value |
| --- | --- |
| Entry point | `src/index.ts`, `src/http.ts`, `src/runtime.ts`, `src/start.ts` |
| Boot command | `pnpm build` |
| Smoke command | `pnpm verify` |
| Validation surfaces | tool schemas and annotations, MCP initialization/list/call, widget resource metadata/CSP, REST composition, malformed input, idempotent watch, restart persistence, bridge actions, browser console/network, live runtime config |
| UI validation path | run `pnpm dev:fixture`, open `/widget` with Playwright, create/retry a watch, restart with the same state file, and capture screenshot/console/requests |
| Escalation rule | stop before public deployment, ChatGPT registration, hosted state, notifications, purchase/cart behavior, private access, or policy changes |
