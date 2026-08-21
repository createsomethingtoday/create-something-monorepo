# Calm Operator Bridge

Production Cloudflare Worker bridge for the Stopwatch Calm Operator device.
The deployed Worker and `INK_*` secret names remain unchanged to avoid a
credential and Durable Object migration. `/operator/*` is the canonical API;
the former `/ink/*` paths remain temporary compatibility aliases.

The device should call this Worker directly over HTTPS. A Cloudflare Tunnel is only needed when a local-only producer cannot post outbound to the Worker. For production, agents, MCP review jobs, Slack/Gmail bridges, and health checks should send outbound events to this Worker.

## Role

- Store active operator alerts in a Durable Object.
- Accept MCP/agent health snapshots and attention events.
- Accept a single synthesized operator priority brief for the M5 "what now?"
  surface.
- Accept Langfuse quality/eval summaries as evidence for that synthesized
  priority without making Ink a Langfuse client or source of truth.
- Collect configured remote health checks on the same schedule.
- Run a scheduled health review four times daily.
- Fire daily local alarms for the operator at configured Central Time moments.
- Accept Stopwatch device heartbeat.
- Project recent laptop Codex tasks, including a synthetic new-task action, into
  versioned provider-neutral progress snapshots.
- Queue only agent-advertised, remote-safe operator decisions and retain their
  delivery receipts.
- Accept bounded voice recordings for local transcription and on-device review.
- Return a compact `/operator/brief` response compatible with the device contract.
- Keep production content live-only. No mock carousel or fake workflow counts.

## Endpoints

Public:

- `GET /healthz`
- `GET /`

Token-gated:

- `GET /operator/brief`
- `GET /operator/clock`
- `GET /operator/agent-console`
- `POST /operator/agent-progress`
- `POST /operator/agent-decision`
- `POST /operator/agent-decisions/lease`
- `POST /operator/agent-decisions/:id/receipt`
- `POST /operator/voice-command`
- `GET /operator/voice-command/:id`
- `POST /operator/voice-command/:id/confirm`
- `POST /operator/voice-commands/lease`
- `POST /operator/voice-command/:id/transcript`
- `POST /operator/alert`
- `POST /operator/operator-priority`
- `POST /operator/operator-event`
- `POST /operator/health-snapshot`
- `GET /operator/health-review`
- `POST /operator/health-review/request`
- `POST /operator/device-heartbeat`
- `POST /operator/clear`

Tokens may be sent as `Authorization: Bearer ...`, `x-ink-token`, or `x-api-key`.

## Secrets

Set with Wrangler:

```bash
pnpm --dir packages/calm-operator-ink-bridge exec wrangler secret put INK_DEVICE_TOKEN
pnpm --dir packages/calm-operator-ink-bridge exec wrangler secret put INK_RELAY_TOKEN
pnpm --dir packages/calm-operator-ink-bridge exec wrangler secret put INK_SOURCE_TOKEN
```

Optional compatibility token:

```bash
pnpm --dir packages/calm-operator-ink-bridge exec wrangler secret put INK_BRIDGE_TOKEN
```

Use `INK_DEVICE_TOKEN` in Stopwatch firmware, `INK_RELAY_TOKEN` in the local
agent relay, and `INK_SOURCE_TOKEN` for MCP/alert producers. `INK_BRIDGE_TOKEN`
remains a compatibility token for all three roles.

The Stopwatch firmware lives in `packages/calm-operator-stopwatch-firmware`.
Generic `OPERATOR_*` token names are also accepted by the code for future
secret migration, but existing production secrets require no rotation.

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
infisical run --env=prod --path=/ --include-imports=true -- pnpm operator:bridge:smoke
```

The smoke checks public `/healthz`, authenticated `/operator/clock`, authenticated
`/operator/brief`, the read-only `/operator/agent-console`, and a harmless `/operator/device-heartbeat` write using
`INK_DEVICE_TOKEN` or `CALM_OPERATOR_BRIDGE_TOKEN`.

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
curl -sS https://ink.createsomething.agency/operator/brief \
  -H "x-ink-token: $INK_DEVICE_TOKEN"
```

The compact firmware brief includes the selected operator state plus a stable
Central Time clock contract:

```json
{
  "generated_at": "2026-04-30T14:05:00.000Z",
  "signal": "linear",
  "detail_label": "CRE-611",
  "source_links": [
    {
      "kind": "linear",
      "label": "CRE-611",
      "url": "https://linear.app/createsomething/issue/CRE-611"
    }
  ],
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

## Agent progress and steering

The agent console is provider-neutral. A relay publishes a versioned snapshot;
the device can enqueue only one of the `remote_safe` decisions advertised in
that exact version. Unsafe decisions remain visible to the desktop agent but
are omitted from the Stopwatch response.

Publish a snapshot from a JSON file or stdin:

```bash
INK_RELAY_TOKEN=... pnpm --dir packages/calm-operator-ink-bridge agent:progress ./agent-progress.json
```

```json
{
  "agent_id": "claude:session-123",
  "provider": "claude",
  "label": "Auth investigation",
  "status": "waiting",
  "phase": "Tests reproduced",
  "summary": "Two agents finished; one needs direction.",
  "detail": "Choose the next bounded path.",
  "progress_version": 17,
  "needs_input": true,
  "decisions": [
    {
      "id": "focus-test",
      "kind": "redirect",
      "label": "Focus on test",
      "description": "Fix the failing test before implementation changes.",
      "requires_confirmation": true,
      "requires_text": false,
      "remote_safe": true
    }
  ]
}
```

Run the local delivery relay continuously, or run one deterministic cycle:

```bash
INK_RELAY_TOKEN=... pnpm --dir packages/calm-operator-ink-bridge agent:relay
INK_RELAY_TOKEN=... pnpm --dir packages/calm-operator-ink-bridge agent:relay:once
INK_RELAY_TOKEN=... pnpm --dir packages/calm-operator-ink-bridge agent:relay:sync
```

Optional relay configuration:

- `INK_BRIDGE_ORIGIN` defaults to `https://ink.createsomething.agency`.
- `INK_RELAY_ID` defaults to the local hostname.
- `INK_RELAY_PROVIDERS` defaults to `claude,codex`.
- `INK_CLAUDE_EXECUTABLE` overrides the Claude CLI path.
- `INK_CODEX_EXECUTABLE` overrides the Codex binary used to start app-server.
  The relay prefers the Codex binary bundled with the ChatGPT desktop app, then
  the package-local binary.
- `INK_AGENT_WORKDIR` sets the trusted workspace for resumed sessions.

Claude delivery uses `claude --resume ... --print`. Codex delivery uses the
official [Codex app-server protocol](https://developers.openai.com/codex/app-server/)
to list recent tasks, start a task, resume an eligible task, start its next
turn, and stream progress back to the console. `agent:relay:sync` performs only
the task-list projection and does not lease voice or decision work.

The Stopwatch can prompt only a `legacy` Codex task that is idle and whose
desktop state has been unchanged for at least two minutes. The relay re-reads
the exact task version and advertised action immediately before dispatch. A
recent, active, failed, or `paginated` task stays visible but read-only. Codex
does not currently support resuming paginated task history through app-server;
new tasks started by the Stopwatch use resumable legacy history.

Codex turns run in the trusted `INK_AGENT_WORKDIR` with `workspace-write` and
`approvalPolicy: never`. The JSONL client declines command, file, permission,
user-input, and MCP-elicitation escalation requests. This grants bounded local
agent authority without allowing the device to approve broader access or
invent answers on the operator's behalf. Codex and local transcription child
processes receive a strict environment allowlist; Infisical relay tokens, API
keys, database URLs, passwords, and unrelated production secrets are not
inherited. Claude retains its own existing sandbox, permissions, and approval
policy. A `stop` or `pause` decision asks an agent to act at its next safe
checkpoint; the relay does not kill an executing tool process.

Decision state is durable: `queued`, `leased`, `acknowledged`, then `completed`
or `failed`. The console returns recent receipts so the device can distinguish
button input from actual provider delivery.

### Voice steering

Voice is an input adapter to the same decision queue, not a second authority
path. Stopwatch uploads at most 192 kB of mono `pcm_s16le` audio at 16 kHz. A
relay must lease the item, attach a transcript, and release the raw audio before
the device can review it. Confirmation then calls the normal decision validator.

Voice leasing is disabled until a local transcriber is configured:

```bash
export OPERATOR_TRANSCRIBE_EXECUTABLE=/absolute/path/to/transcribe
export OPERATOR_TRANSCRIBE_ARGS_JSON='["--language","en","{audio}"]'
INK_RELAY_TOKEN=... pnpm --dir packages/calm-operator-ink-bridge agent:relay
```

The executable is launched with `shell: false`, receives a mode-`0600`
temporary PCM file, and must print only the transcript to stdout. A failed or
empty transcription cannot be confirmed.

For the supported local-only path on macOS, install `whisper-cpp`, place the
English `ggml-base.en.bin` model at
`~/Library/Application Support/CREATE SOMETHING/Calm Operator/models/ggml-base.en.bin`,
and point the relay at the included raw-PCM adapter:

```bash
brew install whisper-cpp
export OPERATOR_TRANSCRIBE_EXECUTABLE="$PWD/packages/calm-operator-ink-bridge/scripts/transcribe-local-whisper.mjs"
unset OPERATOR_TRANSCRIBE_ARGS_JSON
INK_RELAY_TOKEN=... pnpm --dir packages/calm-operator-ink-bridge agent:relay
```

The adapter converts the three-second 16 kHz mono PCM file with local `ffmpeg`,
runs the local Whisper model, prints only the transcript, and deletes its WAV
and text intermediates. `CALM_OPERATOR_WHISPER_MODEL` can override the private
model path.

Install the persistent, secret-free user LaunchAgent after configuring the
model. The installer records only executable/workspace paths; Infisical injects
the relay token when the service starts:

```bash
pnpm --dir packages/calm-operator-ink-bridge agent:relay:install
pnpm --dir packages/calm-operator-ink-bridge agent:relay:status
```

Use `agent:relay:uninstall` to boot out the service and remove its plist. The
service is intentionally pinned to the checkout from which it was installed;
re-run `agent:relay:install` after moving or replacing that checkout.

## Producer helpers

MCP review agents and health monitors can post directly to production:

```bash
pnpm post:priority -- \
  --focus "Webflow MCP launch" \
  --risk "Marketplace copy incomplete" \
  --next-action "Review Airtable fields" \
  --linear "CRE-611=https://linear.app/createsomething/issue/CRE-611" \
  --health "Operator health=https://ink.createsomething.agency/operator/health-review"
pnpm post:langfuse-quality -- --input ./langfuse-quality-summary.json
pnpm post:mcp -- --mcp "HubSpot MCP" --reason "Review failed"
pnpm post:health -- --component "Claude Code Slack watcher" --status degraded --summary "No heartbeat in 20 minutes"
```

These commands read `INK_SOURCE_TOKEN` or `CALM_OPERATOR_BRIDGE_TOKEN` from the environment.

`POST /operator/operator-priority` is the preferred producer route when a workflow has
already synthesized the operator view across Linear, Notion, Codex, and health
state. It writes one replaceable `operator-priority:current` alert with:

- `focus`: what the operator should focus on now
- `risk`: why it matters
- `next_action`: the concrete next step
- `signal`: the top source family for the device footer, such as `linear`,
  `health`, `codex`, or `langfuse`
- `source_links`: compact evidence links for the full bridge or operator surface

The Stopwatch display renders the compact brief as `OPERATOR PRIORITY`, with focus,
`HEALTH ATTENTION`, or `QUALITY DRIFT`, with focus, risk, and next action.
Source links stay in the JSON payload for richer surfaces and the firmware detail
screen.
When a producer has structured state but no hand-written copy yet, `post:priority`
can also read `--sources ./operator-state.json` and synthesize the compact brief
from `linear`, `notion`, `codex`, `health`, and `langfuse` keys.

Langfuse input is a quality signal only. It should summarize local eval or
smoke output into a normalized object with status, eval or experiment name,
failure/regression summary, optional permalink, severity, and recommended
action. Critical quality regressions can become the active priority, but blocked
or urgent workflow/client issues stay ahead of quality evidence. Noncritical
Langfuse drift raises severity or adds evidence without replacing explicit
Linear, Notion, Codex, or health work.

Example local summary:

```json
{
  "status": "regression",
  "eval_name": "template-review-hub",
  "regression_summary": "Intent routing score dropped 12%",
  "permalink": "https://www.langfuse.dev/app/exp/abc",
  "severity": 90,
  "recommended_action": "Review failing eval examples"
}
```

Dry-run normalization without posting:

```bash
pnpm --dir packages/calm-operator-ink-bridge post:langfuse-quality -- \
  --input ./langfuse-quality-summary.json \
  --dry-run
```

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

You can run the review manually:

```bash
curl -sS https://ink.createsomething.agency/operator/health-review/run \
  -X POST \
  -H "authorization: Bearer $INK_SOURCE_TOKEN"
```

Pass `?collect=false` to review stored snapshots without collecting remote checks.

Health-review attempts are stored in the bridge Durable Object. Inspect recent
manual, scheduled, device-requested, and health-check-triggered runs with:

```bash
curl -sS "https://ink.createsomething.agency/operator/health-review/runs?limit=20" \
  -H "authorization: Bearer $INK_SOURCE_TOKEN"
```

Run records include trigger, status, timing, collected count, report counts,
error text for failed attempts, and the stored report payload when available.

Ink can request the same review with the lower-privilege device token. This
returns the compact firmware brief shape, so the device can show one calm summary
instead of a full report:

```bash
curl -sS https://ink.createsomething.agency/operator/health-review/request \
  -X POST \
  -H "x-ink-token: $INK_DEVICE_TOKEN"
```

Clearing stored alerts or health state remains a source-token operation; the
shipped device token is only for read, heartbeat, review request, and local
operator-event paths.

## Daily alarms

Daily alarms are configured with `DAILY_ALARMS_CT`, defaulting to `06:00,09:00`.
The Worker evaluates those times in `America/Chicago` and writes an urgent
`daily_alarm` alert when one is due. Each alarm uses a per-day id, so retries are
idempotent, and expires after `ALARM_TTL_MS`, defaulting to 45 minutes.

Run the alarm scheduler manually:

```bash
curl -sS https://ink.createsomething.agency/operator/alarms/run \
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
curl -sS https://ink.createsomething.agency/operator/health-checks \
  -H "authorization: Bearer $INK_SOURCE_TOKEN"
```

Run checks and review immediately:

```bash
curl -sS https://ink.createsomething.agency/operator/health-checks/run \
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
