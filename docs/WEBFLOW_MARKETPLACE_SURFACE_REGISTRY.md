# Webflow Marketplace Surface Registry

This registry is the index of Marketplace surfaces in the monorepo.

| Surface | Type | Users | Owner | Deploy target | Role | Source of truth |
|---|---|---|---|---|---|---|
| `apps/webflow-app-form-cloud` | Hosted app | App submitters, Marketplace ops | Marketplace Senior Systems Architect | Webflow Cloud-compatible Next.js app | Public app submission form | Submission records, webhook delivery state, upload flow |
| `apps/webflow-dashboard-cloud` | Hosted app | Template creators, Marketplace reviewers | Marketplace Senior Systems Architect | Webflow Cloud-compatible Next.js app | Creator dashboard and template intake | Dashboard state, template intake flow |
| `packages/webflow-mcp` | MCP | Agents, internal operators | Marketplace engineering | MCP runtime | Marketplace tool surface for agent workflows | Agent tool contracts |
| `packages/webflow-app-review-mcp` | MCP | App review operators, agents | Marketplace engineering | MCP runtime | App review queue, reviewer workflow, and metadata-safe write tooling | App review workflows |
| `packages/webflow-template-review-mcp` | MCP | Template review operators, agents | Marketplace engineering | MCP runtime | Template review metrics and review tooling | Template review workflows |
| `packages/webflow-site-analyzer-mcp` | MCP | Agents, analysis operators | Marketplace engineering | MCP runtime | Site and Designer analysis tooling | Site analysis recipes and outputs |
| `packages/webflow-review/extension` | Designer Extension | Marketplace reviewers | Marketplace engineering | Webflow Designer Extension | Reviewer-side actions and UI | Review workflow actions |
| `packages/webflow-apps-admin` | Admin tooling | Apps Marketplace admins | Marketplace engineering | Dashboard and extension tooling | Administrative audits and reports | App admin reporting |
| `packages/webflow-automation` | Automation | Internal operators | Marketplace engineering | Worker and Airtable automation runtime | Deterministic workflow/sync execution | Automation jobs and sync state |
| `packages/webflow-marketplace-core` | Shared domain package | Apps, MCPs, extensions, automation | Marketplace engineering | Workspace package | Shared Marketplace vocabulary and contracts | Statuses, retry defaults, surface descriptors |

## Required Metadata For New Surfaces

Any new Marketplace surface added to the repo must record:

- users
- owner
- deploy target
- role
- source-of-truth system
- linked policy artifact if it enforces hard-block behavior

## Policy Linkage

The current intake governance policy is:

- `docs/policies/v1/policy.webflow-marketplace-intake-governance.v1.md`

When a surface changes hard validation rules, source-of-truth ownership, retry semantics, or escalation behavior, update this registry and the policy artifact in the same change.
