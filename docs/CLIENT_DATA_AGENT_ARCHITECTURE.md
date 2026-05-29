# Client Data Agent Architecture

- Status: `draft`
- Owner: `CREATE SOMETHING integration architecture`
- Linear: `CRE-426`
- Last reviewed: `2026-05-22`

## Purpose

This document codifies the first client-owned data agent pattern for
Kickstand-style monitoring datasets.

The goal is not to "train on client data" by default. The first product shape is
a client-specific Dify agent grounded in the client's living dataset, with
bounded MCP access, explicit policy, eval gates, and optional E2B evidence
checks.

## Decision

Use Dify as the client-facing runtime and CREATE SOMETHING as the control plane.

For the first pilot:

1. Store normalized client records as the durable source of truth.
2. Feed client-approved slices into Dify Knowledge or an external knowledge
   endpoint.
3. Give the Dify agent only the MCP tools needed to inspect, explain, and
   optionally queue approved actions.
4. Use E2B only for bounded confirmation work such as data checks, calculations,
   CSV inspection, and evidence generation.
5. Keep raw provider payloads short-lived.
6. Keep client-specific data out of cross-client training unless the client opts
   in explicitly.

## Product Shape

The agent should answer questions such as:

- What new public posts were found this week?
- Which posts likely announce real events?
- Which artists are recurring, new, or ambiguous?
- Which venues or accounts are producing the strongest signals?
- What changed since the last reporting period?
- Which items need human review before client delivery?
- Why did the system classify this post as urgent, duplicate, or low-value?

The agent should not become a broad scraping or admin operator. Collection,
normalization, retention, and client delivery remain product systems. The agent
interprets and operates on approved data surfaces.

## Data Layers

| Layer | Store | Agent access | Retention |
|-------|-------|--------------|-----------|
| Normalized client records | Client-scoped database or warehouse | Yes | Contract-defined |
| Provider provenance | Run metadata, provider IDs, costs, errors | Yes, summarized | Long-term if non-sensitive |
| Raw provider payloads | Encrypted object storage | No by default; debug only | 7-30 days |
| Final deliverables | Client-facing tables, reports, exports | Yes | Contract-defined |
| Platform telemetry | Aggregated provider reliability, latency, cost, schema drift | Yes, only aggregated | Long-term |
| Training/eval examples | Curated and approved examples | Only if opt-in | Explicit policy |

## Dify Runtime Pattern

Use this split:

- Dify app: client-facing chat/workflow surface.
- Dify Knowledge: approved client context and documentation.
- External Knowledge API: preferred when retrieval must stay inside our own
  client-scoped data store.
- MCP tools: bounded live actions and retrieval that should not be embedded as
  static knowledge.
- E2B builtin tools: sandboxed confirmation and data inspection, not open-ended
  production automation.
- Braintrust: eval system of record.
- Repo inventory: source of truth for prompt, tool exposure, policy, and eval
  gates.

## Knowledge Strategy

Start with Dify Knowledge for pilot speed when the dataset slice is small,
approved, and text-friendly.

Use an external knowledge endpoint when any of these are true:

- data is large or frequently updated;
- retrieval needs custom filters such as client, venue, date range, source, or
  confidence;
- access must remain fully tenant-scoped in CREATE SOMETHING infrastructure;
- the client needs deletion, export, or audit controls outside Dify.

For Kickstand, the likely split is:

- Dify Knowledge: client playbook, business rules, reporting preferences, known
  artist/venue context, glossary.
- External Knowledge/MCP: live normalized post/event dataset and review status.

## MCP Access

The first client data agent should expose a narrow house MCP, not direct provider
MCPs.

Suggested capability names:

- `client_data_search`
- `client_data_get_record`
- `client_data_summarize_period`
- `client_data_compare_periods`
- `client_data_explain_classification`
- `client_data_queue_review`

Default permissions:

| Tool | Risk | Confirmation |
|------|------|--------------|
| `client_data_search` | read | no |
| `client_data_get_record` | read | no |
| `client_data_summarize_period` | read | no |
| `client_data_compare_periods` | read | no |
| `client_data_explain_classification` | read | no |
| `client_data_queue_review` | write | yes |

Do not expose Bright Data, Apify, Airtable, or broad Composio tools directly to
the client-facing agent unless there is a deliberate exception. Provider tools
belong behind CREATE SOMETHING adapters.

## E2B Role

E2B is useful for bounded confirmation work:

- inspect a CSV export;
- compute counts or deltas;
- validate duplicate keys;
- compare two small result samples;
- generate a short evidence artifact;
- run deterministic checks before a suggested write.

E2B should not have arbitrary access to client credentials or broad write tools.
Treat `run_code`, `run_command`, `upload_file`, and `download_file` as
external-side-effect tools in Dify inventory unless a narrower policy is
documented.

## Policy Pack

Create a policy pack such as `client-data-agent.v1` with these rules:

1. Client data is client-owned or client-controlled by default.
2. Use client-specific data only to operate and improve that client's service.
3. Use aggregated, non-identifying telemetry to improve CREATE SOMETHING
   platform reliability.
4. Do not reuse client-specific examples for other clients, demos, evals,
   training, or fine-tunes without explicit opt-in.
5. Raw provider payload access is debug-only and short-lived.
6. Write-capable tools require explicit user confirmation.
7. The agent must disclose when an answer is based on incomplete retrieval.

## Eval Gates

Every client data agent should ship with these gates:

- `api_health`
- `expected_tool_use`
- `forbidden_tool_use`
- `grounded_answer`
- `secret_refusal`
- `latency_budget`
- `policy_boundary`
- `tenant_isolation`
- `error_recovery`

Add `write_confirmation` as soon as the agent has any review queue, CRM, Airtable,
Notion, Slack, or delivery-write tool.

Minimum smoke cases:

1. Answer a summary question using client knowledge.
2. Retrieve a known record by source URL or record ID.
3. Refuse cross-client data access.
4. Refuse credential disclosure.
5. Ask for confirmation before queuing or writing a review action.
6. Use E2B for a bounded calculation only when the task requires calculation.

## Kickstand Pilot

Build the first agent as `kickstand-data-agent`.

Initial scope:

- read-only client chat over normalized Instagram/event monitoring records;
- Dify Knowledge for business rules and reporting preferences;
- external knowledge or MCP for live record retrieval;
- no direct Bright Data or Apify tool exposure;
- E2B allowed only for bounded calculations and CSV/evidence inspection;
- no writes except a later explicit `queue_review` action.

Pilot sequence:

1. Define the normalized record schema for agent retrieval.
2. Select 50-200 approved historical records as a pilot corpus.
3. Create Dify Knowledge for client rules and glossary.
4. Build a read-only `client_data_search` retrieval surface.
5. Create the Dify app in Studio.
6. Export/import the DSL into `config/dify-agents/`.
7. Add inventory entry and smoke cases.
8. Add Braintrust evals.
9. Run shadow with internal users before giving client access.

## Open Decisions

- Whether the first retrieval surface should be Dify Knowledge only or an
  external knowledge API backed by the client database.
- Which client-specific fields are allowed in agent context.
- Retention duration for raw Bright Data/Apify payloads.
- Whether the client wants opt-in reusable eval examples.
- Whether the first write action should be `queue_review`, `create_report`, or
  no write action at all.

