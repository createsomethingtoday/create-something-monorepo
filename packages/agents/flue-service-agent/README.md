# Flue Service Agent Pilot

This package is the first Flue service-agent slice for Policy OS delivery.

It does not replace `packages/relay`. Relay remains the Pi/OpenClaw channel gateway. This package proves the parallel service-agent path: typed webhook or CLI input, contract-bound prompt context, schema-constrained output, and Linear-ready runtime evidence.

## Runtime Shape

- Runtime: `flue`
- Role: `service_agent`
- Agent: `.flue/agents/service-delivery.ts`
- Readiness agent: `.flue/agents/delivery-readiness.ts`
- MCP access agent: `.flue/agents/mcp-access-review.ts`
- Cloudflare readiness agent: `.flue/agents/cloudflare-readiness.ts`
- Endpoint patterns after `flue dev` or `flue build`:
  - `POST /agents/service-delivery/:id`
  - `POST /agents/delivery-readiness/:id`
  - `POST /agents/mcp-access-review/:id`
  - `POST /agents/cloudflare-readiness/:id`
- Golden task: `runtime-routing-pi-flue`
- Contract refs: `templates/agent_contract.yaml`, `templates/golden_tasks.yaml`

## Commands

```bash
pnpm --dir packages/agents/flue-service-agent test
pnpm --dir packages/agents/flue-service-agent typecheck
./scripts/ona-bootstrap-local.sh pnpm --dir packages/agents/flue-service-agent flue:build
pnpm --dir packages/agents/flue-service-agent flue:smoke
pnpm --dir packages/agents/flue-service-agent flue:smoke:cloudflare
pnpm --dir packages/agents/flue-service-agent flue:evidence:cloudflare
pnpm --dir packages/agents/flue-service-agent flue:history:cloudflare
pnpm --dir packages/agents/flue-service-agent flue:resources:smoke
```

Run locally with a provider key in an ignored env file:

```bash
pnpm --dir packages/agents/flue-service-agent dev -- --env .env
curl http://localhost:3583/agents/service-delivery/runtime-routing-pi-flue \
  -H "Content-Type: application/json" \
  --data-binary @packages/agents/flue-service-agent/fixtures/runtime-routing-pi-flue.json
```

Flue currently requires Node 22.18+. Use `./scripts/ona-bootstrap-local.sh` from the repo root when the host shell is still on an older Node.

The pure contract adapter in `src/contract.ts` is intentionally testable without a model call. That gives Policy OS a stable evidence envelope even while Flue runtime APIs are still moving.

`flue:smoke` runs the same deterministic path end to end: it builds the Flue server, verifies the generated manifest includes all webhook agents, validates the runtime-routing fixture, checks delivery readiness, checks brokered MCP access through `create-something-hub`, and emits JSON evidence that can be attached to Linear.

`flue:smoke:cloudflare` also builds the Cloudflare target and verifies the generated `manifest.json`, `wrangler.jsonc`, `_entry.ts`, Durable Object bindings, migrations, and deployment guardrails. It does not deploy.

`flue:evidence` and `flue:evidence:cloudflare` convert the same deterministic smoke evidence into a compact Markdown report for Linear. Set `LINEAR_ISSUE=CRE-123` to stamp the report with a tracked issue, or pass `--out <path>` to write it to a local artifact file. The Cloudflare evidence command is the promotion gate because it includes Worker artifact readiness and rollback notes.

`flue:history` and `flue:history:cloudflare` append schema-valid run-history records to `.artifacts/flue-service-agent/run-history.jsonl`. This ignored JSONL resource is the local observability handoff: each record has a stable `flue://run-history/...` URI, readiness scores, MCP access observations, generated artifact refs, secret-location policy, and rollback notes. Use `LINEAR_ISSUE=CRE-123` to stamp records with tracked work.

For hosted `create-something` MCP promotion, use the higher-level operator command from the MCP package:

```bash
pnpm --dir packages/create-something-mcp flue:history:promote -- --issue CRE-123
```

It generates the Cloudflare-ready run-history record and syncs validated JSONL into `TELEMETRY_DB.flue_run_history`.

GitHub Actions also owns this promotion path through `.github/workflows/flue-run-history-promotion.yml`: PR and `main` changes run dry-run validation, while manual `workflow_dispatch` with `target=remote` performs the protected D1 promotion.

`flue:resources:smoke` validates the MCP resource handoff by appending a Cloudflare-ready run-history record and reading these package-owned resources:

- `flue://run-history/status`
- `flue://run-history/latest`
- `flue://run-history/list`

Use `registerFlueRunHistoryResources(server, { historyPath })` from `src/mcp-resources.ts` to expose those JSON resources on an MCP server that follows the repo's `server.resource(...)` pattern.
