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

Current project reference inferred from the Trigger.dev dashboard URL shared in this thread:

- `TRIGGER_PROJECT_REF=create-something-d6vx`

## Tasks

Current tasks are foundation-only:

- `cs-trigger-foundation-healthcheck`
- `cs-halfdozen-scenario-dispatch`
- `cs-halfdozen-fleet-watchdog-hourly`

`cs-halfdozen-scenario-dispatch` currently returns a structured phase result and refuses to imply live execution readiness. That is deliberate until the shared OpenAI Agents SDK runtime is extracted from the smoke script and moved behind a reusable package boundary.

`cs-halfdozen-fleet-watchdog-hourly` is a declarative v4 scheduled task. It currently schedules dry-run dispatches for the `fleet-watchdog` lane so the scheduling and queue surfaces are proven before live execution is enabled.

Phase 2 extraction is now in place:

- the shared Half Dozen runtime lives in `src/halfdozen.ts`
- the existing smoke script uses that shared runtime
- Trigger.dev live execution is currently limited to the read-only `fleet-watchdog` lane

To enable the live read-only pilot, set:

```bash
CS_TRIGGER_ENABLE_LIVE_HALFDOZEN=true
OPENAI_API_KEY=...
```

Non-watchdog scenarios remain blocked in Trigger.dev until the bounded-write lane is implemented.

## Next step

Phase sequencing lives in:

- `docs/TRIGGER_DEV_TEMPORAL_PHASE_PLAN_2026-03-15.md`
