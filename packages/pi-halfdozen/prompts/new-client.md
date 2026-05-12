---
description: Add a new Half Dozen client to the Notion MCP fleet
argument-hint: "<client-name>"
---

Load the halfdozen-fleet skill, then add a new client: **$1**

## Steps

1. Derive the URL slug from the client name (lowercase, hyphens): `$1` → `{slug}-notion.mcp.workway.co`
2. Add the client route in `packages/halfdozen-notion-mcp/worker/`
3. Update `docs/MCP_FLEET_REGISTRY.md` with the new entry
4. Deploy: `cd packages/halfdozen-notion-mcp/worker && wrangler deploy`
5. Verify: `curl https://{slug}-notion.mcp.workway.co/mcp`

## Checklist

- [ ] Client slug derived and validated
- [ ] Route added to worker configuration
- [ ] Fleet registry updated
- [ ] Worker deployed
- [ ] Endpoint verified
- [ ] Telemetry confirmed in `halfdozen-feedback` D1
