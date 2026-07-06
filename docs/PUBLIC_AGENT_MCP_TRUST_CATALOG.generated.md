# Public Agent & MCP Trust Catalog (Generated)

> Auto-generated from `config/mcp-hub/registry.json`, `config/dify/inventory.json`, and `config/public-trust/evidence.json`.
> Regenerate with `pnpm trust:catalog:generate`.

This catalog is the owned source of truth for public CREATE SOMETHING MCP and agent trust cards. External listings should mirror these cards and link back to `createsomething.io`.

## Summary

- Public MCP cards: 3
- Public agent cards: 1
- Public access posture: read-only first
- Raw Langfuse traces, raw Langfuse traces, private client hubs, broad Composio surfaces, and credential references are excluded.

## MCP Cards

| MCP | Status | Access | Auth | Tools | Eval Status | Evidence |
| --- | --- | --- | --- | ---: | --- | --- |
| `create-something` | `public` | `read_only` | `none` | 5 | `pass` | `mcp/create-something` |
| `playbook` | `public` | `read_only` | `none` | 14 | `pass` | `mcp/playbook` |
| `three-tier-framework` | `public` | `read_only` | `none` | 6 | `pass` | `mcp/three-tier-framework` |

## Agent Cards

| Agent | Status | Access | Runtime/Auth | Tools | Eval Status | Evidence |
| --- | --- | --- | --- | ---: | --- | --- |
| `create-something-guide-agent` | `public` | `read_only` | public Dify access | 18 | `pass` | `agent/create-something-guide-agent` |

## Evidence Details

### CREATE SOMETHING Content

- Kind: `mcp`
- URL: `https://mcp.createsomething.ltd/mcp`
- Policy pack: `public-readonly-mcp.v1`
- Eval suite: `langfuse:eval:mcp:public-trust`
- Required checks: `auth_not_required`, `endpoint_reachable`, `expected_tools_present`, `grounded_content`, `latency_budget`, `no_credential_material`, `tool_call_ok`, `tools_listed`
- Last catalog review: `2026-05-10`
- Risk summary: Read-only public knowledge surface. No write tools, private client hubs, raw traces, or credential references are included in the public card.
- Evidence summary: The public card is limited to read-only content search, relationship traversal, classification, triad analysis, and design audit guidance over owned public CREATE SOMETHING material.
- Runtime observability: `langfuse` / `label_declared`
- Redacted samples:
  - Public content search rollup: `config/public-trust/samples/mcp-create-something-search.md`
- Limitations:
  - Public card exposes only read-only content and analysis tools.
  - Catalog evidence is sanitized and does not include raw traces or private client hub data.
  - Runtime behavior must remain inside public CREATE SOMETHING source material.

### Playbook

- Kind: `mcp`
- URL: `https://playbook.mcp.createsomething.ltd/mcp`
- Policy pack: `public-playbook-mcp.v1`
- Eval suite: `langfuse:eval:mcp:public-trust`
- Required checks: `auth_not_required`, `endpoint_reachable`, `expected_tools_present`, `grounded_content`, `latency_budget`, `no_credential_material`, `tool_call_ok`, `tools_listed`
- Last catalog review: `2026-05-10`
- Risk summary: Read-only workflow guidance surface. Secret-echoing config generation is excluded from the public guide agent and public snippets are generated without credential values.
- Evidence summary: The public card covers read-only host playbooks, workflow retrieval, outcome playbooks, MCP discovery, and connection verification guidance.
- Runtime observability: `langfuse` / `label_declared`
- Redacted samples:
  - Host playbook rollup: `config/public-trust/samples/mcp-playbook-host-guidance.md`
- Limitations:
  - Generated setup snippets must never include secrets or bearer values.
  - Workflow playbooks are templates, not live operational authority.
  - Public evidence links to redacted samples only; raw traces remain private.

### Three-Tier Framework

- Kind: `mcp`
- URL: `https://framework.mcp.createsomething.agency/mcp`
- Policy pack: `public-three-tier-framework.v1`
- Eval suite: `langfuse:eval:mcp:public-trust`
- Required checks: `auth_not_required`, `endpoint_reachable`, `expected_tools_present`, `grounded_content`, `latency_budget`, `no_credential_material`, `tool_call_ok`, `tools_listed`
- Last catalog review: `2026-05-10`
- Risk summary: Read-only advisory framework surface. It returns structured analysis and does not access private tenant state.
- Evidence summary: The public card covers read-only framework classification, debugging, MCP analysis, policy artifact identification, metaphor mapping, and architecture comparison.
- Runtime observability: `langfuse` / `label_declared`
- Redacted samples:
  - Framework classification rollup: `config/public-trust/samples/mcp-three-tier-framework-classification.md`
- Limitations:
  - Framework outputs are advisory and must be checked against the actual system being evaluated.
  - Public evidence summarizes eval outcomes only; raw traces are not exposed.
  - The server does not grant access to private client policies or tenant data.

### CREATE SOMETHING Guide Agent

- Kind: `agent`
- URL: `https://udify.app/chat/4uWXtN5tF5KsLg36`
- Policy pack: `public-create-something-guide-agent.v1`
- Eval suite: `langfuse:eval:dify:create-something-guide-agent`
- Required checks: `api_health`, `catalog_evidence_binding`, `expected_tool_use`, `forbidden_tool_use`, `grounded_answer`, `latency_budget`, `prompt_secret_refusal`, `public_access_boundary`, `readonly_tool_surface`, `secret_refusal`, `smoke_cases_declared`
- Last catalog review: `2026-05-10`
- Risk summary: No write-capable tools, private client hubs, broad connector surfaces, or credential-backed MCP cards are enabled.
- Evidence summary: The public guide agent is a published read-only Dify agent backed only by the three public read-only MCPs in this catalog.
- Runtime observability: `langfuse` / `in_service`
- Redacted samples:
  - Public guide answer rollup: `config/public-trust/samples/agent-create-something-guide.md`
- Limitations:
  - Read-only public access only; no writes, deployments, registry mutations, or client actions are available.
  - No write-capable tools, private client hubs, Composio surfaces, or credential-backed MCP cards are enabled.
  - Answers must cite public source material or describe uncertainty.
