# HydraDB Integration Review - 2026-05-13

Tracked work: CRE-316

Status: review complete. Recommendation is a contained pilot, not default production integration.

## Decision

HydraDB is a plausible Database-layer context hardening addition for CREATE SOMETHING agent systems. It should not be added to default hub bundles or customer lanes yet.

Start with a private pilot behind Infisical-managed credentials and a narrow house wrapper. Use HydraDB for recall evaluation and agent memory hardening, not as a replacement for repo-local source-of-truth artifacts.

## What HydraDB Provides

Public docs describe HydraDB as managed context infrastructure for AI applications:

- HTTP API at `https://api.hydradb.com`.
- Bearer-token API authentication.
- Tenant and sub-tenant isolation.
- Async ingestion for files, app knowledge, and user memories.
- Hybrid recall over knowledge sources and user memories.
- Optional graph context in recall responses.
- Official TypeScript and Python SDKs.
- Official stdio MCP package, `@hydra_db/mcp`, with store, search, conversation ingest, list, delete, and fetch-content tools.

Relevant public docs:

- https://docs.hydradb.com/quickstart
- https://docs.hydradb.com/essentials/architecture
- https://docs.hydradb.com/essentials/recall
- https://docs.hydradb.com/essentials/multi-tenant
- https://docs.hydradb.com/plugins/mcp
- https://docs.hydradb.com/api-reference/sdks
- https://docs.hydradb.com/essentials/metadata

## Three-Tier Classification

Database:

- Primary fit. HydraDB stores and recalls durable context, memories, source metadata, graph relations, and retrieval results.
- It should be treated as an external memory/index substrate, not as policy authority.

Automation:

- Secondary fit through the official MCP tools and SDK endpoints.
- Any store, delete, or inferred-memory operation is an Automation-layer action and must go through normal hub authz, rate-limit, and audit controls.

Judgment:

- HydraDB can run inference during memory ingestion when `infer: true`.
- That means it can transform raw records into extracted preferences or insights. For this repo, use `infer: false` by default until policy and eval coverage explicitly approve inferred memories.

## Repo Fit

Best candidates:

- `packages/create-something-mcp`: currently uses generated content plus lexical search and a repo-local graph. HydraDB can augment recall, but should not replace the static artifact pipeline.
- `scripts/build-knowledge-graph`: can export policy, docs, and decision artifacts into HydraDB `app_knowledge` for recall testing.
- `packages/scanner-worker/src/services/memory.ts`: current P3 memory uses exact fingerprints and simple Jaccard similarity. HydraDB is a good candidate for a false-positive and precedent-memory pilot.
- `packages/cs-mcp-hub`: can broker a narrow house wrapper once the tool surface and auth model are explicit.

Avoid initially:

- Default `core` or `observability` hub bundles.
- Direct customer-facing HydraDB MCP exposure.
- Uploading private client data, customer conversations, or raw credentials.
- Using the provided live token directly after it was pasted into chat.

## Credential Handling

The HydraDB API key should be treated as exposed because it was shared in chat, which can also place it in local process arguments depending on how Codex was launched. If the current key is kept temporarily, limit it to internal non-customer pilot data and rotate it before any production or customer-facing use.

Do not store the key in repo files, generated registry artifacts, Linear, or delivery docs.

Recommended Infisical location for a pilot:

- Environment: `prod`
- Path: `/mcp-hub/hydradb`
- Secret names:
  - `HYDRA_DB_API_KEY`
  - `HYDRA_DB_TENANT_ID=create_something`
  - `HYDRA_DB_SUB_TENANT_ID=cs-internal-context`

Keep the sub-tenant explicit per pilot surface, for example `cs_policy_docs_pilot`, `cs_scanner_precedent_pilot`, or `cs_operator_memory_pilot`.

## Integration Options

### Option A - Local official MCP pilot

Use the upstream `@hydra_db/mcp` package only in a local/operator environment:

```json
{
  "mcpServers": {
    "hydradb": {
      "command": "infisical",
      "args": [
        "run",
        "--env=prod",
        "--path=/mcp-hub/hydradb",
        "--include-imports=true",
        "--",
        "npx",
        "-y",
        "@hydra_db/mcp"
      ]
    }
  }
}
```

This avoids committing secrets and lets Infisical inject the expected HydraDB env vars. It is acceptable for a local pilot, but not enough for governed shared production because it bypasses house naming, authorization, and telemetry.

### Option B - House wrapper MCP

Recommended production path.

Build a narrow CREATE SOMETHING wrapper around HydraDB using the SDK or direct HTTP. Expose only house tools such as:

- `context_recall`
- `context_ingest_policy_artifact`
- `context_ingest_decision_record`
- `context_verify_processing`
- `context_delete_source`

Default behavior:

- Read-only recall first.
- `infer: false` first.
- Explicit tenant and sub-tenant mapping.
- Metadata filters required for scoped retrieval.
- Hub telemetry and authz on every call.
- Deletes operator-only.

### Option C - Direct SDK augmentation

Do not start here. Adding SDK calls directly into existing MCPs couples production tools to an external memory service before the governance wrapper exists.

## Pilot Plan

1. Store the active HydraDB pilot key in Infisical only, and schedule rotation before production or customer use.
2. Create a non-customer pilot tenant/sub-tenant.
3. Use `pnpm hydradb:pilot:infisical -- seed-eval` to ingest a small corpus:
   - `docs/policies/v1/*.md`
   - `docs/MCP_HUB_CONTROL_PLANE.md`
   - `docs/HUB_EXECUTION_GOVERNANCE_PLAN.md`
   - selected scanner false-positive records without client secrets
4. Evaluate recall with fixed queries:
   - "Which policy governs bearer token rotation?"
   - "How should large MCP tool catalogs be exposed?"
   - "What is the required downstream execution pipeline?"
   - "Has this scanner finding pattern been marked false positive before?"
5. Compare against current repo-local search and graph traversal.
6. Record latency, result quality, source citation quality, tenant isolation behavior, and delete behavior.

## Acceptance Criteria

- Active key is stored only in Infisical, with rotation required before production or customer use.
- No plaintext HydraDB secret exists in git, Linear, shell scripts, or generated docs.
- Pilot corpus contains no client secrets or private customer data.
- Recall results include usable source metadata and are measurably better than lexical search for at least one target workflow.
- Deletes and processing-status checks work.
- Tenant/sub-tenant model is documented for any future client use.
- A house wrapper design exists before any shared hub or customer-facing exposure.

## Open Questions

- Whether HydraDB has a security packet or current SOC 2 report available beyond marketing/login-page claims.
- Data retention and deletion guarantees for ingested memories and graph-derived artifacts.
- Whether `infer: true` stores model-derived preferences in a way that can be audited, corrected, and deleted.
- Practical rate limits for the account tier.
- Whether the official MCP package is stable enough for long-lived operator workflows or should be wrapped immediately.
