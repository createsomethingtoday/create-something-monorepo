# Half Dozen Agent Analyzer Telemetry MCP

Hosted MCP for native Notion `AGENT ANALYZER` eval telemetry.

The server is intentionally append-only. Agents can record structured evidence about an evaluation run, but they cannot update or delete prior events. Notion remains the outcome record through `Test Reports [OS]` and `Tasks [HD]`; this MCP records the runtime trail that can be cross-checked later.

## Endpoints

- `GET /health`: public configuration and schema health.
- `POST /mcp`: streamable HTTP MCP endpoint, bearer protected.
- `/sse`: SSE fallback endpoint, bearer protected.

## Auth

Configure the Notion Custom Agent MCP connection with:

```text
Authorization: Bearer <MCP_API_KEY>
```

The Worker accepts `MCP_API_KEY`, with `OPERATOR_API_TOKEN` as an optional fallback for operator clients. The deployed bearer value is stored in Infisical as `HALFDOZEN_AGENT_ANALYZER_TELEMETRY_MCP_API_KEY` in `prod:/`.

## Langfuse

Langfuse is optional but supported as a first-class telemetry sink. When
`LANGFUSE_SECRET_KEY` is configured on the Worker, every append-only telemetry
event is mirrored into Langfuse as a tool span. Set `LANGFUSE_PROJECT_NAME`
or `LANGFUSE_PUBLIC_KEY` when the events should land in a specific Langfuse
project.

For native Notion agents that cannot be invoked programmatically, use this MCP
as the Langfuse bridge: the agent records run starts, checks, writes, cleanup,
scores, and final outcomes through the tools below, and the Worker sends the
same evidence to Langfuse.

## Tools

- `start_eval_run`
- `record_schema_check`
- `record_permission_check`
- `record_write_test`
- `record_cleanup_result`
- `record_langfuse_evidence`
- `record_langfuse_evidence`
- `record_score`
- `finish_eval_run`
- `get_eval_run`
- `list_recent_eval_runs`

Recommended Langfuse-first sequence:

1. `start_eval_run`
2. `record_schema_check` and `record_permission_check`
3. `record_write_test` and `record_cleanup_result` when a reversible test runs
4. `record_langfuse_evidence` for traces, logs, experiments, datasets, scores, and permalinks
5. `record_score` once per category, including overall
6. `finish_eval_run`

## Native Notion Agent Instruction Patch

The live Notion `AGENT ANALYZER` instructions should treat Langfuse as the
first-class runtime evidence layer:

- Test Reports must include `Langfuse evidence reviewed`, including trace/span
  ids, experiment refs, dataset refs, score refs, log refs, permalinks, and a
  telemetry completeness note. If no evidence is available, write
  `No Langfuse evidence found`.
- Langfuse is the system of record for evaluation runtime evidence. Notion
  remains the system of record for evaluation outcomes, Test Reports, tasks, and
  status changes.
- Langfuse may stay as supporting or fallback evidence while it remains
  configured, but it should not be described as the primary runtime evidence
  system.
- When the Telemetry MCP is available, every evaluation run should call:
  `start_eval_run`, schema and permission checks, any write and cleanup events,
  `record_langfuse_evidence`, category scores including `overall`, and
  `finish_eval_run`.

Transcript-derived business guardrails:

- Evaluation reports belong only in `Test Reports [OS]`. Never create report,
  feedback, or result pages in `AI Agents [HD]`, `Notes [HD]`, or the source
  agent page body.
- Access fixtures must be title-only unless the evaluated workflow specifically
  requires deeper write proof. Do not populate `Status`, priority, relations, or
  other automation-triggering properties just to prove access.
- For database access checks, title-only create plus archive/remove is enough.
  If the analyzer created the fixture, it should clean it up in the same run
  without waiting for human approval.
- Failed Test Reports should include implementation-ready recommendations so a
  downstream feedback-implementation agent or personal agent can apply the
  recommended instruction changes later.

## Deployment

```bash
pnpm --dir packages/halfdozen-agent-analyzer-telemetry-mcp/worker db:migrations:apply
pnpm --dir packages/halfdozen-agent-analyzer-telemetry-mcp/worker run check
pnpm --dir packages/halfdozen-agent-analyzer-telemetry-mcp/worker run deploy
```

Rollback: redeploy the previous Worker version from Cloudflare Workers deploy history. The D1 migration is additive and append-only.
