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

The shared workflow context endpoint shape is:

```text
GET /api/canon/workflow-context?contextId=create-something-governed-workflow-console
```

That route returns sanitized runtime checks, Database / Automation / Judgment layers, action definitions, approval state, evidence, decisions, artifacts, agent prompts, and guardrails. It must not return secrets, raw source data, credentials, private workspace URLs, or token-bearing endpoints.

Endpoint defaults should stay empty in reusable components. Promotion to a specific Webflow site should set Cloudflare URLs in the Webflow Designer or a site-specific composition layer.

## Share

Sharing updates the Webflow workspace:

```bash
cd packages/webflow-components
pnpm run share
```

Run the verification command first and record the package, Webflow library ID, command output, and rollback note in the related Linear issue.
