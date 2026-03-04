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

## Enforcement Surfaces

- Architecture review checklists
- Integration design docs
- Hub/server registration metadata

## Evidence

- Integration decision records with rationale
- Exception approvals and dates

## Source Anchors

- `docs/COMPOSIO_PATTERNS.md`
- `packages/composio-bridge/`
