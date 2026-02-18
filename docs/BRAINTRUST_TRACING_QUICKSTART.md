# Braintrust Tracing Quickstart (Node)

This repo now includes a small smoke script and a thin wrapper module to help you start tracing OpenAI calls with Braintrust.

## 1) Set Environment Variables

Required:

- `BRAINTRUST_API_KEY`
- `OPENAI_API_KEY`

Optional:

- `BRAINTRUST_PROJECT_NAME` (defaults to `CREATE SOMETHING`)
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
pnpm braintrust:smoke
```

Production route smoke (runs a protected Half Dozen scenario in the deployed worker and prints response):

```bash
pnpm braintrust:playbook-smoke
```

If everything is wired correctly, you should see:

- The model response in your terminal
- A trace in Braintrust for the OpenAI call

For production smoke, you should additionally see:

- `200` from the worker endpoint
- `success: true` in response payload
- A new trace in the Braintrust project for that scenario run
- No Braintrust flush-auth errors in worker logs (`Invalid API Key`, `Failed to construct records`, `Dropping batch`)

## 3) Integrate In Your App

Use the wrapper entrypoint:

```ts
import { initBraintrust, wrapOpenAI } from '@create-something/observability/braintrust';
import { OpenAI } from 'openai';

initBraintrust({ projectName: 'My Project' });

const openai = wrapOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
```

Notes:

- `initBraintrust()` intentionally disables tracing if `BRAINTRUST_API_KEY` is missing (to avoid interactive login prompts in server/CI contexts).
- `wrapOpenAI()` is a no-op when Braintrust isn't configured.

## OpenAI Agents SDK (This Repo)

If you are using `@openai/agents` (Agents SDK), you can export its built-in spans into Braintrust:

```ts
import { registerOpenAIAgentsBraintrustTracing } from '@create-something/observability/openai-agents';

registerOpenAIAgentsBraintrustTracing({
  projectName: 'My Project',
  tags: ['agents']
});
```

This repo's Half Dozen smoke script will automatically enable Agents tracing when `BRAINTRUST_API_KEY` is set:

```bash
pnpm agent:halfdozen:smoke --scenario inbox-triage
```

## Runbook (Production Checklist)

1. Set required environment variables (`BRAINTRUST_API_KEY`, `OPENAI_API_KEY`, `HALFDOZEN_AGENT_ROUTE_TOKEN`).
2. Confirm worker secrets:

```bash
cd packages/playbook-mcp/worker && pnpm exec wrangler secret list
```

3. Trigger prod smoke:

```bash
set -a; . ./scripts/braintrust-playbook-smoke.env.example; set +a; pnpm braintrust:playbook-smoke
```

4. Verify:

- Worker response status is non-error and `success: true`.
- Braintrust project receives the latest trace for that run.
- If no trace appears, check worker secret freshness and deployment version.
- `Half Dozen Slack notify failed (404 no_service)` is a separate webhook-notification warning and does not block scenario execution or Braintrust trace flushing.
