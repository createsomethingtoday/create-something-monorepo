# MCP Fleet Registry

> The fleet inventory for CREATE SOMETHING delivery lanes, platform MCPs, and legacy WORKWAY backend services.
> Updated: March 2026

## Fleet Overview

Two Cloudflare accounts host the fleet:

| Account | ID | MCPs | Telemetry DB |
|---------|-----|------|-------------|
| **CREATE SOMETHING** | `9645bd52e640b8a4f40a3a55ff1dd75a` | Half Dozen delivery lanes + platform MCPs | `cs-telemetry` |
| **WORKWAY** | `5c3e9cf4d55ce171b844fad0931607f9` | Legacy Half Dozen backend workers | `halfdozen-feedback` |

## Status Legend

| Status | Meaning |
|--------|---------|
| **Active** | Deployed, serving traffic, telemetry enabled |
| **Active (unmetered)** | Deployed but no telemetry yet |
| **Planned** | Config committed; not yet deployed |
| **Dormant** | Exists but incomplete or unused |
| **Local** | Stdio/local server, not a Cloudflare Worker |

---

## CREATE SOMETHING Account — Half Dozen Delivery Lanes

Half Dozen delivery is now routed through named CREATE SOMETHING hub lanes plus team-specific CREATE SOMETHING Notion bridges. These are the canonical customer-facing endpoints.

| # | Surface | Status | URL | Auth | Telemetry |
|---|---------|--------|-----|------|-----------|
| 1 | `Lainy` hub lane | Active | `lainy.mcp.createsomething.agency` | Bearer | `cs-telemetry` |
| 2 | `Danny` hub lane | Active | `danny.mcp.createsomething.agency` | Bearer | `cs-telemetry` |
| 3 | `August` hub lane | Active | `august.mcp.createsomething.agency` | Bearer | `cs-telemetry` |
| 4 | `Fillip` hub lane | Active | `fillip.mcp.createsomething.agency` | Bearer | `cs-telemetry` |
| 5 | `Leah` hub lane | Active | `leah.mcp.createsomething.agency` | Bearer | `cs-telemetry` |
| 6 | `MJ` hub lane | Active | `mj.mcp.createsomething.agency` | Bearer | `cs-telemetry` |
| 7 | `Lainy` Notion bridge | Active | `lainy-notion.mcp.createsomething.agency` | Basic Auth | `cs-telemetry` |
| 8 | `Danny` Notion bridge | Active | `danny-notion.mcp.createsomething.agency` | Basic Auth | `cs-telemetry` |
| 9 | `August` Notion bridge | Active | `august-notion.mcp.createsomething.agency` | Basic Auth | `cs-telemetry` |
| 10 | `Fillip` Notion bridge | Active | `fillip-notion.mcp.createsomething.agency` | Basic Auth | `cs-telemetry` |
| 11 | `Leah` Notion bridge | Active | `leah-notion.mcp.createsomething.agency` | Basic Auth | `cs-telemetry` |
| 12 | `MJ` Notion bridge | Active | `mj-notion.mcp.createsomething.agency` | Basic Auth | `cs-telemetry` |

---

## CREATE SOMETHING Account — Platform MCPs

Active platform MCPs use `cs-telemetry` D1 for telemetry. Fleet-wide queries via the **CS Telemetry MCP**.

| # | Package | Server Name | Status | URL | Telemetry | D1 |
|---|---------|-------------|--------|-----|-----------|-----|
| 13 | `cs-mcp-hub-remote` | `cs-mcp-hub-remote` | Active | `cs-mcp-hub-remote.createsomething.workers.dev` | Yes | `cs-telemetry` |
| 14 | `schedule-mcp` | `schedule-mcp` | Active | `schedule.mcp.createsomething.agency` | Yes | `schedule-mcp-db` + `cs-telemetry` |
| 15 | `substrate-mcp` | `substrate-mcp` | Active | `substrate.mcp.createsomething.agency` | Yes | `substrate-mcp-db` + `cs-telemetry` |
| 16 | `create-something-mcp` | `create-something` | Active | `mcp.createsomething.ltd` | Yes | `cs-telemetry` |
| 17 | `three-tier-framework-mcp` | `three-tier-framework` | Active | `framework.mcp.createsomething.agency` | Yes | `cs-telemetry` |
| 18 | `playbook-mcp` | `playbook` | Active | `playbook.mcp.createsomething.ltd` | Yes | `cs-telemetry` |
| 19 | `outerfields-mcp-remote` | `outerfields-pcn` | Active | `outerfields.mcp.createsomething.agency` | Yes | `cs-telemetry` |
| 20 | `cs-telemetry-mcp` | `cs-telemetry` | Active | `cs-telemetry-mcp.createsomething.workers.dev` | — (reads telemetry) | `cs-telemetry` |
| 21 | `webflow-app-review-mcp` | `webflow-app-review-mcp` | Active | `webflow-app-review-mcp.createsomething.workers.dev` | Yes | `cs-telemetry` |
| 22 | `webflow-template-review-mcp` | `webflow-template-review-mcp` | Active | `webflow-template-review-mcp.createsomething.workers.dev` | Yes | `cs-telemetry` |

---

## WORKWAY Account — Legacy Half Dozen Backends

These legacy specialized workers remain documented for compatibility and backend context. They are no longer the canonical `.agency` delivery surface.

| # | Package | Server Name | Status | URL | Telemetry |
|---|---------|-------------|--------|-----|-----------|
| 23 | `halfdozen-notion-mcp` | `notion-halfdozen-create-something` | Active (legacy backend) | `createsomething-notion.mcp.workway.co` | Yes |
| 24 | `halfdozen-notion-mcp` (System Studio) | `notion-halfdozen-create-something` | Active (legacy backend) | `system-studio-notion.mcp.workway.co` | Yes |
| 25 | `halfdozen-notion-mcp` (BLOND:ISH) | `notion-halfdozen-create-something` | Active (legacy backend) | `blondish-notion.mcp.workway.co` | Yes |
| 26 | `halfdozen-notion-mcp` (C3 Management) | `notion-halfdozen-create-something` | Active (legacy backend) | `c3-management-notion.mcp.workway.co` | Yes |
| 27 | `halfdozen-notion-mcp` (Cracked) | `notion-halfdozen-create-something` | Active (legacy backend) | `cracked-notion.mcp.workway.co` | Yes |
| 28 | `halfdozen-notion-mcp` (Fanpad) | `notion-halfdozen-create-something` | Active (legacy backend) | `fanpad-notion.mcp.workway.co` | Yes |
| 29 | `halfdozen-notion-mcp` (Lightswitch) | `notion-halfdozen-create-something` | Active (legacy backend) | `lightswitch-notion.mcp.workway.co` | Yes |
| 30 | `halfdozen-notion-mcp` (Phase 3) | `notion-halfdozen-create-something` | Active (legacy backend) | `phase-3-notion.mcp.workway.co` | Yes |
| 31 | `halfdozen-notion-mcp` (Three Six Zero) | `notion-halfdozen-create-something` | Active (legacy backend) | `three-six-zero-notion.mcp.workway.co` | Yes |
| 32 | `halfdozen-notion-mcp` (Juice Labs) | `notion-halfdozen-create-something` | Active (legacy backend) | `juice-labs-notion.mcp.workway.co` | Yes |
| 33 | `halfdozen-notion-mcp` (KK Management) | `notion-halfdozen-create-something` | Active (legacy backend) | `kk-management-notion.mcp.workway.co` | Yes |
| 34 | `halfdozen-gmail-sync` | `halfdozen-gmail-sync` | Active (legacy backend) | `gmail.mcp.workway.co` | Yes |
| 35 | `halfdozen-zoom-sync` | `halfdozen-zoom-sync` | Active (legacy backend) | `zoom.mcp.workway.co` | Yes |
| 36 | `half-dozen-youtube-sync` | `half-dozen-youtube-sync` | Active (legacy backend) | `youtube.mcp.workway.co` | Yes |
| 37 | `halfdozen-telemetry-mcp` | `halfdozen-telemetry` | Active (legacy backend) | `halfdozen-telemetry-mcp.half-dozen.workers.dev` | — (reads telemetry) |

### Naming Note

The YouTube MCP uses `half-dozen-` (with dash) while others use `halfdozen-` (no dash). This remains a legacy naming inconsistency.

---

## Dormant / Prototype

| # | Package | Status | Notes |
|---|---------|--------|-------|
| 38 | `gmail-notion-mcp` | Dormant | Placeholder D1 ID (`00000000...`), Composio bridge experiment |
| 39 | `notion-sync-mcp` | Dormant | Superseded by `halfdozen-notion-mcp`, uses mcp-core |

---

## Local / Stdio Servers

Not deployed to Cloudflare. Run locally via stdio transport.

| # | Package | Server Name | Notes |
|---|---------|-------------|-------|
| 40 | `quickbooks-notion-mcp` | `quickbooks-notion-mcp-server` | Node.js HTTP/stdio, KV for tokens |
| 41 | `webflow-site-analyzer-mcp` | `webflow-site-analyzer-mcp` | Node.js stdio (package also supports Streamable HTTP, but no live remote deployment yet) |
| 42 | `outerfields-mcp-server` | `outerfields-pcn` | Stdio companion to remote Worker |

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
database_name = "cs-telemetry"          # or "halfdozen-feedback" for legacy WORKWAY backends
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
                    │         CS Telemetry MCP (canonical)      │
                    │                                          │
                    │  cs-telemetry D1 + optional cross-account │
                    │  read into legacy WORKWAY telemetry       │
                    └─────────────┬────────────────────────────┘
                                  │
              ┌───────────────────┴────────────────────┐
              │                                        │
      CREATE SOMETHING delivery lanes          Legacy WORKWAY backends
      + platform MCPs                          (halfdozen-feedback D1)
```

Half Dozen delivery lanes and CREATE SOMETHING platform MCPs write to `cs-telemetry`. Legacy WORKWAY workers continue to write to `halfdozen-feedback` until they are fully retired.

---

## Cursor MCP Config

All active MCPs should be in `~/.cursor/mcp.json`. See the config file for current state.

## Adding a New MCP

Use the scaffold: `docs/MCP_SCAFFOLD.md`
