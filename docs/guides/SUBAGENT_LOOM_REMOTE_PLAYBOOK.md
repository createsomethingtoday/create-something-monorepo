# Subagent Playbook for Loom Remote

Use this guide when you want multiple agents working in parallel on the CREATE SOMETHING monorepo with shared task state in remote Loom.

## Goal

Turn subagents into bounded workers with:

- remote task coordination
- narrow ownership boundaries
- explicit verification commands
- clean handoff back to a lead agent

This is the default shared-work pattern for this repo. Use local `lm` only when you intentionally want repo-local `.loom` state.

## Core rule

Split work by **tier**, **package**, or **artifact**.

Good splits:

- one MCP package per agent
- one policy artifact family per agent
- one frontend app per agent
- one verification lane per agent
- one Database / Automation / Judgment lane each

Bad splits:

- "go investigate everything"
- multiple unrelated packages in one task
- mixed code + policy + strategy work without a narrow success condition

## Default operating model

1. Create a parent Loom task for the overall objective.
2. Create one child task per subagent lane.
3. Claim each task with a stable agent name.
4. Give each subagent:
   - one primary label
   - one allowed scope
   - one verification command set
   - one explicit do-not-cross boundary
5. Reconcile changes in a lead-agent pass.
6. Complete each task with evidence.

## Remote Loom commands

Check ready work:

```bash
pnpm loom:remote ready
pnpm loom:remote list --status ready --label code-quality-light
pnpm loom:remote list --status ready --label code-quality
pnpm loom:remote list --status ready --label policy
```

Create a task:

```bash
pnpm loom:remote create \
  --title "Fix MCP gate regression in webflow-template-review-mcp" \
  --description "Tier: Automation
Objective: Restore the failing MCP quality gate for webflow-template-review-mcp.
Verification:
- pnpm mcp:gate:typecheck

Allowed scope:
- packages/webflow-template-review-mcp
- directly required shared build/type infrastructure

Do not:
- broaden into repo-wide cleanup
- edit policy artifacts unless generation is the direct blocker" \
  --priority high \
  --label code-quality-light
```

Claim and complete:

```bash
pnpm loom:remote claim --task-id <id> --agent codex-mcp-1
pnpm loom:remote complete --task-id <id> --evidence "pnpm mcp:gate:typecheck passed"
```

Inspect task state:

```bash
pnpm loom:remote get --task-id <id>
pnpm loom:remote summary --label code-quality-light
pnpm loom:remote summary --label code-quality
```

## Recommended lane types

### 1. MCP package lane

Use for one server or worker package at a time.

Examples:

- `packages/cs-mcp-hub`
- `packages/webflow-app-review-mcp`
- `packages/webflow-template-review-mcp`
- `packages/notion-sync-mcp`
- `packages/gmail-notion-mcp`

Default label:

- `code-quality-light` for narrow package fixes that can stay lightweight
- `code-quality` when the package work needs broad verification or full bootstrap

Verification:

- `pnpm mcp:gate:typecheck`
- package-local test command when available

### 2. Policy artifact lane

Use when touching source policy files or generated outputs.

Examples:

- `docs/policies/v1`
- `docs/policies/generated`
- `packages/policy-os-engine`

Default label:

- `policy`

Verification:

- `pnpm policy:artifacts:check`
- `pnpm authz:compile` when authz inputs changed

### 3. Frontend app lane

Use for one Svelte app or dashboard surface.

Examples:

- `packages/agency`
- `packages/concierge-chat`
- `packages/webflow-dashboard`
- `packages/lms`

Default label:

- `code-quality-light` for package-scoped UI changes with narrow verification
- `code-quality` when the app change needs broader integration or repo-wide checks

Verification:

- narrow package `pnpm check`
- package tests
- UI preview if the change is visual

### 4. Documentation and runbook lane

Use for architecture docs, operator guides, or rollout instructions.

Examples:

- `docs/`
- `docs/guides/`
- package-local docs

Default label:

- `policy` for governance/process docs
- `code-quality-light` for implementation-adjacent docs, scripts, or config tied to a narrow code change
- `code-quality` when the docs task is coupled to broader verification or integration work

Verification:

- direct source review
- linked command examples checked against repo scripts

### 5. Verification lane

Use a dedicated agent when the main risk is integration rather than implementation.

Examples:

- root `pnpm check`
- root `pnpm lint`
- root `pnpm test`
- `pnpm mcp:gate`
- Braintrust evals
- `pnpm ground`

Default label:

- `code-quality`

Verification:

- the lane exists to produce the verification evidence

## Template shapes

### Parent task template

```text
Tier: Automation
Objective: <overall outcome>

Subagent lanes:
- <lane 1>
- <lane 2>
- <lane 3>

Completion condition:
- all child lanes completed with evidence
- lead-agent reconciliation finished

Do not:
- let subagents widen scope without creating a new Loom task
```

### Child task template

```text
Tier: <Database|Automation|Judgment>
Objective: <single narrow outcome>
Verification:
- <exact command>

Allowed scope:
- <package/path/artifact family>

Do not:
- <scope boundary>

Handoff:
- report files touched
- report verification result
- report blockers or follow-up tasks
```

## Agent naming

Use stable names so task history stays legible.

Examples:

- `codex-lead`
- `codex-mcp-1`
- `codex-policy-1`
- `codex-ui-1`
- `codex-verify-1`

Do not rotate names mid-stream unless ownership really changed.

## Best splits for this monorepo

### Database / Automation / Judgment split

Use when a change crosses layers.

- `Database` agent checks data shape, migrations, bindings, records, generated artifacts
- `Automation` agent fixes workers, handlers, scripts, tests, packaging
- `Judgment` agent checks policies, prompts, approval rules, governance docs

This mirrors the framework in `docs/THREE_TIER_FRAMEWORK.md`.

### MCP fleet split

Use when one issue may affect multiple servers.

- one agent identifies affected packages
- one agent per affected MCP
- one verification agent runs `pnpm mcp:gate`

### Policy sync split

Use when source markdown, JSON, generated fallback, and Polar outputs must agree.

- one agent updates source artifacts
- one agent compiles generated artifacts
- one agent validates engine/runtime impact

### Release-readiness split

Use before deploys or broad merges.

- one agent for registry and exposure checks
- one agent for policy artifact checks
- one agent for smoke/eval runs
- one lead agent reconciles and decides release status

## Lead agent responsibilities

The lead agent should:

- create and name the task graph
- keep each subagent bounded
- prevent overlapping ownership
- collect verification evidence
- decide whether new follow-up tasks are needed
- run final reconciliation and final checks

Do not use subagents as a substitute for reconciliation. Parallel work without a lead pass just moves the integration burden later.

## When not to use subagents

Avoid subagents for:

- a one-file change with one obvious verification command
- vague exploration without a concrete outcome
- work that depends on one sequential discovery chain
- tasks smaller than the coordination overhead

## Example: three-lane MCP fix

Parent task:

- `Fix MCP gate regression across webflow review services`

Child lanes:

- `codex-mcp-1`: `packages/webflow-app-review-mcp`
- `codex-mcp-2`: `packages/webflow-template-review-mcp`
- `codex-verify-1`: `pnpm mcp:gate:typecheck`

Success condition:

- each package lane completes with evidence
- verification lane passes after reconciliation

## Example: policy rollout change

Parent task:

- `Update tenant tool exposure governance and generated outputs`

Child lanes:

- `codex-policy-1`: edit `docs/policies/v1/policy.tenant-tool-exposure.v1.*`
- `codex-policy-2`: regenerate and validate `docs/policies/generated/*`
- `codex-verify-1`: run `pnpm policy:artifacts:check`

## Relationship to Symphony

Use Loom remote as the system of record.
Use Symphony when you want a lane to execute in an isolated worktree with a bounded workflow.

Recommended pattern:

1. Create the Loom remote task.
2. Make the task narrow and verifiable.
3. Run Symphony only for lanes that justify isolated execution.
4. Return evidence to Loom remote on completion.

## Minimal checklist

Before starting:

- task exists in remote Loom
- scope is narrow
- label is correct
- verification command is explicit

Before completing:

- diff reviewed
- verification run
- evidence recorded
- follow-up tasks created if scope expanded
