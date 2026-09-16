# Half Dozen Operator Notion MCP

Composio-backed Notion MCP for operator-managed account bindings.

## Tools

- `halfdozen_notion`
- `blondish_notion`
- `operator_notion_accounts`
- `operator_notion_sync`
- `operator_notion_sync_contracts`
- `operator_notion_run_sync_contract`
- `operator_notion_router`

## Environment

Worker secrets / vars:

- `COMPOSIO_API_KEY`
- `COMPOSIO_NOTION_AUTH_CONFIG_ID`
- `MCP_API_KEY`
- `PARTNER_KEY`
- `PARTNER_CLIENT_SLUG`
- `OPENAI_API_KEY` (optional, enables OpenAI-agent fallback in `operator_notion_router`)
- `ROUTER_OPENAI_MODEL` (optional, default `gpt-5.5`)
- `ROUTER_OPENAI_TIMEOUT_MS` (optional, default `3000`)
- `ROUTER_OPENAI_CACHE_TTL_MS` (optional, default `120000`)
- `LANGFUSE_SECRET_KEY` (optional, enables Langfuse export for MCP telemetry and router-agent traces)
- `LANGFUSE_PUBLIC_KEY` (optional, recommended for explicit project routing)
- `LANGFUSE_PROJECT_NAME` (optional var, defaults to `CREATE SOMETHING`)
- `LANGFUSE_ENABLED` (optional var reserved for future route-tracing controls)

Default Notion auth config ID in `worker/wrangler.toml`:

- `COMPOSIO_NOTION_AUTH_CONFIG_ID = "ac_1fYSxzK38XeT"`
- `CONFIG_DB` points to `create-something-db` (`a74e70ae-6a94-43da-905e-b90719c8dfd2`)

## Notes

- Pinned tools resolve through `partner_auth_notion_pins` and reject caller account overrides.
- Account metadata and pins live in the agency D1 schema introduced by `0011_partner_notion_accounts.sql`.
- Sync contracts, field mappings, record mappings, and run history live in the agency D1 schema introduced by `0020_partner_notion_sync_contracts.sql`.
- `operator_notion_accounts` supports API-first workspace registration (`action=upsert_account`) plus optional connect-link issuance; guided wizard flow remains available when conversational onboarding is useful.
- `operator_notion_sync` supports page-content preview/copy between managed accounts after connection.
- `operator_notion_sync_contracts` manages deterministic pairwise data-source sync contracts for Codex automations:
  - discovery: `list_data_sources`, `get_data_source_schema`
  - contract lifecycle: `create_contract`, `update_contract`, `list_contracts`, `get_contract`, `delete_contract`, `set_enabled`
  - preflight: `validate_contract`, `preview_run`
- `operator_notion_run_sync_contract` executes a stored contract or dry-run preview; Codex Apps automations own cadence and prompting.
- Contract execution uses mapping-table identity only in v1 and normalizes delete propagation to archive/tombstone behavior.
- Validation rejects unsupported Notion field types such as relations, rollups, formulas, and files.
- `operator_notion_router` uses deterministic routing first, then optional OpenAI-agent fallback (timeout + in-memory cache) for ambiguous requests.
- Account status refreshes are TTL-gated on hot paths to reduce Composio API load under frequent MCP traffic.
- Partner client and pinned-tool bindings are short-TTL cached in-process to reduce repeated D1 reads on high-frequency pinned tool calls.
- MCP tool telemetry and feedback are exported to Langfuse when `LANGFUSE_SECRET_KEY` is configured.

## Contract Shape

Stored contracts are pairwise and decision-complete:

- `contract_slug`
- `source_account_slug`
- `target_account_slug`
- `source_data_source_id`
- `target_data_source_id`
- `enabled`
- `match_strategy = "mapping_table"`
- `conflict_policy = "manual" | "source_wins" | "target_wins"`
- `propagate_create`
- `propagate_update`
- `propagate_archive`
- `propagate_delete`
- `delete_mode = "archive"`
- `field_mappings[]` with `source_field`, `target_field`, `direction`

Supported v1 field types:

- `title`
- `rich_text`
- `number`
- `select`
- `multi_select`
- `date`
- `checkbox`
- `url`
- `email`
- `phone_number`
- `status`

## Example Flow

1. Register each workspace with `operator_notion_accounts(action=upsert_account)`.
2. Issue connect links as needed with `operator_notion_accounts(action=create_connect_link)` and confirm `ACTIVE` via `action=get_status`.
3. Discover data sources with `operator_notion_sync_contracts(action=list_data_sources)`.
4. Inspect schemas with `operator_notion_sync_contracts(action=get_data_source_schema)`.
5. Create or validate a contract with field mappings and conflict policy.
6. Dry-run with `operator_notion_sync_contracts(action=preview_run)` or `operator_notion_run_sync_contract(dry_run=true)`.
7. Let a Codex Apps automation call `operator_notion_run_sync_contract` on its schedule.

## Quality Gates

- Dispatcher contract test:
  - `pnpm --filter @create-something/halfdozen-operator-notion-mcp test:contract`
- Deploy preflight:
  - `pnpm mcp:halfdozen-operator-notion:preflight`
- Danny hub smoke:
  - `pnpm mcp:halfdozen-operator-notion:smoke`

### Vault-aware script options

Both scripts support Infisical scoping flags:

- `INFISICAL_ENV` (default `prod`)
- `INFISICAL_PATH` (default `/`)
- `INFISICAL_PROJECT_ID` (optional)
- `INFISICAL_INCLUDE_IMPORTS` (default `true`)
