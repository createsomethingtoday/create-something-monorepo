# Notion Partner Lead Packet

> Owner: CREATE SOMETHING
> Status: application-ready draft
> Scope: Notion Solutions Partner positioning, Template Marketplace proof, Builders/API proof, and Technology Partner readiness

## Positioning

CREATE SOMETHING should lead with Notion operating systems for AI-enabled
teams:

- Notion as the PM and operator-facing view.
- Linear as the engineering tracker.
- Substrate and Cloudflare as canonical state and runtime.
- MCPs, Notion Workers, and direct API scripts as the automation layer.
- Policy OS as the approval, evidence, and escalation layer.

The best Notion partner category order is:

1. `Solutions Partner`, Consulting Partner track, as the primary category.
2. `Template Marketplace` and `Builders` as proof and distribution lanes.
3. `Technology Partner` only after a public OAuth integration, public docs,
   marketplace-quality listing, and usage evidence exist.

This keeps implementation credibility ahead of product-partner claims.

## Application Narrative

CREATE SOMETHING designs Notion operating systems for teams that need AI
workflows, delivery evidence, and cross-tool automation without turning Notion
into the only source of truth.

The differentiated package is not generic Notion setup. The differentiated
package is Notion plus the CREATE SOMETHING control layer:

- PM and operator workspace architecture.
- Client timeline, risk, decision, evidence, and milestone views.
- Notion MCP surfaces and Notion Worker experiments.
- Substrate-to-Notion synchronization patterns.
- Policy artifacts for write boundaries, approval states, and evidence capture.
- Sanitized templates and setup guides that can be reused without exposing
  client data.

Use this concise application summary:

> CREATE SOMETHING builds Notion operating systems for AI-enabled teams. We
> design PM and operator workspaces, connect them to Linear and canonical
> business systems, and add governed automation through MCPs, Notion Workers,
> direct API scripts, and Policy OS artifacts. We are applying first as a
> Solutions Partner because our strongest current proof is consulting,
> implementation, training, and ongoing optimization. Our distribution lane is
> sanitized templates and builder content, with Technology Partner readiness as
> a later productized integration path.

## Proof Matrix

| Proof point | Evidence source | How to use it |
| --- | --- | --- |
| Notion developer surface strategy | `docs/guides/NOTION_WORKERS_AND_CLI_2026.md` | Shows when to use CREATE SOMETHING MCPs, Notion Worker Agent Tools, Syncs, hosted MCP, and `ntn`. |
| Agency Ops PM operating model | `docs/guides/AGENCY_OPS_PM_AGENT_NOTION_REVIEW_2026.md` | Shows Notion as the PM/operator layer, Linear as engineering tracker, and Substrate as canonical state. |
| Deployed Notion MCP fleet | `config/mcp-hub/fleet.json` | Shows multiple client-specific Notion MCP deployments with Infisical-scoped auth references. |
| Notion Worker experiment package | `packages/notion-worker-experiments` | Shows the emerging Notion Worker path for Custom Agent tools and sync experiments. |
| Notion sync packages | `packages/notion-sync-mcp`, `packages/halfdozen-notion-mcp`, `packages/quickbooks-notion-mcp` | Shows reusable MCP and sync patterns across client and internal Notion workflows. |
| Dify YouTube Transcript Notion agent | `docs/guides/DIFY_YOUTUBE_TRANSCRIPT_NOTION_AGENT.md` | Shows a cross-lane Dify plus Notion workflow that can become sanitized builder content. |

## Solutions Partner Case

Lead with Solutions Partner because CREATE SOMETHING can credibly support:

- Notion workspace architecture for PM, delivery, and evidence workflows.
- Implementation of client operating systems and team onboarding surfaces.
- Training around Notion as the operator layer rather than the canonical data
  store.
- Integrations with Linear, Cloudflare, Dify, and client-owned systems.
- Ongoing optimization, view cleanup, workflow hardening, and policy reviews.

The most credible track is Consulting Partner. Channel Partner should remain a
later option unless CREATE SOMETHING intentionally takes on Notion resale,
procurement, renewal, and expansion responsibilities.

## Template And Builder Case

Use Notion templates and builder content as the public proof lane:

- `Agency Ops PM Cockpit`: sanitized workspace for timelines, risks, decisions,
  evidence, and client updates.
- `Agent Evals And Review`: Notion-native eval and evidence management with
  external systems holding raw traces, costs, and evaluator output.
- `Client Evidence Index`: reusable delivery evidence, rollback, and approval
  review structure.
- `Notion Worker Tool Examples`: small read-only Custom Agent tools for
  engagement briefs, stale milestone review, and evidence gaps.

Templates should use sanitized demo data only. Do not export client-private
schemas, live page IDs, raw traces, or internal credentials.

## Technology Partner Readiness

Treat Technology Partner as a later product lane. Before applying or presenting
this as ready, confirm:

1. A public Notion integration exists.
2. OAuth is implemented for user authorization.
3. The integration has public documentation, a landing page, and a demo video.
4. The support path and emergency response plan are documented.
5. Privacy and security materials are ready for review.
6. Usage evidence is strong enough for Notion to see real customer demand.

Until those are true, public copy should say `Notion implementation lane`,
`Notion operating systems`, or `Notion builder proof`, not `official Notion
technology partner`.

## Public Messaging Guardrails

Approved before Notion acceptance:

- "Notion implementation lane"
- "Notion operating systems for AI-enabled teams"
- "Applying for the Notion Solutions Partner path"
- "Template and builder proof lane"
- "Technology Partner readiness path"

Not approved before Notion acceptance:

- "Official Notion Partner"
- "Certified Notion Consultant"
- "Notion-approved implementation partner"
- "Notion Technology Partner"
- Notion brand asset use that implies endorsement or approval.

## Sanitization Rules

Before any proof point leaves the repo:

1. Remove client-private records, raw traces, transcript fragments, and page IDs.
2. Replace live workspace data with generated demo data.
3. Keep Infisical paths only when the artifact is internal or already approved
   for public evidence.
4. Avoid broad connector catalogs in public screenshots.
5. Document what Notion owns, what Linear owns, and what canonical state owns.

## Submission Assets

Prepare these before submitting:

- Organization name: `CREATE SOMETHING`
- Primary category: `Solutions Partner`
- Primary track: `Consulting Partner`
- Public reference page: `/notion`
- Primary offer: `Notion operating systems with Policy OS`
- Proof: Agency Ops PM model, Notion Worker guide, deployed Notion MCP fleet,
  sanitized templates, and builder examples.
- Compliance note: no official partnership, certification, or Notion commercial
  brand claim until Notion approves it.

## Validation

Run these checks before submitting materials:

```bash
pnpm --filter @create-something/agency check
pnpm dify:inventory:check
pnpm trust:catalog:check
```

Record the exact commands, results, public page URL, and any remaining manual
application steps in Linear.
