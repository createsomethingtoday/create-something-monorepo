# Webflow Template Review Cloud

Standalone Webflow Cloud origin for the CREATE SOMETHING Template Review MCP.

This package is intentionally a transparent adapter. It keeps the current Worker as the owning runtime and rollback path while exposing the same authenticated MCP transport through the Webflow-assigned domain.

## Runtime contract

- Public MCP: `/mcp` and `/mcp/*`
- Legacy SSE: `/sse` and `/sse/*`
- OAuth protected-resource discovery: `/.well-known/oauth-protected-resource` and path variants
- Health: `/health`
- Upstream: `https://webflow-template-review-mcp.createsomething.workers.dev`
- Workspace: `Create Something` (`63221596dcbcf2eaadee2798`)

The adapter forwards the caller's OAuth bearer and MCP session headers. It never stores or relays the Worker's legacy shared bearer. The Worker must explicitly allowlist the assigned Cloud `/mcp` resource before authenticated Cloud-origin calls can pass its audience check.

## Commands

```bash
pnpm --filter @create-something/webflow-template-review-cloud test
pnpm --filter @create-something/webflow-template-review-cloud check
pnpm --filter @create-something/webflow-template-review-cloud build
```

The first production deploy uses Webflow CLI v2.1.1 with `--workspace-id 63221596dcbcf2eaadee2798`. Webflow assigns `cloud.app_id`, the environment, and the `*.webflow.io` domain during that deploy. Production deployment is approval-gated; do not run it without the operator's literal `deploy` response to the deployment preview.
