# Interaction Atlas MCP - Control Plane Rollout

This rollout adds Judgment Layer Control Plane persistence for:

- automation registry and versioned contracts,
- run/event/audit timelines,
- approval inbox state,
- policy activation governance,
- DB-level invariants for common operator safety rules.

## Migration order

Apply in this exact order:

1. `0001_versions_visualizations.sql`
2. `0002_judgment_policy.sql`
3. `0003_automation_registry.sql`
4. `0004_runs_approvals_audit.sql`
5. `0005_policy_activation_governance.sql`
6. `0006_control_plane_invariants.sql`
7. `0007_polar_artifacts.sql`

## Pre-flight checks

1. Confirm `worker/wrangler.toml` points at the correct D1 target (`database_id`).
2. Take a D1 backup/snapshot before applying new migrations.
3. Ensure runtime has `PRAGMA foreign_keys = ON` if executed outside Wrangler migrations.

## Apply commands

From `packages/interaction-atlas-mcp/worker`:

```bash
pnpm exec wrangler d1 migrations apply interaction-atlas-mcp
```

For remote environment:

```bash
pnpm exec wrangler d1 migrations apply interaction-atlas-mcp --remote
```

## Post-migration verification

Run these checks:

1. `automation_contracts` can insert `direct` and `guided` records.
2. `execution_mode=autonomous` rejects `agentAssignment.mode=none` in `spec_json`.
3. Only one active contract per `(account_id, automation_id)` is allowed.
4. `approval_requests` only transitions out of `pending` once and requires decision fields.
5. `automation_runs` cannot transition to `awaiting_approval` without a pending approval row.
6. `policy_activations` accepts rows referencing existing `judgment_policy_versions`.

## Rollback strategy

SQLite/D1 migrations are forward-only in normal practice. Use one of:

1. **Preferred**: restore from backup/snapshot.
2. **Fallback**: apply a follow-up corrective migration:
   - disable or drop problematic triggers from `0006`,
   - archive bad data rows,
   - re-add corrected triggers/indexes.

Do not manually mutate history tables (`run_events`, `approval_events`) unless required by incident policy.

## Operational handoff

Before enabling operator write paths:

1. Turn on read-only dashboard queries first (`automation_runs`, `approval_requests`, `run_events`).
2. Enable control-plane writes for one pilot tenant.
3. Validate Inbox and audit replay flows.
4. Expand to broader tenants after two clean release windows.
