# Offer Savings App

`@create-something/offer-savings-app` packages the LTK-first Offer Savings Agent as one Streamable HTTP process with a versioned REST API, MCP tools, and a standalone MCP Apps widget resource. It is an adapter over `@create-something/offer-resolution`; it does not calculate confidence or own offer policy.

## Public surfaces

| Surface                | Contract                                                                     |
| ---------------------- | ---------------------------------------------------------------------------- |
| MCP                    | `/mcp` with host-search planning, host resolution, verification, and watches |
| REST                   | `/v1/offers/search-plan`, `/v1/offers/resolve`, `/v1/offers/verify`, `/v1/watches`, and `/v1/watches/:id` |
| Readiness              | `/health`                                                                    |
| Widget resource        | `ui://offer-savings/results-v6.html` with `text/html;profile=mcp-app`        |
| Standalone development | `/widget` when the fixture harness supplies bounded initial data             |

The interactive ChatGPT/Codex path calls `plan_offer_search`, uses the host agent for bounded LTK-first public discovery, then calls `resolve_offers` once with factual observations. The MCP—not the host—owns observation time, deterministic scores, caps, ranking, evidence separation, receipts, and watch baselines. It has no server-side discovery or retrieval fallback.

The standalone widget uses the standard MCP Apps JSON-RPC bridge (`ui/initialize`, `ui/notifications/tool-result`, and `tools/call`) first. `window.openai` is an optional ChatGPT enhancement. The main result lane contains only currently corroborated LTK or supplemental offers. Historical mentions, uncorroborated creator codes, generic fulfillment pages, and other incomplete findings appear only as non-actionable research evidence, without projected savings or coupon actions. Each result includes a short search-run receipt. Its only write action is the retry-safe creation of a deadline-bounded watch; it cannot purchase, mutate a cart, access private LTK data, or send a notification.

The widget resource remains available for standalone development and future host compatibility, with read-only `results-v5.html`, `results-v4.html`, `results-v3.html`, `results-v2.html`, and `results-v1.html` aliases. Interactive tool descriptors intentionally do not bind an output template: ChatGPT currently completes the structured tool call but can leave the embedded app on its invocation envelope. Until the host reliably delivers the completed payload to the iframe, the production path renders the completed structured result and receipt directly in ChatGPT instead of showing a stale pending card.

ChatGPT does not supply observation timestamps. The MCP input schemas omit `asOf`; the service records it at the start of each find, verify, or watch run. This prevents model-formatted timestamp retries from creating duplicate searches.

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

The live server requires only an explicit state file:

```bash
pnpm --filter @create-something/offer-resolution build
pnpm --filter @create-something/offer-savings-app build
OFFER_STATE_FILE=/absolute/path/to/watches.json \
node packages/offer-savings-app/dist/start.js
```

Run one scheduler attempt with a stable key:

```bash
OFFER_STATE_FILE=/absolute/path/to/watches.json \
node packages/offer-savings-app/dist/run-watches.js \
  --run-key scheduler-2026-07-30T16:00Z
```

The scheduler intentionally reports active watches as skipped; it cannot search or notify. A ChatGPT or Codex scheduled workflow must retrieve fresh evidence itself, then resolve it through the MCP. Never commit user evidence or place it in command history.

## Hosted MCP for private ChatGPT testing

The Cloudflare Worker in `worker/` exposes the production MCP endpoint at `https://offer-savings-agent.createsomething.workers.dev/mcp`. It uses CREATE SOMETHING Identity OAuth, restricts access to the configured email allowlist, and persists watches in the dedicated `offer-savings` D1 database. It has no OpenAI API key or server-side search provider.

The canonical personal-plugin bundle is in `plugin/`. Its MCP configuration points directly to the production HTTPS endpoint, so a fresh Codex or ChatGPT session can expose the callable tools on desktop or mobile without a local `bash` or stdio process. Keep the personal marketplace copy synchronized from this reviewed bundle; do not restore a local launcher as a fallback.

Deploy and validate from the Worker package:

```bash
pnpm --filter @create-something/offer-savings-worker test
pnpm --filter @create-something/offer-savings-worker check
pnpm --filter @create-something/offer-savings-worker deploy:dry-run
pnpm --filter @create-something/offer-savings-worker deploy
```

This hosted endpoint is approved for private ChatGPT Developer Mode testing. Public directory submission, external notifications, purchase/cart behavior, private LTK access, and broader user access remain separate promotion gates.

## Agent Legibility Contract

<!-- prettier-ignore -->
| Field | Value |
| --- | --- |
| Entry point | `src/index.ts`, `src/http.ts`, `src/runtime.ts`, `src/start.ts`, `worker/index.ts`, `plugin/.mcp.json` |
| Boot command | `pnpm build` |
| Smoke command | `pnpm verify` |
| Validation surfaces | tool schemas and annotations, MCP initialization/list/call, remote-only plugin packaging, widget resource metadata/CSP, REST composition, malformed input, idempotent watch, restart persistence, bridge actions, browser console/network, live runtime config |
| UI validation path | run `pnpm dev:fixture`, open `/widget` with Playwright, create/retry a watch, restart with the same state file, and capture screenshot/console/requests |
| Escalation rule | stop before public directory submission, broader user access, notifications, purchase/cart behavior, private LTK access, or offer-policy changes |
