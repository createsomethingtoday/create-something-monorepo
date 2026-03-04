# policy.global-access-kill-switch.v1

- Status: `draft`
- Owner: `CREATE SOMETHING incident commander`
- Effective date: `TBD`

## Purpose

Define emergency and containment controls for global MCP tool exposure.

## Scope

- Runtime access mode control via `MCP_TOOL_ACCESS_MODE`
- Incident response mode transitions
- Recovery and normalization criteria

## Policy Statements

1. Global access mode MUST support `normal`, `read_only`, and `off`.
2. Incident responders MUST use kill-switch controls before deeper policy surgery.
3. `off` MUST be reserved for severe incidents requiring full containment.
4. `read_only` MUST be the default containment mode when safe read visibility is needed.
5. Return to `normal` MUST require explicit incident resolution notes and owner sign-off.

## Enforcement Surfaces

- Worker runtime metadata and secrets
- Security status tooling and operational runbooks

## Evidence

- Mode change timeline with actor and reason
- Linked incident IDs and closure records

## Source Anchors

- `docs/STRATEGIC_MCP_SECURITY_POLICY_2026-02-27.md`
- `packages/interaction-atlas-mcp/src/auth.ts`
- `packages/interaction-atlas-mcp/src/storage/security.ts`
