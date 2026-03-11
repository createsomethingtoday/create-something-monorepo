# policy.cross-workspace-sync-governance.v1

- Status: `draft`
- Owner: `CREATE SOMETHING product + broker operations + partner operations`
- Effective date: `TBD`

## Purpose

Define how CREATE SOMETHING may run background jobs that read internal or partner-managed source systems and write approved content into client-managed destination systems.

## Scope

- scheduled Workers, Queues, and Workflows used for recurring sync jobs
- source-to-destination content projection across workspace or tenant boundaries
- client-specific write jobs such as meeting-transcript sync into client Notion
- sync ledgers, idempotency records, retries, and replay controls
- operator-managed runtime credentials and pinned toolkit accounts

## Policy Statements

1. Cross-workspace sync MUST run through a dedicated job surface, not through broad interactive provider write catalogs.
2. Each governed sync MUST define and persist:
   - source system
   - destination system
   - allowed record class
   - allowed field or content classes
   - approved runtime connection refs and destination identifiers such as pinned toolkit account refs, database, data source, page, or bucket IDs
3. Operator-managed runtime credentials or pinned toolkit accounts MUST be used for unattended sync execution. Personal end-user bearer tokens MUST NOT be reused as background runtime credentials.
4. Autonomous cross-workspace write sync is a paid governed capability and MUST NOT run under `mcp_only` access unless an explicit approved exception says otherwise.
5. Each sync job MUST maintain an auditable ledger with source identifier, destination identifier, content hash or version marker, attempt count, last status, last error, and timestamps for first and last sync.
6. Schema-target changes, destination-ID changes, or field-mapping changes MUST require human review before rollout.
7. Full transcript or long-form content MAY be written to a client destination only when contract, consent, and approved target scope allow that content class.
8. Jobs that write to Notion MUST respect the official Notion API content limits and use chunking and batched appends rather than assuming one field or one block can hold the full transcript.
9. Background sync jobs MUST support deterministic replay, bounded retry behavior, and dead-letter or equivalent operator recovery paths.
10. Customer-facing product surfaces SHOULD expose sync status, error state, and replay request flows without exposing raw provider credentials or generic mutable tool catalogs.

## Enforcement Surfaces

- Cloudflare runtime packages for scheduled or asynchronous sync jobs
- job-trigger, job-status, and replay APIs
- sync ledger tables in D1 or equivalent approved state store
- partner toolkit account pinning and runtime secret management
- service-tier entitlement and route-authorization checks for job trigger or replay surfaces

## Evidence

- per-job ledger rows with source and destination identifiers
- retry and dead-letter records
- human-review traces for mapping or target changes
- entitlement and consent records authorizing the sync
- audit records tying runtime identity, pinned account, and workflow execution together

## Source Anchors

- `docs/THREE_TIER_FRAMEWORK.md`
- `docs/MCP_IMPLEMENTATION_COMPARISON_2026-03-07.md`
- `docs/policies/v1/policy.integration-selection.v1.md`
- `docs/policies/v1/policy.partner-auth-governance.v1.md`
- `docs/policies/v1/policy.service-tier-entitlement.v1.md`
- `packages/meetings/src/index.ts`
- `packages/halfdozen-zoom-sync/src/lib/notion.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/+server.ts`
