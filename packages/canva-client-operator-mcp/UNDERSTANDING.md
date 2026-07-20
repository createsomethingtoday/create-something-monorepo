# Understanding: @create-something/canva-client-operator-mcp

> A Claude-authenticated control boundary for one operator-managed, client-authorized Canva account.

## Position In The Three-Tier Framework

**Primary tier**: Automation.

The Worker turns operator identity and a client-owned OAuth grant into governed Canva tools. The Durable Object is the Database-tier source of truth for the connection lock and reset receipts. Scope policy, exact reset confirmation, and fail-closed account selection are Judgment-tier controls.

## Authority Boundaries

| Boundary | Authority |
| --- | --- |
| CREATE SOMETHING Identity | Authenticates and scopes the Claude operator |
| Composio Connect Link | Lets the client authorize Canva without exposing credentials to Claude or the Worker |
| Durable Object | Owns pending, locked, and reset state for the stable client identity |
| Composio gateway | Executes only with the recorded `connectedAccountId` |

The operator subject and Composio client user ID are intentionally different identities. Never replace the stable client user ID with the current operator subject.

## Internal Structure

```text
worker/index.ts                 -> HTTP, OAuth challenge, request composition
src/operator-auth.ts           -> resource validation, allowlist, scopes
src/client-binding-service.ts  -> pending, lock, reset, revoke policy
src/durable-binding-store.ts   -> atomic state and audit receipts
src/composio-gateway.ts        -> Canva auth, discovery, execution, revocation
src/server.ts                  -> MCP tool visibility and locked execution
```

## Invariants

- At most one pending or locked binding exists per client identity.
- The first active Canva connection wins the lock.
- Tool execution never relies on Composio's ambient/default connected account.
- Upstream revocation completes before the local lock is cleared.
- Only `canva-client:admin` can create or reset a connection.
- Reset requires `RESET <COMPOSIO_CLIENT_USER_ID>` and creates a receipt.

## Escalation Notes

Stop if Composio cannot return and accept an explicit connected account ID, if Claude cannot complete RFC 9728 discovery against the deployed Worker, or if a client requires multiple simultaneously active Canva accounts. Those conditions change the authority model rather than merely extending this package.
