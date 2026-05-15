# policy.hydradb-context-retention.v1

- Status: `draft`
- Owner: `CREATE SOMETHING engineering operations`
- Effective date: `TBD`

## Purpose

Define the retention, sync, monitoring, and deletion rules for Hydra DB context memory used by CREATE SOMETHING agents.

## Scope

- Hydra DB tenant `create_something`
- Internal sub-tenants `cs-internal-context`, `cs-linear-evidence`, and `cs-mcp-catalog`
- Governed wrapper `hydradb-context-mcp`
- Upstream Hydra DB MCP server `hydradb-memory`
- Non-customer internal docs, policy artifacts, Linear evidence, and MCP registry summaries

This policy does not approve customer data, raw credentials, PHI, payment data, legal documents, or unresolved sensitive incident material for Hydra DB ingestion.

## Policy Statements

1. Hydra DB MUST be treated as a recall/index layer, not as the source of truth for policies, Linear issues, registry entries, credentials, or application data.
2. `hydradb-context-mcp` MAY be enabled for internal operator lanes when its wrapper gate and production monitor pass.
3. `hydradb-context-mcp` MUST remain the only shared recall surface. It exposes read-only `context_recall`.
4. `hydradb-memory` MAY be enabled only in local operator Hub state for ingestion, diagnostics, deletion, and low-level recovery. It MUST NOT be enabled in shared Hub state or broad agent lanes.
5. Hydra DB API keys MUST stay in Infisical under `/mcp-hub/hydradb`.
6. The exposed initial Hydra DB key MAY remain in use for the internal pilot only. It MUST be rotated before customer-facing use, external demonstrations with customer data, or broader production rollout.
7. All approved ingestion scripts MUST store with `infer=false`, stable `source_id` values, source-backed metadata, and secret-pattern guards.
8. Sync jobs MUST be idempotent and safe to rerun. Re-ingestion of the same source ID is allowed to refresh the recall index.
9. Production monitoring MUST check recall result count, latency, and sub-tenant isolation before relying on Hydra DB in agent workflows.
10. Empty recall, latency threshold breach, or failed sub-tenant rejection MUST block promotion and require investigation.
11. Hydra DB recall output MUST be treated as advisory. Agents MUST verify recalled context against repo files, Linear, Infisical, and current policy artifacts before acting.
12. Deletion or retention exceptions MUST be recorded in Linear with source IDs, sub-tenant IDs, operator, date, and reason.

## Approved Sub-Tenants

| Sub-tenant            | Allowed content                              | Source of truth                     | Retention rule                                                                   |
| --------------------- | -------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| `cs-internal-context` | internal policy docs and architecture docs   | git                                 | retain while source file exists and remains approved; resync at least weekly     |
| `cs-linear-evidence`  | sanitized completed Linear delivery evidence | Linear                              | retain for 18 months unless issue is reopened, sensitive, or superseded          |
| `cs-mcp-catalog`      | sanitized MCP registry summaries             | `config/mcp-hub/registry.core.json` | retain while registry entry exists; remove or supersede within 7 days of removal |

Future `client-<slug>-context` sub-tenants require explicit approval, separate retention rules, and key rotation before ingestion.

## Sync Rules

Required command for normal internal sync:

```bash
pnpm hydradb:sync:infisical
```

The sync must run these lanes:

1. `cs-internal-context`: `pnpm hydradb:pilot -- seed-eval --all-policies --mcp-creation`
2. `cs-linear-evidence`: `pnpm hydradb:linear-evidence -- seed-eval --label code-quality --limit 20`
3. `cs-mcp-catalog`: `pnpm hydradb:mcp-catalog -- seed-eval --include-dormant --include-local`
4. monitor: `pnpm hydradb:production-monitor`

Recommended cadence:

- policy/docs: weekly and after policy changes
- Linear evidence: daily on weekdays, or after delivery batches
- MCP catalog: after registry changes and weekly
- production monitor: after each sync and before agent workflows that depend on Hydra recall

## Monitoring Thresholds

Default monitor thresholds:

- every approved lane returns at least 1 result for its fixed probe query
- each recall finishes within 15 seconds
- disallowed sub-tenant `client-not-allowlisted-context` is rejected before a network call

Failures require either:

- rerun after transient provider outage
- sync repair
- sub-tenant allowlist review
- disabling `hydradb-context-mcp` from operator state until fixed

## Deletion Rules

Delete or supersede Hydra DB entries when:

- a source file is removed from git
- a Linear issue is reopened and the evidence is no longer final
- a registry entry is removed or renamed
- an ingested document is discovered to contain credentials, customer data, PHI, payment data, or sensitive incident details
- a client or project retention period expires

The upstream `hydradb-memory` MCP server is the approved deletion surface, but only from a local operator lane. Deletion must not be exposed through shared Hub routing.

## Evidence

Every production or operator enablement pass must record:

- Linear issue ID
- commit SHA
- Hydra sub-tenants touched
- sync command and lane selection
- monitor result counts and latency summary
- whether `hydradb-memory` remained limited to local operator state
- rollback note

## Rollback

1. Disable `hydradb-context-mcp` in local/operator Hub state.
2. Disable `hydradb-memory` outside local operator diagnostics and deletion workflows.
3. Remove or revoke `HYDRA_DB_API_KEY` from Infisical if data sensitivity is in question.
4. Record the rollback and reason in Linear.

## Source Anchors

- `docs/guides/HYDRADB_CONTEXT_MEMORY_PILOT.md`
- `packages/hydradb-context-mcp`
- `scripts/hydradb-sync.ts`
- `scripts/hydradb-production-monitor.ts`
- `scripts/hydradb-operator-gate.ts`
- `config/mcp-hub/registry.core.json`
