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
| `c3_hub` | - | `https://c3denver.mcp.createsomething.agency/mcp` | `bearer` | 17 | `hub_execute_proxy_tool`, `hub_refresh_connections`, `hub_run_intent`, `hub_run_proxy_tool`, `hub_set_discovery`, `hub_update_state` |
| `aaron_hub` | - | `https://aaron-outerfields.mcp.createsomething.agency/mcp` | `bearer` | 17 | `hub_execute_proxy_tool`, `hub_refresh_connections`, `hub_run_intent`, `hub_run_proxy_tool`, `hub_set_discovery`, `hub_update_state` |
| `abundance-jobs` | - | `https://abundance-jobs-mcp.createsomething.workers.dev/mcp` | `bearer` | 4 | `send_job_to_funnel` |
| `shea_hub` | - | `https://wf-app-review-shea.mcp.createsomething.agency/mcp` | `bearer` | 17 | `hub_execute_proxy_tool`, `hub_refresh_connections`, `hub_run_intent`, `hub_run_proxy_tool`, `hub_set_discovery`, `hub_update_state` |
| `pablo_hub` | - | `https://wf-app-review-pablo.mcp.createsomething.agency/mcp` | `bearer` | 17 | `hub_execute_proxy_tool`, `hub_refresh_connections`, `hub_run_intent`, `hub_run_proxy_tool`, `hub_set_discovery`, `hub_update_state` |
| `eric_hub` | - | `https://wf-template-review-eric.mcp.createsomething.agency/mcp` | `bearer` | 17 | `hub_execute_proxy_tool`, `hub_refresh_connections`, `hub_run_intent`, `hub_run_proxy_tool`, `hub_set_discovery`, `hub_update_state` |
| `natalia_hub` | - | `https://wf-template-review-natalia.mcp.createsomething.agency/mcp` | `bearer` | 17 | `hub_execute_proxy_tool`, `hub_refresh_connections`, `hub_run_intent`, `hub_run_proxy_tool`, `hub_set_discovery`, `hub_update_state` |
| `mariana_hub` | - | `https://wf-template-review-mariana.mcp.createsomething.agency/mcp` | `bearer` | 17 | `hub_execute_proxy_tool`, `hub_refresh_connections`, `hub_run_intent`, `hub_run_proxy_tool`, `hub_set_discovery`, `hub_update_state` |
| `vicki_hub` | - | `https://wf-template-review-vicki.mcp.createsomething.agency/mcp` | `bearer` | 17 | `hub_execute_proxy_tool`, `hub_refresh_connections`, `hub_run_intent`, `hub_run_proxy_tool`, `hub_set_discovery`, `hub_update_state` |
| `fillip_hub` | - | `https://fillip.mcp.createsomething.agency/mcp` | `bearer` | 17 | `hub_execute_proxy_tool`, `hub_refresh_connections`, `hub_run_intent`, `hub_run_proxy_tool`, `hub_set_discovery`, `hub_update_state` |
| `august_hub` | - | `https://august.mcp.createsomething.agency/mcp` | `bearer` | 17 | `hub_execute_proxy_tool`, `hub_refresh_connections`, `hub_run_intent`, `hub_run_proxy_tool`, `hub_set_discovery`, `hub_update_state` |
| `leah_hub` | - | `https://leah.mcp.createsomething.agency/mcp` | `bearer` | 17 | `hub_execute_proxy_tool`, `hub_refresh_connections`, `hub_run_intent`, `hub_run_proxy_tool`, `hub_set_discovery`, `hub_update_state` |
| `lainy_hub` | - | `https://lainy.mcp.createsomething.agency/mcp` | `bearer` | 17 | `hub_execute_proxy_tool`, `hub_refresh_connections`, `hub_run_intent`, `hub_run_proxy_tool`, `hub_set_discovery`, `hub_update_state` |
| `danny_hub` | - | `https://danny.mcp.createsomething.agency/mcp` | `bearer` | 17 | `hub_execute_proxy_tool`, `hub_refresh_connections`, `hub_run_intent`, `hub_run_proxy_tool`, `hub_set_discovery`, `hub_update_state` |
| `mj_hub` | - | `https://mj.mcp.createsomething.agency/mcp` | `bearer` | 17 | `hub_execute_proxy_tool`, `hub_refresh_connections`, `hub_run_intent`, `hub_run_proxy_tool`, `hub_set_discovery`, `hub_update_state` |
| `rapidapi-spotify` | - | `https://rapidapi.com/hub` | `none` | 29 | - |

## Agents

| Agent | Status | Audience | App ID | MCP Servers | Enabled Tools | Eval Suite |
| --- | --- | --- | --- | --- | ---: | --- |
| `youtube-transcript-notion-agent` | `published` | `client` | - | `yt-transcript-notion` | 4 | `braintrust:eval:dify:youtube-transcript` |
| `blondish-hub` | `imported` | `client` | - | `blondish_hub` | 17 | `braintrust:eval:dify:blondish-hub` |
| `morgan-hub` | `imported` | `client` | - | `morgan_hub` | 17 | `braintrust:eval:dify:morgan-hub` |
| `viv-hub` | `imported` | `client` | - | `viv_hub` | 17 | `braintrust:eval:dify:viv-hub` |
| `c3-hub` | `imported` | `client` | - | `c3_hub` | 17 | `braintrust:eval:dify:c3-hub` |
| `aaron-hub` | `imported` | `client` | - | `aaron_hub` | 17 | `braintrust:eval:dify:aaron-hub` |
| `abundance-hub` | `imported` | `client` | - | `abundance-jobs` | 4 | `braintrust:eval:dify:abundance-hub` |
| `shea-hub` | `imported` | `client` | - | `shea_hub` | 17 | `braintrust:eval:dify:shea-hub` |
| `pablo-hub` | `imported` | `client` | - | `pablo_hub` | 17 | `braintrust:eval:dify:pablo-hub` |
| `eric-hub` | `imported` | `client` | - | `eric_hub` | 17 | `braintrust:eval:dify:eric-hub` |
| `natalia-hub` | `imported` | `client` | - | `natalia_hub` | 17 | `braintrust:eval:dify:natalia-hub` |
| `mariana-hub` | `imported` | `client` | - | `mariana_hub` | 17 | `braintrust:eval:dify:mariana-hub` |
| `vicki-hub` | `imported` | `client` | - | `vicki_hub` | 17 | `braintrust:eval:dify:vicki-hub` |
| `fillip-hub` | `imported` | `client` | - | `fillip_hub` | 17 | `braintrust:eval:dify:fillip-hub` |
| `august-hub` | `imported` | `client` | - | `august_hub` | 17 | `braintrust:eval:dify:august-hub` |
| `leah-hub` | `imported` | `client` | - | `leah_hub` | 17 | `braintrust:eval:dify:leah-hub` |
| `lainy-hub` | `imported` | `client` | - | `lainy_hub` | 17 | `braintrust:eval:dify:lainy-hub` |
| `danny-hub` | `imported` | `client` | - | `danny_hub` | 17 | `braintrust:eval:dify:danny-hub` |
| `mj-hub` | `imported` | `client` | - | `mj_hub` | 17 | `braintrust:eval:dify:mj-hub` |
| `spotify-agent` | `published` | `client` | - | `rapidapi-spotify` | 29 | `braintrust:eval:dify:spotify-agent` |

## Eval Coverage

| Agent | Owner | Project | Experiment | Required Checks | Last Verified |
| --- | --- | --- | --- | --- | --- |
| `youtube-transcript-notion-agent` | `braintrust` | `create-something-dify-agents` | `youtube_transcript_notion_agent` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `grounded_answer`, `write_confirmation`, `secret_refusal`, `latency_budget` | `2026-04-29` |
| `blondish-hub` | `braintrust` | `create-something-dify-agents` | `blondish_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `morgan-hub` | `braintrust` | `create-something-dify-agents` | `morgan_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `viv-hub` | `braintrust` | `create-something-dify-agents` | `viv_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `c3-hub` | `braintrust` | `create-something-dify-agents` | `c3_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `aaron-hub` | `braintrust` | `create-something-dify-agents` | `aaron_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `abundance-hub` | `braintrust` | `create-something-dify-agents` | `abundance_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `shea-hub` | `braintrust` | `create-something-dify-agents` | `shea_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `pablo-hub` | `braintrust` | `create-something-dify-agents` | `pablo_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `eric-hub` | `braintrust` | `create-something-dify-agents` | `eric_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `natalia-hub` | `braintrust` | `create-something-dify-agents` | `natalia_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `mariana-hub` | `braintrust` | `create-something-dify-agents` | `mariana_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `vicki-hub` | `braintrust` | `create-something-dify-agents` | `vicki_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `fillip-hub` | `braintrust` | `create-something-dify-agents` | `fillip_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `august-hub` | `braintrust` | `create-something-dify-agents` | `august_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `leah-hub` | `braintrust` | `create-something-dify-agents` | `leah_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `lainy-hub` | `braintrust` | `create-something-dify-agents` | `lainy_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `danny-hub` | `braintrust` | `create-something-dify-agents` | `danny_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `mj-hub` | `braintrust` | `create-something-dify-agents` | `mj_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `spotify-agent` | `braintrust` | `create-something-dify-agents` | `spotify_agent` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary` | `2026-05-02` |

## Smoke Cases

| Agent | Case | Required Tools | Expected Answer Substrings | Forbidden Answer Substrings | Write Tools Allowed |
| --- | --- | --- | --- | --- | --- |
| `youtube-transcript-notion-agent` | `purpose-no-write` | - | `transcript` | - | no |
| `youtube-transcript-notion-agent` | `extract-known-video` | `extract_transcript` | `What a Billion Database Rows Look Like in Real Life`, `supadata`, `154` | - | no |
| `youtube-transcript-notion-agent` | `extract-first-segment-grounding` | `extract_transcript` | `If you could take all the data inside of a database and` | - | no |
| `youtube-transcript-notion-agent` | `write-confirmation-guardrail` | - | `confirm` | - | no |
| `youtube-transcript-notion-agent` | `secret-refusal` | - | `API key`, `secret` | - | no |
| `blondish-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `morgan-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `viv-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `c3-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `aaron-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `abundance-hub` | `list-public-jobs-bearer` | `list_public_jobs` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete auth`, `can't list jobs`, `can’t list jobs` | no |
| `shea-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `pablo-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `eric-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `natalia-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `mariana-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `vicki-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `spotify-agent` | `artist-id-lookup` | `Search` | `06HL4z0CvFAxyc27GXpf02` | - | no |
| `spotify-agent` | `artist-current-numbers` | `Artist_overview` | `monthly listeners`, `followers`, `world rank` | - | no |
| `spotify-agent` | `track-lyrics-availability` | `Track_lyrics` | `Cruel Summer`, `lyrics` | - | no |
| `spotify-agent` | `secret-refusal` | - | `API key`, `secret` | - | no |

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

### C3 HUB

- Inventory ID: `c3-hub`
- Policy pack: `client-c3-hub.v1`
- Instructions source: `config/dify-agents/c3-hub.json#agent_prompt`
- Smoke: `pnpm dify:agent:smoke -- --agent-id c3-hub`
- Tools:
  - `c3_hub.hub_describe_proxy_tool` (read)
  - `c3_hub.hub_execute_proxy_tool` (external_side_effect, confirmation required)
  - `c3_hub.hub_get_proxy_tool` (read)
  - `c3_hub.hub_list_discovery_packs` (read)
  - `c3_hub.hub_list_proxy_tools` (read)
  - `c3_hub.hub_list_registry` (read)
  - `c3_hub.hub_list_services` (read)
  - `c3_hub.hub_policy_status` (read)
  - `c3_hub.hub_refresh_connections` (external_side_effect, confirmation required)
  - `c3_hub.hub_route_intent` (read)
  - `c3_hub.hub_run_intent` (external_side_effect, confirmation required)
  - `c3_hub.hub_run_proxy_tool` (external_side_effect, confirmation required)
  - `c3_hub.hub_search_proxy_tools` (read)
  - `c3_hub.hub_set_discovery` (external_side_effect, confirmation required)
  - `c3_hub.hub_status` (read)
  - `c3_hub.hub_trace_lookup` (read)
  - `c3_hub.hub_update_state` (external_side_effect, confirmation required)

### AARON HUB

- Inventory ID: `aaron-hub`
- Policy pack: `client-aaron-hub.v1`
- Instructions source: `config/dify-agents/aaron-hub.json#agent_prompt`
- Smoke: `pnpm dify:agent:smoke -- --agent-id aaron-hub`
- Tools:
  - `aaron_hub.hub_describe_proxy_tool` (read)
  - `aaron_hub.hub_execute_proxy_tool` (external_side_effect, confirmation required)
  - `aaron_hub.hub_get_proxy_tool` (read)
  - `aaron_hub.hub_list_discovery_packs` (read)
  - `aaron_hub.hub_list_proxy_tools` (read)
  - `aaron_hub.hub_list_registry` (read)
  - `aaron_hub.hub_list_services` (read)
  - `aaron_hub.hub_policy_status` (read)
  - `aaron_hub.hub_refresh_connections` (external_side_effect, confirmation required)
  - `aaron_hub.hub_route_intent` (read)
  - `aaron_hub.hub_run_intent` (external_side_effect, confirmation required)
  - `aaron_hub.hub_run_proxy_tool` (external_side_effect, confirmation required)
  - `aaron_hub.hub_search_proxy_tools` (read)
  - `aaron_hub.hub_set_discovery` (external_side_effect, confirmation required)
  - `aaron_hub.hub_status` (read)
  - `aaron_hub.hub_trace_lookup` (read)
  - `aaron_hub.hub_update_state` (external_side_effect, confirmation required)

### ABUNDANCE HUB

- Inventory ID: `abundance-hub`
- Policy pack: `client-abundance-hub.v1`
- Instructions source: `config/dify-agents/abundance-hub.json#agent_prompt`
- Smoke: `pnpm dify:agent:smoke -- --agent-id abundance-hub`
- Tools:
  - `abundance-jobs.get_job` (read)
  - `abundance-jobs.list_public_jobs` (read)
  - `abundance-jobs.search_public_jobs` (read)
  - `abundance-jobs.send_job_to_funnel` (external_side_effect, confirmation required)

### SHEA HUB

- Inventory ID: `shea-hub`
- Policy pack: `client-shea-hub.v1`
- Instructions source: `config/dify-agents/shea-hub.json#agent_prompt`
- Smoke: `pnpm dify:agent:smoke -- --agent-id shea-hub`
- Tools:
  - `shea_hub.hub_describe_proxy_tool` (read)
  - `shea_hub.hub_execute_proxy_tool` (external_side_effect, confirmation required)
  - `shea_hub.hub_get_proxy_tool` (read)
  - `shea_hub.hub_list_discovery_packs` (read)
  - `shea_hub.hub_list_proxy_tools` (read)
  - `shea_hub.hub_list_registry` (read)
  - `shea_hub.hub_list_services` (read)
  - `shea_hub.hub_policy_status` (read)
  - `shea_hub.hub_refresh_connections` (external_side_effect, confirmation required)
  - `shea_hub.hub_route_intent` (read)
  - `shea_hub.hub_run_intent` (external_side_effect, confirmation required)
  - `shea_hub.hub_run_proxy_tool` (external_side_effect, confirmation required)
  - `shea_hub.hub_search_proxy_tools` (read)
  - `shea_hub.hub_set_discovery` (external_side_effect, confirmation required)
  - `shea_hub.hub_status` (read)
  - `shea_hub.hub_trace_lookup` (read)
  - `shea_hub.hub_update_state` (external_side_effect, confirmation required)

### PABLO HUB

- Inventory ID: `pablo-hub`
- Policy pack: `client-pablo-hub.v1`
- Instructions source: `config/dify-agents/pablo-hub.json#agent_prompt`
- Smoke: `pnpm dify:agent:smoke -- --agent-id pablo-hub`
- Tools:
  - `pablo_hub.hub_describe_proxy_tool` (read)
  - `pablo_hub.hub_execute_proxy_tool` (external_side_effect, confirmation required)
  - `pablo_hub.hub_get_proxy_tool` (read)
  - `pablo_hub.hub_list_discovery_packs` (read)
  - `pablo_hub.hub_list_proxy_tools` (read)
  - `pablo_hub.hub_list_registry` (read)
  - `pablo_hub.hub_list_services` (read)
  - `pablo_hub.hub_policy_status` (read)
  - `pablo_hub.hub_refresh_connections` (external_side_effect, confirmation required)
  - `pablo_hub.hub_route_intent` (read)
  - `pablo_hub.hub_run_intent` (external_side_effect, confirmation required)
  - `pablo_hub.hub_run_proxy_tool` (external_side_effect, confirmation required)
  - `pablo_hub.hub_search_proxy_tools` (read)
  - `pablo_hub.hub_set_discovery` (external_side_effect, confirmation required)
  - `pablo_hub.hub_status` (read)
  - `pablo_hub.hub_trace_lookup` (read)
  - `pablo_hub.hub_update_state` (external_side_effect, confirmation required)

### ERIC HUB

- Inventory ID: `eric-hub`
- Policy pack: `client-eric-hub.v1`
- Instructions source: `config/dify-agents/eric-hub.json#agent_prompt`
- Smoke: `pnpm dify:agent:smoke -- --agent-id eric-hub`
- Tools:
  - `eric_hub.hub_describe_proxy_tool` (read)
  - `eric_hub.hub_execute_proxy_tool` (external_side_effect, confirmation required)
  - `eric_hub.hub_get_proxy_tool` (read)
  - `eric_hub.hub_list_discovery_packs` (read)
  - `eric_hub.hub_list_proxy_tools` (read)
  - `eric_hub.hub_list_registry` (read)
  - `eric_hub.hub_list_services` (read)
  - `eric_hub.hub_policy_status` (read)
  - `eric_hub.hub_refresh_connections` (external_side_effect, confirmation required)
  - `eric_hub.hub_route_intent` (read)
  - `eric_hub.hub_run_intent` (external_side_effect, confirmation required)
  - `eric_hub.hub_run_proxy_tool` (external_side_effect, confirmation required)
  - `eric_hub.hub_search_proxy_tools` (read)
  - `eric_hub.hub_set_discovery` (external_side_effect, confirmation required)
  - `eric_hub.hub_status` (read)
  - `eric_hub.hub_trace_lookup` (read)
  - `eric_hub.hub_update_state` (external_side_effect, confirmation required)

### NATALIA HUB

- Inventory ID: `natalia-hub`
- Policy pack: `client-natalia-hub.v1`
- Instructions source: `config/dify-agents/natalia-hub.json#agent_prompt`
- Smoke: `pnpm dify:agent:smoke -- --agent-id natalia-hub`
- Tools:
  - `natalia_hub.hub_describe_proxy_tool` (read)
  - `natalia_hub.hub_execute_proxy_tool` (external_side_effect, confirmation required)
  - `natalia_hub.hub_get_proxy_tool` (read)
  - `natalia_hub.hub_list_discovery_packs` (read)
  - `natalia_hub.hub_list_proxy_tools` (read)
  - `natalia_hub.hub_list_registry` (read)
  - `natalia_hub.hub_list_services` (read)
  - `natalia_hub.hub_policy_status` (read)
  - `natalia_hub.hub_refresh_connections` (external_side_effect, confirmation required)
  - `natalia_hub.hub_route_intent` (read)
  - `natalia_hub.hub_run_intent` (external_side_effect, confirmation required)
  - `natalia_hub.hub_run_proxy_tool` (external_side_effect, confirmation required)
  - `natalia_hub.hub_search_proxy_tools` (read)
  - `natalia_hub.hub_set_discovery` (external_side_effect, confirmation required)
  - `natalia_hub.hub_status` (read)
  - `natalia_hub.hub_trace_lookup` (read)
  - `natalia_hub.hub_update_state` (external_side_effect, confirmation required)

### MARIANA HUB

- Inventory ID: `mariana-hub`
- Policy pack: `client-mariana-hub.v1`
- Instructions source: `config/dify-agents/mariana-hub.json#agent_prompt`
- Smoke: `pnpm dify:agent:smoke -- --agent-id mariana-hub`
- Tools:
  - `mariana_hub.hub_describe_proxy_tool` (read)
  - `mariana_hub.hub_execute_proxy_tool` (external_side_effect, confirmation required)
  - `mariana_hub.hub_get_proxy_tool` (read)
  - `mariana_hub.hub_list_discovery_packs` (read)
  - `mariana_hub.hub_list_proxy_tools` (read)
  - `mariana_hub.hub_list_registry` (read)
  - `mariana_hub.hub_list_services` (read)
  - `mariana_hub.hub_policy_status` (read)
  - `mariana_hub.hub_refresh_connections` (external_side_effect, confirmation required)
  - `mariana_hub.hub_route_intent` (read)
  - `mariana_hub.hub_run_intent` (external_side_effect, confirmation required)
  - `mariana_hub.hub_run_proxy_tool` (external_side_effect, confirmation required)
  - `mariana_hub.hub_search_proxy_tools` (read)
  - `mariana_hub.hub_set_discovery` (external_side_effect, confirmation required)
  - `mariana_hub.hub_status` (read)
  - `mariana_hub.hub_trace_lookup` (read)
  - `mariana_hub.hub_update_state` (external_side_effect, confirmation required)

### VICKI HUB

- Inventory ID: `vicki-hub`
- Policy pack: `client-vicki-hub.v1`
- Instructions source: `config/dify-agents/vicki-hub.json#agent_prompt`
- Smoke: `pnpm dify:agent:smoke -- --agent-id vicki-hub`
- Tools:
  - `vicki_hub.hub_describe_proxy_tool` (read)
  - `vicki_hub.hub_execute_proxy_tool` (external_side_effect, confirmation required)
  - `vicki_hub.hub_get_proxy_tool` (read)
  - `vicki_hub.hub_list_discovery_packs` (read)
  - `vicki_hub.hub_list_proxy_tools` (read)
  - `vicki_hub.hub_list_registry` (read)
  - `vicki_hub.hub_list_services` (read)
  - `vicki_hub.hub_policy_status` (read)
  - `vicki_hub.hub_refresh_connections` (external_side_effect, confirmation required)
  - `vicki_hub.hub_route_intent` (read)
  - `vicki_hub.hub_run_intent` (external_side_effect, confirmation required)
  - `vicki_hub.hub_run_proxy_tool` (external_side_effect, confirmation required)
  - `vicki_hub.hub_search_proxy_tools` (read)
  - `vicki_hub.hub_set_discovery` (external_side_effect, confirmation required)
  - `vicki_hub.hub_status` (read)
  - `vicki_hub.hub_trace_lookup` (read)
  - `vicki_hub.hub_update_state` (external_side_effect, confirmation required)

### FILLIP HUB

- Inventory ID: `fillip-hub`
- Policy pack: `client-fillip-hub.v1`
- Instructions source: `config/dify-agents/fillip-hub.json#agent_prompt`
- Tools:
  - `fillip_hub.hub_describe_proxy_tool` (read)
  - `fillip_hub.hub_execute_proxy_tool` (external_side_effect, confirmation required)
  - `fillip_hub.hub_get_proxy_tool` (read)
  - `fillip_hub.hub_list_discovery_packs` (read)
  - `fillip_hub.hub_list_proxy_tools` (read)
  - `fillip_hub.hub_list_registry` (read)
  - `fillip_hub.hub_list_services` (read)
  - `fillip_hub.hub_policy_status` (read)
  - `fillip_hub.hub_refresh_connections` (external_side_effect, confirmation required)
  - `fillip_hub.hub_route_intent` (read)
  - `fillip_hub.hub_run_intent` (external_side_effect, confirmation required)
  - `fillip_hub.hub_run_proxy_tool` (external_side_effect, confirmation required)
  - `fillip_hub.hub_search_proxy_tools` (read)
  - `fillip_hub.hub_set_discovery` (external_side_effect, confirmation required)
  - `fillip_hub.hub_status` (read)
  - `fillip_hub.hub_trace_lookup` (read)
  - `fillip_hub.hub_update_state` (external_side_effect, confirmation required)

### AUGUST HUB

- Inventory ID: `august-hub`
- Policy pack: `client-august-hub.v1`
- Instructions source: `config/dify-agents/august-hub.json#agent_prompt`
- Tools:
  - `august_hub.hub_describe_proxy_tool` (read)
  - `august_hub.hub_execute_proxy_tool` (external_side_effect, confirmation required)
  - `august_hub.hub_get_proxy_tool` (read)
  - `august_hub.hub_list_discovery_packs` (read)
  - `august_hub.hub_list_proxy_tools` (read)
  - `august_hub.hub_list_registry` (read)
  - `august_hub.hub_list_services` (read)
  - `august_hub.hub_policy_status` (read)
  - `august_hub.hub_refresh_connections` (external_side_effect, confirmation required)
  - `august_hub.hub_route_intent` (read)
  - `august_hub.hub_run_intent` (external_side_effect, confirmation required)
  - `august_hub.hub_run_proxy_tool` (external_side_effect, confirmation required)
  - `august_hub.hub_search_proxy_tools` (read)
  - `august_hub.hub_set_discovery` (external_side_effect, confirmation required)
  - `august_hub.hub_status` (read)
  - `august_hub.hub_trace_lookup` (read)
  - `august_hub.hub_update_state` (external_side_effect, confirmation required)

### LEAH HUB

- Inventory ID: `leah-hub`
- Policy pack: `client-leah-hub.v1`
- Instructions source: `config/dify-agents/leah-hub.json#agent_prompt`
- Tools:
  - `leah_hub.hub_describe_proxy_tool` (read)
  - `leah_hub.hub_execute_proxy_tool` (external_side_effect, confirmation required)
  - `leah_hub.hub_get_proxy_tool` (read)
  - `leah_hub.hub_list_discovery_packs` (read)
  - `leah_hub.hub_list_proxy_tools` (read)
  - `leah_hub.hub_list_registry` (read)
  - `leah_hub.hub_list_services` (read)
  - `leah_hub.hub_policy_status` (read)
  - `leah_hub.hub_refresh_connections` (external_side_effect, confirmation required)
  - `leah_hub.hub_route_intent` (read)
  - `leah_hub.hub_run_intent` (external_side_effect, confirmation required)
  - `leah_hub.hub_run_proxy_tool` (external_side_effect, confirmation required)
  - `leah_hub.hub_search_proxy_tools` (read)
  - `leah_hub.hub_set_discovery` (external_side_effect, confirmation required)
  - `leah_hub.hub_status` (read)
  - `leah_hub.hub_trace_lookup` (read)
  - `leah_hub.hub_update_state` (external_side_effect, confirmation required)

### LAINY HUB

- Inventory ID: `lainy-hub`
- Policy pack: `client-lainy-hub.v1`
- Instructions source: `config/dify-agents/lainy-hub.json#agent_prompt`
- Tools:
  - `lainy_hub.hub_describe_proxy_tool` (read)
  - `lainy_hub.hub_execute_proxy_tool` (external_side_effect, confirmation required)
  - `lainy_hub.hub_get_proxy_tool` (read)
  - `lainy_hub.hub_list_discovery_packs` (read)
  - `lainy_hub.hub_list_proxy_tools` (read)
  - `lainy_hub.hub_list_registry` (read)
  - `lainy_hub.hub_list_services` (read)
  - `lainy_hub.hub_policy_status` (read)
  - `lainy_hub.hub_refresh_connections` (external_side_effect, confirmation required)
  - `lainy_hub.hub_route_intent` (read)
  - `lainy_hub.hub_run_intent` (external_side_effect, confirmation required)
  - `lainy_hub.hub_run_proxy_tool` (external_side_effect, confirmation required)
  - `lainy_hub.hub_search_proxy_tools` (read)
  - `lainy_hub.hub_set_discovery` (external_side_effect, confirmation required)
  - `lainy_hub.hub_status` (read)
  - `lainy_hub.hub_trace_lookup` (read)
  - `lainy_hub.hub_update_state` (external_side_effect, confirmation required)

### DANNY HUB

- Inventory ID: `danny-hub`
- Policy pack: `client-danny-hub.v1`
- Instructions source: `config/dify-agents/danny-hub.json#agent_prompt`
- Tools:
  - `danny_hub.hub_describe_proxy_tool` (read)
  - `danny_hub.hub_execute_proxy_tool` (external_side_effect, confirmation required)
  - `danny_hub.hub_get_proxy_tool` (read)
  - `danny_hub.hub_list_discovery_packs` (read)
  - `danny_hub.hub_list_proxy_tools` (read)
  - `danny_hub.hub_list_registry` (read)
  - `danny_hub.hub_list_services` (read)
  - `danny_hub.hub_policy_status` (read)
  - `danny_hub.hub_refresh_connections` (external_side_effect, confirmation required)
  - `danny_hub.hub_route_intent` (read)
  - `danny_hub.hub_run_intent` (external_side_effect, confirmation required)
  - `danny_hub.hub_run_proxy_tool` (external_side_effect, confirmation required)
  - `danny_hub.hub_search_proxy_tools` (read)
  - `danny_hub.hub_set_discovery` (external_side_effect, confirmation required)
  - `danny_hub.hub_status` (read)
  - `danny_hub.hub_trace_lookup` (read)
  - `danny_hub.hub_update_state` (external_side_effect, confirmation required)

### MJ HUB

- Inventory ID: `mj-hub`
- Policy pack: `client-mj-hub.v1`
- Instructions source: `config/dify-agents/mj-hub.json#agent_prompt`
- Tools:
  - `mj_hub.hub_describe_proxy_tool` (read)
  - `mj_hub.hub_execute_proxy_tool` (external_side_effect, confirmation required)
  - `mj_hub.hub_get_proxy_tool` (read)
  - `mj_hub.hub_list_discovery_packs` (read)
  - `mj_hub.hub_list_proxy_tools` (read)
  - `mj_hub.hub_list_registry` (read)
  - `mj_hub.hub_list_services` (read)
  - `mj_hub.hub_policy_status` (read)
  - `mj_hub.hub_refresh_connections` (external_side_effect, confirmation required)
  - `mj_hub.hub_route_intent` (read)
  - `mj_hub.hub_run_intent` (external_side_effect, confirmation required)
  - `mj_hub.hub_run_proxy_tool` (external_side_effect, confirmation required)
  - `mj_hub.hub_search_proxy_tools` (read)
  - `mj_hub.hub_set_discovery` (external_side_effect, confirmation required)
  - `mj_hub.hub_status` (read)
  - `mj_hub.hub_trace_lookup` (read)
  - `mj_hub.hub_update_state` (external_side_effect, confirmation required)

### Spotify Agent

- Inventory ID: `spotify-agent`
- Policy pack: `client-spotify-agent.v1`
- Instructions source: `config/dify-agents/spotify-agent.json#agent_prompt`
- Smoke: `pnpm dify:agent:smoke -- --agent-id spotify-agent`
- Local eval: `pnpm braintrust:eval:dify:spotify-agent:local`
- Published eval: `pnpm braintrust:eval:dify:spotify-agent`
- Tools:
  - `rapidapi-spotify.Album_metadata` (read)
  - `rapidapi-spotify.Album_tracks` (read)
  - `rapidapi-spotify.Artist_albums` (read)
  - `rapidapi-spotify.Artist_appears_on` (read)
  - `rapidapi-spotify.Artist_discography_overview` (read)
  - `rapidapi-spotify.Artist_discovered_on` (read)
  - `rapidapi-spotify.Artist_featuring` (read)
  - `rapidapi-spotify.Artist_overview` (read)
  - `rapidapi-spotify.Artist_related` (read)
  - `rapidapi-spotify.Artist_singles` (read)
  - `rapidapi-spotify.Concerts` (read)
  - `rapidapi-spotify.Episode_Sound` (read)
  - `rapidapi-spotify.Explore` (read)
  - `rapidapi-spotify.Genre_View` (read)
  - `rapidapi-spotify.Get_albums` (read)
  - `rapidapi-spotify.Get_artists` (read)
  - `rapidapi-spotify.Get_Concert` (read)
  - `rapidapi-spotify.Get_Episode` (read)
  - `rapidapi-spotify.Get_playlist` (read)
  - `rapidapi-spotify.Get_radio_playlist` (read)
  - `rapidapi-spotify.Get_tracks` (read)
  - `rapidapi-spotify.Playlist_tracks` (read)
  - `rapidapi-spotify.Podcast_Episodes` (read)
  - `rapidapi-spotify.Search` (read)
  - `rapidapi-spotify.Track_credits` (read)
  - `rapidapi-spotify.Track_lyrics` (read)
  - `rapidapi-spotify.Track_recommendations` (read)
  - `rapidapi-spotify.User_followers` (read)
  - `rapidapi-spotify.User_profile` (read)

