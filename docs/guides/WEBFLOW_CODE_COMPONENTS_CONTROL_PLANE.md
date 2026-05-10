# Webflow Code Components Control Plane

Webflow Code Components are the active governance UI surface for CREATE SOMETHING operator and client-safe control-plane views.

## Boundary

- Webflow renders the interface.
- Cloudflare owns durable governance state, execution routes, and runtime policy checks.
- Linear records tracked work, ownership, status, and evidence.
- Repo-owned policy artifacts define approval and escalation behavior.

The UI must remain a rendering and interaction layer. Durable source data, policy rules, credentials, telemetry, and deployment evidence stay in Cloudflare, Linear, and the monorepo.

## Source Files

- Control-plane contract: `config/webflow/control-plane.json`
- Generated contract view: `docs/WEBFLOW_CODE_COMPONENTS_CONTROL_PLANE.generated.md`
- Component package: `packages/webflow-components`
- Webflow library config: `packages/webflow-components/webflow.json`

## Verify

```bash
pnpm webflow:governance:generate
pnpm webflow:governance:verify
```

`pnpm webflow:governance:verify` checks the repo contract and then runs the component package verification, including TypeScript and the Webflow library bundle step.

## Endpoint Configuration

Control components render without live endpoints by using static Webflow props. For interactive deployments, configure endpoint props per site or environment:

- `*.contextEndpointUrl` for components that should hydrate from the D1-backed workflow context
- `AgentDock.endpointUrl`
- `ActionPreview.endpointUrl`
- `CanonControlPanel.agentEndpointUrl`
- `CanonControlPanel.actionEndpointUrl`
- `ApprovalQueue.endpointUrl` or `CanonControlPanel.approvalEndpointUrl` only for trusted approval proxies
- `ApprovalQueue.requestCredentials` or `CanonControlPanel.approvalRequestCredentials` when operator session cookies must be sent

The shared workflow context endpoint shape is:

```text
GET /api/canon/workflow-context?contextId=create-something-governed-workflow-console
```

That route returns sanitized runtime checks, business contexts, operating metrics, source statuses, Database / Automation / Judgment layers, action definitions, approval queue state, execution queue items, evidence, decisions, artifacts, activity events, agent prompts, and guardrails. It must not return secrets, raw source data, credentials, private workspace URLs, or token-bearing endpoints.

Business-management deployments should also configure:

```text
POST /api/canon/approval
```

That route persists approval queue review/approve/block decisions in D1 and appends public-safe activity events. It requires the server-side `AGENCY_INTERNAL_API_KEY` as `Authorization: Bearer <key>` or `X-API-Key`. Public Webflow pages must leave approval endpoint props empty or call through a trusted, authenticated operator proxy; do not place internal credentials in Webflow props or browser code.

Operator-only deployments can use the session-authenticated proxy instead:

```text
POST /api/canon/operator-approval
```

That route requires an Auth0-backed `.agency` session whose email is listed in `AGENCY_OPERATOR_EMAILS`. It only accepts same-origin requests, configured `CANON_OPERATOR_ORIGINS`, local development origins, or HTTPS origins under `*.createsomething.agency`. For Webflow Code Components, set `Approval Request Credentials` to `include` only when the console is served from a trusted CREATE SOMETHING domain that can send the `.createsomething.agency` session cookie. Keep public `webflow.io` previews read-only or local-state only.

The production Webflow publish origin is:

```text
https://governed-workflow-console.webflow.io
```

Use these endpoint props for read and preview behavior:

```text
Workflow Context Endpoint URL: https://createsomething.agency/api/canon/workflow-context
Agent Endpoint URL: https://createsomething.agency/api/canon/agent
Action Endpoint URL: https://createsomething.agency/api/canon/action-preview
```

In Webflow Designer and the published `webflow.io` origin, keep `Approval Endpoint URL` empty unless a Webflow-specific operator auth bridge is active. The backend CORS policy trusts `https://governed-workflow-console.webflow.io`, but the existing `.agency` session cookies are `SameSite=Lax` and do not travel on cross-site fetch POSTs from `webflow.io`.

For the authenticated `.agency` operator surface, or after a compatible Webflow operator auth bridge exists, set:

```text
Approval Endpoint URL: https://createsomething.agency/api/canon/operator-approval
Approval Request Credentials: include
```

Endpoint defaults should stay empty in reusable components. Promotion to a specific Webflow site should set Cloudflare URLs in the Webflow Designer or a site-specific composition layer.

## Share

Sharing updates the Webflow workspace:

```bash
cd packages/webflow-components
pnpm run share
```

Run the verification command first and record the package, Webflow library ID, command output, and rollback note in the related Linear issue.
