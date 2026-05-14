# Webflow Template Review Central MCP Connector

Runtime strategy context: [Webflow Template Review Runtime Strategy Brief](./WEBFLOW_TEMPLATE_REVIEW_RUNTIME_STRATEGY_BRIEF_2026-05-14.md).

## Purpose

The central connector gives Webflow Template Reviewers one remote MCP URL that can be added to Claude custom connectors or Gumloop:

```text
https://wf-template-review.mcp.createsomething.agency/mcp
```

This is a shared Hub endpoint, not a shared reviewer identity. Each reviewer must still authenticate with a reviewer-bound managed bearer or session token so the Hub can resolve:

- `account_id`
- `tenant_id`
- `user_id`
- `allowed_tool_prefixes`
- `tool_mode`

The downstream `webflow-template-review-mcp` receives the resolved account ID through Hub headers and maps it to the reviewer directory. Prompt text such as "I am Eric" or "assign this to Natalia" is not identity.

## Runtime Shape

| Layer                         | Responsibility                                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Claude or Gumloop             | Chat/runtime surface. Sends requests to the central MCP URL with reviewer auth.                                |
| `cs-mcp-hub-remote`           | Single remote MCP endpoint, session resolver, discovery cap, route authorization, traces, and proxy execution. |
| Identity worker               | Resolves reviewer managed bearer or session tokens to account context and allowed tool prefixes.               |
| `webflow-template-review-mcp` | Template Review queue/context/capture/draft/write tools with reviewer-safe ownership checks.                   |

## Deployment

The central endpoint reuses the existing reviewer Phase A Hub deploy script. It is intentionally not included in the default reviewer loop unless requested.

Deploy, normalize, and verify the central endpoint:

```bash
REVIEWER=central \
HUB_API_TOKEN="$CS_HUB_WF_TEMPLATE_REVIEW_API_TOKEN" \
SESSION_TOKEN_FOR_NORMALIZE="$SESSION_TOKEN_FOR_NORMALIZE" \
pnpm mcp:hub:webflow-template-review:central:deploy all
```

Deploy only:

```bash
pnpm mcp:hub:webflow-template-review:central:deploy deploy
```

Include the central endpoint in a full reviewer deploy:

```bash
INCLUDE_CENTRAL=1 bash scripts/cs-hub-webflow-reviewers-phase-a-deploy.sh all
```

Sync central runtime secrets:

```bash
pnpm mcp:hub:webflow-template-review:central:vault:sync
```

The central worker defaults to:

- `CENTRAL_SLUG=wf-template-review`
- `CENTRAL_ACCOUNT_ID=acct_wf_template_review`
- `CENTRAL_IDENTITY_MODE=session_required`
- `ENABLED_SERVERS=webflow-template-review-mcp`
- `DISABLED_SERVERS=webflow-local,webflow-site-analyzer-mcp`
- `DISCOVERY_PACK=webflow-marketplace-review-phase-a`
- `DISCOVERY_MAX_PROXY_TOOLS=18`

Reviewer-specific Hubs remain available as fallback.

## Reviewer Token Requirements

For reviewer-safe writes, Claude and Gumloop must use a token that resolves through the identity worker. The token should resolve to a Webflow Template Review reviewer account such as `acct_wf_eric`, `acct_wf_natalia`, `acct_wf_mariana`, or `acct_wf_vicki`.

Recommended token posture:

- `bound_host=wf-template-review`
- `tenant_id=tenant_webflow_marketplace`
- `tool_mode=read_write` only for reviewers approved for MCP write actions
- `allowed_tool_prefixes` limited to the Phase A Template Review surface

Migration posture:

- Existing reviewer-bound managed bearer tokens for `wf-template-review-{reviewer}` may resolve on the shared `wf-template-review` host.
- Central tokens do not become valid on reviewer-specific hosts just because the shared host exists.
- Non-reviewer accounts on the shared host do not inherit reviewer tool prefixes.

## Claude Setup

Use the remote MCP custom connector flow and point the connector at:

```text
https://wf-template-review.mcp.createsomething.agency/mcp
```

Operational requirements:

- Scope the connector to the intended reviewer group.
- Use OAuth/session or reviewer managed bearer auth that the identity worker can resolve.
- Do not configure a shared static Hub token as the reviewer credential.
- Keep analyzer/local MCP servers out of the connector.
- Verify the connector can call `hub_list_services`, `hub_search_proxy_tools`, and `hub_execute_proxy_tool`.

The Hub exposes OAuth protected-resource metadata for hosts that support discovery, but reviewer identity still has to resolve through the identity worker before any tool execution.

## Gumloop Setup

Use Gumloop custom MCP server configuration:

```text
Server URL: https://wf-template-review.mcp.createsomething.agency/mcp
Auth: Bearer Token
Token: reviewer-bound managed bearer token
```

Gumloop notes:

- Prefer Bearer Token auth over custom authentication headers for Anthropic-native models.
- Gumloop's MCP Agent path does not provide approval prompts, so do not rely on the client for write confirmation.
- Keep write safety in the Hub and downstream MCP: reviewer identity, allowed tool prefixes, ownership checks, and explicit reviewer-safe write tools.

## Reviewer Workflow

Expected tool path:

1. `hub_list_services`
2. `hub_search_proxy_tools` with `serverName=webflow-template-review-mcp`
3. `hub_execute_proxy_tool` for the selected `webflow-template-review-mcp__template_review_*` proxy tool

For full public-site reviews, use the capture-session proxy tools:

- `webflow-template-review-mcp__template_review_start_capture_session`
- `webflow-template-review-mcp__template_review_continue_capture_session`
- `webflow-template-review-mcp__template_review_draft_from_capture_session`

For reviewer-safe Airtable actions, use only the narrow proxy tools:

- `webflow-template-review-mcp__template_review_assign_self`
- `webflow-template-review-mcp__template_review_unassign_self`
- `webflow-template-review-mcp__template_review_request_changes`
- `webflow-template-review-mcp__template_review_set_review_status`
- `webflow-template-review-mcp__template_review_save_draft_feedback`

Do not expose or promote broad admin tools such as `template_review_assign_reviewer`.

## Acceptance Checks

Before PMM or reviewer enablement treats the central connector as reviewer-ready:

- The endpoint is reachable at `/mcp` and advertises OAuth protected-resource metadata.
- `hub_list_services` shows only `webflow-template-review-mcp`.
- `hub_search_proxy_tools` shows the Phase A reviewer-safe Template Review tools and no analyzer/local tools.
- Eric and Natalia tokens on the same endpoint resolve to different reviewer identities.
- A prompt-spoofed identity attempt does not change the resolved reviewer.
- `template_review_my_queue` scopes to the authenticated reviewer.
- `template_review_assign_self` attributes to the authenticated reviewer.
- A forbidden cross-reviewer mutation is denied by the downstream MCP.
- Gumloop and Claude both use the same shared URL and token posture.

## Related Files

- `scripts/cs-hub-webflow-reviewers-phase-a-deploy.sh`
- `scripts/cs-hub-webflow-reviewers-phase-a-vault-sync.sh`
- `packages/identity-worker/src/index.ts`
- `packages/cs-mcp-hub-remote/index.ts`
- `config/mcp-hub/fleet.json`
- [Hub and Dify Eval Suites](./WEBFLOW_TEMPLATE_REVIEW_HUB_EVAL_SUITE.md)
