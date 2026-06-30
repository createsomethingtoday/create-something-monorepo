# MCP Fleet Registry

> Curated operating overview for the CREATE SOMETHING and WORKWAY MCP fleet.
> Updated: June 30, 2026

Detailed server rows are generated from `config/mcp-hub/registry.json` into
`docs/MCP_FLEET_REGISTRY.generated.md`. Treat the generated file as the
authoritative inventory and use this file for posture, ownership, and
operator-facing context.

## Source Files

| Surface | Purpose |
| --- | --- |
| `config/mcp-hub/registry.json` | Canonical merged server and bundle registry |
| `config/mcp-hub/registry.core.json` | Hand-maintained CREATE SOMETHING and WORKWAY core entries |
| `config/mcp-hub/registry.composio.generated.json` | Generated Composio toolkit entries |
| `config/mcp-hub/fleet.json` | Operational deployment map by tenant and product |
| `config/mcp-hub/discovery-packs.json` | Managed discovery packs for brokered hub exposure |
| `config/mcp-hub/named-lane-hardening.json` | Read-only hardening contract for named lanes and client hubs |
| `config/workspace-lanes.json` | Workspace/package lane assignment |
| `docs/MCP_FLEET_REGISTRY.generated.md` | Generated human-readable registry detail |
| `docs/MCP_HUB_NAMED_LANE_HARDENING.generated.md` | Generated named-lane hardening matrix |

## Current Snapshot

Observed from the working tree on June 30, 2026:

| Metric | Count |
| --- | ---: |
| Registered servers | 1042 |
| Bundles | 107 |
| Direct exposure | 54 |
| Brokered exposure | 987 |
| Dormant exposure | 1 |
| HTTP transports | 1036 |
| Stdio transports | 6 |
| Catalog-included servers | 19 |
| Fleet deployments | 30 |
| Discovery packs | 15 |
| Discovery-pack covered servers | 30 |
| Manual hardening lanes | 4 |

Workspace lane counts:

| Lane | Packages |
| --- | ---: |
| platform | 17 |
| product | 19 |
| services | 39 |
| clients | 20 |
| labs | 19 |

## Fleet Overview

Two Cloudflare account families host the deployed fleet:

| Account | ID | Scope | Telemetry DB |
| --- | --- | --- | --- |
| WORKWAY | `5c3e9cf4d55ce171b844fad0931607f9` | Half Dozen tenant Notion, sync, and telemetry services | `halfdozen-feedback` |
| CREATE SOMETHING | `9645bd52e640b8a4f40a3a55ff1dd75a` | Core platform, Webflow, Abundance, client hubs, shared policy/runtime services | `cs-telemetry` |

Operational deployment types in `config/mcp-hub/fleet.json`:

| Deployment type | Count |
| --- | ---: |
| `policy_os_hub` | 12 |
| `notion_mcp` | 11 |
| `remote_mcp_server` | 6 |
| `internal_infra` | 1 |

## Exposure Model

| Exposure | Meaning |
| --- | --- |
| `direct` | Server is exposed directly to catalog/runtime consumers. |
| `brokered` | Server is routed through a hub or managed discovery pack. |
| `dormant` | Server remains registered for traceability but is not an active delivery surface. |
| `local` | Stdio/local development server, not a Cloudflare Worker. |

The current registry is intentionally broker-heavy: `987` of `1042` servers are
brokered Composio toolkit or hub-routed entries. Discovery packs currently cover
`30` unique servers: `23` brokered servers and `7` direct servers.

## Catalog-Included Servers

These entries have `catalog.include=true` in the current registry:

| Server | Primary role |
| --- | --- |
| `bettermode-creator` | Webflow Marketplace creator drafting surface |
| `create-something` | Core CREATE SOMETHING MCP |
| `half-dozen-youtube-sync` | Half Dozen YouTube sync |
| `halfdozen-gmail-sync-danny` | Half Dozen Gmail sync |
| `halfdozen-zoom-sync` | Half Dozen Zoom sync |
| `hydra-db-recall-mcp` | Hydra recall/memory MCP |
| `outerfields-pcn` | Outerfields client MCP |
| `playbook` | Policy/workflow playbook MCP |
| `quickbooks-notion-mcp-server` | QuickBooks/Notion finance MCP, remote HTTP |
| `schedule-mcp` | Scheduling MCP |
| `spotify-mcp` | Spotify/RapidAPI MCP |
| `substrate-mcp` | Automation substrate MCP |
| `three-tier-framework` | Three-Tier Framework MCP |
| `webflow-app-review-mcp` | Webflow app review MCP |
| `webflow-reviewer-exceptions-mcp` | Webflow reviewer exceptions MCP |
| `webflow-template-review-mcp` | Webflow template review MCP |
| `youtube-transcript-notion-claude-mcp` | Claude-compatible OAuth wrapper for YouTube transcript and Notion enrichment |
| `youtube-transcript-notion-mcp` | YouTube transcript and Notion enrichment MCP |
| `zendesk-mcp` | Zendesk review/support MCP |

## Half Dozen Notes

Half Dozen tenant Notion servers use tenant-specific registry IDs. Do not repeat
`notion-halfdozen-create-something` for every tenant row.

Current tenant-specific Notion IDs include:

| Tenant | Registry server |
| --- | --- |
| CREATE SOMETHING | `notion-halfdozen-create-something` |
| System Studio | `notion-halfdozen-system-studio` |
| BLOND:ISH | `notion-halfdozen-blondish` |
| C3 Management | `notion-halfdozen-c3-management` |
| Cracked | `notion-halfdozen-cracked` |
| Fanpad | `notion-halfdozen-fanpad` |
| Juice Labs | `notion-halfdozen-juice-labs` |
| KK Management | `notion-halfdozen-kk-management` |
| Lightswitch | `notion-halfdozen-lightswitch` |
| Phase 3 | `notion-halfdozen-phase-3` |
| Three Six Zero | `notion-halfdozen-three-six-zero` |

The YouTube sync service intentionally uses `half-dozen-youtube-sync` while most
other Half Dozen services use the `halfdozen-` prefix.

## Local Servers

The current local/stdio registry entries are:

| Server | Command |
| --- | --- |
| `community-mcp` | `node ./packages/community-mcp/dist/index.js` |
| `ground-mcp` | `npx -y @createsomething/ground-mcp` |
| `harness-mcp` | `node ./packages/harness-mcp/dist/index.js` |
| `lsmcp` | `npx -y @mizchi/lsmcp mcp` |
| `social-mcp` | `node ./packages/social-mcp/dist/index.js` |
| `ui-preview-mcp` | `node ./packages/ui-preview-mcp/dist/index.js` |

`quickbooks-notion-mcp-server` is not a local-only entry in the current
registry. It is registered as HTTP at `https://quickbooks.mcp.workway.co/mcp`.

## Named-Lane Hardening

Manual hardening currently covers four customer-facing hub lanes:

| Lane | Classification | Discovery pack |
| --- | --- | --- |
| `viv-blondish` | `named_lane` | `viv-blondish-named-lane` |
| `morgan-young-c3-management` | `named_lane` | `morgan-young-c3-management-named-lane` |
| `blondish-hub` | `client_hub` | `blondish-client-hub` |
| `cracked-hub` | `client_hub` | `cracked-client-hub` |

The hardening checker validates static config, generated matrix freshness, and
optionally live unauthenticated `/health` payloads.

## Maintenance Commands

Use read-only checks for drift review:

```bash
pnpm mcp:registry:check
pnpm mcp:hub:hardening:matrix:check
pnpm mcp:hub:hardening:check
pnpm policy:artifacts:check
```

Use generators only when intentionally refreshing artifacts:

```bash
pnpm mcp:registry:generate
pnpm mcp:hub:hardening:matrix:generate
```

Do not use `lm`, local `.loom`, or `pnpm loom:*` for new coordination. Linear is
the source of truth for tracked MCP registry work.
