# Dify Workspace Inventory

This guide explains how to codify manually created Dify MCP server cards and Dify agents.

## Source Of Truth

Use `config/dify/inventory.json` as the repo-side source of truth for Dify workspace state.

The inventory records:

- Dify MCP server IDs and URLs
- Infisical secret references, never secret values
- discovered Dify MCP tools and risk classification
- Dify builtin/Marketplace tools attached directly to agents
- Dify agents, app IDs, DSL/manifest paths, enabled tools, policy packs, and eval ownership
- whether Dify-native Langfuse tracing is connected for the app runtime

Use `config/dify-mcp-intake/*.json` only for MCPs that are ready to register in
Dify Studio but do not yet have discovered tools codified in inventory.

Generated operator view:

- `docs/DIFY_WORKSPACE_INVENTORY.generated.md`
- `docs/DIFY_MCP_COVERAGE.generated.md`

## Commands

```bash
pnpm dify:mcp:intake -- --registry-server-id <mcp-registry-server-id>
pnpm dify:mcp:intake -- --all-missing
pnpm dify:mcp:intake:check
pnpm dify:agent:scaffold -- --agent-id <agent-slug> --server-id <dify-mcp-server-id>
pnpm dify:agent:import-dsl -- --dsl <exported-dify-yml> --agent-id <agent-slug> --fleet-id <mcp-fleet-id>
pnpm dify:agent:smoke -- --agent-id <agent-slug>
pnpm dify:agent:smoke -- --agent-id <agent-slug> --case <case-id>
pnpm dify:agent:smoke -- --agent-id <agent-slug> --dry-run
pnpm dify:agent:smoke -- --agent-id <agent-slug> --query <prompt> --require-tool <tool>
pnpm dify:reviewer-hubs:smoke
pnpm dify:reviewer-hubs:e2b-smoke
pnpm dify:reviewer-hubs:identity-smoke -- --version-id <asset-version-id>
pnpm dify:coverage:generate
pnpm dify:coverage:check
pnpm dify:inventory:validate
pnpm dify:inventory:generate
pnpm dify:inventory:check
```

Use `dify:agent:scaffold` to draft a manifest and inventory entry from an
existing Dify MCP server card. It is a dry run unless `--write-manifest` or
`--write-inventory` are provided.

Use `dify:agent:import-dsl` when an agent already exists in Dify and has been
exported as a DSL file. The command reads the app name, instructions, MCP
provider ID, and enabled MCP tools from the export, then drafts the repo-side
DSL snapshot, manifest, and inventory entries. It is a dry run unless
`--write-dsl`, `--write-manifest`, or `--write-inventory` are provided. Prefer
`--fleet-id` when the underlying MCP URL/auth already exists in
`config/mcp-hub/fleet.json`; otherwise pass `--mcp-url` plus Infisical secret
reference flags. For Policy OS Hub deployments, Dify MCP cards should use the
same static lane bearer reference declared in the fleet registry, usually
`prod:/mcp-hub/hubs:CS_HUB_*_API_TOKEN`.

Use `dify:mcp:intake` when coverage shows an active direct HTTP MCP that does
not yet have a codified Dify server card. The command creates a Dify Studio
setup artifact under `config/dify-mcp-intake/` when run with `--write`; it does
not update `config/dify/inventory.json` until tools have been discovered and
classified. Use `--all-missing --write` to create intake artifacts for every
missing Dify-direct candidate that is not already represented by inventory or an
intake artifact. Use `dify:mcp:intake:check` to validate that intake artifacts
still map to the MCP registry, do not overlap strict inventory, and contain only
secret references.

Use `dify:agent:smoke` for a generic Dify Service API smoke against any agent
declared in `config/dify/inventory.json`. It resolves the agent Service API key
from the inventory's Infisical reference unless overridden by environment flags.
If the agent has `smoke_cases`, passing only `--agent-id` runs those cases. Use
`--case` for a targeted inventory case, or `--query` for one-off probes before
promoting the case into inventory.

```bash
pnpm dify:agent:smoke -- --list-agents
pnpm dify:agent:smoke -- \
  --agent-id youtube-transcript-notion-agent \
  --query "Extract the transcript for https://www.youtube.com/watch?v=sEQ1ecQq0HI. Do not write to Notion." \
  --require-tool extract_transcript \
  --forbid-tool sync_video_to_notion
```

Use `--expect-tool`/`--require-tool` for required tool calls,
`--forbid-tool` for tools that must not run, `--expect-answer`/`--expect` for
answer text, `--forbid-answer` for answer text that must not appear,
`--expect-observation` for tool observation text, and
`--max-attempts` when a live provider path has known transient failures.

For reviewer Hub agents with direct E2B tools, keep both sides of the sandbox
boundary covered: a read-only Hub readiness case that forbids E2B, and a
positive E2B case that intentionally allows `run_code` while forbidding Hub
calls and file transfer tools. Use `pnpm dify:reviewer-hubs:e2b-smoke` when the
change only needs the E2B lane, or `pnpm dify:reviewer-hubs:smoke` when both the
Hub and E2B cases should run for every reviewer lane.

Use `pnpm dify:reviewer-hubs:identity-smoke` before allowing Dify reviewer
agents to perform review-write workflows. It asks each reviewer agent to route a
read-only `template_review_get_review_context` call through its Hub card and
asserts that `data.context.currentReviewer.email` matches the expected reviewer
lane. Pass `--version-id` or `DIFY_REVIEWER_IDENTITY_VERSION_ID` for the Asset
Version used as a stable read target; if omitted, the agent first reads one
queue item. The smoke fails if the agent attempts downstream reviewer writes,
Hub state refresh, or Hub state mutation.

For Hub MCP server cards, do not treat Dify Studio's `Authorized` badge as a
complete readiness signal. That badge can be satisfied by MCP initialization and
tool discovery. A real readiness smoke must call at least one harmless read tool,
usually `hub_status` or `hub_list_services`, and fail if the tool observation or
answer reports `Unauthorized MCP session token`, `token_not_found`, or asks the
user to complete Hub auth. Hub compat runtimes must treat the configured static
`HUB_API_TOKEN` as the MCP auth boundary and must not send that token through
identity/session resolution during `tools/call`.

Use `generate` after changing `config/dify/inventory.json`. Use `check` in CI or before landing a PR.
Run `dify:mcp:intake:check` after changing `config/dify-mcp-intake/`.

Use `dify:coverage:generate` to compare active direct HTTP MCPs from
`config/mcp-hub/registry.json` against the Dify inventory. The generated
coverage report makes the manual Dify Studio backlog explicit: missing server
cards, intake-ready server cards, server-only mappings, draft agents, and agents
missing smoke/eval gates.

## Manual Snapshot Flow

Until Dify Cloud exposes a stable public admin API for app/MCP provisioning, treat Dify Studio as the live UI and this repo as the governance layer.

For each Dify MCP server card:

1. Copy the Dify MCP server ID exactly.
2. Record the URL.
3. Record only the Infisical path/key reference for credentials.
4. Refresh tools in Dify Studio.
5. Add every discovered tool to `mcp_servers[server_id].tools`.
6. Mark write or side-effect tools with `risk: "write"` or `risk: "external_side_effect"` and `requires_user_confirmation: true`.

For Dify builtin or Marketplace tools attached directly to an agent, record them
under that agent's `builtin_tools`. These tools are not MCP server cards, but
they still need the same risk and confirmation policy. Execution tools such as
E2B `run_code`, `run_command`, `upload_file`, and `download_file` should be
treated as `external_side_effect` unless a narrower policy is documented.

For each Dify agent:

1. Export the app DSL.
2. Run `pnpm dify:agent:import-dsl -- --dsl <export.yml> --agent-id <agent> --fleet-id <fleet-id>` to draft the mapping.
3. Re-run with `--write-dsl --write-manifest --write-inventory` after reviewing the output.
4. Confirm the DSL snapshot exists under `config/dify-agents/{agent}.dify.yml`.
5. Confirm the compact manifest exists under `config/dify-agents/{agent}.json`.
6. Confirm the agent entry exists in `config/dify/inventory.json`.
7. List all enabled tools as `server_id.tool_name`.
8. Set `policy_pack`, `eval_suite`, `evals`, and `smoke_command`.
9. Add at least one `smoke_cases` entry before setting `status: "published"`.
10. Run the Dify inventory check and the agent's smoke/eval command.

For prompt-only updates to an already published app, keep the existing Dify app in place. Do not import a replacement app or delete the existing app just to update instructions; that would rotate app identity and Service API wiring unnecessarily. If the live Instructions field contains an XML wrapper, Dify variables, output format, or examples, patch only the intended policy paragraphs and preserve the rest of the live field. If the live field is a plain compact prompt, paste the repo-owned prompt into the current app instructions. After saving the existing app, export its DSL and reconcile the snapshot back into `config/dify-agents/{agent}.dify.yml`, then run the inventory check, that agent's smoke/eval command, and `pnpm dify:reviewer-hubs:identity-smoke` for reviewer-hub prompt changes.

## Rules

- Do not store Dify API keys, MCP bearer tokens, Notion tokens, or other secret values in the repo.
- Every published Dify agent must have a Service API key reference in Infisical.
- Every enabled tool must exist in the referenced Dify MCP server entry.
- Every write-capable tool must require explicit confirmation.
- Every agent that enables write-capable tools must declare `write_policy: "requires_explicit_confirmation"`.
- Every Dify agent must declare Langfuse-owned eval gates in `evals.required_checks`.
- Every published Dify agent must declare both a local eval command and a published eval command.
- Every Dify agent with enabled tools must cover expected tool use and forbidden tool avoidance.
- Every Dify agent with write-capable tools must cover explicit write confirmation.
- Every published Dify agent must have at least one inventory-declared `smoke_cases` entry.
- Every `config/dify-agents/*.json` manifest must be referenced by the inventory.

## Eval And Trace Model

Dify is the runtime and client-facing chat surface. Langfuse is the native trace
surface for the Dify app runtime. Langfuse is the eval system for
CREATE SOMETHING-owned MCP gates. The inventory should make that split explicit
for every agent.

Use Langfuse to inspect:

- Dify app sessions and conversations
- prompt and model behavior
- latency, token usage, cost, and runtime errors
- operator debugging evidence

Use `evals.required_checks` to name the behavioral gates the agent must satisfy.
The validator enforces this minimum:

- all agents: `api_health`, `secret_refusal`, `latency_budget`
- agents with MCP tools: `expected_tool_use`, `forbidden_tool_use`
- agents with write-capable MCP tools: `write_confirmation`

Add stricter checks when they matter for a client or domain:

- `grounded_answer`
- `policy_boundary`
- `tenant_isolation`
- `error_recovery`

The eval gates should be implemented by a Langfuse eval file under
`evals/langfuse/dify/` and exposed through package scripts. Service API keys
must resolve from Infisical or the local process environment, never from checked-in
files.

## Relationship To MCP Registry

The Dify inventory should point back to `config/mcp-hub/registry.json` through `source_mcp_registry_server` whenever a Dify MCP server is backed by one of our canonical MCPs.

That relationship keeps the split clear:

- `config/mcp-hub/registry.json` says what MCP capabilities exist.
- `config/dify/inventory.json` says which MCP capabilities are exposed to Dify agents.
- `config/dify-agents/*.dify.yml` carries the importable Dify app shape.
- Langfuse traces explain what happened inside the Dify app.
- Langfuse evals prove each CREATE SOMETHING-owned MCP boundary follows policy.
