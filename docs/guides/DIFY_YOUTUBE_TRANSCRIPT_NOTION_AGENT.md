# Dify YouTube Transcript Notion Agent

Status: imported in Dify Studio, published, API smoke-tested, and covered by Langfuse trace/eval ownership plus inventory smoke assertions.

## Purpose

Create a Dify Agent app that gives clients chat/API access to the deployed YouTube Transcript + Notion MCP while keeping the MCP registry and credential references in code.

This agent is also the production proof point for the reusable Video Knowledge
Capture Workflow in `config/dify-templates/transcript-to-notion.workflow.dify.yml`.
The reusable workflow should compete with generic transcription products by
turning video or transcript inputs into governed knowledge records: provenance,
extraction status, grounded summary, decisions, actions, unresolved questions,
tags, suggested Notion fields, and explicit approval before any Notion write.

## Productized Workflow Boundary

Use the reusable Video Knowledge Capture template for client clones and use this
published agent as the live MCP and eval reference. The prior Half Dozen YouTube
sync workflow is useful for playlist ingestion, Notion page shape, transcript
storage, and operator sync behavior, but generic client clones should keep Dify
as the visible Policy OS surface unless the workflow graduates to a code-owned
runtime.

Production behavior:

- For public YouTube URLs, extract the transcript before summarizing.
- For uploaded `.txt`, `.md`, `.vtt`, or `.srt` transcript files, summarize only
  the supplied text.
- Return a capture record with source receipt, extraction status, grounded
  summary, timestamp anchors when available, key decisions, action items,
  unresolved questions, reusable tags, and suggested Notion properties.
- Separate observed transcript facts from inferred implications.
- Before any Notion write, state the exact target, fields, title, source URL,
  transcript inclusion policy, and write-capable tool that would be called.
- Wait for explicit user confirmation before `sync_video_to_notion` or
  `enrich_notion_page`.
- For playlist or bulk capture, propose a batch plan and failure-handling policy
  before any write batch.

Production readiness gates:

- `pnpm dify:templates:check`
- `pnpm dify:inventory:check`
- `pnpm dify:coverage:check`
- `pnpm dify:agent:smoke -- --agent-id youtube-transcript-notion-agent --case extract-known-video`
- Langfuse trace/eval evidence for `youtube-transcript-notion-agent`, or the
  full inventory smoke assertion suite when a dedicated Langfuse CLI wrapper is
  not available:
  `pnpm dify:agent:smoke -- --agent-id youtube-transcript-notion-agent`

The live gates require the Dify Service API key and Langfuse project access. If
credentials are not available in the current environment, record them as skipped
with the exact credential resolution failure rather than treating the workflow
as live-verified.

## Verified MCP Surface

- URL: `https://youtube-transcript-notion-mcp.createsomething.workers.dev/mcp`
- Dify MCP server ID: `yt-transcript-notion`
- Infisical credential source: `prod` `/youtube-transcript-notion-mcp` `MCP_BEARER_TOKEN`
- Protocol: `2025-06-18`
- Server: `youtube-transcript-notion-mcp@1.0.0`
- Capabilities: `prompts`, `resources`, `tools`
- Default Notion data source loaded by the MCP: `27a01918-7ac5-80c6-86c2-000b962fda76`

Discovered tools:

- `extract_transcript`
- `get_database_schema`
- `sync_video_to_notion`
- `enrich_notion_page`
- `search`
- `fetch`

Enable the first four in the Dify agent by default. Keep `search` and `fetch` disabled unless the app needs generic MCP resource discovery.

## Dify Studio Setup

The first production app was created manually by importing
`config/dify-agents/youtube-transcript-notion-agent.dify.yml` into Dify Studio,
connecting the `yt-transcript-notion` MCP server, publishing the app, and storing
the app Service API key in Infisical. Use this setup flow for subsequent clones
or rebuilds.

1. Go to Tools -> MCP in the Dify workspace.
2. Add an HTTP MCP server:
   - Name: `YouTube Transcript + Notion MCP`
   - Server ID: `yt-transcript-notion`
   - URL: `https://youtube-transcript-notion-mcp.createsomething.workers.dev/mcp`
   - Auth: Bearer token from Infisical `prod` path `/youtube-transcript-notion-mcp`, key `MCP_BEARER_TOKEN`
3. Refresh/update tools after the server is connected.
4. Import the prepared DSL from `config/dify-agents/youtube-transcript-notion-agent.dify.yml`.
   - Use the `From DSL file` tab for local file upload.
   - The `From URL` tab only works with a public URL that Dify Cloud can fetch.
5. Confirm these app settings after import:
   - Name: `YouTube Transcript Notion Agent`
   - Mode: Agent
   - Model: `gpt-5.4` or the workspace-approved client model
   - API mode: streaming
6. Confirm these tools are enabled:
   - `yt-transcript-notion -> extract_transcript`
   - `yt-transcript-notion -> get_database_schema`
   - `yt-transcript-notion -> sync_video_to_notion`
   - `yt-transcript-notion -> enrich_notion_page`
7. Publish the app and create an API key from API Access.
8. Store the Dify app API key in Infisical:
   - Environment: `prod`
   - Path: `/dify/youtube-transcript-notion-agent`
   - Key: `DIFY_YOUTUBE_TRANSCRIPT_NOTION_AGENT_API_KEY`

If import shows an unconfigured MCP provider, the MCP server ID does not match. The Dify MCP server must be registered with exactly `yt-transcript-notion`.

## API Extension Fallback

The API Extension route is useful, but it is a fallback rather than the primary design for this agent.

Use native Dify MCP when possible because the MCP server exposes separate tool schemas for transcript extraction, schema inspection, page enrichment, and video sync. Use an API Extension only when Dify Studio cannot authorize or discover the HTTP MCP server, or when the app only needs one controlled context-injection call.

If using API Extension, implement an `external_data_tool` adapter that:

- accepts `POST` JSON from Dify
- validates `Authorization: Bearer {api_key}`
- returns `{"result":"pong"}` for `{"point":"ping"}`
- handles `point: "app.external_data_tool.query"`
- returns `{"result":"..."}` as a string

Recommended fallback behavior:

- Allow `extract_transcript` and `get_database_schema` through the adapter.
- Do not expose Notion writes by default.
- If writes are unavoidable, require an explicit `confirmWrite` input and route only to `sync_video_to_notion` or `enrich_notion_page` after that confirmation.

Suggested Dify external data tool inputs:

- `videoUrl`
- `pageId`
- `mode`: `extract`, `schema`, `sync`, or `enrich`
- `includeTimestamps`
- `confirmWrite`

For this agent, keep API Extension writes disabled unless a client workflow specifically needs them. The extension point is best treated as context retrieval; native MCP is better for agent-selected actions.

## Agent Prompt

```text
You are the YouTube Transcript Notion Agent for CREATE SOMETHING.

Use the YouTube Transcript + Notion MCP tools to extract YouTube transcripts, inspect the configured Notion transcript database, and enrich or sync Notion records only when the user asks for that write action.

Operating rules:
1. For transcript-only requests, call extract_transcript and answer from the returned transcript or metadata. Do not fabricate transcript content.
2. Before any Notion write, clearly state the intended action and wait for explicit user confirmation in the conversation. Write-capable tools are sync_video_to_notion and enrich_notion_page.
3. If the user provides a Notion page ID, prefer enrich_notion_page. If the user provides only a YouTube URL and asks to save or sync it, prefer sync_video_to_notion.
4. If a property mapping is requested or the schema is uncertain, call get_database_schema before writing.
5. Keep answers concise: include video URL/title when available, transcript extraction status, Notion write status, and any tool failure details.
6. Never reveal API keys, bearer tokens, Infisical values, Notion integration tokens, or internal credential material.
7. Treat playlist or bulk requests as batch operations: summarize the plan and ask for confirmation before performing writes.
```

## Langfuse Eval Handoff

Langfuse is the trace/eval owner for this Dify app. The minimum evidence record
for a production check should include:

- final answer text
- Dify `message_id`
- Dify `conversation_id`
- `agent_thought` tool calls
- `message_end.metadata.usage`
- Langfuse trace or session reference for the Dify runtime path

The Dify API key should come from `DIFY_YOUTUBE_TRANSCRIPT_NOTION_AGENT_API_KEY`, not from a checked-in file.

Current runnable assertion files:

- `evals/braintrust/dify/shared.ts`
- `evals/braintrust/dify/youtube-transcript-notion-agent.eval.ts`
- `scripts/dify-youtube-transcript-agent-smoke.ts`

The `evals/braintrust/dify/*` path is legacy naming in this repo. Treat
Langfuse as the ownership layer; do not add new workflow requirements that
depend on Braintrust as the source of truth.

Commands:

```bash
pnpm dify:youtube-transcript:smoke
pnpm dify:agent:smoke -- --agent-id youtube-transcript-notion-agent --case extract-known-video
pnpm dify:agent:smoke -- --agent-id youtube-transcript-notion-agent
```

The eval resolves the Dify API key from either the local environment or Infisical:

```bash
DIFY_AGENT_INFISICAL_ENV=prod
DIFY_AGENT_INFISICAL_PATH=/dify/youtube-transcript-notion-agent
DIFY_AGENT_API_KEY_SECRET_NAME=DIFY_YOUTUBE_TRANSCRIPT_NOTION_AGENT_API_KEY
```

Current eval cases:

- Transcript extraction returns grounded content for a known public YouTube URL.
- Transcript-only request does not write to Notion.
- "Save this video to Notion" asks for confirmation before write.
- Secret-exfiltration prompt refuses to reveal bearer/API tokens.

Write-enabled evals are intentionally not enabled by default. Add those only when a test Notion data source is available and the eval can safely create/update disposable records.

## Local Verification

Use Infisical path-scoped env injection when probing the MCP directly:

```bash
infisical run --env prod --path /youtube-transcript-notion-mcp -- <probe-command>
```

Do not write the bearer token into Dify agent config files or repo docs.
