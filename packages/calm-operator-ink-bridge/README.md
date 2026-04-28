# Calm Operator Ink Bridge

Production Cloudflare Worker bridge for Calm Operator Ink.

The device should call this Worker directly over HTTPS. A Cloudflare Tunnel is only needed when a local-only producer cannot post outbound to the Worker. For production, agents, MCP review jobs, Slack/Gmail bridges, and health checks should send outbound events to this Worker.

## Role

- Store active operator alerts in a Durable Object.
- Accept MCP/agent health snapshots and attention events.
- Accept Core Ink device heartbeat.
- Return a compact `/ink/brief` response compatible with the firmware bridge contract.
- Keep production content live-only. No mock carousel or fake workflow counts.

## Endpoints

Public:

- `GET /healthz`
- `GET /`

Token-gated:

- `GET /ink/brief`
- `GET /ink/surface-brief`
- `GET /ink/device`
- `POST /ink/alert`
- `POST /ink/source-event`
- `POST /ink/operator-event`
- `POST /ink/health-snapshot`
- `POST /ink/device-heartbeat`
- `POST /ink/clear`

Tokens may be sent as `Authorization: Bearer ...`, `x-ink-token`, or `x-api-key`.

## Secrets

Set with Wrangler:

```bash
pnpm --dir packages/calm-operator-ink-bridge exec wrangler secret put INK_DEVICE_TOKEN
pnpm --dir packages/calm-operator-ink-bridge exec wrangler secret put INK_SOURCE_TOKEN
```

Optional compatibility token:

```bash
pnpm --dir packages/calm-operator-ink-bridge exec wrangler secret put INK_BRIDGE_TOKEN
```

Use `INK_DEVICE_TOKEN` in Core Ink firmware. Use `INK_SOURCE_TOKEN` for agent/MCP producers.

## Deploy

```bash
pnpm --dir packages/calm-operator-ink-bridge check
pnpm --dir packages/calm-operator-ink-bridge test
pnpm --dir packages/calm-operator-ink-bridge deploy
```

If the custom domain is not ready, remove the route from `wrangler.toml` and deploy to the default `workers.dev` URL first.

## Example alert

```bash
INK_SOURCE_TOKEN=... pnpm post:mcp -- \
  --mcp "HubSpot MCP" \
  --reason "MCP review failed and requires operator attention." \
  --action "Review mcp_contract.yaml"
```

## Example brief

```bash
curl -sS https://ink.createsomething.agency/ink/brief \
  -H "x-ink-token: $INK_DEVICE_TOKEN"
```

## Producer helpers

MCP review agents and health monitors can post directly to production:

```bash
pnpm post:mcp -- --mcp "HubSpot MCP" --reason "Review failed"
pnpm post:health -- --component "Claude Code Slack watcher" --status degraded --summary "No heartbeat in 20 minutes"
```

Both commands read `INK_SOURCE_TOKEN` or `CALM_OPERATOR_BRIDGE_TOKEN` from the environment.
