# Webflow Template Review Central MCP Connector

Runtime strategy context: [Webflow Template Review Runtime Strategy Brief](./WEBFLOW_TEMPLATE_REVIEW_RUNTIME_STRATEGY_BRIEF_2026-05-14.md).

## Purpose

The central connector gives Webflow Template Reviewers one public remote MCP URL for Claude Code, Claude-compatible clients, and Gumloop:

```text
https://wf-template-review.mcp.createsomething.agency/mcp/bearer
```

This endpoint is intentionally bearer-only. It does not use OAuth discovery, does not call the identity/session resolver, and does not depend on:

```text
https://id.createsomething.space/v1/mcp/sessions/resolve
```

Use a configured static Hub bearer as the client credential. This is shared MCP access, not reviewer identity, so the central connector must stay scoped to read/capture/discovery tools. The central worker accepts the approved existing reviewer Hub bearers for Eric, Mariana, Vicki, and Natalia; all of those tokens map to the same central fallback actor and the same read/capture allowlist. Reviewer-attributed Airtable writes remain on the reviewer-specific Hubs such as:

```text
https://wf-template-review-eric.mcp.createsomething.agency/mcp
```

## Runtime Shape

| Layer                         | Responsibility                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| Claude Code, Claude, Gumloop  | Remote MCP client. Sends `Authorization: Bearer <token>` to `/mcp/bearer`.                               |
| `cs-mcp-hub-remote`           | Static-bearer Hub in `compat` mode with OAuth discovery and session resolver disabled for this endpoint. |
| `webflow-template-review-mcp` | Template Review queue/context/public capture tools behind the Hub.                                       |

No reviewer identity is inferred from prompt text, OAuth, custom headers, or the session resolver on this central endpoint.

## Deployment

Deploy and verify the central endpoint only. Central normalize is skipped by default because reviewer-access tokens should not expose Hub state/discovery mutation tools:

```bash
REVIEWER=central \
HUB_API_TOKEN="$CS_HUB_WF_TEMPLATE_REVIEW_ERIC_API_TOKEN" \
pnpm mcp:hub:webflow-template-review:central:deploy all
```

Deploy only:

```bash
pnpm mcp:hub:webflow-template-review:central:deploy deploy
```

Sync central runtime secrets:

```bash
pnpm mcp:hub:webflow-template-review:central:vault:sync
```

The central worker defaults to:

- `CENTRAL_SLUG=wf-template-review`
- `CENTRAL_ACCOUNT_ID=acct_wf_template_review`
- `CENTRAL_IDENTITY_MODE=compat`
- `CENTRAL_SESSION_RESOLVER_ENABLED=false`
- `CENTRAL_OAUTH_DISCOVERY_ENABLED=false`
- `CENTRAL_FALLBACK_TOOL_MODE=read_write`
- `CENTRAL_MANAGEMENT_TOOL_ALLOWLIST=hub_status,hub_list_proxy_tools,hub_search_proxy_tools,hub_route_intent,hub_describe_proxy_tool,hub_get_proxy_tool,hub_run_intent,hub_execute_proxy_tool,hub_run_proxy_tool,hub_list_services,hub_policy_status`
- `CENTRAL_SKIP_NORMALIZE=1`
- `CENTRAL_ACCESS_TOKEN_ENV_VARS=CS_HUB_WF_TEMPLATE_REVIEW_ERIC_API_TOKEN,CS_HUB_WF_TEMPLATE_REVIEW_NATALIA_API_TOKEN,CS_HUB_WF_TEMPLATE_REVIEW_MARIANA_API_TOKEN,CS_HUB_WF_TEMPLATE_REVIEW_VICKI_API_TOKEN`
- `ENABLED_SERVERS=webflow-template-review-mcp`
- `DISABLED_SERVERS=webflow-local,webflow-site-analyzer-mcp`
- `DISCOVERY_PACK=webflow-marketplace-review-phase-a`
- `DISCOVERY_MAX_PROXY_TOOLS=18`

The deploy script also sends an empty `HUB_SESSION_RESOLVE_URL` for the central worker and sets `HUB_COMPAT_ALLOWED_TOOL_PREFIXES` to the central read/capture allowlist. `CENTRAL_FALLBACK_TOOL_MODE` stays `read_write` because the generic route classifier treats `template_review_start_capture_session` as mutable even though it is part of the read/capture workflow; the explicit proxy allowlist is the central safety boundary. The vault sync script writes `HUB_ADDITIONAL_API_TOKENS` from `CENTRAL_ACCESS_TOKEN_ENV_VARS` so approved reviewer bearers can authenticate to the central endpoint without resolver lookup. Reviewer-specific workers keep their existing resolver/OAuth defaults unless explicitly redeployed with different variables.

The central worker accepts these existing reviewer Hub bearer tokens as equivalent static access credentials:

- `CS_HUB_WF_TEMPLATE_REVIEW_ERIC_API_TOKEN`
- `CS_HUB_WF_TEMPLATE_REVIEW_NATALIA_API_TOKEN`
- `CS_HUB_WF_TEMPLATE_REVIEW_MARIANA_API_TOKEN`
- `CS_HUB_WF_TEMPLATE_REVIEW_VICKI_API_TOKEN`
- `CS_HUB_WF_TEMPLATE_REVIEW_MARIANA_API_TOKEN`
- `CS_HUB_WF_TEMPLATE_REVIEW_VICKI_API_TOKEN`

All four tokens resolve to the same central fallback actor on this endpoint. They do not create reviewer identity on the central connector.

## Central Tool Scope

The central bearer endpoint should expose only the Template Review tools that work without reviewer identity:

- `webflow-template-review-mcp__template_review_workflow`
- `webflow-template-review-mcp__template_review_health`
- `webflow-template-review-mcp__template_review_start_capture_session`
- `webflow-template-review-mcp__template_review_continue_capture_session`
- `webflow-template-review-mcp__template_review_get_capture_session_artifact`
- `webflow-template-review-mcp__template_review_draft_from_capture_session`
- `webflow-template-review-mcp__template_review_list_queue`
- `webflow-template-review-mcp__template_review_get_review_context`
- `webflow-template-review-mcp__template_review_search_assets`
- `webflow-template-review-mcp__template_review_search_versions`
- `webflow-template-review-mcp__template_review_get_asset`
- `webflow-template-review-mcp__template_review_list_versions`
- `webflow-template-review-mcp__template_review_get_version`
- `webflow-template-review-mcp__template_review_list_releases`
- `webflow-template-review-mcp__template_review_get_field_map`
- `webflow-template-review-mcp__template_review_get_metrics`

Do not expose reviewer-attributed write tools on this shared central credential:

- `template_review_assign_self`
- `template_review_unassign_self`
- `template_review_request_changes`
- `template_review_set_review_status`
- `template_review_save_draft_feedback`
- broad admin tools such as `template_review_assign_reviewer`

Use reviewer-specific Hubs for assignment, reviewer queue, draft feedback writes, status changes, and request-changes actions.

## Claude Code Setup

Yes: Claude Code can use the bearer route. Configure the remote MCP server URL as:

```text
https://wf-template-review.mcp.createsomething.agency/mcp/bearer
```

Use bearer authentication with any approved central access token:

```text
Authorization: Bearer <CS_HUB_WF_TEMPLATE_REVIEW_ERIC_API_TOKEN>
```

Do not configure OAuth, session login, custom identity headers, or `X-MCP-Session-Token` for this central connector.

## Gumloop Setup

Use Gumloop custom MCP server configuration:

```text
Server URL: https://wf-template-review.mcp.createsomething.agency/mcp/bearer
Auth: Bearer Token
Token: one of the approved CS_HUB_WF_TEMPLATE_REVIEW_*_API_TOKEN values
```

Gumloop notes:

- Put the token in Gumloop's **Access Token / API Key** field so it is sent as `Authorization: Bearer <token>`.
- Eric, Mariana, Vicki, and Natalia can use their approved existing reviewer Hub token here; the token still does not create reviewer identity on the central endpoint.
- Do not use custom headers for this MCP. Anthropic-native Gumloop models do not forward custom headers.
- Gumloop has no approval prompts before MCP tool execution, so the server-side allowlist is the safety boundary.

## Expected Workflow

Expected tool path:

1. `hub_list_services`
2. `hub_search_proxy_tools` with `serverName=webflow-template-review-mcp`
3. `hub_execute_proxy_tool` for an allowed `webflow-template-review-mcp__template_review_*` proxy tool

For full public-site reviews, use the capture-session proxy tools:

- `webflow-template-review-mcp__template_review_start_capture_session`
- `webflow-template-review-mcp__template_review_continue_capture_session`
- `webflow-template-review-mcp__template_review_get_capture_session_artifact`
- `webflow-template-review-mcp__template_review_draft_from_capture_session`

For reviewer-attributed writes, switch to the reviewer-specific Hub.

## Acceptance Checks

Before PMM or reviewer enablement treats the central connector as ready for Claude/Gumloop testing:

- `/health` reports `identity_mode=compat`.
- `/health` reports `oauth_discovery_enabled=false`.
- `/health` reports `session_resolver.enabled=false`.
- Unauthenticated `/mcp` and `/mcp/bearer` calls return `401` with a plain bearer challenge.
- `/.well-known/oauth-authorization-server` returns `404`.
- `/mcp/.well-known/oauth-protected-resource` returns `404`.
- `hub_list_services` shows only `webflow-template-review-mcp`.
- `hub_search_proxy_tools` shows the central read/capture Template Review allowlist.
- Eric, Mariana, Vicki, and Natalia static reviewer Hub bearers can authenticate to the same central endpoint.
- `tools/list` does not expose Hub mutation tools such as `hub_update_state`, `hub_set_discovery`, or `hub_refresh_connections`.
- Analyzer/local tools do not appear.
- Reviewer-attributed write tools and broad admin tools do not appear.
- A request with a non-static personal bearer is rejected rather than sent to the session resolver.
- Eric's reviewer-specific endpoint still reports and behaves according to its own reviewer-specific Hub config.

## Related Files

- `scripts/cs-hub-webflow-reviewers-phase-a-deploy.sh`
- `scripts/cs-hub-webflow-reviewers-phase-a-vault-sync.sh`
- `packages/cs-mcp-hub-remote/index.ts`
- `config/mcp-hub/fleet.json`
- [Hub and Dify Eval Suites](./WEBFLOW_TEMPLATE_REVIEW_HUB_EVAL_SUITE.md)
