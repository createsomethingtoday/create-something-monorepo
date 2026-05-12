---
name: halfdozen-fleet
description: Half Dozen MCP fleet — client Notion MCPs, Gmail/Zoom/YouTube sync, telemetry queries, and deployment patterns for music management agent workflows.
---

# Half Dozen Fleet

Domain knowledge for the Half Dozen MCP cluster serving music management clients.

## Fleet Overview

All Half Dozen MCPs run on the **WORKWAY** Cloudflare account and share `halfdozen-feedback` D1 for telemetry.

## Client Notion MCPs

All served by `halfdozen-notion-mcp` with per-client routing:

| # | Client | URL | Status |
|---|--------|-----|--------|
| 1 | CREATE SOMETHING | `createsomething-notion.mcp.workway.co` | Active |
| 2 | System Studio | `system-studio-notion.mcp.workway.co` | Active |
| 3 | BLOND:ISH | `blondish-notion.mcp.workway.co` | Active |
| 4 | C3 Management | `c3-management-notion.mcp.workway.co` | Active |
| 5 | Cracked | `cracked-notion.mcp.workway.co` | Active |
| 6 | Fanpad | `fanpad-notion.mcp.workway.co` | Active |
| 7 | Lightswitch | `lightswitch-notion.mcp.workway.co` | Active |
| 8 | Phase 3 | `phase-3-notion.mcp.workway.co` | Active |
| 9 | Three Six Zero | `three-six-zero-notion.mcp.workway.co` | Active |
| 10 | Juice Labs | `juice-labs-notion.mcp.workway.co` | Active |
| 11 | KK Management | `kk-management-notion.mcp.workway.co` | Active |

## Communication MCPs

| Server | Package | URL |
|--------|---------|-----|
| Gmail Sync | `halfdozen-gmail-sync` | `gmail.mcp.workway.co` |
| Zoom Sync | `halfdozen-zoom-sync` | `zoom.mcp.workway.co` |
| YouTube Sync | `half-dozen-youtube-sync` | `youtube.mcp.workway.co` |
| Telemetry | `halfdozen-telemetry-mcp` | `halfdozen-telemetry-mcp.half-dozen.workers.dev` |

## ⚠️ Naming Inconsistency

YouTube uses `half-dozen-` (with dash). All others use `halfdozen-` (no dash). Known issue, preserved for compatibility.

## Key Packages

| Package | Purpose |
|---------|---------|
| `packages/halfdozen-notion-mcp` | Multi-tenant Notion connectivity |
| `packages/halfdozen-gmail-sync` | Gmail inbox monitoring and sync |
| `packages/halfdozen-zoom-sync` | Zoom meeting sync |
| `packages/halfdozen-zoom-transcript-sync` | Zoom transcript extraction |
| `packages/half-dozen-youtube-sync` | YouTube channel sync |
| `packages/halfdozen-telemetry-mcp` | Fleet-wide telemetry queries |
| `packages/halfdozen-dm-mcp` | Direct message management |
| `packages/halfdozen-operator-notion-mcp` | Operator-level Notion access |

## Telemetry

All MCPs log to `halfdozen-feedback` D1. Query via the Telemetry MCP:

```
# Wrangler D1 query (from WORKWAY account)
wrangler d1 execute halfdozen-feedback --command "SELECT * FROM telemetry ORDER BY created_at DESC LIMIT 20"
```

## Deploy Pattern

```bash
cd packages/halfdozen-notion-mcp/worker
wrangler deploy

cd packages/halfdozen-gmail-sync/worker
wrangler deploy
```

## Adding a New Client

1. Configure the client route in `halfdozen-notion-mcp` worker
2. Add the URL mapping: `{client-slug}-notion.mcp.workway.co`
3. Update `docs/MCP_FLEET_REGISTRY.md`
4. Deploy the worker
5. Verify: `curl https://{client-slug}-notion.mcp.workway.co/mcp` (should return JSONRPC error for GET)
