# MCP Fleet Registry

> The fleet inventory for all CREATE SOMETHING and WORKWAY MCP servers.
> Updated: February 2026

## Fleet Overview

Two Cloudflare accounts host the fleet:

| Account | ID | MCPs | Telemetry DB |
|---------|-----|------|-------------|
| **WORKWAY** | `5c3e9cf4d55ce171b844fad0931607f9` | Half Dozen cluster | `halfdozen-feedback` |
| **CREATE SOMETHING** | `9645bd52e640b8a4f40a3a55ff1dd75a` | Everything else | `cs-telemetry` |

## Status Legend

| Status | Meaning |
|--------|---------|
| **Active** | Deployed, serving traffic, telemetry enabled |
| **Active (unmetered)** | Deployed but no telemetry yet |
| **Dormant** | Exists but incomplete or unused |
| **Local** | Stdio/local server, not a Cloudflare Worker |

---

## WORKWAY Account — Half Dozen Cluster

All Half Dozen MCPs share `halfdozen-feedback` D1 for telemetry. Fleet-wide queries via the **Telemetry MCP**.

| # | Package | Server Name | Status | URL | Telemetry |
|---|---------|-------------|--------|-----|-----------|
| 1 | `halfdozen-notion-mcp` | `notion-halfdozen-create-something` | Active | `createsomething-notion.mcp.workway.co` | Yes |
| 2 | `halfdozen-notion-mcp` (System Studio) | `notion-halfdozen-create-something` | Active | `system-studio-notion.mcp.workway.co` | Yes |
| 3 | `halfdozen-gmail-sync` | `halfdozen-gmail-sync` | Active | `gmail.mcp.workway.co` | Yes |
| 4 | `halfdozen-zoom-sync` | `halfdozen-zoom-sync` | Active | `zoom.mcp.workway.co` | Yes |
| 5 | `half-dozen-youtube-sync` | `half-dozen-youtube-sync` | Active | `youtube.mcp.workway.co` | Yes |
| 6 | `halfdozen-telemetry-mcp` | `halfdozen-telemetry` | Active | `halfdozen-telemetry-mcp.half-dozen.workers.dev` | — (reads telemetry) |

### Naming Note

The YouTube MCP uses `half-dozen-` (with dash) while others use `halfdozen-` (no dash). This is a known inconsistency.

---

## CREATE SOMETHING Account

Active MCPs use `cs-telemetry` D1 for telemetry. Fleet-wide queries via the **CS Telemetry MCP**.

| # | Package | Server Name | Status | URL | Telemetry | D1 |
|---|---------|-------------|--------|-----|-----------|-----|
| 7 | `schedule-mcp` | `schedule-mcp` | Active | `schedule.mcp.createsomething.agency` | Yes | `schedule-mcp-db` + `cs-telemetry` |
| 8 | `substrate-mcp` | `substrate-mcp` | Active | `substrate.mcp.createsomething.agency` | Yes | `substrate-mcp-db` + `cs-telemetry` |
| 9 | `create-something-mcp` | `create-something` | Active | `mcp.createsomething.ltd` | Yes | `cs-telemetry` |
| 10 | `three-tier-framework-mcp` | `three-tier-framework` | Active | `framework.mcp.createsomething.agency` | Yes | `cs-telemetry` |
| 11 | `playbook-mcp` | `playbook` | Active | `playbook.mcp.createsomething.ltd` | Yes | `cs-telemetry` |
| 12 | `outerfields-mcp-remote` | `outerfields-pcn` | Active | `outerfields.mcp.createsomething.agency` | Yes | `cs-telemetry` |
| 13 | `cs-telemetry-mcp` | `cs-telemetry` | Active | `cs-telemetry-mcp.createsomething.workers.dev` | — (reads telemetry) | `cs-telemetry` |

---

## Dormant / Prototype

| # | Package | Status | Notes |
|---|---------|--------|-------|
| 14 | `gmail-notion-mcp` | Dormant | Placeholder D1 ID (`00000000...`), Composio bridge experiment |
| 15 | `notion-sync-mcp` | Dormant | Superseded by `halfdozen-notion-mcp`, uses mcp-core |

---

## Local / Stdio Servers

Not deployed to Cloudflare. Run locally via stdio transport.

| # | Package | Server Name | Notes |
|---|---------|-------------|-------|
| 16 | `quickbooks-notion-mcp` | `quickbooks-notion-mcp-server` | Node.js HTTP/stdio, KV for tokens |
| 17 | `webflow-site-analyzer-mcp` | `webflow-site-analyzer-mcp` | Node.js stdio |
| 18 | `outerfields-mcp-server` | `outerfields-pcn` | Stdio companion to remote Worker |

---

## Architecture Pattern

Every Worker-based MCP follows this structure:

```
packages/{name}/
├── src/                    # Business logic (resources, tools, prompts)
│   ├── resources.ts        # Database tier (MCP Resources)
│   ├── tools.ts            # Automation tier (MCP Tools)
│   └── prompts.ts          # Judgment tier (MCP Prompts)
└── worker/
    ├── index.ts            # McpAgent DO + Worker entry point
    ├── package.json        # Worker-specific deps (mcp-core, agents, zod)
    └── wrangler.toml       # CF config (D1, KV, DO, routes)
```

### Required Bindings (for telemetry)

```toml
# In wrangler.toml — add alongside any existing D1 bindings
[[d1_databases]]
binding = "TELEMETRY_DB"
database_name = "cs-telemetry"          # or "halfdozen-feedback" for WORKWAY
database_id = "f710641a-0c85-4a7b-bb73-2c16f8d024c3"  # or halfdozen ID
```

### Telemetry Integration

```typescript
import { enableTelemetry } from '@create-something/mcp-core';

async init() {
  // Must be called BEFORE registering tools
  if (this.env.TELEMETRY_DB) {
    enableTelemetry(this.server, this.env.TELEMETRY_DB, SERVER_NAME);
  }
  // ... register resources, tools, prompts
}
```

---

## Telemetry Architecture

```
                    ┌──────────────────────────────────────────┐
                    │           Cursor / Claude Desktop         │
                    │                                          │
                    │  "How are my MCPs doing?"                │
                    └─────────────┬────────────────────────────┘
                                  │
                    ┌─────────────┴────────────────────────────┐
                    │                                          │
           ┌────────┴────────┐                    ┌────────────┴───────┐
           │ HD Telemetry MCP│                    │ CS Telemetry MCP   │
           │ (WORKWAY acct)  │                    │ (CS acct)          │
           └────────┬────────┘                    └────────────┬───────┘
                    │                                          │
           ┌────────┴────────┐                    ┌────────────┴───────┐
           │ halfdozen-      │                    │ cs-telemetry D1    │
           │ feedback D1     │                    │                    │
           └────────┬────────┘                    └────────────┬───────┘
                    │                                          │
        ┌───────────┼──────────┐              ┌────────┬───────┼──────────┐
        │           │          │              │        │       │          │
    Notion MCP  Gmail MCP  Zoom MCP    Schedule  Substrate  CS-MCP  Framework
    YouTube MCP                        Playbook  Outerfields
```

Each MCP writes to its account's shared telemetry D1. Each account has a telemetry MCP for fleet-wide queries.

---

## Cursor MCP Config

All active MCPs should be in `~/.cursor/mcp.json`. See the config file for current state.

## Adding a New MCP

Use the scaffold: `docs/MCP_SCAFFOLD.md`
