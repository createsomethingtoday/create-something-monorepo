# Webflow Template Review Cloud

Standalone Webflow Cloud origin for the CREATE SOMETHING Template Review MCP.

This package is the Webflow-owned Cloudflare Access adapter. It keeps the current Worker as the owning runtime and rollback path while exposing its signed-assertion MCP transport through the Webflow-assigned domain.

## Runtime contract

- Public MCP: `/mcp` and `/mcp/*`, routed to the Worker's `/access/mcp` surface
- Legacy SSE: `/sse` and `/sse/*`, routed to the Worker's `/access/sse` surface
- OAuth protected-resource discovery: `/.well-known/oauth-protected-resource` and path variants
- Health: `/health`
- Upstream: `https://webflow-template-review-mcp.createsomething.workers.dev`
- Workspace: `Create Something` (`63221596dcbcf2eaadee2798`)

Cloudflare Access resolves its opaque Managed OAuth bearer before the adapter runs and injects a signed `Cf-Access-Jwt-Assertion`. The adapter requires that assertion, strips the opaque bearer and unsigned identity headers, and forwards only the assertion plus MCP transport headers. The Worker verifies the Webflow Access issuer, application audience, signature, identity claims, and reviewer allowlist on `/access/mcp`.

## Commands

```bash
pnpm --filter @create-something/webflow-template-review-cloud test
pnpm --filter @create-something/webflow-template-review-cloud check
pnpm --filter @create-something/webflow-template-review-cloud build
```

The first production deploy uses Webflow CLI v2.1.1 with `--workspace-id 63221596dcbcf2eaadee2798`. Webflow assigns `cloud.app_id`, the environment, and the `*.webflow.io` domain during that deploy. Production deployment is approval-gated; do not run it without the operator's literal `deploy` response to the deployment preview.
