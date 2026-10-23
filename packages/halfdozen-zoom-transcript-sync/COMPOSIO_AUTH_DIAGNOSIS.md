# Operator Notion authentication diagnosis

The blocked live acceptance read failed at Composio project API authentication. It did not establish an expired Notion user authorization. No credential repair or access retry was performed during diagnosis.

## Verified service and ownership

- Service: `halfdozen-operator-notion-mcp`.
- Endpoint: `https://halfdozen-operator-notion-mcp.createsomething.workers.dev/mcp`.
- Hosting account: Create Something, Cloudflare account `9645bd52e640b8a4f40a3a55ff1dd75a`.
- Latest reported deployment: `6f6153e7-cc71-43f9-bc74-214f3d8790bd`, version `833a2edf-9556-4a01-9ebb-475a6f8542c5` at 100%, deployed 2026-04-16 by `micah@createsomething.io`.
- This service is distinct from the transcript Worker hosted in the Half Dozen Cloudflare account.

Read-only deployment metadata confirms the `COMPOSIO_API_KEY` secret binding exists. No value was extracted. Deployed nonsecret settings match the repository: `PARTNER_KEY=half-dozen`, `PARTNER_CLIENT_SLUG=blondish`, Notion auth config `ac_1fYSxzK38XeT`, and pinned tools `halfdozen_notion` and `blondish_notion`.

## Credential path and failure layer

Danny Hub's documented runtime credential is available from Infisical project `e1532079-2f2b-46b5-8972-cf7a025eb803`, environment `prod`, path `/mcp-hub/hubs`, secret name `CS_HUB_DANNY_API_TOKEN`. That credential authenticated Hub discovery successfully. It is not the rejected credential.

The operator Worker reads its separate `COMPOSIO_API_KEY` binding when constructing both `@composio/core` and `ComposioNotionDispatcher`. The dispatcher resolves Notion tools through Composio before forwarding an action. The failed pinned read returned HTTP 401, code `801`, slug `APIKey_InvalidAPIKey`, request ID `7c3456cd-75b5-48d3-94dc-e7929b06a8a2`.

The operator preflight script documents a vault-managed `COMPOSIO_API_KEY`, with configurable `INFISICAL_PROJECT_ID`, `INFISICAL_ENV`, and `INFISICAL_PATH`. Its defaults are `prod` and `/`; the exact current vault location and valid replacement have not been verified. No other key was read or tried to infer that location. A key revoked at Composio, a stale deployed key, or a key from the wrong project could cause the observed rejection. The evidence does not distinguish those causes.

## End-user Notion authorization remains unverified

A targeted, read-only D1 metadata query showed that `halfdozen_notion` is pinned to account slug `hd-client-key`, auth config `ac_1fYSxzK38XeT`, connected-account identifier `ca_MNcZT-BR1w2n`. Its cached status is `ACTIVE`, last checked 2026-05-13. The query wrote zero rows. This is cached configuration evidence, not current provider acceptance.

Do not reconnect Notion or recreate the deleted Goldin connection to address this error. Composio must first accept the existing service's project key. Only then can a read-only status and exact synthetic-parent access check determine whether the current Notion authorization needs attention.

## Smallest repair to request approval for

Approve a separate repair of only the existing operator Worker's `COMPOSIO_API_KEY` binding, using an existing authorized key from the Composio project that owns auth config `ac_1fYSxzK38XeT` and its pinned connections. Confirm the vault project, environment, and path before use. Include the Worker version deployment needed to apply that single binding change in the approval. Do not rotate a global key, create a key, reconnect accounts, change grants or pins, or modify other Workers as part of this repair.

Suggested approval wording:

> Approve updating only `COMPOSIO_API_KEY` on `halfdozen-operator-notion-mcp` in the Create Something Cloudflare account from the verified existing vault credential for the current Composio project, including the configuration deployment required to apply it. Then run read-only Composio, Notion-connection, and synthetic-parent checks. No new credentials, account reconnections, permission changes, or transcript rollout.

The service is shared by Half Dozen and BLOND:ISH pinned routes. Repairing it may restore calls through both. Preserve the current auth config, connections, pins, and sync contracts; this diagnosis did not authorize changes to their behavior.

After a successful read-only check, the prior approval can cover the single isolated synthetic body fixture if target scope is confirmed. Full transcript ingestion, production cutoff, property/trigger changes, and rollout remain separate decisions. Do not announce completion to Danny before the acceptance test succeeds and the result is available.
