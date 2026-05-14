# Notion Worker Experiments

Small Notion Worker spike package for CREATE SOMETHING Custom Agent tools.

This package is intentionally separate from the Cloudflare Worker MCP packages. It validates Notion-native delivery for capabilities that should run inside Notion Custom Agents.

## Current Scope

- `summarizePage` - read-only page preview tool using `context.notion`.
- `appendPolicyNote` - write-capable page note appender. In Notion Custom Agents this should require user confirmation.

No production deployment is configured at the repo root yet.

## Setup

Install the Notion CLI:

```bash
curl -fsSL https://ntn.dev | bash
ntn login
ntn doctor
```

Notion's Worker quickstart now lists Node.js `22+` and npm `10+` as the deploy
environment. The monorepo build may run under the repo's current Node version,
but hosted Worker deploy tests should use Node 22 before promotion.

For local execution, create a local `.env` from `.env.example` and set `NOTION_API_TOKEN` from a secret manager or temporary shell session.

## Local Tool Tests

```bash
cd packages/notion-worker-experiments

ntn workers exec summarizePage --local -d '{"pageId":"<page_id>","maxBlocks":5}'

ntn workers exec appendPolicyNote --local -d '{"pageId":"<page_id>","heading":"Policy note","note":"Test note from local Worker execution.","sourceUrl":null}'
```

Use the write tool only against disposable pages while testing.

## Hosted Worker Flow

```bash
cd packages/notion-worker-experiments
ntn workers deploy --name create-something-notion-worker-experiments
ntn workers exec summarizePage -d '{"pageId":"<page_id>","maxBlocks":5}'
ntn workers runs list
```

Store external API keys with `ntn workers env set`. Do not commit secrets.

## Design Notes

- Agent Tools are the preferred Notion Worker spike because they make CREATE SOMETHING capabilities available directly inside Notion.
- Syncs should be piloted only for greenfield Notion-managed databases until Notion supports syncing into existing client-owned databases.
- The current `@notionhq/workers` package exposes `hints` in docs but does not yet type/copy that field in `ToolConfiguration`; `src/index.ts` patches the returned capability manifest for `readOnlyHint` so the experiment matches the documented Agent Tool behavior.
- `@notionhq/workers@0.3.0` currently peers against `@notionhq/client@^2.2.15`.
  Keep this package on the compatible peer range until the Workers SDK supports
  the standalone SDK v5 line. The `@notionhq/client` `5.21.0` guidance in the
  repo audit applies to non-Worker SDK packages that opt in to API
  `2026-03-11`.
- For Custom Agent calls, `context.notion` is authenticated by Notion with the
  Custom Agent's permissions. For local tests, syncs, webhooks, and CLI exec,
  supply `NOTION_API_TOKEN` explicitly.

## Related Docs

- `docs/guides/NOTION_WORKERS_AND_CLI_2026.md`
- `docs/guides/NOTION_API_COMPATIBILITY_AUDIT_2026.md`
- https://developers.notion.com/workers/guides/tools
- https://developers.notion.com/workers/guides/syncs
- https://developers.notion.com/workers/guides/api-client
- https://developers.notion.com/cli/get-started/overview
