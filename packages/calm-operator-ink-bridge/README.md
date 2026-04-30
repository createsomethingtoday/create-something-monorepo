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
- `GET /ink/surfaces`
- `GET /ink/device`
- `POST /ink/alert`
- `POST /ink/operator-decision`
- `POST /ink/source-event`
- `POST /ink/operator-event`
- `POST /ink/health-snapshot`
- `GET /ink/health-checks`
- `POST /ink/health-checks/run`
- `GET /ink/health-review`
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

Request a different Ink surface profile without changing the backend:

```bash
curl -sS "https://ink.createsomething.agency/ink/brief?surface=t-embed" \
  -H "x-ink-token: $INK_DEVICE_TOKEN"

curl -sS "https://ink.createsomething.agency/ink/brief?surface=reterminal-e1001" \
  -H "x-ink-token: $INK_DEVICE_TOKEN"
```

`core-ink` remains the calm e-ink reference surface. `t-embed` is treated as an
Ink operator console: same alerts and health states, longer copy limits, and
metadata for faster LCD/list/detail interaction.

`reterminal-e1001` is treated as the desk/wall Ink operator sheet: same source of
truth, large e-ink copy limits, and list/detail metadata for richer daily briefs.

Surface roles:

| Surface | Role | Use |
| --- | --- | --- |
| `core-ink` | calm surface | Pocket pager: attention, alarms, all-clear |
| `t-embed` | operator console | Handheld inspection, faster UI, richer controls |
| `reterminal-e1001` | operator sheet | Desk/wall brief, registry summaries, daily status |

## Producer helpers

MCP review agents and health monitors can post directly to production:

```bash
pnpm post:mcp -- --mcp "HubSpot MCP" --reason "Review failed"
pnpm post:health -- --component "Claude Code Slack watcher" --status degraded --summary "No heartbeat in 20 minutes"
pnpm post:decision -- --source mcp-review-agent --subject "MCP review requires attention" --summary "Composio Toolkit MCP failed health review" --urgency attention --decision-required --action "Review Composio auth configuration"
```

Both commands read `INK_SOURCE_TOKEN` or `CALM_OPERATOR_BRIDGE_TOKEN` from the environment.

## AI-native operator decisions

Remote agents should not stream raw reasoning to Ink. They should post the
smallest possible operator decision contract:

```bash
pnpm --dir packages/calm-operator-ink-bridge post:decision -- \
  --source mcp-review-agent \
  --subject "MCP review requires attention" \
  --summary "Composio Toolkit MCP failed health review" \
  --reason "Remote health failed for toolkit bridge" \
  --detail "Auth configuration is missing at least one expected managed account." \
  --action "Review Composio auth configuration" \
  --urgency attention \
  --decision-required \
  --artifact reports/mcp-review.md \
  --confidence 0.92
```

The raw HTTP shape is:

```bash
curl -sS https://ink.createsomething.agency/ink/operator-decision \
  -X POST \
  -H "authorization: Bearer $INK_SOURCE_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "source": "mcp-review-agent",
    "subject": "MCP review requires attention",
    "summary": "Composio Toolkit MCP failed health review",
    "reason": "Remote health failed for toolkit bridge",
    "detail": "Auth configuration is missing at least one expected managed account.",
    "action": "Review Composio auth configuration",
    "urgency": "attention",
    "decision_required": true,
    "can_step_away": false,
    "artifact": "reports/mcp-review.md",
    "confidence": 0.92
  }'
```

If `decision_required` is false and `can_step_away` is true, the Worker records
the event but does not create an Ink alert. If human judgment is required, it
creates a constrained `operator_decision` alert. This keeps the pocket surface
AI-native without making it a chat surface.

## Scheduled health review

The Worker has a Cron Trigger that covers health-review runs and Central Time
alarm moments:

```toml
[triggers]
crons = ["0 4,5,11,12,13,14,15,18,20,21,23 * * *", "30 17,18 * * *"]
```

Health reviews only run during `HEALTH_REVIEW_UTC_HOURS`, which defaults to
`4,13,18,23`, so adding alarm Cron slots does not increase the health-review
cadence. Each health run collects configured remote checks, stores health
snapshots, and then reviews all stored snapshots. If any agent/MCP check is poor
or stale, the Worker writes a `health_attention` alert that Ink will display. If
the report is clear, the Worker clears the synthetic health-review alert.

You can run the review manually:

```bash
curl -sS https://ink.createsomething.agency/ink/health-review/run \
  -X POST \
  -H "authorization: Bearer $INK_SOURCE_TOKEN"
```

Pass `?collect=false` to review stored snapshots without collecting remote checks.

Ink can request the same review with the lower-privilege device token. This
returns the compact firmware brief shape, so the device can show one calm summary
instead of a full report:

```bash
curl -sS https://ink.createsomething.agency/ink/health-review/request \
  -X POST \
  -H "x-ink-token: $INK_DEVICE_TOKEN"
```

## Daily alarms

Daily alarms are configured with `DAILY_ALARMS_CT`, defaulting to:

```text
06:00=WORKOUT,09:00=WORK,12:30=WALK,15:00=EAT,23:00=SLEEP
```

The Worker evaluates those times in `America/Chicago` and writes an urgent
`daily_alarm` alert when one is due. Each alarm uses a per-day id, so retries are
idempotent, and expires after `ALARM_TTL_MS`, defaulting to 45 minutes.
Labels are optional; an unlabeled entry like `08:15` becomes a generic daily
alarm.

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
