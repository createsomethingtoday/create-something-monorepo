# API Key Rotation Handoff

This run rotated `API_KEYS` for `interaction-atlas-mcp` and verified role-gated access with `auth_whoami`.

## Scope

- Worker: `interaction-atlas-mcp`
- Environment account: `acme-prod`
- Roles: `admin`, `operator`, `auditor`, `readonly`

## Storage policy

- Store real keys only in your secret manager/vault.
- Do not commit raw keys to git.
- Set worker secret `API_KEYS` using role bindings:
  - `key:account:role`
  - Example: `mykey:acme-prod:operator`

## Rotation procedure

1. Generate four new keys (one per role).
2. Update Worker secret:
   - `wrangler secret put API_KEYS`
3. Redeploy worker:
   - `wrangler deploy`
4. Validate role mapping using MCP tool `auth_whoami`.

## Post-rotation verification checklist

1. `admin` and `operator` return:
   - `readOnly=false`
   - `allowControlPlaneWrite=true`
   - `allowApprovalDecide=true`
2. `auditor` and `readonly` return:
   - `readOnly=true`
   - `allowControlPlaneWrite=false`
   - `allowApprovalDecide=false`
3. Account scope is correct for all keys (`accountId=acme-prod`).
4. Read APIs remain available:
   - `GET /api/automations`
   - `GET /api/inbox`
5. Write behavior is restricted:
   - `operator` write tools succeed
   - `auditor`/`readonly` write tools are unavailable in read-only mode

## Quick commands

```bash
# whoami
curl -sS \
  -H "accept: application/json, text/event-stream" \
  -H "x-api-key: KEY" \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":"who","method":"tools/call","params":{"name":"auth_whoami","arguments":{}}}' \
  "https://interaction-atlas-mcp.createsomething.workers.dev/mcp"

# account-scoped automations list
curl -sS -H "x-api-key: KEY" \
  "https://interaction-atlas-mcp.createsomething.workers.dev/api/automations"
```
