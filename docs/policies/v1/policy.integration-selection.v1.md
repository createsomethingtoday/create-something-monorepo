# policy.integration-selection.v1

- Status: `draft`
- Owner: `CREATE SOMETHING integration architecture`
- Effective date: `TBD`

## Purpose

Standardize the owned MCP default, the temporary preservation of existing
Composio-backed connectivity, and the approval boundary for exceptions.

## Scope

- New integration planning and design reviews
- Multi-tenant default integrations
- Strategic client-specific integrations
- Scheduled or recurring sync jobs that move content across workspace boundaries

## Policy Statements

1. New app connectivity MUST default to an owned CREATE SOMETHING MCP contract.
2. Existing Composio-backed production paths MAY remain while each path is
   audited and a replacement or intentional retirement is verified.
3. New Composio usage MUST be treated as an exception with explicit rationale,
   approving operator, approval date, and Linear issue.
4. Deep or client-specific integrations MUST use custom MCP implementations.
5. Approved Composio usage MUST remain implementation plumbing; client-facing delivery remains CREATE SOMETHING MCP.
6. Commercial packaging MUST remain aligned:
   - `MCP-only` as discovery/compliance wedge
   - `Policy OS` as default paid delivery
7. Integration selection compliance alone is insufficient for catalog exposure; any broad or variable connector surface MUST also comply with the MCP catalog exposure policy.
8. Broad multi-provider or large-catalog connector surfaces MUST default to Hub-brokered discovery rather than eager direct registration.
9. Direct exposure of provider-branded commodity MCP surfaces MUST be treated as an exception path with explicit rationale, approving owner, and sunset or review criteria.
10. New integration proposals MUST record both:
   - packaging choice (`wrapped`, `custom`, or exception `direct`)
   - catalog exposure mode (`direct`, `brokered`, or approved exception)
11. Scheduled or recurring cross-workspace syncs that read internal or partner-managed data and write into a client-owned system MUST use a custom Worker, Queue, or Workflow control plane rather than exposing a broad provider write surface directly to the client.

## Enforcement Surfaces

- Architecture review checklists
- Integration design docs
- Hub/server registration metadata
- MCP registry validation for large-catalog surfaces
- catalog exposure and exception review for Composio-backed surfaces
- async job design review for Worker, Queue, or Workflow-based syncs

## Evidence

- Integration decision records with rationale
- Exception approvals, dates, and Linear issue identifiers
- documented packaging and catalog-exposure mode for each new MCP surface

## Source Anchors

- `docs/COMPOSIO_PATTERNS.md`
- `docs/MCP_CATALOG_EXPOSURE_POLICY.md`
- `docs/policies/v1/policy.cross-workspace-sync-governance.v1.md`
- `packages/composio-bridge/`
