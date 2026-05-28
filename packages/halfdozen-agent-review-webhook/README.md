# Half Dozen Agent Review Webhook

Cloudflare Worker endpoint for Notion Automation `Send webhook` actions from the Half Dozen
`Agents / Tools` database. When Half Dozen flags an agent build for review, the webhook creates a
CREATE SOMETHING Linear issue and optionally sends a Slack webhook notification.

## Notion Setup

Use the deployed Worker URL in the Notion action:

```text
https://halfdozen-agent-review-webhook.createsomething.workers.dev/webhook
```

Add one custom header:

```text
Authorization: Bearer <WEBHOOK_SECRET>
```

Select these Notion properties in the webhook content when present:

- `Name`
- `Status`
- `Priority`
- `Type`
- `Agent URL`
- `Agent Description`
- `Activated`

## Runtime

```bash
pnpm --filter @create-something/halfdozen-agent-review-webhook check
pnpm --filter @create-something/halfdozen-agent-review-webhook deploy
```

Required secrets:

```bash
wrangler secret put WEBHOOK_SECRET
wrangler secret put LINEAR_API_KEY
```

Optional secrets:

```bash
wrangler secret put SLACK_WEBHOOK_URL
```
