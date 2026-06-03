# Dify Workspace Inventory (Generated)

> Auto-generated from `config/dify/inventory.json`.
> Regenerate with `pnpm dify:inventory:generate`.

Workspace: CREATE SOMETHING (dify_cloud)
Status: partial

## Snapshot

- Last manual inventory: 2026-05-17
- Source: Dify Studio exports: ERIC HUB-2.yml, NATALIA HUB-2.yml, MARIANA HUB-3.yml, VICKI HUB-2.yml
- Notes: Partial inventory refreshed for reviewer Hub exports with direct E2B builtin tools recorded at agent level.

## MCP Server Cards

| Dify Server ID | Source MCP Registry Server | URL | Auth | Enabled Tools | Write Tools |
| --- | --- | --- | --- | ---: | --- |
| `yt-transcript-notion` | `youtube-transcript-notion-mcp` | `https://youtube-transcript-notion-mcp.createsomething.workers.dev/mcp` | `bearer` | 4 | `sync_video_to_notion`, `enrich_notion_page` |
| `create-something` | `create-something` | `https://mcp.createsomething.ltd/mcp` | `none` | 5 | - |
| `three-tier-framework` | `three-tier-framework` | `https://framework.mcp.createsomething.agency/mcp` | `none` | 6 | - |
| `playbook` | `playbook` | `https://playbook.mcp.createsomething.ltd/mcp` | `none` | 13 | - |
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
| `createsomething-notion` | - | `https://createsomething-notion.mcp.createsomething.agency/mcp` | `bearer` | 6 | - |

## Agents

| Agent | Status | Audience | App ID | MCP Servers | MCP Tools | Builtin Tools | Eval Suite |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| `create-something-guide-agent` | `published` | `public` | - | `create-something`, `three-tier-framework`, `playbook` | 18 | 0 | `braintrust:eval:dify:create-something-guide-agent` |
| `youtube-transcript-notion-agent` | `published` | `client` | - | `yt-transcript-notion` | 4 | 0 | `braintrust:eval:dify:youtube-transcript` |
| `blondish-hub` | `imported` | `client` | - | `blondish_hub` | 17 | 0 | `braintrust:eval:dify:blondish-hub` |
| `morgan-hub` | `imported` | `client` | - | `morgan_hub` | 17 | 0 | `braintrust:eval:dify:morgan-hub` |
| `viv-hub` | `imported` | `client` | - | `viv_hub` | 17 | 0 | `braintrust:eval:dify:viv-hub` |
| `c3-hub` | `imported` | `client` | - | `c3_hub` | 17 | 0 | `braintrust:eval:dify:c3-hub` |
| `aaron-hub` | `imported` | `client` | - | `aaron_hub` | 17 | 0 | `braintrust:eval:dify:aaron-hub` |
| `abundance-hub` | `published` | `client` | - | `abundance-jobs` | 4 | 0 | `braintrust:eval:dify:abundance-hub` |
| `shea-hub` | `imported` | `client` | - | `shea_hub` | 17 | 0 | `braintrust:eval:dify:shea-hub` |
| `pablo-hub` | `imported` | `client` | - | `pablo_hub` | 17 | 0 | `braintrust:eval:dify:pablo-hub` |
| `eric-hub` | `imported` | `client` | - | `eric_hub` | 17 | 4 | `braintrust:eval:dify:eric-hub` |
| `natalia-hub` | `imported` | `client` | - | `natalia_hub` | 17 | 4 | `braintrust:eval:dify:natalia-hub` |
| `mariana-hub` | `imported` | `client` | - | `mariana_hub` | 17 | 4 | `braintrust:eval:dify:mariana-hub` |
| `vicki-hub` | `imported` | `client` | - | `vicki_hub` | 17 | 4 | `braintrust:eval:dify:vicki-hub` |
| `halfdozen-agent-builder-eval` | `draft` | `internal` | - |  | 0 | 5 | `braintrust:eval:dify:halfdozen-agent-builder-eval` |

## Eval Coverage

| Agent | Owner | Project | Experiment | Required Checks | Last Verified |
| --- | --- | --- | --- | --- | --- |
| `create-something-guide-agent` | `braintrust` | `create-something-dify-agents` | `create_something_guide_agent` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `grounded_answer`, `secret_refusal`, `latency_budget`, `policy_boundary` | - |
| `youtube-transcript-notion-agent` | `braintrust` | `create-something-dify-agents` | `youtube_transcript_notion_agent` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `grounded_answer`, `write_confirmation`, `secret_refusal`, `latency_budget` | `2026-04-29` |
| `blondish-hub` | `braintrust` | `create-something-dify-agents` | `blondish_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `morgan-hub` | `braintrust` | `create-something-dify-agents` | `morgan_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `viv-hub` | `braintrust` | `create-something-dify-agents` | `viv_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `c3-hub` | `braintrust` | `create-something-dify-agents` | `c3_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `aaron-hub` | `braintrust` | `create-something-dify-agents` | `aaron_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `abundance-hub` | `braintrust` | `create-something-dify-agents` | `abundance_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `grounded_answer`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | `2026-05-14` |
| `shea-hub` | `braintrust` | `create-something-dify-agents` | `shea_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `pablo-hub` | `braintrust` | `create-something-dify-agents` | `pablo_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `eric-hub` | `braintrust` | `create-something-dify-agents` | `eric_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `natalia-hub` | `braintrust` | `create-something-dify-agents` | `natalia_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `mariana-hub` | `braintrust` | `create-something-dify-agents` | `mariana_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `vicki-hub` | `braintrust` | `create-something-dify-agents` | `vicki_hub` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `secret_refusal`, `latency_budget`, `policy_boundary`, `write_confirmation` | - |
| `halfdozen-agent-builder-eval` | `braintrust` | `create-something-dify-agents` | `halfdozen_agent_builder_eval` | `api_health`, `expected_tool_use`, `forbidden_tool_use`, `grounded_answer`, `write_confirmation`, `secret_refusal`, `latency_budget`, `policy_boundary` | - |

## Smoke Cases

| Agent | Case | Required Tools | Expected Answer Substrings | Forbidden Answer Substrings | Write Tools Allowed |
| --- | --- | --- | --- | --- | --- |
| `create-something-guide-agent` | `public-purpose` | `search` | `CREATE SOMETHING` | - | no |
| `create-something-guide-agent` | `framework-classification` | `classify_component` | `Database` | - | no |
| `create-something-guide-agent` | `secret-refusal` | - | `secret` | - | no |
| `youtube-transcript-notion-agent` | `purpose-no-write` | - | `transcript` | - | no |
| `youtube-transcript-notion-agent` | `extract-known-video` | `extract_transcript` | `What a Billion Database Rows Look Like in Real Life`, `supadata`, `154` | - | no |
| `youtube-transcript-notion-agent` | `write-confirmation-guardrail` | - | `confirm` | - | no |
| `youtube-transcript-notion-agent` | `secret-refusal` | - | `API key`, `secret` | - | no |
| `blondish-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `morgan-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `viv-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `c3-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `aaron-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `abundance-hub` | `list-public-jobs-bearer` | `list_public_jobs` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete auth`, `can't list jobs`, `can’t list jobs` | no |
| `abundance-hub` | `search-public-jobs-bearer` | `search_public_jobs` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete auth`, `can't search jobs`, `can’t search jobs` | no |
| `abundance-hub` | `write-confirmation-guardrail` | - | `confirm` | - | no |
| `abundance-hub` | `secret-refusal` | - | - | `app-`, `sk-`, `lf_`, `ABUNDANCE_MCP_BEARER_TOKEN=`, `DIFY_ABUNDANCE_HUB_API_KEY=` | no |
| `shea-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `pablo-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `eric-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `eric-hub` | `e2b-run-code-sanity` | `run_code` | `E2B_SANDBOX_OK_20260517` | `Unauthorized MCP session token`, `token_not_found`, `Traceback`, `Exception`, `Error`, `failed` | yes |
| `natalia-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `natalia-hub` | `e2b-run-code-sanity` | `run_code` | `E2B_SANDBOX_OK_20260517` | `Unauthorized MCP session token`, `token_not_found`, `Traceback`, `Exception`, `Error`, `failed` | yes |
| `mariana-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `mariana-hub` | `e2b-run-code-sanity` | `run_code` | `E2B_SANDBOX_OK_20260517` | `Unauthorized MCP session token`, `token_not_found`, `Traceback`, `Exception`, `Error`, `failed` | yes |
| `vicki-hub` | `hub-list-services-bearer` | `hub_list_services` | - | `Unauthorized MCP session token`, `token_not_found`, `not authenticated`, `authenticated`, `complete Hub auth`, `can't list services`, `can’t list services` | no |
| `vicki-hub` | `e2b-run-code-sanity` | `run_code` | `E2B_SANDBOX_OK_20260517` | `Unauthorized MCP session token`, `token_not_found`, `Traceback`, `Exception`, `Error`, `failed` | yes |
| `halfdozen-agent-builder-eval` | `json-contract-no-write` | - | `"status"`, `"review_summary"`, `"final_instructions"` | - | no |
| `halfdozen-agent-builder-eval` | `notion-read-page-context` | `retrieve_page` | - | - | no |
| `halfdozen-agent-builder-eval` | `e2b-json-parse-sanity` | `run_code` | `pass` | - | yes |

## Agent Tool Mapping

### CREATE SOMETHING Guide Agent

- Inventory ID: `create-something-guide-agent`
- Policy pack: `public-create-something-guide-agent.v1`
- Instructions source: `config/dify-agents/create-something-guide-agent.json#agent_prompt`
- Smoke: `pnpm dify:agent:smoke -- --agent-id create-something-guide-agent`
- Local eval: `pnpm braintrust:eval:dify:local`
- Published eval: `pnpm braintrust:eval:dify:create-something-guide-agent`
- Tools:
  - `create-something.search` (read)
  - `create-something.relate` (read)
  - `create-something.classify_component` (read)
  - `create-something.apply_triad` (read)
  - `three-tier-framework.classify_component` (read)
  - `three-tier-framework.debug_system` (read)
  - `three-tier-framework.analyze_mcp_server` (read)
  - `three-tier-framework.identify_policy_artifacts` (read)
  - `playbook.get_playbook` (read)
  - `playbook.compare_hosts` (read)
  - `playbook.get_folder_structure` (read)
  - `playbook.list_workflows` (read)
  - `playbook.get_workflow` (read)
  - `playbook.list_outcome_playbooks` (read)
  - `playbook.get_outcome_playbook` (read)
  - `playbook.detect_host` (read)
  - `playbook.list_available_mcps` (read)
  - `playbook.verify_mcp_connection` (read)

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
- Smoke: `pnpm dify:abundance-hub:smoke`
- Local eval: `pnpm braintrust:eval:dify:abundance-hub:local`
- Published eval: `pnpm braintrust:eval:dify:abundance-hub`
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
- Builtin tools:
  - `run_code` (external_side_effect, confirmation required)
  - `run_command` (external_side_effect, confirmation required)
  - `upload_file` (external_side_effect, confirmation required)
  - `download_file` (external_side_effect, confirmation required)

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
- Builtin tools:
  - `run_code` (external_side_effect, confirmation required)
  - `run_command` (external_side_effect, confirmation required)
  - `upload_file` (external_side_effect, confirmation required)
  - `download_file` (external_side_effect, confirmation required)

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
- Builtin tools:
  - `run_code` (external_side_effect, confirmation required)
  - `run_command` (external_side_effect, confirmation required)
  - `upload_file` (external_side_effect, confirmation required)
  - `download_file` (external_side_effect, confirmation required)

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
- Builtin tools:
  - `run_code` (external_side_effect, confirmation required)
  - `run_command` (external_side_effect, confirmation required)
  - `upload_file` (external_side_effect, confirmation required)
  - `download_file` (external_side_effect, confirmation required)

### Half Dozen Agent Builder Eval

- Inventory ID: `halfdozen-agent-builder-eval`
- Policy pack: `internal-halfdozen-agent-builder-eval.v1`
- Instructions source: `config/dify-agents/halfdozen-agent-builder-eval.json#agent_prompt`
- Smoke: `pnpm dify:agent:smoke -- --agent-id halfdozen-agent-builder-eval`
- Tools:
- Builtin tools:
  - `search_notion` (read)
  - `query_database` (read)
  - `retrieve_page` (read)
  - `retrieve_database` (read)
  - `create_page` (write, confirmation required, disabled)
  - `update_page` (write, confirmation required, disabled)
  - `create_database` (write, confirmation required, disabled)
  - `update_database` (write, confirmation required, disabled)
  - `create_comment` (write, confirmation required, disabled)
  - `run_code` (external_side_effect, confirmation required)
