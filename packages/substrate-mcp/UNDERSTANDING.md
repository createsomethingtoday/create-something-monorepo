# Understanding: @create-something/substrate-mcp

> **The agent-native data layer that exposes workspaces, records, files, and audit state through MCP plus a trust-oriented dashboard.**

## Ontological Position

**Mode of Being**: Operational MCP package

This package makes a live shared workspace system operable through MCP. Its core burden is not only CRUD, but preserving trust: agent actions, dashboard state, auth scope, audit log, and file storage all need to line up so operators can verify what happened.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| D1 | Primary structured data store for workspaces, tables, records, auth, and audit state |
| R2 | File storage for uploaded workspace artifacts |
| `@create-something/mcp-core` | Shared MCP primitives and runtime wiring |
| Cloudflare bindings and secrets | Required for Worker/runtime parity and remote auth flows |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| operators | How workspace state is stored, scoped, and audited |
| MCP clients | Which data-plane operations are safe and role-gated |
| stakeholders | How the dashboard reflects the live underlying state |

## Internal Structure

```text
src/
├── index.ts                  → stdio server entry point
├── tools/                    → workspace, record, relation, file, and auth operations
├── resources/                → workspace, table, relation, file, and audit resources
├── prompts/                  → workspace setup, modeling, role, and audit prompts
└── ...                       → schemas and runtime support

worker/
├── ...                       → remote runtime and Cloudflare configuration
```

## To Understand This Package, Read

1. **`README.md`** — operational model, dashboard, auth, and exposed primitives
2. **`src/index.ts`** — stdio server boot path
3. **dashboard routes/templates in the Worker runtime** — trust surface for state verification
4. **tool and resource handlers** — how CRUD and audit views map to live state

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `UNDERSTANDING.md`, `src/index.ts` |
| Boot command | `pnpm --filter=substrate-mcp dev` for local iteration, or `pnpm --filter=substrate-mcp build && pnpm --filter=substrate-mcp start` for the compiled stdio server |
| Smoke command | `pnpm --filter=substrate-mcp typecheck && pnpm --filter=substrate-mcp build` |
| Validation surfaces | typecheck output, stdio startup, role-gated tool responses, dashboard views, audit log rows, file metadata, health/runtime logs |
| UI validation path | `/dashboard` or `/dashboard/{workspace_id}` |
| Escalation rule | Stop if tool responses and dashboard/audit state diverge, or if the required auth, D1, or R2 bindings are unavailable in the current environment. |

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| workspace | top-level tenant/project container | README workspace sections and workspace tools |
| dashboard | read-only trust surface for current state | README dashboard sections |
| scoped token | bearer credential restricted by role and optional workspace IDs | README auth sections |
| audit trail | append-only mutation visibility layer | audit resources and auth/tool logging |

## This Package Helps You Understand

- how a live shared system can be exposed to agents without losing trust
- where auth scope and audit data enter the MCP execution path
- how to verify operational state through both tool output and dashboard state

## Common Tasks

| Task | Start Here |
|------|------------|
| inspect auth and role model | `README.md` authentication sections |
| inspect live runtime entrypoint | `src/index.ts` |
| verify trust surfaces | dashboard routes and audit resources |
| extend operational surface | tool/resource handlers |

---

*Last validated: 2026-03-09*
