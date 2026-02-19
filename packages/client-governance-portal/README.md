# Client Governance Portal

Whitelabeled SvelteKit UI for tenant governance on top of `gateway-control-worker`.

## Features

- Connect to control plane with admin token
- Tenant list + tenant detail
- Runtime key creation
- Provider credential update (managed/BYOK)
- Model allowlist + policy posture updates
- Budget/rate-limit updates
- Usage and cost dashboard by model

## Development

```bash
cd packages/client-governance-portal
pnpm install
pnpm dev
```

The UI expects a deployed `gateway-control-worker` URL and valid `OPERATOR_API_TOKEN`.
