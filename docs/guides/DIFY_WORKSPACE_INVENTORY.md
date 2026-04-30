# Dify Workspace Inventory

This guide explains how to codify manually created Dify MCP server cards and Dify agents.

## Source Of Truth

Use `config/dify/inventory.json` as the repo-side source of truth for Dify workspace state.

The inventory records:

- Dify MCP server IDs and URLs
- Infisical secret references, never secret values
- discovered Dify MCP tools and risk classification
- Dify agents, app IDs, DSL/manifest paths, enabled tools, policy packs, and eval ownership

Generated operator view:

- `docs/DIFY_WORKSPACE_INVENTORY.generated.md`

## Commands

```bash
pnpm dify:inventory:validate
pnpm dify:inventory:generate
pnpm dify:inventory:check
```

Use `generate` after changing `config/dify/inventory.json`. Use `check` in CI or before landing a PR.

## Manual Snapshot Flow

Until Dify Cloud exposes a stable public admin API for app/MCP provisioning, treat Dify Studio as the live UI and this repo as the governance layer.

For each Dify MCP server card:

1. Copy the Dify MCP server ID exactly.
2. Record the URL.
3. Record only the Infisical path/key reference for credentials.
4. Refresh tools in Dify Studio.
5. Add every discovered tool to `mcp_servers[server_id].tools`.
6. Mark write or side-effect tools with `risk: "write"` or `risk: "external_side_effect"` and `requires_user_confirmation: true`.

For each Dify agent:

1. Export the app DSL and store it under `config/dify-agents/{agent}.dify.yml`.
2. Add or update a compact manifest under `config/dify-agents/{agent}.json`.
3. Add the agent to `config/dify/inventory.json`.
4. List all enabled tools as `server_id.tool_name`.
5. Set `policy_pack`, `eval_suite`, `evals`, and `smoke_command`.
6. Run the Dify inventory check and the agent's smoke/eval command.

## Rules

- Do not store Dify API keys, MCP bearer tokens, Notion tokens, or other secret values in the repo.
- Every published Dify agent must have a Service API key reference in Infisical.
- Every enabled tool must exist in the referenced Dify MCP server entry.
- Every write-capable tool must require explicit confirmation.
- Every agent that enables write-capable tools must declare `write_policy: "requires_explicit_confirmation"`.
- Every Dify agent must declare Braintrust-owned eval gates in `evals.required_checks`.
- Every published Dify agent must declare both a local eval command and a published eval command.
- Every Dify agent with enabled tools must cover expected tool use and forbidden tool avoidance.
- Every Dify agent with write-capable tools must cover explicit write confirmation.
- Every `config/dify-agents/*.json` manifest must be referenced by the inventory.

## Eval Gate Model

Dify is the runtime and client-facing chat surface. Braintrust is the eval system
of record. The inventory should make that split explicit for every agent.

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

The eval gates should be implemented by a Braintrust eval file under
`evals/braintrust/dify/` and exposed through package scripts. Service API keys
must resolve from Infisical or the local process environment, never from checked-in
files.

## Relationship To MCP Registry

The Dify inventory should point back to `config/mcp-hub/registry.json` through `source_mcp_registry_server` whenever a Dify MCP server is backed by one of our canonical MCPs.

That relationship keeps the split clear:

- `config/mcp-hub/registry.json` says what MCP capabilities exist.
- `config/dify/inventory.json` says which MCP capabilities are exposed to Dify agents.
- `config/dify-agents/*.dify.yml` carries the importable Dify app shape.
- Braintrust evals prove each Dify agent follows policy.
