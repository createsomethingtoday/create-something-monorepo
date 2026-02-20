# MCP Fleet Registry (Generated)

> Auto-generated from `config/mcp-hub/registry.json`.
> Regenerate with `pnpm mcp:registry:generate`.

## Active (17)

| Server | Transport | Endpoint | Tags |
| --- | --- | --- | --- |
| `create-something` | `http` | `https://mcp.createsomething.ltd/mcp` | `core`, `content`, `cs` |
| `cs-telemetry` | `http` | `https://cs-telemetry-mcp.createsomething.workers.dev/mcp` | `observability`, `telemetry`, `cs` |
| `half-dozen-youtube-sync` | `http` | `https://youtube.mcp.workway.co/mcp` | `halfdozen`, `youtube`, `workway` |
| `halfdozen-dm-mcp` | `http` | `https://dm.mcp.workway.co/mcp` | `halfdozen`, `dm`, `notion`, `workway` |
| `halfdozen-gmail-sync-danny` | `http` | `https://gmail.mcp.workway.co/mcp` | `halfdozen`, `gmail`, `workway` |
| `halfdozen-gmail-sync-fillip` | `http` | `https://fillip-gmail.mcp.workway.co/mcp` | `halfdozen`, `gmail`, `workway` |
| `halfdozen-gmail-sync-leah` | `http` | `https://leah-gmail.mcp.workway.co/mcp` | `halfdozen`, `gmail`, `workway` |
| `halfdozen-telemetry` | `http` | `https://halfdozen-telemetry-mcp.half-dozen.workers.dev/mcp` | `observability`, `telemetry`, `workway` |
| `halfdozen-zoom-sync` | `http` | `https://zoom.mcp.workway.co/mcp` | `halfdozen`, `zoom`, `workway` |
| `meetings` | `http` | `https://meetings-mcp.createsomething.workers.dev/mcp` | `meetings`, `cs` |
| `notion-halfdozen-create-something` | `http` | `https://createsomething-notion.mcp.workway.co/mcp` | `halfdozen`, `notion`, `workway` |
| `outerfields-pcn` | `http` | `https://outerfields.mcp.createsomething.agency/mcp` | `agency`, `outerfields`, `cs` |
| `playbook` | `http` | `https://playbook.mcp.createsomething.ltd/mcp` | `core`, `workflow`, `cs` |
| `quickbooks-notion-mcp-server` | `http` | `https://quickbooks.mcp.workway.co/mcp` | `finance`, `quickbooks`, `notion`, `workway` |
| `schedule-mcp` | `http` | `https://schedule.mcp.createsomething.agency/mcp` | `ops`, `scheduling`, `cs` |
| `substrate-mcp` | `http` | `https://substrate.mcp.createsomething.agency/mcp` | `ops`, `automation`, `cs` |
| `three-tier-framework` | `http` | `https://framework.mcp.createsomething.agency/mcp` | `core`, `framework`, `cs` |

## Dormant (2)

| Server | Transport | Endpoint | Tags |
| --- | --- | --- | --- |
| `gmail-notion-mcp` | `http` | `https://gmail-notion-mcp.createsomething.workers.dev/mcp` | `dormant`, `prototype`, `cs` |
| `notion-sync-mcp` | `http` | `https://notion-sync-mcp-worker.createsomething.workers.dev/mcp` | `dormant`, `prototype`, `cs` |

## Local (3)

| Server | Transport | Endpoint | Tags |
| --- | --- | --- | --- |
| `lsmcp` | `stdio` | `npx -y @mizchi/lsmcp mcp` | `local`, `dev`, `filesystem` |
| `webflow-local` | `stdio` | `node ./packages/webflow-mcp/dist/index.js` | `local`, `dev`, `webflow` |
| `webflow-site-analyzer-mcp` | `stdio` | `node ./packages/webflow-site-analyzer-mcp/dist/index.js` | `local`, `dev`, `webflow` |

## Bundles

| Bundle | Servers |
| --- | --- |
| `agency` | `outerfields-pcn` |
| `core` | `create-something`, `three-tier-framework`, `playbook` |
| `dormant` | `gmail-notion-mcp`, `notion-sync-mcp` |
| `finance` | `quickbooks-notion-mcp-server` |
| `halfdozen` | `notion-halfdozen-create-something`, `halfdozen-dm-mcp`, `half-dozen-youtube-sync` |
| `halfdozen-observability` | `halfdozen-telemetry` |
| `halfdozen-sync` | `halfdozen-gmail-sync-danny`, `halfdozen-gmail-sync-fillip`, `halfdozen-gmail-sync-leah`, `halfdozen-zoom-sync` |
| `local-dev` | `webflow-local`, `webflow-site-analyzer-mcp`, `lsmcp` |
| `meetings` | `meetings` |
| `observability` | `cs-telemetry` |
| `ops` | `schedule-mcp`, `substrate-mcp` |
