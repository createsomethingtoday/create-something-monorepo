# Moltworker Operator Companion

> Status: preferred evaluation path.
> Purpose: run the internal CREATE SOMETHING operator companion on Cloudflare
> before using any Vercel-first TrustClaw deployment path.

Moltworker / RELAY is the preferred runtime candidate for the internal operator
companion.

Retool remains the control plane. The monorepo remains the source of truth.
Moltworker is the action/runtime surface underneath Retool.

Repo package:

- package: `packages/relay`
- Wrangler config: `packages/relay/wrangler.jsonc`
- preflight: `pnpm moltworker:preflight`

## Position

Use Moltworker when the business needs an internal chief-of-staff assistant that
can:

- brief
- summarize
- route work
- create low-risk internal tasks
- run scheduled checks
- call bounded tools
- prepare approval packets for Retool

Do not use Moltworker as:

- the CEO
- the client portal
- the durable source of truth
- the approval surface
- the billing or contract system
- the default client-facing product

## Why Moltworker First

Moltworker is closer to the CREATE SOMETHING platform posture than the current
TrustClaw upstream path:

- Cloudflare Workers host the entrypoint Worker and API router.
- Cloudflare Sandbox SDK / Containers isolate the OpenClaw runtime.
- R2 provides persistent storage across container lifecycle.
- Cloudflare Access protects admin and operator endpoints.
- AI Gateway gives model-request visibility and cost controls.
- Browser Rendering can support browser automation.
- Chat integrations can be added only after the secure core path is validated.

TrustClaw remains parked as a Vercel exception path. Use
`docs/guides/TRUSTCLAW_VERCEL_DEPLOYMENT.md` only if Moltworker fails evaluation
or a Vercel-specific feature is required.

## Can Composio Still Be Used?

Yes.

Composio can still be used with Moltworker, but it should remain hidden
integration plumbing behind CREATE SOMETHING-controlled tools.

Preferred patterns:

1. CREATE SOMETHING MCP wrapper
   - A Worker or MCP server uses `@create-something/composio-bridge`.
   - Moltworker calls the CREATE SOMETHING tool.
   - Retool shows tool availability, approval state, connected-account status,
     and revocation paths.

2. OpenClaw skill wrapper
   - A RELAY/OpenClaw skill calls a narrow CREATE SOMETHING endpoint.
   - That endpoint performs the Composio-backed action.
   - Risky actions return a Retool approval packet instead of executing.

3. Internal-only direct execution
   - Acceptable for private low-risk operator actions.
   - Not acceptable as the default client surface.

Blocked patterns:

- exposing Composio branding as the product surface
- storing raw client app keys inside Moltworker, OpenClaw, Retool, or repo files
- letting Moltworker autonomously send external messages or mutate production
  records without Retool approval
- making direct Composio-hosted MCP URLs the default client delivery path

## Required Smoke Tests

Before operational use:

1. Run `pnpm moltworker:preflight`.
2. Run `pnpm moltworker:preflight -- --check-auth` when Cloudflare auth should
   be available.
3. Deploy Moltworker to the CREATE SOMETHING Cloudflare account.
4. Protect admin/operator routes with Cloudflare Access.
5. Rotate any old gateway token from historical experiments.
6. Verify gateway-token enforcement.
7. Verify R2 persistence across container restart.
8. Verify AI Gateway request logging and cost visibility.
9. Connect one low-risk Composio account.
10. Execute one read-only Composio-backed tool call.
11. Execute one approval-required action and confirm it stops in Retool.
12. Confirm connected-account revocation is visible from Retool.
13. Measure cold start and normal response latency.
14. Record actual cost after one week and one billing cycle.

## Retool Contract

Retool must show:

- connected accounts
- allowed tools
- pending approvals
- recent action summaries
- failed action summaries
- pause controls
- revocation path
- client-visible update drafts

Retool must not expose:

- raw secrets
- raw agent scratchpads
- private Webflow/client data outside its allowed workstream
- direct Composio-hosted tool catalogs as the product surface

## Authority Levels

| Level | Authority | Examples |
| --- | --- | --- |
| 1 | Read and summarize | briefs, status summaries, link lookup |
| 2 | Create drafts and tasks | Linear issues, email drafts, Retool draft records |
| 3 | Low-risk internal actions | status updates, internal notes, safe checks |
| 4 | Approval required | client messages, workflow retries, deployments, permission changes |
| 5 | Blocked | delete records, change secrets, make hiring decisions, publish proof |

## Decision Rule

Use Moltworker / RELAY when the job is:

> Operate internally across tools and prepare work for Retool approval.

Use Retool when the job is:

> Show state, request approval, expose client-visible surfaces, pause work, or
> record delivery evidence.

Use Composio when the job is:

> Connect to commodity SaaS tools through managed OAuth and tool execution.

Use custom MCP/workers when the job is:

> Strategic, client-specific, high-risk, or part of CREATE SOMETHING's durable
> delivery surface.
