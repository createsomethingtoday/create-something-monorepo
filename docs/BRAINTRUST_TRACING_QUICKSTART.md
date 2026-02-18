# Braintrust Tracing Quickstart (Node)

This repo now includes a small smoke script and a thin wrapper module to help you start tracing OpenAI calls with Braintrust.

## 1) Set Environment Variables

Required:

- `BRAINTRUST_API_KEY`
- `OPENAI_API_KEY`

Optional:

- `BRAINTRUST_PROJECT_NAME` (defaults to `Create Something`)
- `OPENAI_MODEL` (defaults to `gpt-4o-mini`)
- `OPENAI_PROMPT` (defaults to `What is 1+1?`)

## 2) Run The Smoke Script

```bash
pnpm tsx scripts/braintrust-openai-smoke.ts
```

If everything is wired correctly, you should see:

- The model response in your terminal
- A trace in Braintrust for the OpenAI call

## 3) Integrate In Your App

Use the wrapper entrypoint:

```ts
import { initBraintrust, wrapOpenAI } from '@create-something/observability/braintrust';
import { OpenAI } from 'openai';

initBraintrust({ projectName: 'My Project' });

const openai = wrapOpenAI(
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
);
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
