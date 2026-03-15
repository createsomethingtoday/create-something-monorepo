# @create-something/workflows-trigger

Trigger.dev-first orchestration foundation for CREATE SOMETHING.

This package is intentionally narrow:

- It establishes the Trigger.dev workspace shape.
- It defines the initial env/config contract.
- It provides a minimal task surface for Phase 1 validation.
- It does **not** yet move live Half Dozen/OpenAI execution into Trigger.dev.

## Phase intent

Use Trigger.dev first for:

- scheduled runs
- retries
- parallel fan-out
- lightweight background orchestration

Keep these concerns outside this package for now:

- route authorization and review decisions (`mcp-authz` + `policy-os-engine`)
- tool execution (`Hub MCP`)
- durable pause/resume and approval waits (`Temporal`, later)

## Commands

From the repo root:

```bash
pnpm trigger:dev
pnpm trigger:dev:infisical
pnpm trigger:deploy
pnpm trigger:deploy:infisical
```

For raw CLI access, use the package directly:

```bash
pnpm --filter @create-something/workflows-trigger exec trigger --help
bash scripts/trigger/run-with-infisical.sh whoami
```

## Environment

Required for `trigger.dev dev`:

- `TRIGGER_SECRET_KEY`
- `TRIGGER_PROJECT_REF`

Required for `trigger.dev deploy`:

- `TRIGGER_ACCESS_TOKEN`
- `TRIGGER_PROJECT_REF`

Optional:

- `OPENAI_API_KEY`
- `BRAINTRUST_API_KEY`
- `CS_TRIGGER_ENABLE_LIVE_HALFDOZEN`

## Tasks

Current tasks are foundation-only:

- `cs-trigger-foundation-healthcheck`
- `cs-halfdozen-scenario-dispatch`

`cs-halfdozen-scenario-dispatch` currently returns a structured phase result and refuses to imply live execution readiness. That is deliberate until the shared OpenAI Agents SDK runtime is extracted from the smoke script and moved behind a reusable package boundary.

## Next step

Phase sequencing lives in:

- `docs/TRIGGER_DEV_TEMPORAL_PHASE_PLAN_2026-03-15.md`
