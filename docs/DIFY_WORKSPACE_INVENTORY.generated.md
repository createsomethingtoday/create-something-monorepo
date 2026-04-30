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
| `blondish_hub` | - | `https://blondish.mcp.createsomething.agency/mcp` | `bearer` | 17 | `hub_execute_proxy_tool`, `hub_refresh_connections`, `hub_run_intent`, `hub_run_proxy_tool`, `hub_set_discovery`, `hub_update_state` |
| `morgan_hub` | - | `https://morgan-young-c3-management.mcp.createsomething.agency/mcp` | `bearer` | 17 | `hub_execute_proxy_tool`, `hub_refresh_connections`, `hub_run_intent`, `hub_run_proxy_tool`, `hub_set_discovery`, `hub_update_state` |
| `viv_hub` | - | `https://viv-blondish.mcp.createsomething.agency/mcp` | `bearer` | 17 | `hub_execute_proxy_tool`, `hub_refresh_connections`, `hub_run_intent`, `hub_run_proxy_tool`, `hub_set_discovery`, `hub_update_state` |

## Agents

| Agent | Status | Audience | App ID | MCP Servers | Enabled Tools | Eval Suite |
| --- | --- | --- | --- | --- | ---: | --- |
| `youtube-transcript-notion-agent` | `published` | `client` | - | `yt-transcript-notion` | 4 | `braintrust:eval:dify:youtube-transcript` |
| `blondish-hub` | `imported` | `client` | - | `blondish_hub` | 17 | `braintrust:eval:dify:blondish-hub` |
| `morgan-hub` | `imported` | `client` | - | `morgan_hub` | 17 | `braintrust:eval:dify:morgan-hub` |
| `viv-hub` | `imported` | `client` | - | `viv_hub` | 17 | `braintrust:eval:dify:viv-hub` |

## Eval Coverage

| Agent | Owner | Project | Experiment | Required Checks | Last Verified |
| --- | --- | --- | --- | --- | --- |
| `youtube-transcript-notion-agent` | `braintrust` | `create-something-dify-agents` | `youtube_transcript_notion_agent` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `grounded_answer`, `write_confirmation`, `secret_refusal`, `latency_budget` | `2026-04-29` |
| `blondish-hub` | `braintrust` | `create-something-dify-agents` | `blondish_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `morgan-hub` | `braintrust` | `create-something-dify-agents` | `morgan_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `viv-hub` | `braintrust` | `create-something-dify-agents` | `viv_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |

## Smoke Cases

| Agent | Case | Required Tools | Expected Answer Substrings | Forbidden Answer Substrings | Write Tools Allowed |
| --- | --- | --- | --- | --- | --- |
| `youtube-transcript-notion-agent` | `purpose-no-write` | - | `transcript` | - | no |
| `youtube-transcript-notion-agent` | `extract-known-video` | `extract_transcript` | `What a Billion Database Rows Look Like in Real Life`, `supadata`, `154` | - | no |
| `youtube-transcript-notion-agent` | `write-confirmation-guardrail` | - | `confirm` | - | no |
| `youtube-transcript-notion-agent` | `secret-refusal` | - | `API key`, `secret` | - | no |
| `blondish-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `morgan-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `viv-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |

## Agent Tool Mapping

### YouTube Transcript Notion Agent

- Inventory ID: `youtube-transcript-notion-agent`
- Policy pack: `client-youtube-transcript-notion.v1`
- Instructions source: `config/dify-agents/youtube-transcript-notion-agent.json#agent_prompt`
- Smoke: `pnpm dify:agent:smoke -- --agent-id youtube-transcript-notion-agent`
- Local eval: `pnpm braintrust:eval:dify:local`
- Published eval: `pnpm braintrust:eval:dify:youtube-transcript`
- Tools:
  - `yt-transcript-notion.extract_transcript` (read)
  - `yt-transcript-notion.get_database_schema` (read)
  - `yt-transcript-notion.sync_video_to_notion` (write, confirmation required)
  - `yt-transcript-notion.enrich_notion_page` (write, confirmation required)

### BLOND:ISH HUB

- Inventory ID: `blondish-hub`
- Policy pack: `client-blondish-hub.v1`
- Instructions source: `config/dify-agents/blondish-hub.json#agent_prompt`
- Smoke: `pnpm dify:agent:smoke -- --agent-id blondish-hub`
- Tools:
  - `blondish_hub.hub_describe_proxy_tool` (read)
  - `blondish_hub.hub_execute_proxy_tool` (external_side_effect, confirmation required)
  - `blondish_hub.hub_get_proxy_tool` (read)
  - `blondish_hub.hub_list_discovery_packs` (read)
  - `blondish_hub.hub_list_proxy_tools` (read)
  - `blondish_hub.hub_list_registry` (read)
  - `blondish_hub.hub_list_services` (read)
  - `blondish_hub.hub_policy_status` (read)
  - `blondish_hub.hub_refresh_connections` (external_side_effect, confirmation required)
  - `blondish_hub.hub_route_intent` (read)
  - `blondish_hub.hub_run_intent` (external_side_effect, confirmation required)
  - `blondish_hub.hub_run_proxy_tool` (external_side_effect, confirmation required)
  - `blondish_hub.hub_search_proxy_tools` (read)
  - `blondish_hub.hub_set_discovery` (external_side_effect, confirmation required)
  - `blondish_hub.hub_status` (read)
  - `blondish_hub.hub_trace_lookup` (read)
  - `blondish_hub.hub_update_state` (external_side_effect, confirmation required)

### MORGAN HUB

- Inventory ID: `morgan-hub`
- Policy pack: `client-morgan-hub.v1`
- Instructions source: `config/dify-agents/morgan-hub.json#agent_prompt`
- Smoke: `pnpm dify:agent:smoke -- --agent-id morgan-hub`
- Tools:
  - `morgan_hub.hub_describe_proxy_tool` (read)
  - `morgan_hub.hub_execute_proxy_tool` (external_side_effect, confirmation required)
  - `morgan_hub.hub_get_proxy_tool` (read)
  - `morgan_hub.hub_list_discovery_packs` (read)
  - `morgan_hub.hub_list_proxy_tools` (read)
  - `morgan_hub.hub_list_registry` (read)
  - `morgan_hub.hub_list_services` (read)
  - `morgan_hub.hub_policy_status` (read)
  - `morgan_hub.hub_refresh_connections` (external_side_effect, confirmation required)
  - `morgan_hub.hub_route_intent` (read)
  - `morgan_hub.hub_run_intent` (external_side_effect, confirmation required)
  - `morgan_hub.hub_run_proxy_tool` (external_side_effect, confirmation required)
  - `morgan_hub.hub_search_proxy_tools` (read)
  - `morgan_hub.hub_set_discovery` (external_side_effect, confirmation required)
  - `morgan_hub.hub_status` (read)
  - `morgan_hub.hub_trace_lookup` (read)
  - `morgan_hub.hub_update_state` (external_side_effect, confirmation required)

### VIV HUB

- Inventory ID: `viv-hub`
- Policy pack: `client-viv-hub.v1`
- Instructions source: `config/dify-agents/viv-hub.json#agent_prompt`
- Smoke: `pnpm dify:agent:smoke -- --agent-id viv-hub`
- Tools:
  - `viv_hub.hub_describe_proxy_tool` (read)
  - `viv_hub.hub_execute_proxy_tool` (external_side_effect, confirmation required)
  - `viv_hub.hub_get_proxy_tool` (read)
  - `viv_hub.hub_list_discovery_packs` (read)
  - `viv_hub.hub_list_proxy_tools` (read)
  - `viv_hub.hub_list_registry` (read)
  - `viv_hub.hub_list_services` (read)
  - `viv_hub.hub_policy_status` (read)
  - `viv_hub.hub_refresh_connections` (external_side_effect, confirmation required)
  - `viv_hub.hub_route_intent` (read)
  - `viv_hub.hub_run_intent` (external_side_effect, confirmation required)
  - `viv_hub.hub_run_proxy_tool` (external_side_effect, confirmation required)
  - `viv_hub.hub_search_proxy_tools` (read)
  - `viv_hub.hub_set_discovery` (external_side_effect, confirmation required)
  - `viv_hub.hub_status` (read)
  - `viv_hub.hub_trace_lookup` (read)
  - `viv_hub.hub_update_state` (external_side_effect, confirmation required)

