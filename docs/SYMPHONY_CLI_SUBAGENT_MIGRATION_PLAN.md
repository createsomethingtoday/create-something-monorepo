# Symphony CLI Subagent Migration Plan

## Purpose

Define an incremental migration path from Symphony's current app-server-coupled worker model to a CLI-first subagent execution model, while preserving:

- remote Loom as the control plane
- workflow-file lane definitions
- existing lane labels and task conventions
- validation, telemetry, and review expectations

This is a migration plan, not a rewrite brief.

## Current assessment

Symphony is structurally useful in three ways:

1. It gives the repo a Loom-backed orchestration layer.
2. It gives each lane a bounded workflow definition.
3. It provides a common place to attach hooks, telemetry, and retry logic.

The current execution model is the main constraint.

### What is tightly coupled today

- Historical constraint:
  Worker execution used to be hard-wired to `CodexAppServerClient`.
- Current state:
  Symphony now runs on `codex-cli`; the legacy app-server path has been removed.
- Remaining design consideration:
  the runtime and telemetry model still reflect thread/start and turn/start semantics.

### What is too expensive today

For many subagent-sized tasks, startup cost exceeds task cost:

- `code-quality` defaults to snapshotting the workspace
- `policy` uses worktree creation even for narrow documentation tasks
- `hub-deploy` uses the same heavyweight bootstrap path
- lane hooks may trigger `pnpm install` or other repo-heavy setup before the worker has even interpreted the task

### What worked in review

- remote Loom task routing works
- label-to-lane matching works
- task claiming works
- workflow-file loading and validation work

This means the orchestration shell is still valuable.
The migration target should replace the worker transport, not discard the control plane.

## Recommendation

Move Symphony to a **pluggable runner architecture**.

Current status in this repo:

- `policy` runs on `codex-cli`
- `code-quality-light` runs on `codex-cli`
- `code-quality` runs on `codex-cli`
- `hub-deploy` runs on `codex-cli`
- the legacy `codex-app-server` compatibility path has been removed from `packages/symphony`

Target state:

- Symphony remains the orchestrator
- Loom remote remains the tracker
- workflow files remain the lane contract
- execution becomes selectable per lane or per task

Recommended runners:

- `codex-cli` for CLI-first subagent execution
- optional future runners for other agent hosts if needed

Do not replace Symphony just to adopt a newer execution host.
Keep Symphony as the orchestrator and treat future SDK adoption as a new runner, not a new control plane.

## Design goals

1. Preserve Loom remote as the shared source of task truth.
2. Preserve lane semantics: `code-quality`, `policy`, `hub-deploy`.
3. Reduce startup cost for bounded tasks.
4. Support richer subagent execution than the current app-server wrapper allows.
5. Keep validation, evidence, and legibility requirements explicit.
6. Allow selective isolation instead of always paying for worktrees and full bootstrap.

## Proposed architecture

### 1. Introduce a runner interface

Replace the current implicit worker binding with an explicit runner contract.

Suggested shape:

```text
Runner
- prepare(issue, workspace, config)
- execute(initial_prompt, continuation_context)
- continue(issue_state)
- terminate(reason)
- collect_result()
```

The orchestrator should not need to know whether the runner is:

- app-server RPC
- CLI invocation
- a future external agent host

It should only need:

- status
- telemetry events
- final summary
- failure class

### 2. Split workspace strategy from runner strategy

These are separate concerns and should be configured separately.

Current problem:

- app-server worker choice
- workspace bootstrap mode
- install behavior

are entangled in lane hooks.

Target separation:

- `runner`: `codex-cli` today, with room for future runners
- `workspace_mode`: `in-place`, `snapshot`, `worktree`, `clone`
- `dependency_mode`: `reuse`, `link`, `install-if-missing`, `always-install`

### 3. Add task-shape-aware execution policy

Not every task should pay the same bootstrap cost.

Recommended execution classes:

- `lightweight`
  - docs-only
  - policy wording sync
  - narrow script/config edits
  - default workspace mode: `in-place` or minimal snapshot

- `isolated`
  - multi-file refactors
  - dependency or build work
  - risky MCP or deploy-surface changes
  - default workspace mode: `snapshot` or `worktree`

- `deploy-sensitive`
  - hub deploy
  - secret sync
  - runtime verification with external side effects
  - explicit human-reviewed boundaries required

## Lane migration strategy

### `code-quality`

Target:

- default to CLI runner
- support lightweight execution for narrow fixes
- keep snapshot/worktree mode available for high-risk changes

Recommended cutover order:

1. Add runner abstraction without changing lane behavior.
2. Add CLI runner behind a feature flag.
3. Add a lightweight workspace mode for tasks marked docs-only or narrow package-only.
4. Move `code-quality` default runner to CLI once parity is proven.

### `policy`

Target:

- default to CLI runner earlier than other lanes
- aggressively avoid worktree/bootstrap for docs-only policy tasks
- preserve strict artifact checks and promotion boundaries

Why this lane should move first:

- lower runtime risk
- strong deterministic checks
- many tasks are documentation + generated-artifact alignment
- minimal benefit from app-server thread semantics

### `hub-deploy`

Target:

- keep stricter isolation and explicit deploy boundaries
- move to CLI runner only after the runner can support approval and evidence requirements cleanly

Why this lane should move last:

- higher side-effect risk
- Cloudflare and vault interactions
- more need for durable operator-visible evidence

## Migration phases

## Phase 0: Freeze assumptions

Objective:

- stop embedding new app-server-only assumptions into Symphony

Actions:

- document runner abstraction target
- stop adding lane behavior that depends on app-server-only semantics
- mark current app-server path as legacy-compatible rather than strategic

Exit criteria:

- migration plan approved
- new Symphony work treats execution transport as a replaceable concern

## Phase 1: Introduce runner abstraction

Objective:

- refactor Symphony internals so the orchestrator depends on a generic runner interface

Actions:

- define runner contract
- move execution behind a runner factory
- isolate any transport-specific logic behind the selected runner implementation
- keep behavior identical by default

Exit criteria:

- internal orchestration no longer imports a specific execution transport outside the runner layer
- lane workflow files can select execution mode explicitly

## Phase 2: Add CLI runner

Objective:

- support a first-class `codex-cli` runner

Actions:

- define how Symphony invokes CLI sessions
- define prompt handoff, continuation behavior, and result capture
- define structured summary expectations for CLI completion
- preserve telemetry and task evidence surfaces

Open implementation choices:

- one CLI invocation per task
- one CLI invocation per turn
- resumable CLI session model

Preferred direction:

- one bounded CLI execution per task pass
- explicit continuation only when the tracker state still requires more work

Exit criteria:

- CLI runner can complete bounded docs/code tasks
- final summary, failure class, and evidence fields are captured
- operator can distinguish runner type in telemetry

## Phase 3: Decouple workspace bootstrap

Objective:

- stop making every task pay the cost of heavy workspace creation

Actions:

- add workspace modes to config
- support `in-place` or minimal snapshot mode for lightweight tasks
- support dependency reuse without automatic install for docs-only tasks
- move lane hooks toward policy-driven bootstrap instead of one fixed shell script per lane

Exit criteria:

- docs-only and narrow config tasks can start without full snapshot/worktree/bootstrap
- installs occur only when required by task shape
- runtime evidence shows startup latency reduction

## Phase 4: Migrate lanes selectively

Objective:

- move each lane based on risk and evidence

Recommended order:

1. `policy`
2. `code-quality`
3. `hub-deploy`

Exit criteria:

- each migrated lane has a documented default runner
- each lane has rollback instructions
- dry-run and real-task validation both pass

## Phase 5: Deprecate app-server default

Objective:

- make CLI runner the normal execution path

Actions:

- keep app-server runner for compatibility only
- remove app-server assumptions from lane docs and templates
- update Symphony operator docs to describe runner selection explicitly

Exit criteria:

- new lanes default to CLI runner
- legacy runner remains opt-in only

## Workflow file changes

Add execution configuration to workflow front matter.

Suggested additions:

```yaml
execution:
  runner: codex-cli
  workspace_mode: lightweight
  dependency_mode: reuse
```

Possible values:

- `runner`
  - `codex-cli`
  - future SDK or external-host runners if adopted later

- `workspace_mode`
  - `in-place`
  - `snapshot`
  - `worktree`
  - `clone`
  - `lightweight`

- `dependency_mode`
  - `reuse`
  - `link`
  - `install-if-missing`
  - `always-install`

## Acceptance criteria

### Architectural

- Symphony orchestrator is independent of app-server transport
- runner type is configurable per lane
- workspace strategy is configurable independently of runner type

### Operational

- a lightweight task can be claimed and started without heavy bootstrap
- a policy task can run without forced worktree creation
- a code-quality task can choose between lightweight and isolated modes
- a hub-deploy task can retain strict isolation and side-effect controls

### Evidence

- startup latency is materially lower for lightweight tasks
- lane logs identify runner type and workspace mode
- completion evidence remains command-based and Loom-visible

## Risks

### Risk: losing observability

CLI execution can reduce structured event fidelity if treated as raw shell output.

Mitigation:

- require structured runner events
- record start, finish, failure, and summary states explicitly

### Risk: losing continuation semantics

App-server threads make continuation straightforward.

Mitigation:

- use explicit continuation policy at the orchestrator layer
- persist runner summaries and tracker-derived state between passes

### Risk: weaker safety boundaries

CLI execution may make it easier to run broad commands casually.

Mitigation:

- preserve lane policy boundaries in workflow files
- keep validation and evidence requirements unchanged
- keep high-risk lanes isolated

### Risk: migration stall

A partial migration can leave both systems awkward.

Mitigation:

- migrate lane by lane
- keep app-server as compatibility path only
- define hard exit criteria per phase

## Suggested first implementation slice

Build the smallest slice that proves the architecture.

Recommended slice:

1. Introduce runner abstraction internally.
2. Keep app-server as the existing implementation.
3. Add a minimal CLI runner for docs-only `policy` tasks.
4. Add lightweight workspace mode that skips worktree creation and install for docs-only tasks.
5. Validate on a real policy-documentation task with Loom remote.

This gives the fastest proof with the least operational risk.

## Immediate next tasks

1. Create a `code-quality` task to introduce runner abstraction in Symphony internals.
2. Create a `policy` task to prototype CLI runner on docs-only tasks.
3. Create a `code-quality` task to separate workspace mode from runner mode.
4. Create a `policy` or docs task to update Symphony operator docs after the first slice lands.

## Decision summary

Symphony should not be discarded.
It should be narrowed to what it already does well:

- lane orchestration
- Loom coordination
- retries
- lifecycle hooks
- telemetry

The execution layer should evolve from a hard-coded app-server worker into a configurable runner system.
That is the cleanest path from the original Codex App framing to a CLI-first subagent framework.
