---
name: mcp-fleet
description: MCP fleet registry, deployment patterns, scaffold commands, and the Three-Tier Framework. Use when creating, deploying, or debugging any MCP server in this monorepo.
---

# MCP Fleet

Domain knowledge for the CREATE SOMETHING MCP fleet. Load this skill when working on MCP servers.

## Full References

For complete details, read the source docs:

| Topic | Document |
|-------|----------|
| Fleet registry (all servers) | `docs/MCP_FLEET_REGISTRY.md` |
| Scaffold / create new MCP | `docs/MCP_SCAFFOLD.md` |
| Three-Tier Framework | `docs/THREE_TIER_FRAMEWORK.md` |
| MCP Hub control plane | `docs/MCP_HUB_CONTROL_PLANE.md` |
| Remote MCP identity | `docs/REMOTE_MCP_IDENTITY_STANDARD.md` |
| Hub deploy runbook | `docs/MCP_HUB_REMOTE_DEPLOY.md` |
| Agent legibility contract | `docs/guides/AGENT_LEGIBILITY_CONTRACT.md` |
| MCP implementation patterns | `docs/MCP_IMPLEMENTATION_COMPARISON_2026-03-07.md` |
| Telemetry setup | `docs/guides/OBSERVABILITY_SETUP.md` |

## The Three-Tier Framework (Core Mental Model)

Everything maps to three tiers via MCP's three primitives:

| Tier | What | MCP Primitive | Control Model |
|------|------|---------------|---------------|
| **Database** | What exists (state, records) | Resources | Application-controlled |
| **Automation** | What happens (tools, skills) | Tools | Model-controlled |
| **Judgment** | What should happen (policy) | Prompts | User-controlled |

**Debug order**: Database → Automation → Judgment

**The recursive property**: MCP sampling lets Automation request Judgment (feedback loop).

**Policy as artifact**: Constraints flow through all tiers — stored in Database, transformed by Automation, evaluated by Judgment.

## Fleet Topology

Two Cloudflare accounts:

| Account | MCPs | Telemetry DB |
|---------|------|-------------|
| **WORKWAY** | Half Dozen cluster (15 servers) | `halfdozen-feedback` |
| **CREATE SOMETHING** | Everything else (12+ servers) | `cs-telemetry` |

### Key Active Servers

| Server | URL | Client |
|--------|-----|--------|
| Notion (per-client) | `{client}-notion.mcp.workway.co` | Half Dozen clients |
| Gmail Sync | `gmail.mcp.workway.co` | Half Dozen |
| YouTube Sync | `youtube.mcp.workway.co` | Half Dozen |
| Zoom Sync | `zoom.mcp.workway.co` | Half Dozen |
| Schedule MCP | `schedule.mcp.createsomething.agency` | CREATE SOMETHING |
| Substrate MCP | `substrate.mcp.createsomething.agency` | CREATE SOMETHING |
| Framework MCP | `framework.mcp.createsomething.agency` | CREATE SOMETHING |
| Playbook MCP | `playbook.mcp.createsomething.ltd` | CREATE SOMETHING |

## Creating a New MCP

```bash
pnpm create-mcp <name> [--profile generic|content|operational] [--dry-run]
```

### Required Structure

```
packages/{name}/
├── src/
│   ├── resources.ts        # Database tier (MCP Resources)
│   ├── tools.ts            # Automation tier (MCP Tools)
│   └── prompts.ts          # Judgment tier (MCP Prompts)
└── worker/
    ├── index.ts            # McpAgent DO + Worker entry point
    ├── package.json
    └── wrangler.toml       # CF config (D1, KV, DO, routes)
```

### Required Telemetry Binding

```toml
[[d1_databases]]
binding = "TELEMETRY_DB"
database_name = "cs-telemetry"   # or "halfdozen-feedback"
database_id = "f710641a-0c85-4a7b-bb73-2c16f8d024c3"
```

### Deploy

```bash
cd packages/{name}/worker
wrangler deploy
```

## Agent Legibility Contract

Every package an agent works on should document:

1. **Entry point** — what file to read first
2. **Boot command** — `pnpm dev`, `pnpm --filter <pkg> dev`
3. **Smoke path** — minimal validation command
4. **Evidence surface** — how to verify it works
5. **Escalation rule** — when to stop and ask

## Naming Inconsistency

Half Dozen MCPs: `halfdozen-` (no dash) except YouTube which uses `half-dozen-` (with dash). Known issue, preserved for compatibility.
