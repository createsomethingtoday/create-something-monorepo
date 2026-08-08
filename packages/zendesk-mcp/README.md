# Zendesk MCP

Separate MCP server for Webflow asset reviewers working in Webflow Zendesk (`webflow2579.zendesk.com`).

It exposes Zendesk tickets, comments, users, views, and guarded ticket write operations through MCP. Secrets stay in Infisical, Wrangler secrets, or local shell env; do not commit Zendesk tokens or MCP bearer tokens.

The canonical personal Codex plugin is bundled in `plugin/`. It connects directly to the production HTTPS MCP, so a fresh Codex task can discover the reviewer skill and Zendesk tools without a local stdio launcher.

## Plugin boundary

- Zendesk owns ticket conversation, requester context, comments, and ticket status.
- Webflow App Review MCP owns Airtable review records, Asset Versions, governance findings, and review decisions.
- The plugin owns routing, approval classes, stop conditions, readback, and mutation receipts.
- Slack remains a separate collaboration surface; the plugin does not silently post or reply there.

The plugin is a personal reviewer lane. It is not a public directory listing, organization-wide installation, or substitute for bounded App Review MCP authority.

## Framework Tier

| Tier           | MCP Primitive | Role                                                                                |
| -------------- | ------------- | ----------------------------------------------------------------------------------- |
| **Database**   | Resources     | Redacted Webflow Zendesk account boundary and reviewer workflow contract            |
| **Automation** | Tools         | Search/read tickets, inspect comments/users/views, add comments, update status/tags |
| **Judgment**   | Prompts       | Draft and triage reviewer-safe Zendesk comments                                     |

## Tools

Read-only:

- `zendesk_health`
- `zendesk_search_tickets`
- `zendesk_find_asset_review_tickets`
- `zendesk_get_ticket`
- `zendesk_list_ticket_comments`
- `zendesk_list_active_views`
- `zendesk_list_view_tickets`
- `zendesk_get_user`

Writes:

- `zendesk_add_ticket_comment` writes a public reply or private internal note. Public replies require `confirm_public_reply=true`.
- `zendesk_update_ticket_status` updates status/tags and can add a private internal note.
- `zendesk_add_internal_note` is a private-note-only compatibility tool.

All write tools require explicit confirmation flags and are hidden when `ZENDESK_READ_ONLY=true` or `MCP_TOOL_ACCESS_MODE=read_only`.

## Required Config

Default non-secret:

```bash
WEBFLOW_ZENDESK_SUBDOMAIN=webflow2579
```

Zendesk API-token auth:

```bash
WEBFLOW_ZENDESK_EMAIL=reviewer@example.com
WEBFLOW_ZENDESK_API_TOKEN=...
```

Integration-user password fallback:

```bash
WEBFLOW_ZENDESK_EMAIL=support-admin@webflow.com
WEBFLOW_ZENDESK_PASSWORD=...
```

OAuth bearer-token auth alternative:

```bash
WEBFLOW_ZENDESK_OAUTH_TOKEN=...
```

Remote MCP transport auth:

```bash
ZENDESK_MCP_API_KEY=...
# or MCP_API_KEY=...
```

Recommended Infisical shape:

```bash
infisical run --env=prod --path=/webflow/zendesk --include-imports=true -- \
  pnpm --filter @create-something/zendesk-mcp start
```

Use the actual project path if Webflow Zendesk secrets already live elsewhere.

The personal plugin references `ZENDESK_MCP_API_KEY` only by environment-variable name:

```json
{
  "type": "http",
  "url": "https://zendesk-mcp.createsomething.workers.dev/mcp",
  "bearer_token_env_var": "ZENDESK_MCP_API_KEY"
}
```

Inject the value into the process that launches Codex from Infisical or another approved secret manager. Never place the token in the plugin bundle, repository files, screenshots, prompts, logs, or Linear evidence.

## Personal plugin

```text
plugin/
├── .codex-plugin/plugin.json
├── .mcp.json
└── skills/webflow-zendesk-reviewer/
    ├── SKILL.md
    ├── agents/openai.yaml
    └── references/
        ├── authentication.md
        ├── policy.webflow-zendesk-reviewer.v1.json
        ├── policy.webflow-zendesk-reviewer.v1.md
        └── receipt-template.md
```

The plugin starts read-only in its operating workflow. Reading current ticket and comment state is the prerequisite for any mutation. Private internal notes, public replies, and status/tag changes have graduated approval requirements in the packaged policy; tool confirmation flags are necessary but do not themselves grant user authorization.

Validate the complete package and plugin bundle without calling Zendesk:

```bash
pnpm --filter @create-something/zendesk-mcp verify
```

After installation, use a fresh Codex task to invoke `$webflow-zendesk-reviewer` and run `zendesk_health` before reading an exact ticket. Do not write to a ticket merely to prove connectivity.

## Local Development

```bash
pnpm --filter @create-something/mcp-core build
pnpm --filter @create-something/zendesk-mcp typecheck
pnpm --filter @create-something/zendesk-mcp build
```

Run stdio locally:

```bash
infisical run --env=prod --path=/webflow/zendesk --include-imports=true -- \
  pnpm --filter @create-something/zendesk-mcp start
```

## Worker

```bash
pnpm exec wrangler secret put ZENDESK_MCP_API_KEY --cwd packages/zendesk-mcp/worker
pnpm exec wrangler secret put WEBFLOW_ZENDESK_EMAIL --cwd packages/zendesk-mcp/worker
pnpm exec wrangler secret put WEBFLOW_ZENDESK_API_TOKEN --cwd packages/zendesk-mcp/worker
# or, when using the integration-user login:
pnpm exec wrangler secret put WEBFLOW_ZENDESK_PASSWORD --cwd packages/zendesk-mcp/worker
pnpm exec wrangler deploy --cwd packages/zendesk-mcp/worker
```

`/health` reports only secret presence, never secret values.

## Agent Legibility Contract

| Field               | Value                                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry point         | `README.md`, `src/server.ts`, `worker/index.ts`                                                                                                                   |
| Boot command        | `pnpm --filter @create-something/zendesk-mcp build && pnpm --filter @create-something/zendesk-mcp start`                                                          |
| Smoke command       | `pnpm --filter @create-something/zendesk-mcp verify`                                                                                                              |
| Validation surfaces | typecheck, build, plugin packaging and policy tests, Worker `/health`, fresh-task authenticated read-only MCP call, and separately approved representative writes |
| UI validation path  | Webflow Zendesk ticket, for example `https://webflow2579.zendesk.com/agent/tickets/1147219`                                                                       |
| Escalation rule     | Stop if Zendesk auth, agent permissions, ticket visibility, or transport auth cannot be verified without exposing credentials.                                    |

## Rollback

Disable or remove the personal plugin and revoke or narrow the MCP transport token if needed. Plugin removal stops future agent access but does not reverse Zendesk changes already made through the MCP. Every approved ticket mutation requires its own compensating action and receipt.
