# Dify MCP Coverage (Generated)

> Auto-generated from `config/mcp-hub/registry.json`, `config/dify/inventory.json`, and `config/dify-mcp-intake/*.json`.
> Regenerate with `pnpm dify:coverage:generate`.

This report tracks MCPs that are reasonable Dify-direct candidates: active HTTP servers that are not explicitly brokered through the Hub or Composio.
Brokered, local, dormant, and non-HTTP servers are summarized but excluded from direct Dify agent coverage.

## Summary

- MCP registry servers: 1014
- Dify-direct candidates: 26
- Dify inventory status: `partial`
- Dify MCP server cards in inventory: 1
- Dify agents in inventory: 1
- Dify MCP intake artifacts: 1

## Candidate Status

| Status | Count | Meaning |
| --- | ---: | --- |
| `ready` | 1 | Mapped to a Dify server and published agent with smoke/eval gates. |
| `agent-needs-gates` | 0 | Published agent exists but smoke/eval evidence is incomplete. |
| `agent-draft` | 0 | Agent exists but is not published yet. |
| `intake-ready` | 1 | Repo has a Dify Studio intake artifact, but the server card and discovered tools are not codified yet. |
| `server-only` | 0 | Dify MCP server exists but no Dify agent uses it yet. |
| `missing-dify-server` | 24 | No Dify MCP server card is codified for this registry server. |

## Excluded From Direct Dify Coverage

| Reason | Count |
| --- | ---: |
| `brokered` | 986 |
| `dormant` | 1 |
| `local` | 0 |
| `non-http` | 1 |

## Dify-Direct Candidate Matrix

| MCP Registry Server | Status | Dify Server Card | Intake Artifact | Dify Agents | Published Agents | Est. Tools | Exposure | Next Action |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- |
| `create-something` | `missing-dify-server` | - | - | - | - | 10 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id create-something --write. |
| `cs-telemetry` | `missing-dify-server` | - | - | - | - | 10 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id cs-telemetry --write. |
| `gmail-notion-mcp` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id gmail-notion-mcp --write. |
| `half-dozen-youtube-sync` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id half-dozen-youtube-sync --write. |
| `halfdozen-gmail-sync-danny` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id halfdozen-gmail-sync-danny --write. |
| `halfdozen-gmail-sync-fillip` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id halfdozen-gmail-sync-fillip --write. |
| `halfdozen-gmail-sync-leah` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id halfdozen-gmail-sync-leah --write. |
| `halfdozen-telemetry` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id halfdozen-telemetry --write. |
| `halfdozen-zoom-sync` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id halfdozen-zoom-sync --write. |
| `meetings` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id meetings --write. |
| `notion-halfdozen-blondish` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id notion-halfdozen-blondish --write. |
| `notion-halfdozen-c3-management` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id notion-halfdozen-c3-management --write. |
| `notion-halfdozen-create-something` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id notion-halfdozen-create-something --write. |
| `notion-sync-mcp` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id notion-sync-mcp --write. |
| `outerfields-pcn` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id outerfields-pcn --write. |
| `playbook` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id playbook --write. |
| `quickbooks-notion-mcp-server` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id quickbooks-notion-mcp-server --write. |
| `schedule-mcp` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id schedule-mcp --write. |
| `slack_create_something` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id slack_create_something --write. |
| `substrate-mcp` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id substrate-mcp --write. |
| `three-tier-framework` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id three-tier-framework --write. |
| `webflow-app-review-mcp` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id webflow-app-review-mcp --write. |
| `webflow-local` | `missing-dify-server` | - | - | - | - | 10 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id webflow-local --write. |
| `webflow-site-analyzer-mcp` | `missing-dify-server` | - | - | - | - | 22 | `unset` | Run pnpm dify:mcp:intake -- --registry-server-id webflow-site-analyzer-mcp --write. |
| `webflow-template-review-mcp` | `intake-ready` | - | `config/dify-mcp-intake/webflow-template-review.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `youtube-transcript-notion-mcp` | `ready` | `yt-transcript-notion` | - | `youtube-transcript-notion-agent` | `youtube-transcript-notion-agent` | 6 | `direct` | Keep smoke/eval evidence current. |

## Intake-Ready Candidate URLs

| MCP Registry Server | Intake Artifact | URL | Description |
| --- | --- | --- | --- |
| `webflow-template-review-mcp` | `config/dify-mcp-intake/webflow-template-review.json` | `https://webflow-template-review-mcp.createsomething.workers.dev/mcp` | Webflow Template Review MCP for template asset and version workflows |

## Unmapped Candidate URLs

| MCP Registry Server | URL | Description |
| --- | --- | --- |
| `create-something` | `https://mcp.createsomething.ltd/mcp` | CREATE SOMETHING content MCP |
| `cs-telemetry` | `https://cs-telemetry-mcp.createsomething.workers.dev/mcp` | Fleet telemetry MCP for CREATE SOMETHING account |
| `gmail-notion-mcp` | `https://gmail-notion-mcp.createsomething.workers.dev/mcp` | Dormant Gmail to Notion MCP prototype |
| `half-dozen-youtube-sync` | `https://youtube.mcp.workway.co/mcp` | Half Dozen YouTube sync MCP |
| `halfdozen-gmail-sync-danny` | `https://gmail.mcp.workway.co/mcp` | Half Dozen Gmail sync MCP (Danny) |
| `halfdozen-gmail-sync-fillip` | `https://fillip-gmail.mcp.workway.co/mcp` | Half Dozen Gmail sync MCP (Fillip) |
| `halfdozen-gmail-sync-leah` | `https://leah-gmail.mcp.workway.co/mcp` | Half Dozen Gmail sync MCP (Leah) |
| `halfdozen-telemetry` | `https://halfdozen-telemetry-mcp.half-dozen.workers.dev/mcp` | Fleet telemetry MCP for WORKWAY account |
| `halfdozen-zoom-sync` | `https://zoom.mcp.workway.co/mcp` | Half Dozen Zoom sync MCP |
| `meetings` | `https://meetings-mcp.createsomething.workers.dev/mcp` | Meetings MCP (requires API key via bearer_token_env_var or header auth) |
| `notion-halfdozen-blondish` | `https://blondish-notion.mcp.workway.co/mcp` | Half Dozen Notion MCP for BLOND:ISH |
| `notion-halfdozen-c3-management` | `https://c3-management-notion.mcp.workway.co/mcp` | Half Dozen Notion MCP for C3 Management |
| `notion-halfdozen-create-something` | `https://createsomething-notion.mcp.workway.co/mcp` | Half Dozen Notion MCP for CREATE SOMETHING |
| `notion-sync-mcp` | `https://notion-sync-mcp-worker.createsomething.workers.dev/mcp` | Dormant Notion sync MCP prototype |
| `outerfields-pcn` | `https://outerfields.mcp.createsomething.agency/mcp` | OUTERFIELDS remote MCP |
| `playbook` | `https://playbook.mcp.createsomething.ltd/mcp` | Workflow playbooks MCP |
| `quickbooks-notion-mcp-server` | `https://quickbooks.mcp.workway.co/mcp` | QuickBooks to Notion MCP server |
| `schedule-mcp` | `https://schedule.mcp.createsomething.agency/mcp` | Scheduling MCP |
| `slack_create_something` | `https://mcp.slack.com/mcp` | Slack MCP for CREATE SOMETHING workspace |
| `substrate-mcp` | `https://substrate.mcp.createsomething.agency/mcp` | Substrate execution/storage MCP |
| `three-tier-framework` | `https://framework.mcp.createsomething.agency/mcp` | Three-Tier Framework MCP |
| `webflow-app-review-mcp` | `https://webflow-app-review-mcp.createsomething.workers.dev/mcp` | Webflow App Review MCP for app asset and version workflows |
| `webflow-local` | `https://webflow-mcp.createsomething.workers.dev/mcp` | Remote Webflow Marketplace MCP for plagiarism and framework analysis; kept as webflow-local for existing Hub bundle compatibility |
| `webflow-site-analyzer-mcp` | `https://analyzer.mcp.createsomething.agency/mcp` | Webflow Site Analyzer MCP — browser-backed template validation with Steel + Groq |
