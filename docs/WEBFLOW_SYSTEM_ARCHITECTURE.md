# Webflow Systems Architecture

Status: working system map  
Last updated: 2026-05-06  
Owner lens: System Architect

## Purpose

This is the organizing map for the Webflow systems in this monorepo. Use it when
you need to tell the complete story from creator asset dashboards, submission
validation, maintenance jobs, reviewer workflows, agents, and MCP surfaces.

The short version:

> The Webflow work is not one dashboard or one validator. It is a connected
> marketplace operating system where Airtable and Webflow hold the records,
> Cloudflare/Webflow Cloud execute the workflows, and MCP/agent layers make the
> review process legible and governed.

## End-To-End Story

```text
Creator / reviewer touchpoints
        |
        v
Creator dashboard and submission UX
apps/webflow-dashboard-cloud
packages/webflow-dashboard
        |
        | validates creator, template name, images, published URL
        v
Validation and autofill services
packages/webflow-template-validation
packages/webflow-template-analyzer
packages/webflow-site-analyzer-mcp
        |
        | writes form-shaped payloads and uploads
        v
Airtable Marketplace base + R2 + KV
Assets, Asset Versions, Releases, Users, Creators, API Keys
        |
        | exposes queue, version context, review state, metrics
        v
Reviewer operations and MCP workflow surfaces
packages/webflow-template-review-mcp
packages/webflow-app-review-mcp
packages/webflow-mcp
packages/webflow-review
        |
        | brokered through Hub packs and optional Dify agents
        v
Agent and Hub layer
config/mcp-hub/*
config/dify-mcp-intake/*
config/dify-agents/*
specs/webflow-marketplace/delivery/template-review-hub/*
```

The architectural move is upstream: review evidence no longer starts only when a
human opens Airtable. The dashboard and submission flows validate earlier, the
analyzer produces structured evidence, and reviewer Hubs expose the safe subset
of queue and status operations to agents.

## Truth Surfaces

| Surface                     | Role                                                                                                                        | Main repo locations                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Airtable Marketplace base   | System of record for assets, asset versions, releases, creators, users, API keys, category analytics, and leaderboard data. | `packages/webflow-dashboard-core/src/airtable.ts`, `packages/webflow-template-review-mcp`, `packages/webflow-app-review-mcp`                           |
| Webflow published sites     | Runtime evidence for crawls, links, SEO, images, GSAP, public page coverage, and submission eligibility.                    | `apps/webflow-dashboard-cloud/lib/intake/published-url.ts`, `packages/webflow-template-validation`, `packages/webflow-site-analyzer-mcp`               |
| Webflow Designer state      | Authoring evidence for pages, classes, components, CMS collections, interactions, assets, and checklist scoring.            | `packages/webflow-template-validation/extension`, `packages/webflow-site-analyzer-mcp/src/providers/designer-metadata-parsers.ts`                      |
| Webflow review policy       | External policy artifact used to ground analyzer/review results.                                                            | `packages/webflow-site-analyzer-mcp/src/policy/index.ts`, `packages/webflow-review/workers/orchestrator/src/index.ts`                                  |
| Upload storage and sessions | Operational substrate for dashboard uploads, login sessions, rate limits, and temporary assets.                             | `packages/webflow-dashboard-core/src/r2.ts`, `packages/webflow-dashboard-core/src/kv.ts`, `apps/webflow-dashboard-cloud/app/api/cron/cleanup/route.ts` |
| Hub and agent configuration | Governed exposure of MCPs to reviewers and agents.                                                                          | `config/mcp-hub/registry.json`, `config/mcp-hub/discovery-packs.json`, `config/dify-mcp-intake/*`, `config/dify-agents/*`                              |

## Three-Tier Map

| Tier       | Webflow meaning                                                                                        | Representative systems                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Database   | What exists: records, sites, files, policy snapshots, telemetry, queue state.                          | Airtable, Webflow sites, R2 uploads, KV sessions, D1 review history, MCP registry files                                   |
| Automation | What happens: validation, crawling, sync, queue processing, webhook delivery, MCP tool calls.          | Dashboard API routes, template validator worker, analyzer MCP, review orchestrator, Cloudflare Queues, Hub deploy scripts |
| Judgment   | What should happen: reviewer decision boundaries, policy selection, agent recommendations, escalation. | Template review delivery pack, agent contracts, reviewer playbooks, Dify prompts, policy coverage matrix                  |

Debug in this order: data availability, execution path, policy boundary. For
example, a failed reviewer recommendation is not only an agent issue. First
check whether Airtable and the published site have the right state, then whether
the analyzer/MCP call succeeded, then whether the policy pack allowed the
requested action.

## System Lanes

| Lane                                   | Purpose                                                                                                                                                                          | Main source                                                                                                                                                            | Current posture                                                                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Creator asset dashboard                | Creator-facing asset list, detail/edit/archive, login, profile, API keys, analytics, submission tracking.                                                                        | `apps/webflow-dashboard-cloud`, `packages/webflow-dashboard-core`, `packages/webflow-dashboard`                                                                        | `apps/webflow-dashboard-cloud` is the Webflow Cloud/Next.js port; `packages/webflow-dashboard` remains the SvelteKit source reference.             |
| Creator intake and template submission | Validates creator eligibility, template name, published URL, preview URL, image constraints, agreement/checklist, then posts Airtable-compatible webhook envelopes.              | `apps/webflow-dashboard-cloud/app/api/intake/*`, `packages/webflow-dashboard-core/src/marketplace-webhook.ts`                                                          | Active MVP lane in the Cloud dashboard.                                                                                                            |
| Upload and image handling              | Client-side WebP checks, server R2 uploads, upload serving, stale upload cleanup.                                                                                                | `apps/webflow-dashboard-cloud/components/template-intake.tsx`, `packages/webflow-dashboard-core/src/upload-validation.ts`, `packages/webflow-dashboard-core/src/r2.ts` | R2-backed. Cleanup route deletes objects older than one day when invoked with the cron secret.                                                     |
| Published URL validation               | Confirms a public `.webflow.io` site can be crawled and passes marketplace validation checks before template submission.                                                         | `apps/webflow-dashboard-cloud/lib/intake/published-url.ts`                                                                                                             | Uses external validation worker workflow at `gsap-validation-worker.createsomething.workers.dev/crawlWebsite`; final submission reruns validation. |
| Template analyzer autofill             | Uses a published URL to suggest template name, descriptions, categories, pricing, page count, CMS/ecommerce flags, styles, features, and screenshots.                            | `apps/webflow-dashboard-cloud/lib/intake/template-analyzer.ts`, `packages/webflow-template-analyzer/cloudflare/src/index.ts`                                           | Cloudflare Container wrapper around analyzer backend; dashboard treats autofill as helpful but non-blocking.                                       |
| Webflow Way validator                  | Companion validation app, Designer extension, and worker for guideline checks, async review progress, snippet bridge, and asset/content/accessibility/interactions validators.   | `packages/webflow-template-validation`                                                                                                                                 | Creator/reviewer validation surface; broader than the dashboard's published URL gate.                                                              |
| Browser-backed analyzer MCP            | MCP tools for published-site and Designer metadata extraction, policy ingestion, checklist scoring, screenshots, provider status, job queueing, and self-improvement/versioning. | `packages/webflow-site-analyzer-mcp`                                                                                                                                   | Planned/Phase B Hub analysis server in registry; supports local, HTTP, Worker, container, Temporal, and Durable Object-backed modes.               |
| Template review MCP                    | Airtable-scoped MCP for template Assets, Asset Versions, Releases, queue metrics, reviewer assignment, bounded feedback/status writes, and prompts/resources.                    | `packages/webflow-template-review-mcp`                                                                                                                                 | Active Phase A reviewer MCP. This is the authoritative reviewer workflow surface today.                                                            |
| App review MCP                         | Airtable-scoped MCP for app review Assets and Asset Versions with reviewer-safe workflow verbs and app marketplace status tools.                                                 | `packages/webflow-app-review-mcp`                                                                                                                                      | Active app review MCP; Phase A/Phase B discovery packs expose different breadth.                                                                   |
| Webflow marketplace MCP                | Plagiarism, framework, similarity, confidence, and PageRank-style originality tools.                                                                                             | `packages/webflow-mcp`                                                                                                                                                 | Registry slug `webflow-local`; planned Phase B analysis/originality support.                                                                       |
| Cloudflare review service              | Extension plus orchestrator and queue consumer for synchronous page review, async project review, D1 findings, queue processing, screenshots, and policy context.                | `packages/webflow-review`                                                                                                                                              | Cloudflare-native review service. Useful as the review-platform implementation lineage.                                                            |
| Search and admin utilities             | Template search index, app marketplace audit tooling, duplicate Client ID detection, and submission/admin helper scripts.                                                        | `packages/webflow-template-search`, `packages/webflow-apps-admin`                                                                                                      | Adjacent operator systems, not the main reviewer Hub lane.                                                                                         |
| Webflow automation                     | Airtable scripts and a worker for partner onboarding sync and Slack/Airtable/Codex loops.                                                                                        | `packages/webflow-automation`                                                                                                                                          | Adjacent automation lane with shared Airtable/worker patterns.                                                                                     |
| IC MVP to Code Components              | Intake path for turning internal MVPs into Webflow Code Components.                                                                                                              | `packages/webflow-intake`, `packages/webflow-components`, `packages/bundle-scanner`                                                                                    | Related system architect story for internal tool productization.                                                                                   |

## Critical Workflows

### 1. Creator Dashboard To Airtable

1. Creator logs in through magic-link session flow.
2. Dashboard reads Airtable creator and asset records.
3. Creator uploads WebP images to R2 through dashboard upload APIs.
4. Template submission validates creator eligibility, template name, published
   URL, preview URL, images, terms, and checklist confirmation.
5. Dashboard builds a Webflow form-shaped Airtable webhook envelope.
6. Airtable automation ingests the creator or template submission into the
   Marketplace base.

Key code:

- `apps/webflow-dashboard-cloud/README.md`
- `apps/webflow-dashboard-cloud/app/api/intake/template/route.ts`
- `apps/webflow-dashboard-cloud/app/api/intake/creator/route.ts`
- `packages/webflow-dashboard-core/src/marketplace-webhook.ts`

### 2. Published URL Validation To Autofill

1. User enters a `.webflow.io` published URL.
2. Dashboard normalizes the URL and starts the validation worker workflow.
3. Dashboard polls until the full crawl returns success, failure, or timeout.
4. If validation passes, dashboard awaits analyzer autofill.
5. Analyzer suggestions fill fields only when doing so does not overwrite a
   user-edited value.
6. Final template submission reruns validation before webhook delivery.

Key code:

- `apps/webflow-dashboard-cloud/lib/intake/published-url.ts`
- `apps/webflow-dashboard-cloud/lib/intake/template-analyzer.ts`
- `apps/webflow-dashboard-cloud/components/template-intake.tsx`
- `packages/webflow-template-analyzer/cloudflare/src/index.ts`

### 3. Reviewer Queue To Human-Owned Decision

1. Airtable remains the review state database.
2. `webflow-template-review-mcp` exposes queue, asset, version, release,
   field-map, reviewer identity, and reviewer workflow resources.
3. Phase A reviewer Hubs expose template review context and narrow
   reviewer-safe write verbs.
4. Phase B adds analysis/originality surfaces after `webflow-site-analyzer-mcp`
   and `webflow-local` are enabled and verified.
5. Agent outputs are recommendation, rationale, evidence, draft feedback, next
   action, and audit fields. Final decisions remain reviewer-owned.

Key docs:

- `specs/webflow-marketplace/delivery/template-review-hub/README.md`
- `specs/webflow-marketplace/delivery/template-review-hub/mcp_contract.yaml`
- `specs/webflow-marketplace/delivery/template-review-hub/agent_contract.yaml`
- `specs/webflow-marketplace/delivery/template-review-hub/runbook.md`

### 4. Agent And MCP Packaging

The Hub registry turns implementation packages into controlled capability
bundles:

| Bundle                                   | Servers                                                                     | Meaning                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `webflow-marketplace-review-phase-a`     | `webflow-template-review-mcp`                                               | Template queue/context plus bounded reviewer workflow actions. |
| `webflow-marketplace-review-phase-b`     | `webflow-template-review-mcp`, `webflow-site-analyzer-mcp`, `webflow-local` | Template workflow plus analysis and originality tools.         |
| `webflow-marketplace-app-review-phase-a` | `webflow-app-review-mcp`                                                    | App review context with narrow exposure.                       |
| `webflow-marketplace-app-review-phase-b` | `webflow-app-review-mcp`                                                    | Broader app-review tool surface.                               |

The Dify intake artifacts record how these MCPs should be registered in Dify
Studio after tool discovery. Reviewer agent prompts in `config/dify-agents/*`
then instruct agents to use Hub proxy tools, prefer read-only analysis, require
explicit approval for writes, and cite evidence.

Key files:

- `config/mcp-hub/registry.json`
- `config/mcp-hub/discovery-packs.json`
- `config/dify-mcp-intake/webflow-template-review.json`
- `config/dify-mcp-intake/webflow-app-review.json`
- `config/dify-mcp-intake/webflow-site-analyzer.json`
- `config/dify-mcp-intake/webflow-local.json`

## Cron Jobs, Queues, And Maintenance

| Loop                           | Location                                                                                             | What it does                                                                                         | Operational note                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Dashboard upload cleanup       | `apps/webflow-dashboard-cloud/app/api/cron/cleanup/route.ts`                                         | Deletes R2 objects older than one day.                                                               | Requires `CRON_SECRET`; scheduling is external until Webflow Cloud scheduling is confirmed. |
| Marketplace freshness estimate | `packages/webflow-dashboard-core/src/sync-schedule.ts`                                               | Computes expected last/next marketplace sync, currently Mondays at 16:00 UTC.                        | This is dashboard metadata, not the sync job itself.                                        |
| Asset link cleanup             | `scripts/daily-asset-link-cleanup.mjs`                                                               | Removes archived linked records from an Airtable Assets link field.                                  | Requires Airtable token and should be run as a controlled maintenance job.                  |
| Webflow review queue           | `packages/webflow-review/workers/queue-consumer/src/index.ts`                                        | Processes async project review pages, stores findings, retries failures, optionally calls webhook.   | Cloudflare Queue-backed.                                                                    |
| Validator async review jobs    | `packages/webflow-template-validation/worker/src/index.ts`                                           | Tracks app-validator review start/status/events/cancel flows and snippet token lifecycle.            | Worker stores in memory plus Durable Object support for review state.                       |
| Analyzer template review jobs  | `packages/webflow-site-analyzer-mcp/src/template-review-jobs.ts`                                     | Queues browser-backed template reviews with progress phases and optional Durable Object persistence. | Used by analyzer MCP and planned reviewer Phase B flows.                                    |
| Hub reviewer deploy/vault sync | `scripts/cs-hub-webflow-reviewers-phase-a-*.sh`, `scripts/cs-hub-webflow-app-reviewers-phase-a-*.sh` | Deploys reviewer-specific Hubs and syncs bearer/session secrets.                                     | Treat as production operations; record evidence in Linear when available.                   |
| MCP quality gates              | `.github/workflows/mcp-quality-gate.yml`, `scripts/mcp-quality-gate.mjs`                             | Typecheck/lint/test active MCP packages.                                                             | Cross-MCP reliability gate, not Webflow-only.                                               |

## How To Tell The Complete Story

Use this narrative in stakeholder docs or walkthroughs:

1. **Start with the database.** The Marketplace base is the operational source
   of truth for assets, versions, releases, creators, reviewers, status, and
   analytics.
2. **Show the creator layer.** The asset dashboard and submission flow let
   creators see their records, upload valid assets, validate published sites,
   and submit form-shaped data back into the Marketplace system.
3. **Show the automation layer.** Validators, analyzers, Cloudflare Workers,
   queues, containers, R2, KV, and maintenance scripts do the deterministic work
   before and during review.
4. **Show the reviewer layer.** Template and app review MCPs expose the Airtable
   review workflow as resources and tools, while analyzer/originality MCPs add
   evidence for Phase B.
5. **Show the judgment layer.** Agent contracts, reviewer playbooks, Hub packs,
   and Dify prompts make the boundary explicit: agents can gather evidence and
   draft recommendations, but human reviewers own marketplace decisions.

The system architect story is that these are connected surfaces of one operating
model, not a pile of apps. The same pattern repeats throughout: records first,
then bounded automation, then governed judgment.

## Documentation Gaps To Close Next

- Confirm live runtime status for the Zapier response-classification agent and
  reconcile the current-state docs that describe it differently.
- Decide whether the canonical dashboard is now `apps/webflow-dashboard-cloud`
  with `packages/webflow-dashboard` as historical reference, or whether both
  remain active surfaces.
- Add a deployment/runbook page for the external scheduler that invokes the
  dashboard upload cleanup route.
- Add a Webflow-specific MCP runtime matrix showing which servers are active,
  planned, or Dify-pending, with owner, token source, deploy command, and smoke
  command.
- Regenerate Dify inventory and coverage docs after Webflow MCP tool discovery
  is completed in Dify Studio.
- Create a visual diagram for this document once the runtime posture is
  confirmed.

## Related Reading

- `docs/WEBFLOW_MARKETPLACE_SYSTEMS_HANDOFF.md`
- `specs/webflow-marketplace/OVERVIEW.md`
- `specs/webflow-marketplace/system-context.md`
- `specs/webflow-analyzer-series.md`
- `docs/webflow-template-checklist-mcp-coverage.md`
- `docs/webflow-marketplace-ai-summary.md`
- `docs/MCP_FLEET_REGISTRY.md`
- `packages/io/content/experiments/webflow-analyzer-lineage.md`
- `packages/io/content/papers/webflow-dashboard-refactor.md`
