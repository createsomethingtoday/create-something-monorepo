# Airtable System Architect

An installable CREATE SOMETHING Codex plugin for governed Airtable system architecture. It connects directly to Airtable's official MCP server and adds the policy required to inspect, propose, implement, and verify base architecture without turning a broad PAT into ambient write authority.

## Boundary

The plugin is intentionally a deep policy module over Airtable's official execution surface:

- Airtable owns API behavior, permissions, rate limits, and MCP tools.
- This package owns discovery order, architecture proposals, approval gates, unsupported-operation handling, readback, and receipts.
- Existing Webflow Template/App Review MCPs remain the normal path for Marketplace review records and decisions.

No Airtable API client or proxy server is implemented here.

## Three-Tier ownership

| Tier       | Artifact or behavior                                                               |
| ---------- | ---------------------------------------------------------------------------------- |
| Database   | Live Airtable bases, tables, fields, records, interfaces, pages, and automations   |
| Automation | Airtable's official MCP at `https://mcp.airtable.com/mcp` and approved UI fallback |
| Judgment   | The installed architect skill, versioned approval policy, stop rules, and receipts |

## Packaged surface

```text
plugin/
├── .codex-plugin/plugin.json
├── .mcp.json
└── skills/airtable-system-architect/
    ├── SKILL.md
    ├── agents/openai.yaml
    └── references/
        ├── authentication.md
        ├── capability-matrix.md
        ├── policy.airtable-system-architect.v1.json
        ├── policy.airtable-system-architect.v1.md
        └── receipt-template.md
```

## Authentication

The plugin reads the existing Airtable PAT from `AIRTABLE_API_TOKEN` through Codex's `bearer_token_env_var` configuration. Store the value in Infisical or another secret manager and inject it into the Codex process. Never commit the token.

Required scopes for the official Airtable MCP are:

- `data.records:read`
- `data.records:write`
- `schema.bases:read`
- `schema.bases:write`
- `data.recordComments:read`
- `data.recordComments:write`
- `workspacesAndBases:read`

The PAT must also include the intended base/workspace resources, and the owning Airtable user must have sufficient permissions. Creator-level access is generally required for schema creation.

For a manual Codex connection outside the plugin, the equivalent configuration is:

```toml
[mcp_servers.airtable]
url = "https://mcp.airtable.com/mcp"
bearer_token_env_var = "AIRTABLE_API_TOKEN"
```

OAuth remains Airtable's recommended interactive setup. This package uses PAT delivery because it is an administrator-controlled system-architecture lane.

## Capability posture

The official MCP currently covers base/table/field creation, record reads and writes, interface/page creation, page deletion, interface publication, and automation drafts. It does not provide arbitrary control over every Airtable UI operation.

Read [the capability matrix](plugin/skills/airtable-system-architect/references/capability-matrix.md) before relying on delete, field-option, page-layout, interface-update, or automation-activation behavior.

## Operating workflow

1. Discover the workspace/base and resolve stable IDs.
2. Read the relevant table schema, pages, views, and automation state.
3. Produce an architecture proposal with the exact before state, intended change, risk class, verification, and rollback.
4. Obtain the approval required by the versioned policy.
5. Execute the smallest supported MCP operation.
6. Read back the changed surface.
7. Return a receipt that distinguishes requested, attempted, confirmed, and UI-only state.

## Agent Legibility Contract

<!-- prettier-ignore -->
| Field | Value |
| --- | --- |
| Entry point | `plugin/.codex-plugin/plugin.json`, `plugin/skills/airtable-system-architect/SKILL.md` |
| Boot command | `pnpm --filter @create-something/airtable-system-architect test` |
| Smoke command | `pnpm --filter @create-something/airtable-system-architect verify` |
| Validation surfaces | Plugin manifest, MCP binding, architect skill, capability matrix, human/machine policy parity, and the ten-case read-only evaluation pack |
| UI validation path | None for package validation; an approved browser fallback is an operation-specific live checkpoint |
| Escalation rule | Stop when the target, current state, permission, supported capability, approval, rollback, or readback is unclear; never widen the PAT or switch to browser mutation merely to make progress |

## Validation

Package validation is offline and performs no Airtable calls:

```bash
pnpm --filter @create-something/airtable-system-architect verify
```

A later live smoke should begin with `ping`, `search_bases`/`list_bases`, `list_tables_for_base`, and `list_pages_for_base`. Do not use a write tool merely to prove authentication.

## Rollback

Disable or remove the plugin and revoke or narrow the PAT resource grants. The package stores no Airtable state and has no database migration to reverse. Airtable changes made through the plugin require their own operation-specific rollback evidence.

## Upstream authority

- Official MCP guide: <https://support.airtable.com/using-the-airtable-mcp-server>
- Official plugin and skills: <https://github.com/Airtable/skills>
- Official MCP endpoint: <https://mcp.airtable.com/mcp>
