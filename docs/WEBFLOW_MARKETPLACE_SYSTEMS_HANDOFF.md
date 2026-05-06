# Webflow Marketplace Systems Handoff

Status: shareable orientation  
Audience: Webflow coworkers working near Marketplace, review operations, creator
experience, apps, or agent/MCP tooling  
Last updated: 2026-05-06

## Suggested Share Note

I put together a map of the Webflow Marketplace systems in this monorepo so it
is easier to see where the dashboard, validation, reviewer workflows, cron
jobs, agents, and MCPs live. Start here if you need to trace a feature, debug a
workflow, or understand how the creator-facing and reviewer-facing pieces fit
together.

Primary deep-dive: `docs/WEBFLOW_SYSTEM_ARCHITECTURE.md`

## GitHub Quick Links

These links target the pushed branch `emdash/webflow-system-bi3oy` in
`createsomethingtoday/create-something-monorepo` so they work before merge.
Local repo paths are still listed throughout the rest of this handoff for
search/copy-paste use.

| Area                              | GitHub link                                                                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| This handoff                      | [docs/WEBFLOW_MARKETPLACE_SYSTEMS_HANDOFF.md](https://github.com/createsomethingtoday/create-something-monorepo/blob/emdash/webflow-system-bi3oy/docs/WEBFLOW_MARKETPLACE_SYSTEMS_HANDOFF.md)                       |
| Deep architecture map             | [docs/WEBFLOW_SYSTEM_ARCHITECTURE.md](https://github.com/createsomethingtoday/create-something-monorepo/blob/emdash/webflow-system-bi3oy/docs/WEBFLOW_SYSTEM_ARCHITECTURE.md)                                       |
| Docs index                        | [docs/README.md](https://github.com/createsomethingtoday/create-something-monorepo/blob/emdash/webflow-system-bi3oy/docs/README.md)                                                                                 |
| Dashboard Cloud README            | [apps/webflow-dashboard-cloud/README.md](https://github.com/createsomethingtoday/create-something-monorepo/blob/emdash/webflow-system-bi3oy/apps/webflow-dashboard-cloud/README.md)                                 |
| Dashboard Cloud app               | [apps/webflow-dashboard-cloud](https://github.com/createsomethingtoday/create-something-monorepo/tree/emdash/webflow-system-bi3oy/apps/webflow-dashboard-cloud)                                                     |
| Dashboard shared core             | [packages/webflow-dashboard-core](https://github.com/createsomethingtoday/create-something-monorepo/tree/emdash/webflow-system-bi3oy/packages/webflow-dashboard-core)                                               |
| SvelteKit dashboard reference     | [packages/webflow-dashboard](https://github.com/createsomethingtoday/create-something-monorepo/tree/emdash/webflow-system-bi3oy/packages/webflow-dashboard)                                                         |
| Template validation package       | [packages/webflow-template-validation](https://github.com/createsomethingtoday/create-something-monorepo/tree/emdash/webflow-system-bi3oy/packages/webflow-template-validation)                                     |
| Site analyzer MCP                 | [packages/webflow-site-analyzer-mcp](https://github.com/createsomethingtoday/create-something-monorepo/tree/emdash/webflow-system-bi3oy/packages/webflow-site-analyzer-mcp)                                         |
| Template review MCP               | [packages/webflow-template-review-mcp](https://github.com/createsomethingtoday/create-something-monorepo/tree/emdash/webflow-system-bi3oy/packages/webflow-template-review-mcp)                                     |
| App review MCP                    | [packages/webflow-app-review-mcp](https://github.com/createsomethingtoday/create-something-monorepo/tree/emdash/webflow-system-bi3oy/packages/webflow-app-review-mcp)                                               |
| Marketplace/plagiarism MCP        | [packages/webflow-mcp](https://github.com/createsomethingtoday/create-something-monorepo/tree/emdash/webflow-system-bi3oy/packages/webflow-mcp)                                                                     |
| Reviewer Hub delivery pack        | [specs/webflow-marketplace/delivery/template-review-hub](https://github.com/createsomethingtoday/create-something-monorepo/tree/emdash/webflow-system-bi3oy/specs/webflow-marketplace/delivery/template-review-hub) |
| Marketplace architecture overview | [specs/webflow-marketplace/OVERVIEW.md](https://github.com/createsomethingtoday/create-something-monorepo/blob/emdash/webflow-system-bi3oy/specs/webflow-marketplace/OVERVIEW.md)                                   |
| Hub registry                      | [config/mcp-hub/registry.json](https://github.com/createsomethingtoday/create-something-monorepo/blob/emdash/webflow-system-bi3oy/config/mcp-hub/registry.json)                                                     |
| Hub discovery packs               | [config/mcp-hub/discovery-packs.json](https://github.com/createsomethingtoday/create-something-monorepo/blob/emdash/webflow-system-bi3oy/config/mcp-hub/discovery-packs.json)                                       |

## One-Minute Summary

The Marketplace systems are connected through a simple lifecycle:

```text
creator submission
  -> dashboard/intake validation
  -> Airtable Marketplace records
  -> reviewer workflow
  -> MCP/agent evidence and governed actions
  -> human-owned marketplace decision
```

The important point: this is not just a dashboard and not just an analyzer. The
dashboard, validator, analyzer, review MCPs, Hub packs, and agent prompts are
different surfaces of one operating model.

## Where To Start

| Need                                         | Start here                                                         | Why                                                                |
| -------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Overall architecture story                   | `docs/WEBFLOW_SYSTEM_ARCHITECTURE.md`                              | Complete map from dashboard to validator to agents/MCPs.           |
| Creator dashboard and Webflow Cloud app      | `apps/webflow-dashboard-cloud/README.md`                           | Current Next.js/Webflow Cloud dashboard surface.                   |
| Shared dashboard domain logic                | `packages/webflow-dashboard-core`                                  | Airtable, R2, KV, sessions, webhook envelopes, validation helpers. |
| SvelteKit dashboard reference                | `packages/webflow-dashboard`                                       | Earlier dashboard implementation and source reference.             |
| Marketplace agentic architecture exploration | `specs/webflow-marketplace/OVERVIEW.md`                            | Broader discovery and architecture framing.                        |
| Reviewer Hub delivery pack                   | `specs/webflow-marketplace/delivery/template-review-hub/README.md` | Operational package for reviewer-specific Hub rollout.             |
| Checklist automation coverage                | `docs/webflow-template-checklist-mcp-coverage.md`                  | What can be automated, partially detected, or must stay manual.    |
| Stakeholder AI summary                       | `docs/webflow-marketplace-ai-summary.md`                           | Plain-English summary of how AI is used around Marketplace.        |

## System Directory

### Creator And Dashboard Surfaces

| System                     | Location                                                      | Notes                                                                                              |
| -------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Webflow Dashboard Cloud    | `apps/webflow-dashboard-cloud`                                | Current creator dashboard and submission UX target for Webflow Cloud.                              |
| Dashboard shared core      | `packages/webflow-dashboard-core`                             | Shared Airtable, upload, session, submission, marketplace webhook, and sync helpers.               |
| Dashboard source reference | `packages/webflow-dashboard`                                  | SvelteKit/Cloudflare dashboard implementation used as parity reference.                            |
| Creator intake routes      | `apps/webflow-dashboard-cloud/app/api/intake/*`               | Creator profile, template submission, name checks, email checks, upload, published URL validation. |
| Template intake UI         | `apps/webflow-dashboard-cloud/components/template-intake.tsx` | Multi-step creator/template submission interface and client-side image validation.                 |

### Validation And Analyzer Surfaces

| System                             | Location                                                       | Notes                                                                                                                                    |
| ---------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Published URL validation           | `apps/webflow-dashboard-cloud/lib/intake/published-url.ts`     | Normalizes `.webflow.io` URLs, starts/polls validation worker workflow, summarizes crawl results.                                        |
| Template analyzer autofill         | `apps/webflow-dashboard-cloud/lib/intake/template-analyzer.ts` | Maps analyzer output into template form fields and screenshot links.                                                                     |
| Template analyzer container worker | `packages/webflow-template-analyzer/cloudflare/src/index.ts`   | Cloudflare Container wrapper around analyzer backend.                                                                                    |
| Webflow Way validator              | `packages/webflow-template-validation`                         | Next.js app, Designer extension, and Cloudflare worker for Webflow Way checks and async review flows.                                    |
| Browser-backed analyzer MCP        | `packages/webflow-site-analyzer-mcp`                           | MCP tools for published-site analysis, Designer metadata, policy snapshots, checklist scoring, screenshots, and queued template reviews. |
| Validation coverage matrix         | `docs/webflow-template-checklist-mcp-coverage.md`              | Current auto/partial/manual checklist map.                                                                                               |

### Reviewer And Review Operations

| System                           | Location                                                                                                | Notes                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Template review MCP              | `packages/webflow-template-review-mcp`                                                                  | Airtable-scoped MCP for template queue, assets, versions, releases, reviewer assignment, feedback, and status operations. |
| App review MCP                   | `packages/webflow-app-review-mcp`                                                                       | Airtable-scoped MCP for app review assets, versions, reviewer workflow, and marketplace status operations.                |
| Marketplace/plagiarism MCP       | `packages/webflow-mcp`                                                                                  | Similarity, plagiarism, framework detection, confidence, and PageRank-style originality tools.                            |
| Cloudflare review service        | `packages/webflow-review`                                                                               | Review extension, orchestrator worker, queue consumer, D1 findings, and policy-context endpoint.                          |
| Reviewer Hub delivery pack       | `specs/webflow-marketplace/delivery/template-review-hub`                                                | Contracts, playbooks, rollout plans, golden tasks, runtime posture, and operator runbooks.                                |
| Reviewer-specific identity seeds | `docs/examples/webflow-template-review-user-seed.csv`, `docs/examples/webflow-app-review-user-seed.csv` | Seed data for reviewer identity and Hub mapping.                                                                          |

### Agents, MCP Hub, And Dify

| System                  | Location                                                             | Notes                                                                                 |
| ----------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| MCP Hub registry        | `config/mcp-hub/registry.json`                                       | Server registry, URLs, auth env var names, catalog metadata, and bundles.             |
| Discovery packs         | `config/mcp-hub/discovery-packs.json`                                | Phase A/Phase B Webflow reviewer bundles.                                             |
| Webflow Dify MCP intake | `config/dify-mcp-intake/webflow-*.json`                              | Instructions for registering Webflow MCP servers in Dify Studio after tool discovery. |
| Reviewer Dify agents    | `config/dify-agents/*-hub.*`                                         | Agent prompts/configs that route through Hub tools and enforce read/write boundaries. |
| Fleet registry docs     | `docs/MCP_FLEET_REGISTRY.md`, `docs/MCP_FLEET_REGISTRY.generated.md` | Human and generated MCP fleet status views.                                           |

### Maintenance, Cron Jobs, And Ops

| System                         | Location                                                                                                                  | Notes                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Dashboard upload cleanup       | `apps/webflow-dashboard-cloud/app/api/cron/cleanup/route.ts`                                                              | Deletes old R2 uploads when invoked with `CRON_SECRET`.                                  |
| Marketplace freshness metadata | `packages/webflow-dashboard-core/src/sync-schedule.ts`                                                                    | Computes last/next expected marketplace sync time for dashboard display.                 |
| Daily asset link cleanup       | `scripts/daily-asset-link-cleanup.mjs`                                                                                    | Airtable maintenance script for removing archived linked records from asset link fields. |
| Template reviewer Hub deploy   | `scripts/cs-hub-webflow-reviewers-phase-a-deploy.sh`                                                                      | Deploy/normalize/verify path for template reviewer Hubs.                                 |
| App reviewer Hub deploy        | `scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh`                                                                  | Deploy/normalize/verify path for app reviewer Hubs.                                      |
| Vault sync scripts             | `scripts/cs-hub-webflow-reviewers-phase-a-vault-sync.sh`, `scripts/cs-hub-webflow-app-reviewers-phase-a-vault-sync.sh`    | Secret sync support for reviewer Hub surfaces.                                           |
| Auth0 provisioning checklists  | `docs/WEBFLOW_TEMPLATE_REVIEW_AUTH0_PROVISIONING_CHECKLIST.md`, `docs/WEBFLOW_APP_REVIEW_AUTH0_PROVISIONING_CHECKLIST.md` | Reviewer user setup and identity provisioning steps.                                     |

### Adjacent Webflow Builder Systems

| System                  | Location                           | Notes                                                                                |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------------------------------ |
| IC MVP intake           | `packages/webflow-intake`          | Path for evaluating internal MVPs and translating them into Webflow Code Components. |
| Webflow Code Components | `packages/webflow-components`      | Component wrappers and Webflow component library work.                               |
| Bundle Scanner          | `packages/bundle-scanner`          | Graduated IC MVP and app review/security-adjacent tooling.                           |
| Template search         | `packages/webflow-template-search` | Cloudflare Worker search service for template marketplace search.                    |
| Apps admin tools        | `packages/webflow-apps-admin`      | Browser console/extension tooling for Apps Marketplace audits.                       |
| Webflow automation      | `packages/webflow-automation`      | Airtable scripts and worker services for Webflow integration automation.             |

## Common Questions

### Where is the current dashboard?

Use `apps/webflow-dashboard-cloud` for the current Webflow Cloud/Next.js
dashboard work. Use `packages/webflow-dashboard` when you need the earlier
SvelteKit dashboard implementation or parity reference.

### Where is Airtable mapping logic?

Start with `packages/webflow-dashboard-core/src/airtable.ts` for dashboard
reads/writes and `packages/webflow-dashboard-core/src/marketplace-webhook.ts`
for the Webflow form-shaped payloads that Airtable automations ingest.

For reviewer MCP flows, use the MCP-specific Airtable clients in:

- `packages/webflow-template-review-mcp/src/airtable.ts`
- `packages/webflow-app-review-mcp/src/airtable.ts`

### Where is published-site validation?

The dashboard gate lives in
`apps/webflow-dashboard-cloud/lib/intake/published-url.ts`. The broader
validator system lives in `packages/webflow-template-validation`, and the
browser-backed MCP analyzer lives in `packages/webflow-site-analyzer-mcp`.

### Where are reviewer workflow rules?

Start with
`specs/webflow-marketplace/delivery/template-review-hub/agent_contract.yaml` and
`specs/webflow-marketplace/delivery/template-review-hub/mcp_contract.yaml`.
Those define what agents can read, what requires explicit reviewer approval, and
what is blocked.

### Where do agents connect?

The Hub registry and discovery packs are in `config/mcp-hub`. Dify registration
intake files are in `config/dify-mcp-intake`, and reviewer agent prompts live in
`config/dify-agents`.

### What should stay human-owned?

Final marketplace decisions. Agents and MCPs can gather evidence, summarize,
draft, assign within bounded workflows, and perform approved state changes. They
should not autonomously approve, reject, request changes, or send creator-facing
communication without explicit reviewer action.

## Current Caveats

- Some docs still describe historical systems. Prefer this handoff and
  `docs/WEBFLOW_SYSTEM_ARCHITECTURE.md` as the current map.
- `apps/webflow-dashboard-cloud` appears to be the current dashboard target, but
  `packages/webflow-dashboard` still matters as source/reference history.
- Phase A reviewer Hubs are centered on `webflow-template-review-mcp` or
  `webflow-app-review-mcp`. Analyzer/originality MCPs are Phase B unless their
  runtime posture is explicitly enabled and verified.
- Secrets should stay in Infisical or the relevant platform secret store. Repo
  docs should name env vars and secret references, not secret values.
