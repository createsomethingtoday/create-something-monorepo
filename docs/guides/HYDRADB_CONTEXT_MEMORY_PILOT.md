# Hydra DB Context Memory Pilot

Hydra DB is approved for internal governed recall. The upstream Hydra DB MCP server is enabled for local operators only; shared agent lanes must use the `hydradb-context-mcp` read-only wrapper.

## Tier Fit

| Tier       | Role                                                                                   |
| ---------- | -------------------------------------------------------------------------------------- |
| Database   | Persistent agent context, memories, graph-enriched recall, tenant/sub-tenant isolation |
| Automation | Official Hydra DB MCP server behind the local Hub                                      |
| Judgment   | Better recall of policy decisions, preferences, evidence, and historical context       |

Hydra DB must not replace Linear, Infisical, D1, KV, R2, or application databases. Treat it as a recall/index layer for agent context, not as the executable source of truth.

## Secret Handling

The Hydra DB token shared in chat must be considered exposed. It may remain in use during the initial internal rollout because the user explicitly approved that path, but it must stay only in Infisical, must be used only for internal non-customer data, and must be rotated before any customer-facing use.

Store only the active values in Infisical:

```bash
infisical secrets set HYDRA_DB_API_KEY="<active-hydradb-key>" --env=prod --path=/mcp-hub/hydradb
infisical secrets set HYDRA_DB_TENANT_ID="create_something" --env=prod --path=/mcp-hub/hydradb
infisical secrets set HYDRA_DB_SUB_TENANT_ID="cs-internal-context" --env=prod --path=/mcp-hub/hydradb
```

The governed wrapper requires all three values. If additional sub-tenants are approved for the same runtime lane, set `HYDRA_DB_ALLOWED_SUB_TENANT_IDS` to a comma-separated allowlist; otherwise it defaults to `HYDRA_DB_SUB_TENANT_ID`.

For the internal policy, Linear evidence, and MCP catalog lanes, the current allowlist is:

```bash
infisical secrets set HYDRA_DB_ALLOWED_SUB_TENANT_IDS="cs-internal-context,cs-linear-evidence,cs-mcp-catalog" --env=prod --path=/mcp-hub/hydradb
```

Do not put Hydra DB secrets in repo files, Linear comments, generated MCP config, local shell profiles, or `.env` files.

## Infisical Organization

Use `/mcp-hub/hydradb` as the canonical Infisical path for this pilot because Hydra DB backs Hub-managed context memory. Keep app-specific and customer-app credentials in their existing product folders.

Business-case mapping:

- `/mcp-hub/hydradb`: CREATE SOMETHING Hub memory infrastructure and the dormant `hydradb-memory` registry entry.
- Hydra DB `tenant_id`: organization boundary, currently `create_something`.
- Hydra DB `sub_tenant_id`: pilot, project, client, or trust-zone boundary.

Do not create a new Infisical folder for every Hydra DB sub-tenant unless a separate API key, runtime, or access policy is required. Prefer Hydra DB sub-tenant isolation for recall data and Infisical folder isolation for credential ownership.

## Registry Entry

The Hub registry includes `hydradb-memory` as a dormant stdio server:

```text
infisical run --env=prod --path=/mcp-hub/hydradb --include-imports=true -- npx -y @hydra_db/mcp@0.1.1
```

It is listed in the `dormant` bundle and is enabled only in local operator Hub state. Keep it available only for local operator ingestion, diagnostics, deletion, and low-level recovery. Do not enable it in shared Hub state.

The governed wrapper is `hydradb-context-mcp`, also dormant:

```text
infisical run --env=prod --path=/mcp-hub/hydradb --include-imports=true -- node ./packages/hydradb-context-mcp/dist/index.js
```

Use `hydradb-context-mcp` for governed recall because it exposes only the read-only `context_recall` tool. Keep the upstream `hydradb-memory` entry enabled only for local operator ingestion, diagnostics, and deletion.

## Pilot Corpus

Allowed first-pass ingestion:

- public CREATE SOMETHING docs and policy artifacts
- sanitized resolved Linear evidence
- non-secret integration decision records
- generated public trust catalog summaries

Do not ingest:

- API keys, bearer tokens, OAuth refresh tokens, Infisical values, or credential screenshots
- raw private client data
- PHI, payment details, legal documents, or employee personal data
- unresolved incident details that include credentials or exploitable infrastructure paths

## Isolation Plan

Use `tenant_id` for the organization boundary and `sub_tenant_id` for the project or lane boundary.

Recommended tenant ID:

```text
create_something
```

Recommended tenant metadata schema for the Hydra DB create-tenant screen:

```json
[
  { "name": "artifact_type", "data_type": "string", "filterable": true },
  { "name": "trust_zone", "data_type": "string", "filterable": true },
  { "name": "source_system", "data_type": "string", "filterable": true },
  { "name": "project_slug", "data_type": "string", "filterable": true },
  { "name": "client_slug", "data_type": "string", "filterable": true },
  { "name": "policy_pack", "data_type": "string", "filterable": true },
  { "name": "title", "data_type": "string", "searchable": true }
]
```

Keep source-specific fields such as exact file path, Linear issue ID, commit SHA, URL, and tags in `additional_metadata` at ingestion time. Avoid Hydra DB reserved keys such as `source_type`, `source_url`, `source_title`, `id`, `description`, and `chunk_content`.

Recommended initial sub-tenants:

| Sub-tenant              | Use                                              |
| ----------------------- | ------------------------------------------------ |
| `cs-internal-context`   | internal CREATE SOMETHING docs and policies      |
| `cs-linear-evidence`    | sanitized delivery and validation evidence       |
| `cs-mcp-catalog`        | sanitized MCP registry catalog memory            |
| `client-<slug>-context` | future client-specific pilot only after approval |

Do not share one sub-tenant across unrelated clients or unrelated trust zones.

## Enablement

After seeding Infisical with the active pilot key, verify the dormant registry entry and package wiring:

```bash
pnpm mcp:registry:generate
pnpm mcp:registry:validate
pnpm hydradb:pilot:tools
```

Run the contained seed/eval harness before enabling the server through a shared Hub lane:

```bash
pnpm hydradb:pilot -- plan
pnpm hydradb:pilot:infisical -- seed-eval
```

The default harness corpus is a curated set of internal non-customer policy and architecture docs. Use `--all-policies` only after the curated run passes. The harness stores documents through the official Hydra DB MCP server with `infer=false`, stable source IDs, and a secret-pattern guard.

To use Hydra DB for CREATE SOMETHING's MCP creation memory, seed the expanded internal profile after the policy corpus is healthy:

```bash
pnpm hydradb:pilot -- plan --all-policies --mcp-creation
pnpm hydradb:pilot:infisical -- seed-eval --all-policies --mcp-creation
```

This adds MCP thesis, scaffolding, Composio, commercial packaging, Hub, DUI, and app-integration guidance to the policy corpus. Keep it internal and non-customer.

Build and validate the governed wrapper:

```bash
pnpm --filter @create-something/hydradb-context-mcp test
pnpm --filter @create-something/hydradb-context-mcp typecheck
pnpm --filter @create-something/hydradb-context-mcp build
pnpm hydradb:context:gate:infisical -- --json
```

The gate confirms the wrapper stays dormant in the registry, exposes exactly one tool (`context_recall`), returns recall results from the default sub-tenant, and rejects a non-allowlisted sub-tenant.

Enable the governed wrapper and upstream memory server for the local/internal operator Hub state only:

```bash
pnpm hydradb:operator:enable
pnpm hydradb:operator:gate:infisical -- --json
```

This enables `hydradb-context-mcp` and `hydradb-memory` in `config/mcp-hub/state.json`. The registry lifecycle for both entries remains `dormant`; that lifecycle is intentional because the Cloudflare production Hub cannot execute stdio downstreams and because upstream memory tools must not enter broad agent routing. Remote production promotion therefore ships the registry, sync, monitor, and policy guardrails, while actual Hydra recall runs through the local/operator wrapper.

Use policy preflight to turn Hydra recall into agent-ready context before material implementation work:

```bash
pnpm hydradb:policy-preflight:infisical -- --task "Build a governed MCP for a new client integration"
```

The preflight output is compiled markdown with source references. Treat it as advisory recall; verify against repo files and current Linear state before acting.

## Sync

Run the approved sync lanes through Infisical:

```bash
pnpm hydradb:sync:infisical
```

This orchestrates:

1. policy and MCP creation docs into `cs-internal-context`
2. sanitized completed Linear evidence into `cs-linear-evidence`
3. sanitized MCP registry summaries into `cs-mcp-catalog`
4. production recall monitoring

Useful variants:

```bash
pnpm hydradb:sync:infisical -- --lane policy
pnpm hydradb:sync:infisical -- --lane linear-evidence --linear-limit 20
pnpm hydradb:sync:infisical -- --lane mcp-catalog --skip-monitor
pnpm hydradb:sync:infisical -- --dry-run --json
```

Recommended cadence:

- policy/docs: weekly and after policy changes
- Linear evidence: daily on weekdays or after delivery batches
- MCP catalog: after registry changes and weekly
- monitor: after each sync and before agent workflows that depend on Hydra recall

## Production Monitoring

Run the recall monitor:

```bash
pnpm hydradb:production-monitor:infisical -- --json
```

The default monitor checks:

- `cs-internal-context` returns policy context
- `cs-linear-evidence` returns delivery evidence
- `cs-mcp-catalog` returns catalog context
- each recall finishes within 15 seconds
- `client-not-allowlisted-context` is rejected before a network request

Treat monitor failures as production-blocking for Hydra-backed agent workflows. Rerun once for transient provider issues, then repair sync, allowlist, or operator state before relying on recall.

## Linear Evidence Lane

Hydra DB can also index sanitized completed Linear evidence in the separate `cs-linear-evidence` sub-tenant. Linear remains the source of truth; Hydra only provides recall.

Recommended first-pass ingestion is explicit issue selection:

```bash
pnpm hydradb:linear-evidence -- plan --issue CRE-335 --issue CRE-339
pnpm hydradb:linear-evidence -- export --issue CRE-335 --issue CRE-339
pnpm hydradb:linear-evidence:infisical -- seed-eval --issue CRE-335 --issue CRE-339
```

The script only selects completed issues by default, filters to `code-quality`, includes only comments containing `Evidence:`, redacts common secret patterns, stores with `infer=false`, and writes to `cs-linear-evidence` unless `--sub-tenant-id` is provided.

Recall evidence through the governed wrapper:

```bash
pnpm hydradb:policy-preflight:infisical -- \
  --sub-tenant-id cs-linear-evidence \
  --query "What evidence exists for the Hydra DB wrapper promotion gate and compiled policy preflight?" \
  --task "Recall completed Hydra DB implementation evidence"
```

Do not ingest raw Linear conversations, unresolved incidents, customer data, credential screenshots, or comments that include exploitable infrastructure detail.

## MCP Catalog Lane

Hydra DB can also index sanitized MCP registry summaries in the separate `cs-mcp-catalog` sub-tenant. This is useful for agent preflight work: choosing the right existing server, pruning over-broad tool exposure, and recalling which connector already owns a business capability.

The checked-in Hub registry remains the source of truth. Hydra DB catalog recall is advisory only and must be verified against `config/mcp-hub/registry.core.json`, generated registry output, and current Hub state before enabling or routing a server.

Inspect the planned catalog before writing to Hydra DB:

```bash
pnpm hydradb:mcp-catalog -- plan --include-dormant --include-local
pnpm hydradb:mcp-catalog -- export --server ground-mcp --server hydradb-context-mcp --server webflow-template-review-mcp --include-dormant --include-local
```

Seed and evaluate the sanitized registry summaries:

```bash
pnpm hydradb:mcp-catalog:infisical -- seed-eval --include-dormant --include-local
```

The script stores one sanitized document per registry server with `infer=false` and writes to `cs-mcp-catalog` unless `--sub-tenant-id` is provided. It includes server ID, lifecycle, transport, endpoint host, exposure mode, estimated tool count, auth type, package path, bundles, tags, description, and selection/exposure guidance. It does not ingest API keys, bearer tokens, environment values, or full tool schemas.

Use catalog preflight when the task is about connector selection or tool exposure:

```bash
pnpm hydradb:mcp-catalog-preflight:infisical -- \
  --task "Choose MCP servers for Webflow marketplace template review with code-quality verification"
```

The preflight output is compiled markdown with source references such as `MCP webflow-template-review-mcp` and `MCP ground-mcp`. Treat those as candidate servers, not authorization to expose them.

Only after the recall-quality and wrapper gates pass should an operator start a local Hub with the governed wrapper and upstream memory server enabled:

```bash
pnpm hydradb:operator:enable
pnpm hydradb:operator:gate:infisical -- --json
pnpm mcp:hub:start
```

For a Hub smoke test, use a harmless memory such as a public policy summary, then search for it through the Hub proxy. Verify that returned context contains no secrets and is scoped to the expected sub-tenant.

## Acceptance Criteria

Before relying on Hydra DB for internal production agent workflows:

- active Hydra DB token exists only in Infisical, with rotation required before production/customer use
- tenant infra status is ready
- shared lanes expose only the governed `context_recall` wrapper; upstream store/search/delete/list/fetch tools stay enabled only in a local operator lane
- first smoke proves sub-tenant isolation
- recall results improve at least one real agent workflow compared with current repo/Linear-only context
- `pnpm hydradb:operator:gate:infisical -- --json` passes
- `pnpm hydradb:production-monitor:infisical -- --json` passes
- retention rules in `docs/policies/v1/policy.hydradb-context-retention.v1.md` are followed
- Linear evidence records commands run, corpus used, and rollback note

Rollback is simple: disable `hydradb-context-mcp` and `hydradb-memory` in Hub state, then remove or revoke the Hydra DB key from Infisical.
