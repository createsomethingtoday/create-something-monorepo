# Webflow Template Review Claude Code Reviewer Setup

This path is for operators and reviewer power users. For nontechnical reviewer rollout, prefer the Dify-first delivery model in [WEBFLOW_TEMPLATE_REVIEW_NONTECH_REVIEWER_DELIVERY.md](./WEBFLOW_TEMPLATE_REVIEW_NONTECH_REVIEWER_DELIVERY.md).

When Claude Code is used, the automation path runs in the reviewer's or operator's Claude Code instance:

1. Claude Code provides the local shell needed by the `template-review` skill (`curl`, `grep`, batch scripts, raw HTML verification).
2. A reviewer-scoped MCP Hub provides Airtable queue/context/write tools.
3. The Hub remains constrained to `webflow-template-review-mcp` only.

Do not add `webflow-site-analyzer-mcp` back to Template Review reviewer Hubs to support this workflow.

## Runtime Shape

```text
Reviewer Claude Code
  -> local template-review skill
  -> Bash/curl/raw HTML checks
  -> reviewer-specific Hub MCP
  -> webflow-template-review-mcp
  -> Airtable Assets / Asset Versions
```

This is intentionally different from Dify. Dify remains the preferred nontechnical reviewer UI, while the Claude Code path is where local shell commands and skill scripts can run for operator support, calibration, and fallback work.

## Reviewer Hub Endpoints

| Reviewer | Claude Code MCP URL | Infisical token |
| --- | --- | --- |
| Eric | `https://wf-template-review-eric.mcp.createsomething.agency/mcp` | `prod:/mcp-hub/hubs:CS_HUB_WF_TEMPLATE_REVIEW_ERIC_API_TOKEN` |
| Natalia | `https://wf-template-review-natalia.mcp.createsomething.agency/mcp` | `prod:/mcp-hub/hubs:CS_HUB_WF_TEMPLATE_REVIEW_NATALIA_API_TOKEN` |
| Mariana | `https://wf-template-review-mariana.mcp.createsomething.agency/mcp` | `prod:/mcp-hub/hubs:CS_HUB_WF_TEMPLATE_REVIEW_MARIANA_API_TOKEN` |
| Vicki | `https://wf-template-review-vicki.mcp.createsomething.agency/mcp` | `prod:/mcp-hub/hubs:CS_HUB_WF_TEMPLATE_REVIEW_VICKI_API_TOKEN` |

The setup script installs these as remote HTTP MCP servers with a `headersHelper`. The helper fetches the bearer token from Infisical at connection time and emits the JSON header object Claude Code expects.

## Install One Reviewer MCP

From this repo:

```bash
scripts/webflow-template-review-claude-code-setup.sh eric user
```

Use the matching reviewer name: `eric`, `natalia`, `mariana`, or `vicki`.

To install the four current reviewer Hubs for an operator test machine:

```bash
scripts/webflow-template-review-claude-code-setup.sh all user
```

The default scope is `user`. Use `local` only for a single project workspace, and `project` only when intentionally sharing a non-secret `.mcp.json` with the team.

## Verify Connection

```bash
claude mcp list
claude mcp get webflow-template-review-eric
```

Inside Claude Code:

```text
/mcp
```

Then ask:

```text
Use hub_list_services to list available Hub services. Reply with the count and service names only.
```

Expected answer:

```text
1 service: webflow-template-review-mcp
```

Any answer that includes `webflow-site-analyzer-mcp` is a rollout blocker.

## Skill Use

Install the Webflow Template Review skill into the reviewer's Claude Code skill directory:

```bash
mkdir -p ~/.claude/skills
cp -R /path/to/template-review ~/.claude/skills/template-review
```

The skill should treat the reviewer Hub as broker mode:

1. Use `hub_list_services` first and verify only `webflow-template-review-mcp` is listed.
2. Use `hub_search_proxy_tools` with `serverName: "webflow-template-review-mcp"` when it needs to discover the exact downstream tool name.
3. Use `hub_describe_proxy_tool` before executing unfamiliar or write-capable downstream tools.
4. Use `hub_execute_proxy_tool` with the exact proxy tool name and schema.
5. Use local Bash/curl commands for raw HTML, HTTP status, H1, metadata, and script checks.

The skill should not call Hub control-plane tools such as `hub_update_state`, `hub_refresh_connections`, or discovery mutation tools during reviewer work.

## Write Boundary

The reviewer skill may use the Hub to call the narrow reviewer-owned write paths already covered by the eval suite:

- `template_review_assign_self`
- `template_review_unassign_self`
- `template_review_save_draft_feedback`
- `template_review_request_changes`
- `template_review_set_review_status`

The safest default remains draft feedback only. Human reviewers remain responsible for final accept/reject decisions unless the current rollout explicitly enables those writes for their lane.

## Local Shell Boundary

Claude Code local shell is for published-site inspection and skill scripts:

- `curl` homepage and utility pages
- inspect raw HTML with `grep`/`rg`
- run `checks/batch-triage.sh`
- run `checks/summarize-batch.sh`

Those shell operations are not Dify tools and are not MCP tools. They should stay local to Claude Code unless a specific check is later promoted into `webflow-template-review-mcp`.

## Validation Surface

Use the existing Braintrust suite for live Hub/Airtable confidence:

```bash
pnpm braintrust:eval:mcp:webflow-template-hubs:local
```

Use the focused smoke for one reviewer:

```bash
pnpm dify:agent:smoke -- --agent-id eric-hub --case hub-list-services-bearer --timeout-ms 180000
```

The Claude Code setup is considered ready for a reviewer when:

- `/mcp` shows the reviewer Hub connected
- `hub_list_services` returns only `webflow-template-review-mcp`
- `hub_search_proxy_tools` exposes the expected template review proxy tools
- local `curl` checks work from the same terminal session
- the reviewer skill can fetch review context and save draft feedback without touching the human feedback/status fields unexpectedly
