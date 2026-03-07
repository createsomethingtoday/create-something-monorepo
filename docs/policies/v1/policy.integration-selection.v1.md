# policy.integration-selection.v1

- Status: `draft`
- Owner: `CREATE SOMETHING integration architecture`
- Effective date: `TBD`

## Purpose

Standardize when to use Composio-based connectivity versus custom MCP integrations.

## Scope

- New integration planning and design reviews
- Multi-tenant default integrations
- Strategic client-specific integrations

## Policy Statements

1. Commodity app connectivity SHOULD default to Composio via `@create-something/composio-bridge`.
2. Deep or client-specific integrations MUST use custom MCP implementations.
3. Any exception to default strategy MUST include explicit rationale and approving owner.
4. Composio usage MUST remain implementation plumbing; client-facing delivery remains CREATE SOMETHING MCP.
5. Commercial packaging MUST remain aligned:
   - `MCP-only` as discovery/compliance wedge
   - `Agent Outcome Stack` as default paid delivery
6. Integration selection compliance alone is insufficient for catalog exposure; any broad or variable connector surface MUST also comply with the MCP catalog exposure policy.
7. Broad multi-provider or large-catalog connector surfaces MUST default to Hub-brokered discovery rather than eager direct registration.
8. Direct exposure of provider-branded commodity MCP surfaces MUST be treated as an exception path with explicit rationale, approving owner, and sunset or review criteria.
9. New integration proposals MUST record both:
   - packaging choice (`wrapped`, `custom`, or exception `direct`)
   - catalog exposure mode (`direct`, `brokered`, or approved exception)

## Enforcement Surfaces

- Architecture review checklists
- Integration design docs
- Hub/server registration metadata
- MCP registry validation for large-catalog surfaces
- catalog exposure review for Composio-backed surfaces

## Evidence

- Integration decision records with rationale
- Exception approvals and dates
- documented packaging and catalog-exposure mode for each new MCP surface

## Source Anchors

- `docs/COMPOSIO_PATTERNS.md`
- `docs/MCP_CATALOG_EXPOSURE_POLICY.md`
- `packages/composio-bridge/`
