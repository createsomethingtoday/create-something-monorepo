# Calm Operator Ink Bridge

Production Cloudflare Worker bridge for Calm Operator Ink.

The device should call this Worker directly over HTTPS. A Cloudflare Tunnel is only needed when a local-only producer cannot post outbound to the Worker. For production, agents, MCP review jobs, Slack/Gmail bridges, and health checks should send outbound events to this Worker.

## Role

- Store active operator alerts in a Durable Object.
- Accept MCP/agent health snapshots and attention events.
- Collect configured remote health checks on the same schedule.
- Run a scheduled health review four times daily.
- Fire daily local alarms for the operator at configured Central Time moments.
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
- `GET /ink/clock`
- `GET /ink/device`
- `POST /ink/alert`
- `POST /ink/source-event`
- `POST /ink/operator-event`
- `POST /ink/health-snapshot`
- `GET /ink/health-checks`
- `POST /ink/health-checks/run`
- `GET /ink/health-review`
- `GET /ink/health-review/runs`
- `POST /ink/health-review/request`
- `POST /ink/health-review/run`
- `POST /ink/alarms/run`
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

The Core Ink firmware lives in `packages/calm-operator-ink-firmware`. It uses
the device token for `/ink/brief`, `/ink/clock`, `/ink/health-review/request`,
`/ink/operator-event`, and `/ink/device-heartbeat`.

## Deploy

```bash
pnpm --dir packages/calm-operator-ink-bridge check
pnpm --dir packages/calm-operator-ink-bridge test
pnpm --dir packages/calm-operator-ink-bridge run deploy
```

If the custom domain is not ready, remove the route from `wrangler.toml` and deploy to the default `workers.dev` URL first.

## Production smoke

Run a production smoke after deploys or route/token changes:

```bash
infisical run --env=prod --path=/ --include-imports=true -- pnpm ink:bridge:smoke
```

The smoke checks public `/healthz`, authenticated `/ink/clock`, authenticated
`/ink/brief`, and a harmless `/ink/device-heartbeat` write using
`INK_DEVICE_TOKEN`, `INK_SOURCE_TOKEN`, or `CALM_OPERATOR_BRIDGE_TOKEN`.

Use `--public-only` when only route reachability should be checked, or
`--skip-heartbeat` when a read-only authenticated smoke is required:

```bash
pnpm --dir packages/calm-operator-ink-bridge smoke:production -- --skip-heartbeat
```

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

The compact firmware brief includes the selected operator state plus a stable
Central Time clock contract:

```json
{
  "generated_at": "2026-04-30T14:05:00.000Z",
  "clock": {
    "timezone": "America/Chicago",
    "generated_at": "2026-04-30T14:05:00.000Z",
    "local_date": "2026-04-30",
    "local_time": "09:05",
    "display_time": "9:05 AM",
    "hour": 9,
    "minute": 5
  }
}
```

## Producer helpers

MCP review agents and health monitors can post directly to production:

```bash
pnpm post:mcp -- --mcp "HubSpot MCP" --reason "Review failed"
pnpm post:health -- --component "Claude Code Slack watcher" --status degraded --summary "No heartbeat in 20 minutes"
```

Both commands read `INK_SOURCE_TOKEN` or `CALM_OPERATOR_BRIDGE_TOKEN` from the environment.

## Scheduled health review

The Worker has a Cron Trigger that covers health-review runs and Central Time
alarm moments:

```toml
[triggers]
crons = ["0 4,11,12,13,14,15,18,23 * * *"]
```

Health reviews only run during `HEALTH_REVIEW_UTC_HOURS`, which defaults to
`4,13,18,23`, so adding alarm Cron slots does not increase the health-review
cadence. Each health run collects configured remote checks, stores health
snapshots, and then reviews all stored snapshots. If any agent/MCP check is poor
or stale, the Worker writes a `health_attention` alert that Ink will display. If
the report is clear, the Worker clears the synthetic health-review alert.

The remote check set includes the Playbook MCP registry sweep route. When Ink
requests "MCP Review," the bridge calls that route, the route posts the detailed
registry snapshot back to Ink, and the final device summary can include static
MCP registry counts, Dify agent coverage, and live Hub counts. The required
route token is `HALFDOZEN_AGENT_ROUTE_TOKEN` in Worker secrets.

You can run the review manually:

```bash
curl -sS https://ink.createsomething.agency/ink/health-review/run \
  -X POST \
  -H "authorization: Bearer $INK_SOURCE_TOKEN"
```

Pass `?collect=false` to review stored snapshots without collecting remote checks.

Health-review attempts are stored in the bridge Durable Object. Inspect recent
manual, scheduled, device-requested, and health-check-triggered runs with:

```bash
curl -sS "https://ink.createsomething.agency/ink/health-review/runs?limit=20" \
  -H "authorization: Bearer $INK_SOURCE_TOKEN"
```

Run records include trigger, status, timing, collected count, report counts,
error text for failed attempts, and the stored report payload when available.

Ink can request the same review with the lower-privilege device token. This
returns the compact firmware brief shape, so the device can show one calm summary
instead of a full report:

```bash
curl -sS https://ink.createsomething.agency/ink/health-review/request \
  -X POST \
  -H "x-ink-token: $INK_DEVICE_TOKEN"
```

## Daily alarms

Daily alarms are configured with `DAILY_ALARMS_CT`, defaulting to `06:00,09:00`.
The Worker evaluates those times in `America/Chicago` and writes an urgent
`daily_alarm` alert when one is due. Each alarm uses a per-day id, so retries are
idempotent, and expires after `ALARM_TTL_MS`, defaulting to 45 minutes.

Run the alarm scheduler manually:

```bash
curl -sS https://ink.createsomething.agency/ink/alarms/run \
  -X POST \
  -H "authorization: Bearer $INK_SOURCE_TOKEN" \
  -d '{"now":"2026-04-29T11:00:00Z"}'
```

## Remote health checks

Configure remote checks with `HEALTH_CHECKS_JSON`:

```json
[
  {
    "id": "mcp.hub",
    "component": "CREATE SOMETHING Hub MCP",
    "type": "mcp",
    "registry_id": "mcp.hub",
    "url": "https://hub.example.com/healthz",
    "expected_status": 200,
    "expected_text": "ok",
    "json_rules": [
      { "path": "failed_servers.length", "max": 0 },
      { "path": "connected_servers.length", "min": 1 }
    ],
    "token_env": "HUB_HEALTH_TOKEN",
    "action": "Review Hub MCP deployment and token scope"
  }
]
```

If `token_env` is set, the Worker reads that environment variable or secret and
sends it as a Bearer token. Health payloads redact query strings and never store
token values.

`json_rules` are optional semantic checks against the JSON response. Paths use
dot notation and support `.length` for arrays or strings. Supported assertions
are `equals`, `min`, `max`, `includes`, and `truthy`.

Self-checking the Worker through its own custom domain is disabled by default
because same-zone edge fetches can produce false positives. Keep route health
smokes external, or explicitly set `HEALTH_SELF_CHECK_ENABLED=true` only if the
chosen `HEALTH_SELF_ORIGIN` is known to work from Workers.

Keep remote checks lightweight. Deep MCP Hub connection reviews should be posted
as health snapshots by the MCP review agent instead of making the bridge fetch a
full downstream Hub health endpoint on every Ink review.

List configured checks:

```bash
curl -sS https://ink.createsomething.agency/ink/health-checks \
  -H "authorization: Bearer $INK_SOURCE_TOKEN"
```

Run checks and review immediately:

```bash
curl -sS https://ink.createsomething.agency/ink/health-checks/run \
  -X POST \
  -H "authorization: Bearer $INK_SOURCE_TOKEN"
```

## Health-checked command wrapper

Use the command wrapper when an agent, MCP review, Dify job, or local monitor should
report its result to Ink. It runs the command, posts a health snapshot, and returns
the command's original exit code so orchestration can still detect failures.

```bash
pnpm --dir packages/calm-operator-ink-bridge run:health-command \
  --name "MCP review agent" \
  --type agent \
  --registry-id agent.mcp-review \
  --artifact "reports/mcp-review.md" \
  --action "Inspect the MCP review report" \
  -- npm run mcp:review
```

Examples:

```bash
pnpm run:health-command \
  --name "Dify client-agent sync" \
  --type job \
  --registry-id dify.client-agent-sync \
  --action "Review failed Dify workflow run" \
  -- pnpm dify:sync

pnpm run:health-command \
  --name "Hub MCP registry check" \
  --type mcp \
  --registry-id mcp.hub \
  --action "Review MCP contract and tool scope" \
  -- pnpm mcp:registry:review
```

The wrapper only records the command executable name, duration, exit code, registry
id, artifact, and action. It intentionally does not store full command arguments.
