---
name: webflow-fleet
description: Webflow MCP fleet — template review, app review, site analysis, dashboard, automation, and Webflow marketplace patterns. Use when working on any Webflow-related package.
---

# Webflow Fleet

Domain knowledge for the CREATE SOMETHING Webflow MCP cluster and related packages.

## MCP Servers

| Server | Package | URL | Status |
|--------|---------|-----|--------|
| App Review | `webflow-app-review-mcp` | `webflow-app-review-mcp.createsomething.workers.dev` | Active |
| App Reviewer Airtable | `app-reviewer-airtable-mcp` | `app-reviewer-airtable-mcp.createsomething.workers.dev` | Active |
| Webflow Zendesk | `zendesk-mcp` | `zendesk-mcp.createsomething.workers.dev` | Active |
| Template Review | `webflow-template-review-mcp` | `webflow-template-review-mcp.createsomething.workers.dev` | Active |
| Site Analyzer | `webflow-site-analyzer-mcp` | `analyzer.mcp.createsomething.agency` | Planned |
| Webflow MCP | `webflow-mcp` | `webflow-mcp.createsomething.workers.dev` | Planned |

All use `cs-telemetry` D1 for telemetry on the CREATE SOMETHING Cloudflare account.

## Related Packages (non-MCP)

| Package | Purpose |
|---------|---------|
| `webflow-dashboard` | Webflow partner dashboard app |
| `webflow-dashboard-core` | Shared dashboard logic |
| `webflow-apps-admin` | App review admin interface |
| `webflow-automation` | Workflow automation |
| `webflow-components` | Shared UI components for Webflow tools |
| `webflow-intake` | Template submission intake |
| `webflow-review` | Review interface |
| `webflow-template-analyzer` | Template quality analysis |
| `webflow-template-search` | Template search index |
| `webflow-template-validation` | Template validation rules |
| `wf-search-category` | Search category worker |

## Architecture Pattern

Webflow packages follow a governed workflow pattern:

```
Template submitted → Intake validates → Analyzer scores → Review decision
                                                              ↓
                                         Dashboard displays ← MCP serves
```

### Template Review MCP

Reviews Webflow templates against quality standards:
- Design quality scoring
- Accessibility checks
- Performance analysis
- Canon compliance (when templates use CREATE SOMETHING patterns)

### App Review MCP

Reviews Webflow apps for marketplace submission:
- Security checks
- API compliance
- User experience evaluation

## Key Files

| What | Where |
|------|-------|
| Template review logic | `packages/webflow-template-review-mcp/src/tools.ts` |
| App review logic | `packages/webflow-app-review-mcp/src/tools.ts` |
| Dashboard routes | `packages/webflow-dashboard/src/routes/` |
| Template validation | `packages/webflow-template-validation/src/` |

## Deploy

```bash
# Active MCPs
cd packages/webflow-app-review-mcp/worker && wrangler deploy
cd packages/webflow-template-review-mcp/worker && wrangler deploy

# Dashboard (Cloudflare Pages)
pnpm --filter=webflow-dashboard build
wrangler pages deploy packages/webflow-dashboard/.svelte-kit/cloudflare --project-name=webflow-dashboard
```
