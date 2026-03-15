# Symphony Task Templates

Use Symphony as a Loom-backed execution layer for bounded work, not as a free-form operator.

This guide defines the recommended task shapes for CREATE SOMETHING's current working style:

- Loom is the system of record.
- Symphony executes work inside isolated worktrees.
- Policy remains an artifact, not just a prompt.
- Tasks should map cleanly to one tier whenever possible: `Database`, `Automation`, or `Judgment`.

## Operating rule

Every Symphony task should include:

1. A single primary lane label.
2. A narrow success condition.
3. The smallest required verification command set.
4. The relevant artifact scope.
5. Any explicit "do not do this" boundaries.

If a task spans multiple tiers, split it unless there is a strong reason not to.

## Lane selection

Use `code-quality` for:

- build failures
- typecheck failures
- lint regressions
- test regressions
- dependency or install gaps
- narrow runtime or packaging issues

Use `policy` for:

- `docs/policies/v1` updates
- synchronized markdown and JSON policy artifacts
- policy-adjacent governance docs
- authz manifest compilation when policy inputs changed

Do not use Symphony for:

- vague cleanup requests
- open-ended research
- broad refactors without a verification target
- multi-phase strategic work that should be decomposed first

## Template 1: Build Recovery

Use when the root build or a package build is failing and the expected outcome is explicit.

### Required fields

- Tier: `Automation`
- Label: `code-quality`
- Verification target: exact build command
- Scope: package or workspace surface allowed to change
- Install allowance: whether Symphony may install missing dependencies/tools

### Recommended Loom task

Title:

```text
Make monorepo build cleanly
```

Description:

```text
Tier: Automation
Objective: Make the repo build successfully from the root.
Verification:
- pnpm build

Allowed scope:
- dependency installation required for the build
- the smallest safe code or config changes needed to restore the build
- package manifests, lockfile, and build configuration only if required

Do not:
- refactor unrelated packages
- change policy artifacts unless the build is directly blocked by them
- broaden the task into lint/test cleanup beyond what the build requires

Execution notes:
- Start from the failing root build.
- Prefer the smallest fix that restores the build.
- Preserve unrelated changes.
- If a dependency or tool is missing after the LaCie move, install or rewire only what is necessary.
```

Create command:

```bash
pnpm loom:remote create \
  --title "Make monorepo build cleanly" \
  --description "Tier: Automation
Objective: Make the repo build successfully from the root.
Verification:
- pnpm build

Allowed scope:
- dependency installation required for the build
- the smallest safe code or config changes needed to restore the build
- package manifests, lockfile, and build configuration only if required

Do not:
- refactor unrelated packages
- change policy artifacts unless the build is directly blocked by them
- broaden the task into lint/test cleanup beyond what the build requires

Execution notes:
- Start from the failing root build.
- Prefer the smallest fix that restores the build.
- Preserve unrelated changes.
- If a dependency or tool is missing after the LaCie move, install or rewire only what is necessary." \
  --priority high \
  --label code-quality
```

## Template 2: MCP Gate Regression

Use when the failure is already localized to one of the fleet quality gates.

### Required fields

- Tier: `Automation`
- Label: `code-quality`
- Verification target: one of:
  - `pnpm mcp:gate:typecheck`
  - `pnpm mcp:gate:lint`
  - `pnpm mcp:gate:test`
- Scope: affected package(s) or MCP service(s)
- Evidence: failing command or observed regression

### Recommended Loom task

Title:

```text
Fix MCP gate regression in <package-or-service>
```

Description:

```text
Tier: Automation
Objective: Restore the failing MCP quality gate for the affected package or service.
Verification:
- pnpm mcp:gate:typecheck

Affected surface:
- <package-or-service>

Evidence:
- current regression observed in the MCP fleet gate

Allowed scope:
- the affected package
- shared build or type infrastructure directly required by the fix

Do not:
- expand into unrelated monorepo cleanup
- change policy docs unless the gate is blocked by generated policy artifacts
- run broader repo-wide gates unless the touched surface justifies it

Execution notes:
- Start from the narrowest failing MCP gate.
- Confirm the real failing package before editing.
- Land the smallest defensible fix and rerun the narrow gate.
```

Create command:

```bash
pnpm loom:remote create \
  --title "Fix MCP gate regression in <package-or-service>" \
  --description "Tier: Automation
Objective: Restore the failing MCP quality gate for the affected package or service.
Verification:
- pnpm mcp:gate:typecheck

Affected surface:
- <package-or-service>

Evidence:
- current regression observed in the MCP fleet gate

Allowed scope:
- the affected package
- shared build or type infrastructure directly required by the fix

Do not:
- expand into unrelated monorepo cleanup
- change policy docs unless the gate is blocked by generated policy artifacts
- run broader repo-wide gates unless the touched surface justifies it

Execution notes:
- Start from the narrowest failing MCP gate.
- Confirm the real failing package before editing.
- Land the smallest defensible fix and rerun the narrow gate." \
  --priority high \
  --label code-quality
```

## Template 3: Policy Sync

Use when a policy artifact and its machine-readable outputs must stay aligned.

### Required fields

- Tier: `Judgment`
- Label: `policy`
- Policy IDs or artifact paths
- Verification target:
  - `pnpm policy:artifacts:check`
  - `pnpm authz:compile` when authz inputs changed
- Explicit statement about whether runtime publish is in scope

### Recommended Loom task

Title:

```text
Sync <policy-id> artifacts and governance docs
```

Description:

```text
Tier: Judgment
Objective: Keep the policy artifact, machine-readable JSON, and supporting governance docs aligned.
Verification:
- pnpm policy:artifacts:check

Artifacts in scope:
- docs/policies/v1/<policy-id>.md
- docs/policies/v1/<policy-id>.json
- supporting runbooks or governance docs directly affected by the policy change

Conditional verification:
- run pnpm authz:compile if authz manifests or policy-backed runtime inputs changed

Do not:
- publish runtime policy artifacts
- broaden into unrelated copy or architecture cleanup
- change non-adjacent policies in the same pass unless explicitly required

Execution notes:
- Treat the policy text and JSON as a synchronized deliverable.
- Call out lifecycle, approval, evidence, or promotion gaps explicitly.
- Preserve auditability.
```

Create command:

```bash
pnpm loom:remote create \
  --title "Sync <policy-id> artifacts and governance docs" \
  --description "Tier: Judgment
Objective: Keep the policy artifact, machine-readable JSON, and supporting governance docs aligned.
Verification:
- pnpm policy:artifacts:check

Artifacts in scope:
- docs/policies/v1/<policy-id>.md
- docs/policies/v1/<policy-id>.json
- supporting runbooks or governance docs directly affected by the policy change

Conditional verification:
- run pnpm authz:compile if authz manifests or policy-backed runtime inputs changed

Do not:
- publish runtime policy artifacts
- broaden into unrelated copy or architecture cleanup
- change non-adjacent policies in the same pass unless explicitly required

Execution notes:
- Treat the policy text and JSON as a synchronized deliverable.
- Call out lifecycle, approval, evidence, or promotion gaps explicitly.
- Preserve auditability." \
  --priority high \
  --label policy
```

## Template 4: Hub Creation or Deploy From Config

Use when you want Symphony to take an explicit Hub config surface and create, update, or deploy the Hub using the repo's existing provisioning path.

### Required fields

- Tier: `Automation`
- Label: `hub-deploy`
- Config artifact paths:
  - one or more files under `config/mcp-hub/`
  - optional Worker config such as `packages/cs-mcp-hub-remote/wrangler*.toml`
- Verification target:
  - `pnpm mcp:hub:build`
  - `pnpm mcp:hub:fleet:verify`
  - `pnpm mcp:hub:fleet:deploy` only when real deploy is intended
- Explicit deployment mode:
  - config-only change
  - deploy-ready change
  - live deploy

### Recommended Loom task

Title:

```text
Create or update <hub-name> from config
```

Description:

```text
Tier: Automation
Objective: Create or update the requested Hub worker from the supplied config and the existing Hub deploy path.
Verification:
- pnpm mcp:hub:build
- pnpm mcp:hub:fleet:verify

Config artifacts:
- config/mcp-hub/registry.json
- config/mcp-hub/state.json
- config/mcp-hub/discovery-packs.json
- packages/cs-mcp-hub-remote/wrangler.team-hubs.toml

Requested target:
- <hub-name>
- identity mode: <session_required|compat>
- discovery mode: <compact|full>
- enabled servers or bundle set: <explicit list>

Deployment mode:
- <config-only|deploy-ready|live-deploy>

Allowed scope:
- existing Hub config files
- existing deploy scripts and Worker config
- vault sync or verification glue directly required by the requested Hub change

Do not:
- invent a parallel hub provisioning flow
- rotate or publish secrets unless explicitly required
- broaden into unrelated policy or monorepo cleanup

Execution notes:
- Use existing scripts such as pnpm mcp:hub:fleet:deploy, pnpm mcp:hub:fleet:verify, and pnpm mcp:hub:vault:sync when applicable.
- If required credentials or runtime secrets are missing, stop at the reviewable config state and report the blocker clearly.
```

Create command:

```bash
pnpm loom:remote create \
  --title "Create or update <hub-name> from config" \
  --description "Tier: Automation
Objective: Create or update the requested Hub worker from the supplied config and the existing Hub deploy path.
Verification:
- pnpm mcp:hub:build
- pnpm mcp:hub:fleet:verify

Config artifacts:
- config/mcp-hub/registry.json
- config/mcp-hub/state.json
- config/mcp-hub/discovery-packs.json
- packages/cs-mcp-hub-remote/wrangler.team-hubs.toml

Requested target:
- <hub-name>
- identity mode: <session_required|compat>
- discovery mode: <compact|full>
- enabled servers or bundle set: <explicit list>

Deployment mode:
- <config-only|deploy-ready|live-deploy>

Allowed scope:
- existing Hub config files
- existing deploy scripts and Worker config
- vault sync or verification glue directly required by the requested Hub change

Do not:
- invent a parallel hub provisioning flow
- rotate or publish secrets unless explicitly required
- broaden into unrelated policy or monorepo cleanup

Execution notes:
- Use existing scripts such as pnpm mcp:hub:fleet:deploy, pnpm mcp:hub:fleet:verify, and pnpm mcp:hub:vault:sync when applicable.
- If required credentials or runtime secrets are missing, stop at the reviewable config state and report the blocker clearly." \
  --priority high \
  --label hub-deploy
```

## Intake checklist

Before creating a Symphony task, confirm:

- the lane label is unambiguous
- the verification command is explicit
- the scope is narrow enough for one worker pass
- the task description includes tier and artifact boundaries
- the task does not quietly combine build, policy, and strategy work

## Recommended execution pattern

1. Create the Loom task with one primary label.
2. Run the matching Symphony lane.
3. Inspect the resulting worktree diff and verification result.
4. If more work remains, file a new Loom task instead of stretching the original one.

## Commands

Code-quality lane:

```bash
pnpm symphony:code-quality:infisical:once
pnpm symphony:code-quality:infisical
```

Policy lane:

```bash
pnpm symphony:policy:infisical:once
pnpm symphony:policy:infisical
```
