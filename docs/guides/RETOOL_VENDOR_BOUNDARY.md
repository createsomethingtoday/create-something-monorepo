# Retool Vendor Boundary

Retool is the CREATE SOMETHING UI/control plane. It is not the durable source of truth.

## Decision

Use Retool for fast operator and client-facing surfaces:

- Operator Console
- Workflow Control Room
- approval queues
- MCP/resource inspection
- user and environment administration
- light workflow orchestration where Retool is already the right runtime

Keep durable system state in the monorepo, external databases, MCP servers, and managed observability stores.

## Current Integration

- Retool MCP is connected through Codex with a daily `mcp:read` profile and an explicit `mcp:read,mcp:admin` admin profile.
- Retool REST API token is stored in Infisical and production smoke requires a `200` response on the configured path with `users:read` or `mcp:admin`.
- Retool MCP admin reads are reserved for organization, users, folders, apps, resources, and environment inventory.
- The current Retool org is small enough to remain a controlled UI layer rather than a data platform.
- Repo-owned Retool inventory lives in `config/retool/inventory.json`, with a generated operator view at `docs/RETOOL_WORKSPACE_INVENTORY.generated.md`.
- Spaces are treated as separate operational boundaries with Space-specific Retool API endpoints and tokens.

## Portable By Default

These assets must remain portable and repo-backed:

- workflow contracts
- MCP contracts
- agent contracts
- outcome contracts
- schemas
- runbooks
- policy rules
- source code
- deployment scripts
- delivery graph manifests
- telemetry and Linear evidence summaries

## Retool-Native State

These are allowed to be Retool-native and therefore potentially non-portable:

- app layout and component placement
- Retool resource definitions and credentials
- Retool user and group configuration
- Retool workflow canvas definitions
- Retool agent configuration
- Retool-hosted storage used only for UI convenience

Do not put production business data, client delivery artifacts, policy rules, or source code only in Retool.

## Exit Rule

Any production surface must be rebuildable outside Retool from:

- monorepo contracts and manifests
- MCP servers
- external databases
- runbooks
- telemetry records
- client-visible artifact history

If a feature cannot be rebuilt without reading Retool state by hand, it is too locked in.

## Vendor Review

Retool remains the default while the business needs fast governed control rooms, MCP-backed admin surfaces, external portals, and low custom UI overhead.

Revisit the vendor choice when one of these becomes true:

- Retool app state needs full GitOps on the current plan.
- REST platform APIs become a hard dependency.
- client work requires self-hosting or data residency that the current Retool plan cannot satisfy.
- Retool-native workflows or agents begin replacing monorepo-owned MCP servers and contracts.
- external user costs exceed the value of the client portal layer.

## Alternative Posture

If Retool becomes too controlling:

- Superblocks is the closest enterprise alternative for Git/SDLC-centered internal tooling.
- Appsmith is the strongest open-source alternative for lower lock-in and self-hosting.
- Budibase is the strongest open-source workflow/app platform when public API and self-hosting matter more than polish.
- A custom Next.js/Cloudflare app remains the cleanest escape hatch for client-facing surfaces once workflows stabilize.

The default strategy is not to avoid Retool. The strategy is to keep Retool replaceable.
