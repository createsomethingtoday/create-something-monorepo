# MCP Hub Named-Lane Hardening Matrix

Generated from `config/mcp-hub/named-lane-hardening.json`.

Regenerate with:

```bash
pnpm mcp:hub:hardening:matrix:generate
```

| Lane | Class | Runtime | Public contract | Identity | Discovery pack | Servers | Bearer scope | Host binding | Blockers |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| `viv-blondish` | `named_lane` | `hub` | `composio_meta` | `compat` | `viv-blondish-named-lane` | 3 | `partner_managed_named_lane_bearer` | `canonical_named_lane_slug` | None |
| `morgan-young-c3-management` | `named_lane` | `hub` | `composio_meta` | `compat` | `morgan-young-c3-management-named-lane` | 3 | `partner_managed_named_lane_bearer` | `canonical_named_lane_slug` | None |
| `blondish-hub` | `client_hub` | `hub` | `composio_meta` | `compat` | `blondish-client-hub` | 14 | `operator_runtime_bearer` | `dedicated_client_hostname` | Client hub uses a dedicated client hostname, not the partner named-lane issuance URL pattern. |
| `cracked-hub` | `client_hub` | `hub` | `composio_meta` | `compat` | `cracked-client-hub` | 13 | `operator_runtime_bearer` | `dedicated_client_hostname` | Client hub uses a dedicated client hostname, not the partner named-lane issuance URL pattern. |

## Read-only verification

- `pnpm mcp:hub:hardening:matrix:check` validates local fleet metadata, discovery packs, runbooks, and this generated matrix.
- `pnpm mcp:hub:hardening:check` also performs unauthenticated `GET /health` checks against each target URL.
- The live check must not mint credentials, rotate secrets, call `hub_set_discovery`, or mutate Cloudflare/Infisical state.
