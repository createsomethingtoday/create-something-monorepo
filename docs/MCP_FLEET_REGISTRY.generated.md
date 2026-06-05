# MCP Fleet Registry (Generated)

> Auto-generated from `config/mcp-hub/registry.json`.
> Regenerate with `pnpm mcp:registry:generate`.
>
> The Active section is split into a hand-curated core table (always inline)
> and a Composio toolkit summary (count + per-category bundles only). The full
> `composio-toolkit-*` server list lives in
> [`config/mcp-hub/registry.composio.generated.json`](../config/mcp-hub/registry.composio.generated.json).

## Active (core, 42)

| Server | Transport | Endpoint | Exposure | Est. Tools | Tags |
| --- | --- | --- | --- | --- | --- |
| `abundance-jobs-mcp` | `http` | `https://abundance-jobs-mcp.createsomething.workers.dev/mcp` | `direct` | `4` | `client`, `abundance`, `npg`, `jobs`, `healthcare` |
| `abundance-staff-mcp` | `http` | `https://abundance-staff-mcp.createsomething.workers.dev/mcp` | `direct` | `1` | `client`, `abundance`, `npg`, `staffing`, `healthcare` |
| `abundance-thenpgroup-hub` | `http` | `https://abundance-thenpgroup.mcp.createsomething.agency/mcp` | `brokered` | `319` | `client`, `abundance`, `npg`, `policy-os`, `hub` |
| `bettermode-creator` | `http` | `https://bettermode-creator.mcp.createsomething.agency/mcp` | `direct` | `4` | `agency`, `webflow`, `bettermode`, `marketplace`, `cs` |
| `create-something` | `http` | `https://mcp.createsomething.ltd/mcp` | `direct` | `5` | `core`, `content`, `cs`, `policy_os_only` |
| `cs-telemetry` | `http` | `https://cs-telemetry-mcp.createsomething.workers.dev/mcp` | `direct` | `10` | `observability`, `telemetry`, `cs`, `policy_os_only` |
| `half-dozen-youtube-sync` | `http` | `https://youtube.mcp.workway.co/mcp` | `direct` | `0` | `halfdozen`, `youtube`, `workway` |
| `halfdozen-agent-analyzer-telemetry` | `http` | `https://halfdozen-agent-analyzer-telemetry-mcp.half-dozen.workers.dev/mcp` | `direct` | `10` | `halfdozen`, `agent-analyzer`, `notion`, `observability`, `workway` |
| `halfdozen-blondish-sync-mcp` | `http` | `https://halfdozen-blondish-sync-mcp.createsomething.workers.dev/mcp` | `direct` | `8` | `halfdozen`, `blondish`, `notion`, `tickets`, `sync` |
| `halfdozen-dm-mcp` | `http` | `https://dm.mcp.workway.co/mcp` | `brokered` | `100` | `halfdozen`, `dm`, `notion`, `drive`, `composio`, `workway` |
| `halfdozen-gmail-sync-danny` | `http` | `https://gmail.mcp.workway.co/mcp` | `direct` | `0` | `halfdozen`, `gmail`, `workway` |
| `halfdozen-gmail-sync-fillip` | `http` | `https://fillip-gmail.mcp.workway.co/mcp` | `direct` | `0` | `halfdozen`, `gmail`, `workway` |
| `halfdozen-gmail-sync-leah` | `http` | `https://leah-gmail.mcp.workway.co/mcp` | `direct` | `0` | `halfdozen`, `gmail`, `workway` |
| `halfdozen-operator-notion-mcp` | `http` | `https://halfdozen-operator-notion-mcp.createsomething.workers.dev/mcp` | `brokered` | `100` | `halfdozen`, `notion`, `composio`, `operator`, `workway` |
| `halfdozen-telemetry` | `http` | `https://halfdozen-telemetry-mcp.half-dozen.workers.dev/mcp` | `direct` | `0` | `observability`, `telemetry`, `workway` |
| `halfdozen-zoom-sync` | `http` | `https://zoom.mcp.workway.co/mcp` | `direct` | `0` | `halfdozen`, `zoom`, `workway` |
| `hydra-db-recall-mcp` | `http` | `https://hydra-db-recall-mcp.createsomething.workers.dev/mcp` | `direct` | `4` | `hydradb`, `recall`, `memory`, `internal`, `observability`, `cs`, `policy_os_only` |
| `interaction-atlas-mcp` | `http` | `https://interaction-atlas-mcp.createsomething.workers.dev/mcp` | `direct` | `0` | `policy-os`, `interaction-atlas`, `workflow`, `judgment`, `cs` |
| `meetings` | `http` | `https://meetings-mcp.createsomething.workers.dev/mcp` | `direct` | `0` | `meetings`, `cs` |
| `notion-halfdozen-blondish` | `http` | `https://blondish-notion.mcp.workway.co/mcp` | `direct` | `0` | `halfdozen`, `notion`, `blondish`, `workway` |
| `notion-halfdozen-c3-management` | `http` | `https://c3-management-notion.mcp.workway.co/mcp` | `direct` | `0` | `halfdozen`, `notion`, `c3-management`, `workway` |
| `notion-halfdozen-cracked` | `http` | `https://cracked-notion.mcp.workway.co/mcp` | `direct` | `0` | `halfdozen`, `notion`, `cracked`, `workway` |
| `notion-halfdozen-create-something` | `http` | `https://createsomething-notion.mcp.workway.co/mcp` | `direct` | `0` | `halfdozen`, `notion`, `workway` |
| `notion-halfdozen-fanpad` | `http` | `https://fanpad-notion.mcp.workway.co/mcp` | `direct` | `0` | `halfdozen`, `notion`, `fanpad`, `workway` |
| `notion-halfdozen-juice-labs` | `http` | `https://juice-labs-notion.mcp.workway.co/mcp` | `direct` | `0` | `halfdozen`, `notion`, `juice-labs`, `workway` |
| `notion-halfdozen-kk-management` | `http` | `https://kk-management-notion.mcp.workway.co/mcp` | `direct` | `0` | `halfdozen`, `notion`, `kk-management`, `workway` |
| `notion-halfdozen-lightswitch` | `http` | `https://lightswitch-notion.mcp.workway.co/mcp` | `direct` | `0` | `halfdozen`, `notion`, `lightswitch`, `workway` |
| `notion-halfdozen-phase-3` | `http` | `https://phase-3-notion.mcp.workway.co/mcp` | `direct` | `0` | `halfdozen`, `notion`, `phase-3`, `workway` |
| `notion-halfdozen-system-studio` | `http` | `https://system-studio-notion.mcp.workway.co/mcp` | `direct` | `0` | `halfdozen`, `notion`, `system-studio`, `workway` |
| `notion-halfdozen-three-six-zero` | `http` | `https://three-six-zero-notion.mcp.workway.co/mcp` | `direct` | `0` | `halfdozen`, `notion`, `three-six-zero`, `workway` |
| `outerfields-pcn` | `http` | `https://outerfields.mcp.createsomething.agency/mcp` | `direct` | `0` | `agency`, `outerfields`, `cs` |
| `playbook` | `http` | `https://playbook.mcp.createsomething.ltd/mcp` | `direct` | `14` | `core`, `workflow`, `cs`, `policy_os_only` |
| `quickbooks-notion-mcp-server` | `http` | `https://quickbooks.mcp.workway.co/mcp` | `direct` | `0` | `finance`, `quickbooks`, `notion`, `workway` |
| `schedule-mcp` | `http` | `https://schedule.mcp.createsomething.agency/mcp` | `direct` | `0` | `ops`, `scheduling`, `cs`, `policy_os_only` |
| `slack-create-something` | `http` | `https://mcp.slack.com/mcp` | `direct` | `0` | `slack`, `communication`, `cs` |
| `spotify-mcp` | `http` | `https://spotify-mcp.createsomething.workers.dev/mcp` | `direct` | `29` | `spotify`, `rapidapi`, `music`, `dify`, `observability`, `cs`, `policy_os_only` |
| `substrate-mcp` | `http` | `https://substrate.mcp.createsomething.agency/mcp` | `direct` | `0` | `ops`, `automation`, `cs`, `policy_os_only` |
| `three-tier-framework` | `http` | `https://framework.mcp.createsomething.agency/mcp` | `direct` | `6` | `core`, `framework`, `cs`, `policy_os_only` |
| `webflow-app-review-mcp` | `http` | `https://webflow-app-review-mcp.createsomething.workers.dev/mcp` | `direct` | `0` | `webflow`, `review`, `airtable`, `apps`, `cs` |
| `webflow-local` | `http` | `https://webflow-mcp.createsomething.workers.dev/mcp` | `direct` | `10` | `webflow`, `review`, `plagiarism`, `frameworks`, `cs` |
| `webflow-template-review-mcp` | `http` | `https://webflow-template-review-mcp.createsomething.workers.dev/mcp` | `direct` | `0` | `webflow`, `review`, `airtable`, `templates`, `cs` |
| `youtube-transcript-notion-mcp` | `http` | `https://youtube-transcript-notion-mcp.createsomething.workers.dev/mcp` | `direct` | `6` | `youtube`, `transcript`, `notion`, `dify`, `cs` |

## Active (composio toolkits, 984 — summarized)

Per-toolkit detail is in `registry.composio.generated.json`. This section shows
category bundles only so reviewers can audit the routing surface without scrolling
past a thousand near-identical rows.

| Composio Bundle | Toolkit Count |
| --- | ---: |
| `composio-all` | 984 |
| `composio-category-accounting` | 25 |
| `composio-category-ads-conversion` | 8 |
| `composio-category-ai-agents` | 15 |
| `composio-category-ai-assistants` | 2 |
| `composio-category-ai-chatbots` | 15 |
| `composio-category-ai-content-generation` | 9 |
| `composio-category-ai-document-extraction` | 17 |
| `composio-category-ai-meeting-assistants` | 4 |
| `composio-category-ai-models` | 20 |
| `composio-category-ai-safety-compliance-detection` | 2 |
| `composio-category-ai-sales-tools` | 6 |
| `composio-category-ai-web-scraping` | 39 |
| `composio-category-analytics` | 93 |
| `composio-category-app-builder` | 6 |
| `composio-category-artificial-intelligence` | 71 |
| `composio-category-blockchain` | 1 |
| `composio-category-bookmark-managers` | 1 |
| `composio-category-business-intelligence` | 16 |
| `composio-category-calendar` | 6 |
| `composio-category-call-tracking` | 1 |
| `composio-category-communication` | 12 |
| `composio-category-contact-management` | 20 |
| `composio-category-content-files` | 1 |
| `composio-category-crm` | 67 |
| `composio-category-customer-appreciation` | 4 |
| `composio-category-customer-support` | 31 |
| `composio-category-dashboards` | 5 |
| `composio-category-databases` | 23 |
| `composio-category-decentralized-identity` | 1 |
| `composio-category-developer-tools` | 272 |
| `composio-category-developer-tools-devops` | 1 |
| `composio-category-documents` | 57 |
| `composio-category-drip-emails` | 12 |
| `composio-category-e-commerce` | 1 |
| `composio-category-ecommerce` | 39 |
| `composio-category-education` | 10 |
| `composio-category-email` | 36 |
| `composio-category-email-newsletters` | 28 |
| `composio-category-event-management` | 13 |
| `composio-category-file-management-storage` | 20 |
| `composio-category-fitness` | 2 |
| `composio-category-forms-surveys` | 28 |
| `composio-category-fundraising` | 6 |
| `composio-category-gaming` | 5 |
| `composio-category-hr-talent-recruitment` | 9 |
| `composio-category-human-resources` | 8 |
| `composio-category-images-design` | 43 |
| `composio-category-internet-of-things` | 6 |
| `composio-category-it-operations` | 6 |
| `composio-category-lifestyle-entertainment` | 4 |
| `composio-category-marketing` | 10 |
| `composio-category-marketing-automation` | 104 |
| `composio-category-news-lifestyle` | 11 |
| `composio-category-notes` | 3 |
| `composio-category-notifications` | 13 |
| `composio-category-online-courses` | 9 |
| `composio-category-payment-processing` | 25 |
| `composio-category-phone-sms` | 28 |
| `composio-category-product-management` | 6 |
| `composio-category-productivity` | 27 |
| `composio-category-productivity-project-management` | 2 |
| `composio-category-project-management` | 43 |
| `composio-category-proposal-invoice-management` | 17 |
| `composio-category-reviews` | 5 |
| `composio-category-sales-crm` | 11 |
| `composio-category-scheduling-booking` | 19 |
| `composio-category-security-identity-tools` | 35 |
| `composio-category-server-monitoring` | 24 |
| `composio-category-signatures` | 15 |
| `composio-category-social-media-accounts` | 8 |
| `composio-category-social-media-marketing` | 14 |
| `composio-category-spreadsheets` | 9 |
| `composio-category-tag1` | 1 |
| `composio-category-tag2` | 1 |
| `composio-category-task-management` | 17 |
| `composio-category-taxes` | 2 |
| `composio-category-team-chat` | 15 |
| `composio-category-team-collaboration` | 34 |
| `composio-category-time-tracking-software` | 13 |
| `composio-category-transactional-email` | 8 |
| `composio-category-transcription` | 14 |
| `composio-category-url-shortener` | 10 |
| `composio-category-verifiable-credentials` | 1 |
| `composio-category-video-audio` | 16 |
| `composio-category-video-conferencing` | 7 |
| `composio-category-video-generation` | 1 |
| `composio-category-webinars` | 2 |
| `composio-category-website-builders` | 15 |

## Dormant (4)

| Server | Transport | Endpoint | Exposure | Est. Tools | Tags |
| --- | --- | --- | --- | --- | --- |
| `gmail-notion-mcp` | `http` | `https://gmail-notion-mcp.createsomething.workers.dev/mcp` | `direct` | `0` | `dormant`, `prototype`, `cs` |
| `loom-mcp` | `http` | `https://loom.mcp.createsomething.agency/mcp` | `dormant` | `0` | `coordination`, `loom`, `legacy`, `dormant`, `cs` |
| `notion-sync-mcp` | `http` | `https://notion-sync-mcp-worker.createsomething.workers.dev/mcp` | `direct` | `0` | `dormant`, `prototype`, `cs` |
| `slack-webflow` | `http` | `https://mcp.slack.com/mcp` | `direct` | `0` | `slack`, `communication`, `webflow` |

## Local (6)

| Server | Transport | Endpoint | Exposure | Est. Tools | Tags |
| --- | --- | --- | --- | --- | --- |
| `community-mcp` | `stdio` | `node ./packages/community-mcp/dist/index.js` | `direct` | `0` | `local`, `community`, `cs` |
| `ground-mcp` | `stdio` | `npx -y @createsomething/ground-mcp` | `direct` | `0` | `local`, `verification`, `code-quality`, `cs` |
| `harness-mcp` | `stdio` | `node ./packages/harness-mcp/dist/index.js` | `direct` | `0` | `local`, `harness`, `ops`, `cs` |
| `lsmcp` | `stdio` | `npx -y @mizchi/lsmcp mcp` | `direct` | `0` | `local`, `dev`, `filesystem` |
| `social-mcp` | `stdio` | `node ./packages/social-mcp/dist/index.js` | `direct` | `0` | `local`, `social`, `cs` |
| `ui-preview-mcp` | `stdio` | `node ./packages/ui-preview-mcp/dist/index.js` | `direct` | `0` | `local`, `ui`, `preview`, `cs` |

## Bundles

Hand-curated bundles are listed inline. Composio category bundles are listed in the Active
(composio toolkits) section above.

| Bundle | Servers |
| --- | --- |
| `abundance` | `abundance-staff-mcp`, `abundance-jobs-mcp`, `abundance-thenpgroup-hub` |
| `agency` | `outerfields-pcn` |
| `core` | `create-something`, `three-tier-framework`, `playbook` |
| `dormant` | `gmail-notion-mcp`, `notion-sync-mcp`, `loom-mcp` |
| `finance` | `quickbooks-notion-mcp-server` |
| `halfdozen` | `notion-halfdozen-create-something`, `notion-halfdozen-system-studio`, `notion-halfdozen-blondish`, `notion-halfdozen-c3-management`, `notion-halfdozen-cracked`, `notion-halfdozen-fanpad`, `notion-halfdozen-juice-labs`, `notion-halfdozen-kk-management`, `notion-halfdozen-lightswitch`, `notion-halfdozen-phase-3`, `notion-halfdozen-three-six-zero`, `halfdozen-dm-mcp`, `halfdozen-operator-notion-mcp`, `halfdozen-blondish-sync-mcp`, `half-dozen-youtube-sync` |
| `halfdozen-observability` | `halfdozen-agent-analyzer-telemetry`, `halfdozen-telemetry` |
| `halfdozen-sync` | `halfdozen-gmail-sync-danny`, `halfdozen-gmail-sync-fillip`, `halfdozen-gmail-sync-leah`, `halfdozen-zoom-sync`, `halfdozen-blondish-sync-mcp` |
| `local-dev` | `community-mcp`, `ground-mcp`, `harness-mcp`, `social-mcp`, `ui-preview-mcp`, `webflow-local`, `lsmcp` |
| `meetings` | `meetings` |
| `observability` | `cs-telemetry` |
| `ops` | `schedule-mcp`, `substrate-mcp` |
| `policy-os` | `interaction-atlas-mcp` |
| `slack` | `slack-create-something`, `slack-webflow` |
| `webflow-marketplace-app-review-phase-a` | `webflow-app-review-mcp` |
| `webflow-marketplace-app-review-phase-b` | `webflow-app-review-mcp` |
| `webflow-marketplace-review-phase-a` | `webflow-template-review-mcp` |
| `webflow-marketplace-review-phase-b` | `webflow-template-review-mcp`, `webflow-local` |
