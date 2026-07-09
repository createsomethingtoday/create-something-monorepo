# Code-Quality Symphony

This workflow runs Symphony against Linear issues labeled `code-quality`.

Use this lane as the first CREATE SOMETHING agent-loop pilot. It is intentionally
bounded around existing repo primitives: Linear state, isolated Symphony
workspaces, Codex workers, package legibility checks, policy artifact checks,
and the Symphony test suite.

## Requirements

- `LINEAR_API_KEY` exported in the environment
- `codex` available on `PATH`
- `pnpm` available on `PATH`
- Linear GraphQL reachable at `https://api.linear.app/graphql`

## Task convention

Create Linear issues for this lane in the `CREATE SOMETHING Agent Coordination`
project with the `code-quality` label. Keep new issues in `Backlog` or `Todo`
until an operator has reviewed the scope. Move or claim one issue into
`In Progress` when it is ready for an unattended bounded pass.

Example:

```bash
pnpm linear:create -- \
  --title "Fix failing MCP typecheck in playbook worker" \
  --description "Investigate the current regression and land the smallest safe fix." \
  --label code-quality \
  --project "CREATE SOMETHING Agent Coordination"
```

## Running

Readiness preflight. This does not claim Linear work or start Codex workers:

```bash
pnpm agent:loop-pilot
```

The preflight checks:

- current git checkout state
- package agent legibility contracts
- policy artifact structure
- Symphony package tests
- Linear ready queue visibility when `LINEAR_API_KEY` is set

Dispatch one bounded pass only after the preflight is clean:

```bash
pnpm agent:loop-pilot:dispatch
```

`agent:loop-pilot:dispatch` runs the same preflight and then calls
`pnpm symphony:code-quality:once`. That command performs one poll/dispatch pass
and drains to idle instead of leaving a daemon running.

For one worker → read-only reviewer → integrator pass, use the exact-issue lane:

```bash
pnpm agent:loop-pilot:reviewed:check -- --issue CRE-1154 --json
pnpm agent:loop-pilot:reviewed -- --issue CRE-1154 --json
```

The readiness command validates the exact active `code-quality` issue and all
three work-unit contracts without creating a workspace. The live command uses
account-authenticated Codex, preserves the inspected workspace, writes a
machine-readable aggregate receipt, and comments Linear. It does not close,
merge, deploy, batch, or start a daemon.

Only `In Progress` Linear issues in the configured project with the
`code-quality` label are dispatchable. `Backlog` and `Todo` issues may appear in
broad Linear ready views, but the code-quality Symphony workflow must not
automatically claim them.

Continuous orchestration:

```bash
pnpm symphony:code-quality
```

Single poll / dispatch pass:

```bash
pnpm symphony:code-quality:once
```

Runtime state is exposed on `http://127.0.0.1:4780/`.

## Pilot boundaries

Start with the readiness preflight and a single dispatch pass. Do not promote
the continuous daemon until the single-pass evidence is boring.

Default authority:

- may read Linear issues labeled `code-quality`
- may claim `In Progress` work through Symphony when dispatch is explicitly requested
- may create isolated workspaces under `./.symphony/workspaces/code-quality`
- may run targeted package checks and leave a reviewable diff
- may record evidence through the tracker when the worker succeeds

Out of scope for the pilot:

- production deploys
- direct third-party mutations beyond Linear coordination
- broad refactors without a concrete drift signal
- automatic merge, push, or release promotion
- recurring unattended daemon runs without operator review of single-pass results

Stop and escalate when:

- Linear issue state cannot be reconciled with the workspace state
- Symphony claims an issue that does not carry the configured workflow label
- a workspace is dirty after a failed or interrupted worker run
- validation requires unavailable secrets or a live production mutation
- the worker finds policy or ownership ambiguity instead of a mechanical fix

## Evidence to capture

For each pilot run, capture:

- command used, including reviewed readiness or dispatch when applicable
- generated report result
- Linear issue identifier and workspace path when dispatching
- checks run by the worker
- whether the result was a diff, a comment, a blocked note, or no-op
- rollback or cleanup note for any preserved workspace
- worker, reviewer, and integrator receipts plus reviewer fingerprint status
- elapsed time, stage durations, retries, token usage, and human interventions
