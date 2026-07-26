# Operator Chat Agent POC

Cloudflare Think proof of concept for a mobile CREATE SOMETHING operator agent.

The first mobile app is Telegram. Telegram is only the ingress. The product
question is whether an operator can use a phone chat surface to route work into
governed CREATE SOMETHING systems without weakening auth, spend, or evidence
boundaries.

## Why this exists

Recent Poncho / AgentCash research suggests two different operating planes:

| Plane | Best fit | Governance boundary |
| --- | --- | --- |
| Connected SaaS | Durable authenticated operations through Linear, Notion, Composio-backed MCP tools, and repo-owned workers | actor identity, tenant/account scoping, route classification, authz, quotas, traces |
| Paid capability | Bounded external capability purchase or artifact retrieval through Poncho / AgentCash-style systems | spend cap, approval evidence, artifact receipt, no prompt-only approval |

This package is the mobile operator shell for testing that split. It can answer
from a phone, inspect read-only work state, and prepare a paid-capability handoff.
It does not execute live spend.

## Current scope

- Telegram direct-message and mention ingress via Cloudflare Think messengers.
- Durable conversation state through the Think / Agents Durable Object runtime.
- Public `GET /healthz`.
- Token-gated `POST /admin/telegram/setup` for Telegram webhook registration.
- No public `/reset` route.
- Telegram webhook ingress fails closed unless `TELEGRAM_ALLOWED_USER_IDS` or
  `TELEGRAM_ALLOWED_CHAT_IDS` includes the sender.
- Read-only Linear issue lookup when `LINEAR_API_KEY` is configured.
- `request_paid_capability` tool that returns a Linear-ready handoff instead of
  calling Poncho, AgentCash, or any wallet.

## Tier mapping

- Database: Durable Object SQLite for chat state; Linear remains durable task
  coordination and evidence; future spend receipts belong in Linear plus the
  relevant authz/telemetry store.
- Automation: Cloudflare Worker, Think messenger adapter, read-only Linear
  lookup, and future MCP/Hub tools.
- Judgment: `beforeToolCall` enforces tool mode and paid-capability mode before
  execution.

## Setup

```bash
pnpm --dir packages/operator-chat-agent install
pnpm --dir packages/operator-chat-agent check
pnpm --dir packages/operator-chat-agent test
```

Create local development secrets:

```bash
cp packages/operator-chat-agent/.dev.vars.example packages/operator-chat-agent/.dev.vars
```

Required secrets:

- `OPERATOR_ADMIN_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_WEBHOOK_SECRET_TOKEN`
- `TELEGRAM_ALLOWED_USER_IDS` or `TELEGRAM_ALLOWED_CHAT_IDS`

Optional:

- `LINEAR_API_KEY`
- `LINEAR_TEAM_KEY`, default `CRE`
- `OPERATOR_TOOL_ACCESS_MODE`, default `read_only`
- `PAID_CAPABILITY_MODE`, default `handoff_only`
- `PAID_CAPABILITY_MAX_USD`, default `25`

## Telegram phone setup

1. In Telegram, open `@BotFather`.
2. Send `/newbot`.
3. Choose a display name and username.
4. Save the bot token BotFather gives you.
5. Open the new bot from your phone and send `/start`.
6. Before registering a webhook, discover your Telegram IDs:

```bash
TELEGRAM_BOT_TOKEN=... pnpm --dir packages/operator-chat-agent telegram:discover
```

The command prints `TELEGRAM_ALLOWED_USER_IDS=...` and
`TELEGRAM_ALLOWED_CHAT_IDS=...`. Set at least one of those before deploying the
webhook path.

## Deploy and register webhook

Set Worker secrets manually:

```bash
pnpm --dir packages/operator-chat-agent exec wrangler secret put OPERATOR_ADMIN_TOKEN
pnpm --dir packages/operator-chat-agent exec wrangler secret put TELEGRAM_BOT_TOKEN
pnpm --dir packages/operator-chat-agent exec wrangler secret put TELEGRAM_BOT_USERNAME
pnpm --dir packages/operator-chat-agent exec wrangler secret put TELEGRAM_WEBHOOK_SECRET_TOKEN
pnpm --dir packages/operator-chat-agent exec wrangler secret put TELEGRAM_ALLOWED_USER_IDS
```

Or push them from Infisical:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --dir packages/operator-chat-agent secrets:push
```

Optional live Linear lookup:

```bash
pnpm --dir packages/operator-chat-agent exec wrangler secret put LINEAR_API_KEY
```

Validate and deploy:

```bash
pnpm --dir packages/operator-chat-agent check
pnpm --dir packages/operator-chat-agent test
pnpm --dir packages/operator-chat-agent run deploy:worker
```

After deployment or local tunnel setup:

```bash
OPERATOR_CHAT_AGENT_URL=https://<worker-host> \
OPERATOR_ADMIN_TOKEN=... \
pnpm --dir packages/operator-chat-agent telegram:setup
```

The webhook target is `/messengers/telegram/webhook`.

Check webhook status:

```bash
TELEGRAM_BOT_TOKEN=... pnpm --dir packages/operator-chat-agent telegram:status
```

Smoke the deployed Worker:

```bash
OPERATOR_CHAT_AGENT_URL=https://<worker-host> \
pnpm --dir packages/operator-chat-agent smoke:production
```

## Mobile commands

The Telegram chat has deterministic command handling before the Think agent
runtime. Use commands for control-plane state and short prompts for agent work:

- `status`: runtime, ingress, tool mode, Linear configuration, and spend posture.
- `help`: command list and prompt examples.
- `research`: Poncho / AgentCash / Composio framing for this POC.

For task work, use explicit verbs and evidence targets, for example:

- `List open CRE issues.`
- `Summarize AgentCash risks.`
- `Prepare a paid capability handoff under $25.`

Telegram is the mobile ingress. Linear is the evidence surface. Spend remains
handoff-only until the owning policy and promotion path explicitly change.

## Tools

- `operator_status`: summarizes runtime mode, access mode, and the two operating
  planes.
- `linear_open_issues`: reads recent open Linear issues when the Linear key is
  present.
- `research_lane_summary`: explains the Poncho / AgentCash / Composio framing.
- `request_paid_capability`: creates a governed handoff for a paid capability
  request. It blocks requests over `PAID_CAPABILITY_MAX_USD` and never spends.

## Promotion rules

Do not connect live paid capability execution until all of these exist:

- a Linear issue with the intended workflow, expected artifact, spend cap, and
  rollback/no-op path;
- authz classification for the paid route;
- quota/rate-limit controls for the actor or tenant;
- receipt/artifact persistence;
- evidence comment back to Linear.

For production promotion, use Git branch/PR boundaries and record deploy,
validation, smoke, and rollback evidence in Linear.
