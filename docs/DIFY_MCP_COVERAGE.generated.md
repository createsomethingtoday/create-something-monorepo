# Dify MCP Coverage (Generated)

> Auto-generated from `config/mcp-hub/registry.json`, `config/dify/inventory.json`, and `config/dify-mcp-intake/*.json`.
> Regenerate with `pnpm dify:coverage:generate`.

This report tracks MCPs that are reasonable Dify-direct candidates: active HTTP servers that are not explicitly brokered through the Hub or Composio.
Brokered, local, dormant, and non-HTTP servers are summarized but excluded from direct Dify agent coverage.

## Summary

- MCP registry servers: 1032
- Dify-direct candidates: 37
- Dify inventory status: `partial`
- Dify MCP server cards in inventory: 16
- Dify agents in inventory: 14
- Dify MCP intake artifacts: 21

## Candidate Status

| Status | Count | Meaning |
| --- | ---: | --- |
| `ready` | 5 | Mapped to a Dify server and published agent with smoke/eval gates. |
| `agent-needs-gates` | 0 | Published agent exists but smoke/eval evidence is incomplete. |
| `agent-draft` | 0 | Agent exists but is not published yet. |
| `intake-ready` | 21 | Repo has a Dify Studio intake artifact, but the server card and discovered tools are not codified yet. |
| `server-only` | 0 | Dify MCP server exists but no Dify agent uses it yet. |
| `missing-dify-server` | 11 | No Dify MCP server card is codified for this registry server. |

## Excluded From Direct Dify Coverage

| Reason | Count |
| --- | ---: |
| `brokered` | 987 |
| `dormant` | 2 |
| `local` | 0 |
| `non-http` | 6 |

## Dify-Direct Candidate Matrix

| MCP Registry Server | Status | Dify Server Card | Intake Artifact | Dify Agents | Published Agents | Est. Tools | Exposure | Next Action |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- |
| `abundance-staff-mcp` | `missing-dify-server` | - | - | - | - | 1 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id abundance-staff-mcp --write. |
| `bettermode-creator` | `missing-dify-server` | - | - | - | - | 4 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id bettermode-creator --write. |
| `interaction-atlas-mcp` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id interaction-atlas-mcp --write. |
| `notion-halfdozen-cracked` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id notion-halfdozen-cracked --write. |
| `notion-halfdozen-fanpad` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id notion-halfdozen-fanpad --write. |
| `notion-halfdozen-juice-labs` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id notion-halfdozen-juice-labs --write. |
| `notion-halfdozen-kk-management` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id notion-halfdozen-kk-management --write. |
| `notion-halfdozen-lightswitch` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id notion-halfdozen-lightswitch --write. |
| `notion-halfdozen-phase-3` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id notion-halfdozen-phase-3 --write. |
| `notion-halfdozen-system-studio` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id notion-halfdozen-system-studio --write. |
| `notion-halfdozen-three-six-zero` | `missing-dify-server` | - | - | - | - | 0 | `direct` | Run pnpm dify:mcp:intake -- --registry-server-id notion-halfdozen-three-six-zero --write. |
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
| `quickbooks-notion-mcp-server` | `intake-ready` | - | `config/dify-mcp-intake/quickbooks-notion.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `schedule-mcp` | `intake-ready` | - | `config/dify-mcp-intake/schedule.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `slack-create-something` | `intake-ready` | - | `config/dify-mcp-intake/slack-create-something.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `substrate-mcp` | `intake-ready` | - | `config/dify-mcp-intake/substrate.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `webflow-app-review-mcp` | `intake-ready` | - | `config/dify-mcp-intake/webflow-app-review.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `webflow-local` | `intake-ready` | - | `config/dify-mcp-intake/webflow-local.json` | - | - | 10 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `webflow-template-review-mcp` | `intake-ready` | - | `config/dify-mcp-intake/webflow-template-review.json` | - | - | 0 | `direct` | Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory. |
| `abundance-jobs-mcp` | `ready` | `abundance-jobs` | - | `abundance-hub` | `abundance-hub` | 4 | `direct` | Keep smoke/eval evidence current. |
| `create-something` | `ready` | `create-something` | - | `create-something-guide-agent` | `create-something-guide-agent` | 5 | `direct` | Keep smoke/eval evidence current. |
| `playbook` | `ready` | `playbook` | - | `create-something-guide-agent` | `create-something-guide-agent` | 14 | `direct` | Keep smoke/eval evidence current. |
| `three-tier-framework` | `ready` | `three-tier-framework` | - | `create-something-guide-agent` | `create-something-guide-agent` | 6 | `direct` | Keep smoke/eval evidence current. |
| `youtube-transcript-notion-mcp` | `ready` | `yt-transcript-notion` | - | `youtube-transcript-notion-agent` | `youtube-transcript-notion-agent` | 6 | `direct` | Keep smoke/eval evidence current. |

## Intake-Ready Candidate URLs

| MCP Registry Server | Intake Artifact | URL | Description |
| --- | --- | --- | --- |
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
| `quickbooks-notion-mcp-server` | `config/dify-mcp-intake/quickbooks-notion.json` | `https://quickbooks.mcp.workway.co/mcp` | QuickBooks to Notion MCP server |
| `schedule-mcp` | `config/dify-mcp-intake/schedule.json` | `https://schedule.mcp.createsomething.agency/mcp` | Scheduling MCP |
| `slack-create-something` | `config/dify-mcp-intake/slack-create-something.json` | `https://mcp.slack.com/mcp` | Slack MCP for CREATE SOMETHING workspace |
| `substrate-mcp` | `config/dify-mcp-intake/substrate.json` | `https://substrate.mcp.createsomething.agency/mcp` | Substrate execution/storage MCP |
| `webflow-app-review-mcp` | `config/dify-mcp-intake/webflow-app-review.json` | `https://webflow-app-review-mcp.createsomething.workers.dev/mcp` | Webflow App Review MCP for app asset and version workflows |
| `webflow-local` | `config/dify-mcp-intake/webflow-local.json` | `https://webflow-mcp.createsomething.workers.dev/mcp` | Remote Webflow Marketplace MCP for plagiarism and framework analysis; kept as webflow-local for existing Hub bundle compatibility |
| `webflow-template-review-mcp` | `config/dify-mcp-intake/webflow-template-review.json` | `https://webflow-template-review-mcp.createsomething.workers.dev/mcp` | Webflow Template Review MCP for template asset and version workflows |

## Unmapped Candidate URLs

| MCP Registry Server | URL | Description |
| --- | --- | --- |
| `abundance-staff-mcp` | `https://abundance-staff-mcp.createsomething.workers.dev/mcp` | Abundance Staff MCP for NPG staff/operator headcount and private staffing context. Token-bearing access stays in Infisical and is excluded from public delivery artifacts. |
| `bettermode-creator` | `https://bettermode-creator.mcp.createsomething.agency/mcp` | Bettermode Marketplace Creator drafting MCP — read-only Bettermode + Airtable + community queue helpers consumed by the Dify drafter agent. |
| `interaction-atlas-mcp` | `https://interaction-atlas-mcp.createsomething.workers.dev/mcp` | Interaction Atlas MCP for policy, workflow, and agent/MCP capability mapping |
| `notion-halfdozen-cracked` | `https://cracked-notion.mcp.workway.co/mcp` | Half Dozen Notion MCP for Cracked |
| `notion-halfdozen-fanpad` | `https://fanpad-notion.mcp.workway.co/mcp` | Half Dozen Notion MCP for Fanpad |
| `notion-halfdozen-juice-labs` | `https://juice-labs-notion.mcp.workway.co/mcp` | Half Dozen Notion MCP for Juice Labs |
| `notion-halfdozen-kk-management` | `https://kk-management-notion.mcp.workway.co/mcp` | Half Dozen Notion MCP for KK Management |
| `notion-halfdozen-lightswitch` | `https://lightswitch-notion.mcp.workway.co/mcp` | Half Dozen Notion MCP for Lightswitch |
| `notion-halfdozen-phase-3` | `https://phase-3-notion.mcp.workway.co/mcp` | Half Dozen Notion MCP for Phase 3 |
| `notion-halfdozen-system-studio` | `https://system-studio-notion.mcp.workway.co/mcp` | Half Dozen Notion MCP for System Studio |
| `notion-halfdozen-three-six-zero` | `https://three-six-zero-notion.mcp.workway.co/mcp` | Half Dozen Notion MCP for Three Six Zero |
