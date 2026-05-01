# Dify MCP Coverage (Generated)

> Auto-generated from `config/mcp-hub/registry.json`, `config/dify/inventory.json`, and `config/dify-mcp-intake/*.json`.
> Regenerate with `pnpm dify:coverage:generate`.

This report tracks MCPs that are reasonable Dify-direct candidates: active HTTP servers that are not explicitly brokered through the Hub or Composio.
Brokered, local, dormant, and non-HTTP servers are summarized but excluded from direct Dify agent coverage.

## Summary

- MCP registry servers: 1014
- Dify-direct candidates: 26
- Dify inventory status: `partial`
- Dify MCP server cards in inventory: 11
- Dify agents in inventory: 11
- Dify MCP intake artifacts: 25

## Candidate Status

| Status | Count | Meaning |
| --- | ---: | --- |
| `ready` | 1 | Mapped to a Dify server and published agent with smoke/eval gates. |
| `agent-needs-gates` | 0 | Published agent exists but smoke/eval evidence is incomplete. |
| `agent-draft` | 0 | Agent exists but is not published yet. |
| `intake-ready` | 25 | Repo has a Dify Studio intake artifact, but the server card and discovered tools are not codified yet. |
| `server-only` | 0 | Dify MCP server exists but no Dify agent uses it yet. |
| `missing-dify-server` | 0 | No Dify MCP server card is codified for this registry server. |

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
| `create-something` | `intake-ready` | - | `config/dify-mcp-intake/create-something.json` | - | - | 10 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `cs-telemetry` | `intake-ready` | - | `config/dify-mcp-intake/cs-telemetry.json` | - | - | 10 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `gmail-notion-mcp` | `intake-ready` | - | `config/dify-mcp-intake/gmail-notion-mcp.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `half-dozen-youtube-sync` | `intake-ready` | - | `config/dify-mcp-intake/youtube-sync.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `halfdozen-gmail-sync-danny` | `intake-ready` | - | `config/dify-mcp-intake/gmail-sync.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `halfdozen-gmail-sync-fillip` | `intake-ready` | - | `config/dify-mcp-intake/halfdozen-gmail-sync-fillip.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `halfdozen-gmail-sync-leah` | `intake-ready` | - | `config/dify-mcp-intake/halfdozen-gmail-sync-leah.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `halfdozen-telemetry` | `intake-ready` | - | `config/dify-mcp-intake/halfdozen-telemetry.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `halfdozen-zoom-sync` | `intake-ready` | - | `config/dify-mcp-intake/zoom-sync.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `meetings` | `intake-ready` | - | `config/dify-mcp-intake/meetings.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `notion-halfdozen-blondish` | `intake-ready` | - | `config/dify-mcp-intake/notion-halfdozen-blondish.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `notion-halfdozen-c3-management` | `intake-ready` | - | `config/dify-mcp-intake/notion-halfdozen-c3-management.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `notion-halfdozen-create-something` | `intake-ready` | - | `config/dify-mcp-intake/notion-halfdozen-create-something.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `notion-sync-mcp` | `intake-ready` | - | `config/dify-mcp-intake/notion-sync-mcp.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `outerfields-pcn` | `intake-ready` | - | `config/dify-mcp-intake/outerfields.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `playbook` | `intake-ready` | - | `config/dify-mcp-intake/playbook.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `quickbooks-notion-mcp-server` | `intake-ready` | - | `config/dify-mcp-intake/quickbooks-notion.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `schedule-mcp` | `intake-ready` | - | `config/dify-mcp-intake/schedule.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `slack_create_something` | `intake-ready` | - | `config/dify-mcp-intake/slack-create-something.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `substrate-mcp` | `intake-ready` | - | `config/dify-mcp-intake/substrate.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `three-tier-framework` | `intake-ready` | - | `config/dify-mcp-intake/three-tier-framework.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `webflow-app-review-mcp` | `intake-ready` | - | `config/dify-mcp-intake/webflow-app-review.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `webflow-local` | `intake-ready` | - | `config/dify-mcp-intake/webflow-local.json` | - | - | 10 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `webflow-site-analyzer-mcp` | `intake-ready` | - | `config/dify-mcp-intake/webflow-site-analyzer.json` | - | - | 22 | `unset` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `webflow-template-review-mcp` | `intake-ready` | - | `config/dify-mcp-intake/webflow-template-review.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `youtube-transcript-notion-mcp` | `ready` | `yt-transcript-notion` | - | `youtube-transcript-notion-agent` | `youtube-transcript-notion-agent` | 6 | `direct` | Keep smoke/eval evidence current. |

## Intake-Ready Candidate URLs

| MCP Registry Server | Intake Artifact | URL | Description |
| --- | --- | --- | --- |
| `create-something` | `config/dify-mcp-intake/create-something.json` | `https://mcp.createsomething.ltd/mcp` | CREATE SOMETHING content MCP |
| `cs-telemetry` | `config/dify-mcp-intake/cs-telemetry.json` | `https://cs-telemetry-mcp.createsomething.workers.dev/mcp` | Fleet telemetry MCP for CREATE SOMETHING account |
| `gmail-notion-mcp` | `config/dify-mcp-intake/gmail-notion-mcp.json` | `https://gmail-notion-mcp.createsomething.workers.dev/mcp` | Dormant Gmail to Notion MCP prototype |
| `half-dozen-youtube-sync` | `config/dify-mcp-intake/youtube-sync.json` | `https://youtube.mcp.workway.co/mcp` | Half Dozen YouTube sync MCP |
| `halfdozen-gmail-sync-danny` | `config/dify-mcp-intake/gmail-sync.json` | `https://gmail.mcp.workway.co/mcp` | Half Dozen Gmail sync MCP (Danny) |
| `halfdozen-gmail-sync-fillip` | `config/dify-mcp-intake/halfdozen-gmail-sync-fillip.json` | `https://fillip-gmail.mcp.workway.co/mcp` | Half Dozen Gmail sync MCP (Fillip) |
| `halfdozen-gmail-sync-leah` | `config/dify-mcp-intake/halfdozen-gmail-sync-leah.json` | `https://leah-gmail.mcp.workway.co/mcp` | Half Dozen Gmail sync MCP (Leah) |
| `halfdozen-telemetry` | `config/dify-mcp-intake/halfdozen-telemetry.json` | `https://halfdozen-telemetry-mcp.half-dozen.workers.dev/mcp` | Fleet telemetry MCP for WORKWAY account |
| `halfdozen-zoom-sync` | `config/dify-mcp-intake/zoom-sync.json` | `https://zoom.mcp.workway.co/mcp` | Half Dozen Zoom sync MCP |
| `meetings` | `config/dify-mcp-intake/meetings.json` | `https://meetings-mcp.createsomething.workers.dev/mcp` | Meetings MCP (requires API key via bearer_token_env_var or header auth) |
| `notion-halfdozen-blondish` | `config/dify-mcp-intake/notion-halfdozen-blondish.json` | `https://blondish-notion.mcp.workway.co/mcp` | Half Dozen Notion MCP for BLOND:ISH |
| `notion-halfdozen-c3-management` | `config/dify-mcp-intake/notion-halfdozen-c3-management.json` | `https://c3-management-notion.mcp.workway.co/mcp` | Half Dozen Notion MCP for C3 Management |
| `notion-halfdozen-create-something` | `config/dify-mcp-intake/notion-halfdozen-create-something.json` | `https://createsomething-notion.mcp.workway.co/mcp` | Half Dozen Notion MCP for CREATE SOMETHING |
| `notion-sync-mcp` | `config/dify-mcp-intake/notion-sync-mcp.json` | `https://notion-sync-mcp-worker.createsomething.workers.dev/mcp` | Dormant Notion sync MCP prototype |
| `outerfields-pcn` | `config/dify-mcp-intake/outerfields.json` | `https://outerfields.mcp.createsomething.agency/mcp` | OUTERFIELDS remote MCP |
| `playbook` | `config/dify-mcp-intake/playbook.json` | `https://playbook.mcp.createsomething.ltd/mcp` | Workflow playbooks MCP |
| `quickbooks-notion-mcp-server` | `config/dify-mcp-intake/quickbooks-notion.json` | `https://quickbooks.mcp.workway.co/mcp` | QuickBooks to Notion MCP server |
| `schedule-mcp` | `config/dify-mcp-intake/schedule.json` | `https://schedule.mcp.createsomething.agency/mcp` | Scheduling MCP |
| `slack_create_something` | `config/dify-mcp-intake/slack-create-something.json` | `https://mcp.slack.com/mcp` | Slack MCP for CREATE SOMETHING workspace |
| `substrate-mcp` | `config/dify-mcp-intake/substrate.json` | `https://substrate.mcp.createsomething.agency/mcp` | Substrate execution/storage MCP |
| `three-tier-framework` | `config/dify-mcp-intake/three-tier-framework.json` | `https://framework.mcp.createsomething.agency/mcp` | Three-Tier Framework MCP |
| `webflow-app-review-mcp` | `config/dify-mcp-intake/webflow-app-review.json` | `https://webflow-app-review-mcp.createsomething.workers.dev/mcp` | Webflow App Review MCP for app asset and version workflows |
| `webflow-local` | `config/dify-mcp-intake/webflow-local.json` | `https://webflow-mcp.createsomething.workers.dev/mcp` | Remote Webflow Marketplace MCP for plagiarism and framework analysis; kept as webflow-local for existing Hub bundle compatibility |
| `webflow-site-analyzer-mcp` | `config/dify-mcp-intake/webflow-site-analyzer.json` | `https://analyzer.mcp.createsomething.agency/mcp` | Webflow Site Analyzer MCP — browser-backed template validation with Steel + Groq |
| `webflow-template-review-mcp` | `config/dify-mcp-intake/webflow-template-review.json` | `https://webflow-template-review-mcp.createsomething.workers.dev/mcp` | Webflow Template Review MCP for template asset and version workflows |

## Unmapped Candidate URLs

| MCP Registry Server | URL | Description |
| --- | --- | --- |
| - | - | - |
