# Linear Coordination

Linear is the CREATE SOMETHING source of truth for task coordination, ownership, status, and delivery evidence.

## Current Projects

- `MCP & Agent Registry` - registry and source-of-truth initiative.
- `CREATE SOMETHING Agent Coordination` - Linear-backed code-quality and policy orchestration lanes.
- `Loom to Linear Coordination Migration` - imported active local/remote Loom tasks and cutover work.
- `MCP Fleet Registry` - operational MCP registry mirror.
- `Agent Registry` - operational agent registry mirror.
- `Registry Governance & Source of Truth` - approval, policy, and validation workflow.
- `Client Delivery` - active accepted client delivery work that is not registry governance, MCP fleet ownership, or operator escalation.

## Commands

Use the repo wrapper for common agent actions:

```bash
pnpm linear:ready
pnpm linear:list -- --status open --label code-quality
pnpm linear:get -- --issue CRE-123
pnpm linear:create -- --title "..." --description "..." --label code-quality
pnpm linear:claim -- --issue CRE-123
pnpm linear:comment -- --issue CRE-123 --body "..."
pnpm linear:done -- --issue CRE-123 --evidence "Validation: ..."
```

The wrapper uses `LINEAR_API_KEY`. Store that key in Infisical or another secret manager; never commit it. For CREATE SOMETHING automation, the production key lives in Infisical at `prod` `/`.

To verify the wrapper through Infisical:

```bash
infisical run --env=prod --path=/ --include-imports=true -- pnpm linear:ready
```

## Linear MCP

Use Linear's hosted MCP server for interactive agent work when the client supports remote MCP:

```bash
codex mcp add linear --url https://mcp.linear.app/mcp
codex mcp login linear
```

This repository also includes the hosted Linear MCP endpoint in `.mcp.json` for project-scoped clients that read MCP server definitions from the workspace.

Codex clients must have remote MCP enabled in `~/.codex/config.toml`:

```toml
[features]
experimental_use_rmcp_client = true
```

For non-interactive automation, keep using the repo wrapper with `LINEAR_API_KEY`. The same Linear credential model can authenticate MCP calls through an `Authorization: Bearer <token>` header, but credentials still belong in Infisical or process environment only.

Prefer direct hosted Linear MCP for interactive OAuth clients. Do not broker Linear through the Hub unless a separate approval, audit, or policy-control requirement is documented in Linear first.

## Registry Snapshots

Use Linear as the registry coordination and review layer, not as the runtime config store:

```bash
pnpm linear:registry:sync -- --dry-run
pnpm linear:registry:sync
```

The sync creates or refreshes dated Linear issues in:

- `MCP Fleet Registry` from `config/mcp-hub/registry.json`
- `Agent Registry` from `packages/agent-sdk`, agent worker packages, `config/dify/inventory.json`, and Linear-backed Symphony coordination

Treat the Linear issues as review, ownership, approval, and audit artifacts. The executable truth remains in the checked-in registry, package code, Hub state, deployments, and Infisical secrets.

## Evidence Format

Record concise evidence as a Linear comment or completion evidence:

```text
Task: <Linear issue id/title>
Surface: <package/page/service>
Commit: <sha or none>
Validation: <commands and pass/fail>
Deploy: <environment, URL, run id, or none>
Smoke: <route/status/content check>
Rollback: <revert sha, redeploy previous version, or explicit note>
Notes: <known caveats>
```

## Loom Migration

Local and remote Loom have been migrated into Linear:

- Remote active tasks became Linear issues in `Loom to Linear Coordination Migration`.
- Local active tasks not already present remotely were imported into the same project.
- Completed/cancelled Loom history is retained in the Linear document `Loom to Linear Migration Archive`.
- Original `lm-*` IDs are preserved in imported issue descriptions for traceability.

Do not create new Loom tasks. If a legacy command or doc still points to Loom, update it to Linear or file a Linear cleanup issue.

## Operational Rule

Linear is the coordination source of truth. Repo files, Hub/D1, identity stores, and Infisical remain the executable sources of truth for code, runtime registry, authz, and secrets.
