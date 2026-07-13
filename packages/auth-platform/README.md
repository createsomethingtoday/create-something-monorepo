# @create-something/auth-platform

Framework-neutral machine contract for the internal CREATE SOMETHING authentication platform.

It owns three pure operations:

- `createAuthPlatformContract(origin)` — versioned discovery metadata;
- `createAuthOpenApi(origin)` — the auth-focused OpenAPI 3.1 document;
- `validateAuthIntegration(input)` — deterministic, offline, non-mutating configuration validation.

Identity Worker publishes the first two operations over HTTP. The CREATE SOMETHING MCP exposes them as resources and exposes the validator as `auth_config_validate`. Canon and SvelteKit are reference consumers, not the definition of the platform.

The package does not accept credentials or secrets and cannot create users, issue tokens, grant access, rotate keys, call a network service, or mutate production.
