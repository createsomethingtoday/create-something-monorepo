# Cloudflare Partner Lead Packet

> Owner: CREATE SOMETHING
> Status: application-ready draft
> Scope: Cloudflare PowerUP consult positioning, Self-Serve Agency account-management lane, and Technology Alliance readiness

## Positioning

CREATE SOMETHING should lead with Cloudflare as the runtime substrate for
governed AI workflow systems:

- Workers and Pages as the deployment surface.
- D1, KV, R2, Queues, and Durable Objects as the durable runtime layer.
- Cloudflare routes as the preview, approval, and action boundary.
- MCPs and hosted policy checks as the automation layer.
- Policy OS as the approval, evidence, and recovery layer.

The best Cloudflare partner category order is:

1. `PowerUP Partner Program`, consult route, as the primary category.
2. `Self-Serve Agency Program` as the client-account management lane when
   centralized billing and tenant administration become useful.
3. `Technology Alliance` only after CREATE SOMETHING has a public integration
   or developer product that creates repeatable Cloudflare customer value.

This keeps service delivery ahead of resale or alliance claims.

## Application Narrative

CREATE SOMETHING builds Cloudflare-native workflow systems for teams that need
AI agents and MCP tools to run close to the business without losing security,
approval, rollback, or evidence boundaries.

The differentiated package is not "Cloudflare setup" by itself. The
differentiated package is Cloudflare plus the CREATE SOMETHING control layer:

- Worker and Pages deployments for business-facing workflows.
- D1-backed operational state, approval state, and evidence records.
- Remote MCP surfaces and managed bearer-token access.
- Policy OS checks before risky actions run.
- Runbooks, rollback notes, and validation evidence attached to delivery.
- Client-safe review environments and proof surfaces.

Use this concise application summary:

> CREATE SOMETHING builds Cloudflare-native AI workflow systems for operators
> who need reliable execution, clear source-of-truth boundaries, and
> reviewable policy controls. We use Cloudflare Workers, Pages, D1, durable
> runtime primitives, and remote MCP surfaces to deploy governed workflows that
> clients can inspect and inherit. We are applying first through the consult
> route because our strongest current proof is implementation, architecture,
> and ongoing optimization. Self-Serve Agency is the next account-management
> lane, and Technology Alliance becomes relevant after a public integration is
> productized.

## Proof Matrix

| Proof point | Evidence source | How to use it |
| --- | --- | --- |
| Cloudflare runtime in agency stack | `packages/agency/src/routes/stack/+page.svelte` | Shows Cloudflare as runtime and durable data for Workers, D1, Durable Objects, queues, and edge routes. |
| Partner and entitlement surfaces | `packages/agency/src/lib/server/*partner*`, `packages/agency/src/routes/api/admin/mcp-entitlements` | Shows account, entitlement, access, and partner-prospect control-plane work. |
| Deployed MCP fleet | `config/mcp-hub/fleet.json` | Shows deployed Cloudflare-hosted MCP endpoints with tenant boundaries and bearer-token auth. |
| Policy OS runtime | `packages/agency/src/lib/canon/control.ts`, `packages/agency/src/lib/canon/workflow-context.ts` | Shows Cloudflare routes and action previews as governed execution surfaces. |
| Abundance delivery | `docs/deliveries/abundance/2026-05-14-project-update.md` | Shows a Cloudflare-backed client delivery with database, MCP/API surface, matching logic, and validation evidence. |
| Historical and client-compatibility lanes | `/dify`, `/notion` | Preserves labeled migration and client evidence without making either vendor part of the current CREATE SOMETHING runtime. |

## Repeatable Runtime Pattern

Use this pattern when explaining why the offer is more specific than general
Cloudflare implementation:

1. `Route`: expose the workflow through a Worker, Pages route, or client-safe
   review surface.
2. `Gate`: classify the action with Policy OS as allowed, approval-needed,
   blocked, or recoverable.
3. `State`: write request state, approvals, retries, and evidence to D1 or
   another durable primitive.
4. `Act`: call the scoped MCP tool or API with tenant, account, and bearer
   boundaries intact.
5. `Prove`: return a reviewable result, rollback note, runbook update, or
   escalation path.

This is the core Cloudflare-native workflow system claim.

## PowerUP Consult Case

Lead with the consult route because CREATE SOMETHING can credibly support:

- Cloudflare Worker and Pages architecture.
- D1-backed operating state and client-safe review surfaces.
- Remote MCP deployment and bearer-token governance.
- Policy OS action previews, approvals, blocked states, and evidence logs.
- Workflow hardening, runbooks, validation, and rollback plans.

Do not lead with resale unless CREATE SOMETHING intentionally takes on
procurement, renewal, margin management, and account support responsibilities.

## Self-Serve Agency Case

Use the Self-Serve Agency lane when client account volume makes it useful to:

- Manage client self-serve Cloudflare accounts from a multi-tenant view.
- Centralize billing and account administration.
- Standardize starter settings, access, and owner handoff.
- Keep CREATE SOMETHING delivery artifacts separate from Cloudflare account
  ownership.

This is an account-management lane, not a replacement for the consult offer.

## Technology Alliance Readiness

Treat Technology Alliance as a later product lane. Before applying or
presenting this as ready, confirm:

1. A public integration exists.
2. The integration creates repeatable customer value on Cloudflare.
3. Public documentation, landing page, demo, support path, and privacy/security
   materials exist.
4. The offer maps to application services, Zero Trust, network services, or
   developer services.
5. Usage evidence is strong enough to support joint customer or go-to-market
   conversation.

Until those are true, public copy should say `Cloudflare implementation lane`,
`Cloudflare-native workflow systems`, or `Cloudflare runtime substrate`, not
`official Cloudflare technology partner`.

## Public Messaging Guardrails

Approved before Cloudflare acceptance:

- "Cloudflare implementation lane"
- "Cloudflare-native workflow systems"
- "Applying through the Cloudflare partner path"
- "PowerUP consult readiness"
- "Self-Serve Agency account-management readiness"
- "Technology Alliance readiness path"

Not approved before Cloudflare acceptance:

- "Official Cloudflare Partner"
- "Certified Cloudflare Provider"
- "Cloudflare-approved implementation partner"
- "Cloudflare Technology Alliance Partner"
- Cloudflare brand asset use that implies endorsement or approval.

## Sanitization Rules

Before any proof point leaves the repo:

1. Remove client-private records, raw traces, bearer tokens, and account IDs.
2. Replace live tenant data with generated demo data.
3. Keep Infisical paths only in internal artifacts or approved evidence.
4. Avoid screenshots that expose Cloudflare account names, zones, emails, or
   billing details.
5. Document what Cloudflare owns, what CREATE SOMETHING owns, and what the
   client owns.

## Submission Assets

Prepare these before submitting:

- Organization name: `CREATE SOMETHING`
- Primary category: `PowerUP Partner Program`
- Primary route: `Consult`
- Secondary lane: `Self-Serve Agency Program`
- Later lane: `Technology Alliance`
- Public reference page: `/cloudflare`
- Primary offer: `Cloudflare-native workflow systems with Policy OS`
- Proof: agency stack, deployed MCP fleet, Cloudflare-hosted delivery systems,
  D1/action-preview governance, and sanitized client delivery examples.
- Compliance note: no official partnership, certification, or commercial
  Cloudflare brand claim until Cloudflare approves it.

## Application Readiness Checklist

- `PowerUP Consult`: ready to submit with implementation, architecture,
  training, runbook, and optimization proof.
- `Self-Serve Agency`: use when client account volume, centralized billing, or
  account administration needs a managed lane.
- `Technology Alliance`: wait until a public integration, documentation, demo,
  support path, privacy/security review, and usage proof exist.
- `Public proof`: share only sanitized diagrams, generated catalogs, delivery
  summaries, and public pages.
- `Partner stack`: keep Cloudflare as infrastructure, OpenAI as intelligence,
  CREATE SOMETHING as the owned system, and `/stack` as the ownership-boundary
  page.

## Validation

Run these checks before submitting materials:

```bash
pnpm --filter @create-something/agency check
pnpm trust:catalog:check
pnpm partner:policy:conformance --strict
```

Record the exact commands, results, public page URL, and any remaining manual
application steps in Linear.
