# Dify Workspace Inventory (Generated)

> Auto-generated from `config/dify/inventory.json`.
> Regenerate with `pnpm dify:inventory:generate`.

Workspace: CREATE SOMETHING (dify_cloud)
Status: partial

## Snapshot

- Last manual inventory: 2026-04-29
- Source: Dify Studio manual import plus repo-side smoke/eval evidence
- Notes: This inventory is intentionally partial until all existing Dify MCP server cards and apps are exported or manually transcribed.

## MCP Server Cards

| Dify Server ID | Source MCP Registry Server | URL | Auth | Enabled Tools | Write Tools |
| --- | --- | --- | --- | ---: | --- |
| `yt-transcript-notion` | `youtube-transcript-notion-mcp` | `https://youtube-transcript-notion-mcp.createsomething.workers.dev/mcp` | `bearer` | 4 | `sync_video_to_notion`, `enrich_notion_page` |

## Agents

| Agent | Status | Audience | App ID | MCP Servers | Enabled Tools | Eval Suite |
| --- | --- | --- | --- | --- | ---: | --- |
| `youtube-transcript-notion-agent` | `published` | `client` | - | `yt-transcript-notion` | 4 | `braintrust:eval:dify:youtube-transcript` |

## Agent Tool Mapping

### YouTube Transcript Notion Agent

- Inventory ID: `youtube-transcript-notion-agent`
- Policy pack: `client-youtube-transcript-notion.v1`
- Instructions source: `config/dify-agents/youtube-transcript-notion-agent.json#agent_prompt`
- Smoke: `pnpm dify:youtube-transcript:smoke`
- Tools:
  - `yt-transcript-notion.extract_transcript` (read)
  - `yt-transcript-notion.get_database_schema` (read)
  - `yt-transcript-notion.sync_video_to_notion` (write, confirmation required)
  - `yt-transcript-notion.enrich_notion_page` (write, confirmation required)

