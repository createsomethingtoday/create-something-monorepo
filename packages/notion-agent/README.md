# Notion Agent

**Your prompt. Our infrastructure. Works while you sleep.**

Custom Notion Agents by CREATE SOMETHING.

## What it does

Notion Agent lets you build custom AI agents that automate your Notion workspace. You define what the agent does in plain English. We handle the infrastructure.

## How it works

```
┌─────────────────────────────────────────────────────────┐
│                    Your Prompt                          │
│  "Every morning, summarize incomplete tasks from        │
│   Projects database and create a priorities list."      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              CREATE SOMETHING Infrastructure            │
│  • Cloudflare Workers (edge execution)                  │
│  • Workers AI (agent intelligence)                      │
│  • D1 Database (agent configs, execution history)       │
│  • KV Store (OAuth, rate limiting)                      │
│  • Cron Triggers (scheduled execution)                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Your Notion Workspace                  │
│  Databases you authorize. Secure OAuth. Audit logs.     │
└─────────────────────────────────────────────────────────┘
```

## Architecture

### User Message vs System Message

- **User Message**: What you configure. Your prompt defining agent behavior.
- **System Message**: What we manage. Notion API tools, safety constraints, permissions.

This mirrors how ChatGPT Custom GPTs work—you define behavior, platform ensures safety.

### Security

- OAuth 2.0 with encrypted token storage
- Agents can only access databases you explicitly authorize
- All operations logged for audit compliance
- Rate limiting per user/agent

## Setup

### 1. Create Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create notion-agent-db

# Create KV namespace
wrangler kv namespace create KV

# Update wrangler.toml with the IDs
```

### 2. Configure Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Copy the OAuth client ID and secret

### 3. Set Secrets

```bash
wrangler secret put NOTION_CLIENT_ID
wrangler secret put NOTION_CLIENT_SECRET
wrangler secret put ENCRYPTION_KEY  # Generate: openssl rand -hex 32
```

### 4. Run Migrations

```bash
pnpm db:migrate:prod
```

### 5. Deploy

```bash
# Main app
pnpm deploy

# Scheduler worker
cd workers/scheduler && pnpm deploy
```

## Development

```bash
# Install dependencies
pnpm install

# Run migrations locally
pnpm db:migrate

# Start dev server
pnpm dev
```

## API

### Execute Agent

```bash
# Manual trigger (requires auth cookie)
GET /api/execute?agent_id=<id>

# Webhook trigger (for external systems)
POST /api/execute
Content-Type: application/json

{
  "agent_id": "<id>",
  "context": "Optional trigger context"
}
```

### Agent CRUD

```bash
# List agents
GET /api/agents

# Get agent with executions
GET /api/agents?id=<id>

# Create agent
POST /api/agents
{
  "name": "Daily Summary",
  "user_message": "Summarize tasks...",
  "databases": ["db-id-1", "db-id-2"],
  "schedule": "0 8 * * *"
}

# Update agent
PATCH /api/agents
{
  "id": "<id>",
  "enabled": false
}

# Delete agent
DELETE /api/agents?id=<id>
```

## Cron Schedules

The scheduler worker runs every 5 minutes and executes agents with matching cron expressions:

| Expression | Description |
|------------|-------------|
| `0 8 * * *` | Daily at 8 AM UTC |
| `0 9 * * 1` | Weekly on Monday at 9 AM UTC |
| `0 0 1 * *` | Monthly on the 1st |
| `0 */6 * * *` | Every 6 hours |

## Tech Stack

- **Frontend**: SvelteKit 5 + Tailwind CSS
- **Backend**: Cloudflare Pages Functions
- **Database**: Cloudflare D1
- **Cache/State**: Cloudflare KV
- **AI**: Cloudflare Workers AI
- **Scheduling**: Cloudflare Cron Triggers

## Future

This standalone demo validates the approach. Once proven:

1. Add `notion` as a full vertical in TEND
2. Import agent configs into TEND's unified SDK
3. Enable cross-source automations (Notion + Gmail + Slack)

---

Built by [CREATE SOMETHING](https://createsomething.agency)
