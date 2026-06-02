# Half Dozen Agent Review Webhook

Cloudflare Worker endpoint for Notion Automation `Send webhook` actions from the Half Dozen
`Agents / Tools` database. When Half Dozen flags an agent build for review, the webhook creates a
CREATE SOMETHING Linear issue and optionally sends a Slack webhook notification.

Open Linear issues are deduplicated by agent title. A repeated Notion fire for the same agent
reuses the existing open review issue and appends a duplicate-fire comment.

By default, each intake also creates or reuses two Linear follow-up issues:

- `Build Half Dozen agent: <agent name>`
- `Run and share Half Dozen agent eval: <agent name>`

That makes the expected automated flow: Notion notification received, intake created or reused,
build work kicked off, eval/share work kicked off, and eval evidence linked back to the intake.

The eval follow-up points at the repo-owned governance gate:

```bash
pnpm agent:halfdozen:governance-eval -- --output .cache/halfdozen-agent-governance-eval.json
```

The generated `notion_test_report` payload should be mirrored into `Test Reports [OS]`, then linked
back on the intake issue.

When a Notion page URL or page ID is present, the Worker reads the page's block children through
the Notion API and appends the flattened page instructions to the Linear issue. The Notion
connection used by `NOTION_API_KEY` must have read access to the target page. In Notion, share the
source page or its parent database with that integration before expecting page-body content to
appear in Linear.

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
- a page URL or formula property containing the Notion page URL

If CREATE SOMETHING needs a direct link back to the Notion record, expose that as a database URL
property and select it in the webhook content. Notion webhook actions only send selected database
properties, not page contents.

For one-off pages that do not yet have a URL property, configure `PAGE_URL_BY_AGENT_NAME_JSON`
with a JSON object mapping agent names to Notion page URLs.

## Runtime

```bash
pnpm --filter @create-something/halfdozen-agent-review-webhook check
pnpm --filter @create-something/halfdozen-agent-review-webhook deploy
```

Required secrets:

```bash
wrangler secret put WEBHOOK_SECRET
wrangler secret put LINEAR_API_KEY
wrangler secret put NOTION_API_KEY
```

Optional secrets:

```bash
wrangler secret put SLACK_WEBHOOK_URL
wrangler secret put PAGE_URL_BY_AGENT_NAME_JSON
```

Optional vars:

```toml
CREATE_WORKFLOW_ISSUES = "false" # disables build/eval follow-up issue creation
```
