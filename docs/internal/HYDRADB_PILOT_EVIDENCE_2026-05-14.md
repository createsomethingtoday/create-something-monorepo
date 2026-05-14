# Hydra DB Pilot Evidence - 2026-05-14

Tracked work: CRE-329, CRE-332, CRE-335, CRE-339, CRE-343, CRE-348

## Scope

Hydra DB was exercised as an internal, non-customer context-memory pilot only. The active API key was injected from Infisical at `/mcp-hub/hydradb`; no key values were printed or written to repo files.

## Commands

```bash
pnpm hydradb:pilot -- plan --json
pnpm hydradb:pilot -- seed --dry-run --json --limit 2
pnpm hydradb:pilot:tools
pnpm hydradb:pilot:infisical -- seed-eval
```

## Corpus

The curated seed run wrote 9 internal non-customer policy and architecture docs with `infer=false`:

- `docs/policies/v1/policy.mcp-credential-delivery.v1.md`
- `docs/policies/v1/policy.user-bearer-token-governance.v1.md`
- `docs/policies/v1/policy.hub-route-authorization.v1.md`
- `docs/policies/v1/policy.tenant-tool-exposure.v1.md`
- `docs/policies/v1/policy.git-light-agent-delivery.v1.md`
- `docs/policies/v1/policy.integration-selection.v1.md`
- `docs/MCP_HUB_CONTROL_PLANE.md`
- `docs/HUB_EXECUTION_GOVERNANCE_PLAN.md`
- `docs/THREE_TIER_FRAMEWORK.md`

Each seed call reported `1 success, 0 failed`.

## Recall Results

All fixed pilot recall checks returned at least one result:

| Query                                                      | Result |
| ---------------------------------------------------------- | ------ |
| Which policy governs bearer token rotation?                | PASS   |
| How should large MCP tool catalogs be exposed?             | PASS   |
| What is the required downstream execution pipeline?        | PASS   |
| How should tenant tool exposure be governed?               | PASS   |
| Which framework maps work to Database Automation Judgment? | PASS   |

## Decision

The pilot clears the first wiring and recall smoke gate. Keep `hydradb-memory` dormant in the shared registry while designing a narrow CREATE SOMETHING wrapper with scoped read-only recall first, `infer=false` by default, explicit sub-tenant mapping, and Hub telemetry/authz on every call.

## Wrapper Follow-Up

CRE-332 added `packages/hydradb-context-mcp` as the governed wrapper. It exposes only `context_recall`, calls Hydra DB's recall endpoint directly, rejects non-allowlisted sub-tenants, and redacts common secret patterns in returned excerpts and metadata.

The wrapper is registered as `hydradb-context-mcp` in the dormant Hub bundle. Prefer that server for shared recall testing; keep the broader upstream `hydradb-memory` server for local operator ingestion and diagnostics only.

## Promotion Gate Follow-Up

CRE-335 added `pnpm hydradb:context:gate:infisical` as a repeatable non-production gate. It verifies:

- `HYDRA_DB_API_KEY`, `HYDRA_DB_TENANT_ID`, and `HYDRA_DB_SUB_TENANT_ID` are injected from Infisical.
- `hydradb-context-mcp` remains dormant in the registry.
- the wrapper exposes exactly one tool, `context_recall`.
- default recall returns results from `cs-internal-context`.
- compiled recall output includes source-backed policy context.
- a non-allowlisted sub-tenant is rejected before promotion.

Final gate result:

```json
{
  "status": "pass",
  "registry": {
    "server": "hydradb-context-mcp",
    "lifecycle": "dormant",
    "catalogExposureMode": "dormant",
    "estimatedToolCount": 1,
    "dormantBundle": true
  },
  "wrapper": {
    "tools": ["context_recall"],
    "query": "Which policy governs bearer token rotation?",
    "resultCount": 5,
    "subTenantId": "cs-internal-context",
    "compiledOutputValidated": true,
    "disallowedSubTenantRejected": true
  }
}
```

After the gate was available, the pilot was expanded from the curated subset to the full internal policy corpus with `pnpm hydradb:pilot:infisical -- seed-eval --all-policies`.

The full-corpus run selected 25 internal non-customer policy and architecture documents. Every seed call reported `1 success, 0 failed`, and the fixed recall checks passed `5/5`:

| Query                                                      | Result |
| ---------------------------------------------------------- | ------ |
| Which policy governs bearer token rotation?                | PASS   |
| How should large MCP tool catalogs be exposed?             | PASS   |
| What is the required downstream execution pipeline?        | PASS   |
| How should tenant tool exposure be governed?               | PASS   |
| Which framework maps work to Database Automation Judgment? | PASS   |

Final validation commands:

```bash
pnpm --filter @create-something/hydradb-context-mcp test
pnpm --filter @create-something/hydradb-context-mcp typecheck
pnpm --filter @create-something/hydradb-context-mcp build
pnpm hydradb:context:gate:infisical -- --json
pnpm exec prettier --check package.json scripts/hydradb-context-gate.ts scripts/hydradb-context-pilot.ts docs/guides/HYDRADB_CONTEXT_MEMORY_PILOT.md docs/internal/HYDRADB_PILOT_EVIDENCE_2026-05-14.md packages/hydradb-context-mcp/package.json packages/hydradb-context-mcp/tsconfig.json packages/hydradb-context-mcp/README.md 'packages/hydradb-context-mcp/src/**/*.ts'
pnpm mcp:registry:validate
pnpm mcp:registry:check
git diff --check
```

`pnpm mcp:registry:validate` passed with the existing non-failing `quickbooks-notion-mcp-server` naming warning. A targeted repo scan for the exposed Hydra DB token and common key patterns returned no matches.

## Compiled Policy Preflight Follow-Up

CRE-339 added an agent-ready compiled recall path without expanding the shared tool surface. `context_recall` still remains the only exposed wrapper tool, but it now accepts `output_format: "compiled"` to return concise markdown with `[S#]` source references.

CRE-339 also added `pnpm hydradb:policy-preflight:infisical`, which builds a CREATE SOMETHING policy query from a task description and prints compiled advisory context before implementation work. This is the recommended way to take advantage of Hydra DB during agent runs while keeping Hydra as a read-only recall layer.

The seed harness now supports `--mcp-creation` to add internal MCP thesis, scaffold, Composio, packaging, Hub, DUI, and app-integration guidance to the policy corpus after the base recall checks pass.

Expanded corpus command:

```bash
pnpm hydradb:pilot:infisical -- seed-eval --all-policies --mcp-creation
```

The expanded run selected 31 internal non-customer documents. Every seed call reported `1 success, 0 failed`, and the fixed recall checks passed `5/5`:

| Query                                                      | Result | Count |
| ---------------------------------------------------------- | ------ | ----- |
| Which policy governs bearer token rotation?                | PASS   | 9     |
| How should large MCP tool catalogs be exposed?             | PASS   | 9     |
| What is the required downstream execution pipeline?        | PASS   | 7     |
| How should tenant tool exposure be governed?               | PASS   | 7     |
| Which framework maps work to Database Automation Judgment? | PASS   | 8     |

Final policy preflight command:

```bash
pnpm hydradb:policy-preflight:infisical -- --task "Build a governed MCP for a new client integration" --json
```

The preflight returned 5 compiled context sources from `cs-internal-context`, including:

- `docs/policies/v1/policy.client-hub-user-experience.v1.md`
- `docs/policies/v1/policy.integration-selection.v1.md`
- `docs/policies/v1/policy.partner-auth-governance.v1.md`
- `docs/COMPOSIO_PATTERNS.md`
- `docs/policies/v1/policy.mcp-credential-delivery.v1.md`

## Linear Evidence Lane Follow-Up

CRE-343 added a separate `cs-linear-evidence` sub-tenant for sanitized completed Linear evidence. Infisical now includes:

```text
HYDRA_DB_ALLOWED_SUB_TENANT_IDS=cs-internal-context,cs-linear-evidence,cs-mcp-catalog
```

The evidence script selects completed Linear issues, includes evidence comments only by default, redacts common secret patterns, stores with `infer=false`, and keeps Linear as the source of truth.

Validation commands:

```bash
pnpm hydradb:linear-evidence -- plan --issue CRE-335 --issue CRE-339 --json
pnpm hydradb:linear-evidence -- export --issue CRE-335 --issue CRE-339 --json
pnpm hydradb:linear-evidence:infisical -- seed-eval --issue CRE-335 --issue CRE-339
pnpm hydradb:policy-preflight:infisical -- --sub-tenant-id cs-linear-evidence --query "What evidence exists for the Hydra DB wrapper promotion gate and compiled policy preflight?" --task "Recall completed Hydra DB implementation evidence" --json
```

The plan selected 2 sanitized evidence documents:

- `CRE-335` -> `cs-linear-evidence-cre-335`
- `CRE-339` -> `cs-linear-evidence-cre-339`

Each seed call reported `1 success, 0 failed`. The evidence recall eval passed `3/3`:

| Query                                                                          | Result | Count |
| ------------------------------------------------------------------------------ | ------ | ----- |
| What evidence exists for the Hydra DB wrapper promotion gate?                  | PASS   | 2     |
| What evidence exists for the Hydra DB compiled policy preflight?               | PASS   | 2     |
| Has CREATE SOMETHING already validated Hydra DB recall against policy context? | PASS   | 2     |

The governed wrapper successfully recalled `cs-linear-evidence` with 2 compiled evidence sources:

- `Linear CRE-335`
- `Linear CRE-339`

## MCP Catalog Memory Lane Follow-Up

CRE-348 added a separate `cs-mcp-catalog` sub-tenant for sanitized MCP registry summaries. The checked-in Hub registry remains the source of truth; Hydra DB catalog recall is advisory context for server selection, tool exposure pruning, and preflight review.

Validation commands:

```bash
pnpm hydradb:mcp-catalog -- plan --include-dormant --include-local --json
pnpm hydradb:mcp-catalog -- export --server ground-mcp --server hydradb-context-mcp --server webflow-template-review-mcp --server halfdozen-dm-mcp --include-dormant --include-local --json
pnpm hydradb:mcp-catalog:infisical -- seed-eval --include-dormant --include-local
pnpm hydradb:mcp-catalog-preflight:infisical -- --task "Choose MCP servers for Webflow marketplace template review with code-quality verification" --json
```

The full catalog run selected 48 sanitized core registry documents. Each seed call reported `1 success, 0 failed`. The catalog recall eval passed `4/4`:

| Query                                            | Result | Count |
| ------------------------------------------------ | ------ | ----- |
| Which MCP servers help with code quality?        | PASS   | 9     |
| Which MCP servers relate to Hydra DB context?    | PASS   | 7     |
| Which MCP servers support Webflow template work? | PASS   | 7     |
| Which MCP servers expose broad brokered tools?   | PASS   | 8     |

The governed wrapper successfully recalled `cs-mcp-catalog` with 6 compiled catalog sources for Webflow marketplace template review with code-quality verification:

- `MCP ground-mcp`
- `MCP webflow-template-review-mcp`
- `MCP webflow-app-review-mcp`
- `MCP webflow-local`
- `MCP webflow-site-analyzer-mcp`
- `MCP bettermode-creator`
