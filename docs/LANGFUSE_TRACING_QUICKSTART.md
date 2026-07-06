# Langfuse Tracing Quickstart (Node)

This repo now includes a small smoke script and a thin wrapper module to help you start tracing OpenAI calls with Langfuse.

Use this as operator-facing observability amplification for LLM spans, evals, and smoke runs. Do not treat Langfuse auto-instrumentation as the authoritative policy trace for governed MCP execution.

## 1) Set Environment Variables

Required:

- `LANGFUSE_SECRET_KEY`
- `OPENAI_API_KEY`

Optional:

- `LANGFUSE_PROJECT_NAME` (defaults to `CREATE SOMETHING`)
- `OPENAI_MODEL` (defaults to `gpt-4o`)
- `OPENAI_PROMPT` (defaults to `What is 1+1?`)

Optional production env vars (when validating the deployed worker route):

- `HALFDOZEN_AGENT_ROUTE_TOKEN`
- `PLAYBOOK_MCP_BASE_URL` (defaults to `https://playbook.mcp.createsomething.ltd`)
- `PLAYBOOK_MCP_SCENARIO` (`inbox-triage`, `fleet-watchdog`, `dedup`)
- `PLAYBOOK_MCP_QUERY`

## 2) Run The Smoke Scripts

Local OpenAI smoke (direct OpenAI call):

```bash
pnpm langfuse:smoke
```

Production route smoke (runs a protected Half Dozen scenario in the deployed worker and prints response):

```bash
pnpm langfuse:playbook-smoke
```

If everything is wired correctly, you should see:

- The model response in your terminal
- A trace in Langfuse for the OpenAI call

For production smoke, you should additionally see:

- `200` from the worker endpoint
- `success: true` in response payload
- A new trace in the Langfuse project for that scenario run
- No Langfuse flush-auth errors in worker logs (`Invalid API Key`, `Failed to construct records`, `Dropping batch`)

## 3) Run MCP Eval Scaffolds

This repo now includes six Langfuse eval scaffolds for MCP integration checks:

- `fleet_telemetry_contract` — protected playbook route returns a structured success payload
- `fleet_error_path_tracing` — protected playbook route returns a structured auth failure
- `account_isolation` — live Hub account-routing check that verifies lane tokens resolve the expected account and ignore spoofed account headers
- `exa_workload_latency` — live Hub + Exa proxy latency and structured output checks
- `hub_coverage_matrix` — lane-by-lane Hub reachability, tool visibility, and latency
- `hub_intent_routing_quality` — deterministic routing-quality regression for known intent phrases

Load env defaults (edit for your routes first):

```bash
set -a; . ./scripts/langfuse-mcp-evals.env.example; set +a
```

List available evals:

```bash
pnpm langfuse:eval:mcp:list
```

Run all MCP eval scaffolds:

```bash
pnpm langfuse:eval:mcp
```

Run all MCP eval scaffolds locally without uploading logs:

```bash
pnpm langfuse:eval:mcp:local
```

Notes:

- `fleet_telemetry_contract` will try `HALFDOZEN_AGENT_ROUTE_TOKEN` from env first, then fall back to the Infisical CLI when the token is not exported into the shell.
- `account_isolation` now defaults to live Hub account-routing checks using existing `CS_HUB_*_API_TOKEN` / `CS_HUB_*_AUTH_TOKEN` secrets. Set `MCP_ACCOUNT_ISOLATION_MODE=legacy_echo` to use a custom echo fixture instead.
- `hub_coverage_matrix` reuses existing `CS_HUB_*_API_TOKEN` / `CS_HUB_*_AUTH_TOKEN` env vars.
- `hub_intent_routing_quality` does not require live credentials.

Run one eval scaffold:

```bash
pnpm langfuse:eval:mcp:contract
pnpm langfuse:eval:mcp:error-path
pnpm langfuse:eval:mcp:account-isolation
pnpm langfuse:eval:mcp:exa
pnpm langfuse:eval:mcp:hub-coverage
pnpm langfuse:eval:mcp:intent-routing
```

## 4) Integrate In Your App

Use the wrapper entrypoint:

```ts
import { initLangfuse, wrapOpenAI } from '@create-something/observability/langfuse';
import { OpenAI } from 'openai';

initLangfuse({ projectName: 'My Project' });

const openai = wrapOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
```

Notes:

- `initLangfuse()` intentionally disables tracing if `LANGFUSE_SECRET_KEY` is missing (to avoid interactive login prompts in server/CI contexts).
- `wrapOpenAI()` is a no-op when Langfuse isn't configured.
- `wrapOpenAI()` only covers the LLM span. It does not prove that route authorization, quota, retry, or lane policy were applied.

## OpenAI Agents SDK (This Repo)

If you are using `@openai/agents` (Agents SDK), you can export its built-in spans into Langfuse:

```ts
import { registerOpenAIAgentsLangfuseTracing } from '@create-something/observability/openai-agents';

registerOpenAIAgentsLangfuseTracing({
  projectName: 'My Project',
  tags: ['agents']
});
```

This repo's Half Dozen smoke script will automatically enable Agents tracing when `LANGFUSE_SECRET_KEY` is set:

```bash
pnpm agent:halfdozen:smoke --scenario inbox-triage
```

## Governed MCP Requirement

If you use Langfuse in an MCP or Hub path that is subject to policy enforcement, the trace or log payloads must still include house governance fields such as:

- `account_id`
- `tenant_id`
- `correlation_id`
- route classification
- authorization or review outcome
- lane slug or bound host for named lanes

When using `@create-something/observability/mcp`, prefer `getTraceContext(...)` so those fields are attached consistently without duplicating noisy tags.

## Production Caution

Langfuse can log full prompts, inputs, and outputs. For production named lanes, review payload handling before enabling broad auto-instrumentation and avoid treating raw prompt capture as a default-safe setting.

## Runbook (Production Checklist)

1. Set required environment variables (`LANGFUSE_SECRET_KEY`, `OPENAI_API_KEY`, `HALFDOZEN_AGENT_ROUTE_TOKEN`).
2. Confirm worker secrets:

```bash
cd packages/playbook-mcp/worker && pnpm exec wrangler secret list
```

3. Trigger prod smoke:

```bash
set -a; . ./scripts/langfuse-playbook-smoke.env.example; set +a; pnpm langfuse:playbook-smoke
```

4. Verify:

- Worker response status is non-error and `success: true`.
- Langfuse project receives the latest trace for that run.
- If no trace appears, check worker secret freshness and deployment version.
- `Half Dozen Slack notify failed (404 no_service)` is a separate webhook-notification warning and does not block scenario execution or Langfuse trace flushing.
