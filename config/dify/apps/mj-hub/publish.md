# MJ HUB Dify Publish Checklist

This directory is the repo-native contract for the `MJ HUB` Dify app.

## Source

- Imported from local export: `/Users/micahjohnson/Downloads/MJ HUB.yml`
- Imported on: `2026-04-13`
- Canonical checked-in DSL: [app.dify.dsl.yaml](./app.dify.dsl.yaml)

## Before Publish

1. Export the latest Dify app DSL and diff it against [app.dify.dsl.yaml](./app.dify.dsl.yaml).
2. Confirm the registered MCP provider still uses `provider_id = mj_hub`.
3. Verify the Dify MCP server URL still matches `https://mj.mcp.createsomething.agency/mcp`.
4. Verify the Dify secret for the Hub bearer is active and was issued through CREATE SOMETHING identity flows, not created ad hoc in Dify.
5. Review [env.contract.json](./env.contract.json) and [mcp-servers.json](./mcp-servers.json) for drift.
6. Confirm the current lane still satisfies:
   - `policy.user-bearer-token-governance.v1`
   - `policy.mcp-credential-delivery.v1`
   - `policy.service-tier-entitlement.v1`
   - `policy.tenant-tool-exposure.v1`
   - `policy.hub-route-authorization.v1`
7. Run a draft validation pass with at least:
   - `hub_status`
   - `hub_list_services`
   - `hub_search_proxy_tools` scoped to a known service
   - one low-risk `hub_execute_proxy_tool` call
8. Confirm the app prompt still enforces:
   - service-first discovery
   - minimal tool calls
   - drafting instead of blind external mutation

## Publish

1. Publish the validated Dify draft.
2. Record the Dify app version or publish identifier.
3. Record the live app URL or embed surface.
4. Record the active Hub URL and discovery-pack posture used by the app.
5. Record the policy versions or hashes that governed the release.
6. Attach validation evidence in Loom.

## Rollback

1. Restore the last known-good Dify version.
2. If the issue is auth or exposure related, rotate or revoke the Hub bearer through CREATE SOMETHING flows instead of editing secrets manually in Dify.
3. If the issue is tool exposure, fix the Hub policy or lane configuration first and only then republish the Dify app.
4. Record rollback reason, restored app version, and any token rotation in Loom.
