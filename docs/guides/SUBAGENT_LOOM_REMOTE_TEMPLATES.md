# Loom Remote Subagent Task Templates

Use these templates to create narrow remote Loom tasks for subagents in this monorepo.

Pair this guide with `SUBAGENT_LOOM_REMOTE_PLAYBOOK.md`:

- the playbook explains how to split work
- this file gives copy-pasteable task templates

Label rule:

- use `code-quality-light` for narrow docs, config, script, and package-scoped implementation tasks that should stay on lightweight bootstrap
- use `code-quality` for broader implementation or verification work that may need full bootstrap or repo-wide checks
- use `policy` for policy artifacts and governance docs
- use `hub-deploy` for explicit Hub config and deploy work

## Usage rule

Every task should have:

- one primary tier
- one primary label
- one explicit verification target
- one bounded scope
- one clear "do not" boundary

If a task needs multiple primary verification targets across different surfaces, split it.

## 1. MCP package fix

Use when one MCP package or worker needs a narrow implementation fix.

Title:

```text
Fix MCP gate regression in <package-name>
```

Description:

```text
Tier: Automation
Objective: Restore the failing MCP quality gate for the affected package.
Verification:
- pnpm mcp:gate:typecheck

Affected surface:
- packages/<package-name>

Evidence:
- current regression observed in MCP quality checks

Allowed scope:
- packages/<package-name>
- shared type/build infrastructure directly required by the fix

Do not:
- expand into unrelated monorepo cleanup
- edit policy docs unless generated policy artifacts are the direct blocker
- run broad repo cleanup beyond the narrow gate

Execution notes:
- confirm the actual failing package before editing
- land the smallest defensible fix
- report files touched and final gate result
```

Create command:

```bash
pnpm loom:remote create \
  --title "Fix MCP gate regression in <package-name>" \
  --description "Tier: Automation
Objective: Restore the failing MCP quality gate for the affected package.
Verification:
- pnpm mcp:gate:typecheck

Affected surface:
- packages/<package-name>

Evidence:
- current regression observed in MCP quality checks

Allowed scope:
- packages/<package-name>
- shared type/build infrastructure directly required by the fix

Do not:
- expand into unrelated monorepo cleanup
- edit policy docs unless generated policy artifacts are the direct blocker
- run broad repo cleanup beyond the narrow gate

Execution notes:
- confirm the actual failing package before editing
- land the smallest defensible fix
- report files touched and final gate result" \
  --priority high \
  --label code-quality-light
```

## 2. Policy artifact sync

Use when a policy source artifact and its machine-readable forms must stay aligned.

Title:

```text
Sync <policy-id> artifacts and governance docs
```

Description:

```text
Tier: Judgment
Objective: Keep the policy source artifact, JSON artifact, generated artifacts, and supporting governance docs aligned.
Verification:
- pnpm policy:artifacts:check

Artifacts in scope:
- docs/policies/v1/<policy-id>.md
- docs/policies/v1/<policy-id>.json
- directly affected generated artifacts under docs/policies/generated/
- directly affected governance or runbook docs

Conditional verification:
- pnpm authz:compile if authz manifests or policy-backed runtime inputs changed
- node scripts/compile-tenant-routing-artifact.mjs if tenant routing inputs changed

Do not:
- publish runtime artifacts
- mark draft-only policy artifacts as production-ready without lifecycle evidence
- broaden into unrelated policy cleanup
- batch multiple unrelated policies into one task

Execution notes:
- treat markdown and JSON as one synchronized deliverable
- include generated artifacts when the policy feeds runtime manifests or routing
- call out lifecycle, approval, or evidence gaps explicitly
- preserve auditability
```

Create command:

```bash
pnpm loom:remote create \
  --title "Sync <policy-id> artifacts and governance docs" \
  --description "Tier: Judgment
Objective: Keep the policy source artifact, JSON artifact, generated artifacts, and supporting governance docs aligned.
Verification:
- pnpm policy:artifacts:check

Artifacts in scope:
- docs/policies/v1/<policy-id>.md
- docs/policies/v1/<policy-id>.json
- directly affected generated artifacts under docs/policies/generated/
- directly affected governance or runbook docs

Conditional verification:
- pnpm authz:compile if authz manifests or policy-backed runtime inputs changed
- node scripts/compile-tenant-routing-artifact.mjs if tenant routing inputs changed

Do not:
- publish runtime artifacts
- mark draft-only policy artifacts as production-ready without lifecycle evidence
- broaden into unrelated policy cleanup
- batch multiple unrelated policies into one task

Execution notes:
- treat markdown and JSON as one synchronized deliverable
- include generated artifacts when the policy feeds runtime manifests or routing
- call out lifecycle, approval, or evidence gaps explicitly
- preserve auditability" \
  --priority high \
  --label policy
```

## 3. Frontend UI change

Use when one frontend package needs a focused UI or UX change.

Title:

```text
Implement <feature-or-screen> in <package-path>
```

Description:

```text
Tier: Automation
Objective: Implement the requested UI change in the affected frontend package.
Verification:
- pnpm --filter <package-filter-name> check

Affected surface:
- packages/<package-path>

Optional verification:
- package tests when present
- UI preview or screenshot review when the change is visual

Allowed scope:
- packages/<package-path>
- directly imported local UI dependencies if required

Do not:
- restyle unrelated screens
- refactor shared design system surfaces unless directly required
- broaden into content or policy cleanup

Execution notes:
- use the real package filter name from package.json, not the folder name
- preserve the existing product language unless the task explicitly changes it
- report visible behavior changes and any manual verification performed
```

Create command:

```bash
pnpm loom:remote create \
  --title "Implement <feature-or-screen> in <package-path>" \
  --description "Tier: Automation
Objective: Implement the requested UI change in the affected frontend package.
Verification:
- pnpm --filter <package-filter-name> check

Affected surface:
- packages/<package-path>

Optional verification:
- package tests when present
- UI preview or screenshot review when the change is visual

Allowed scope:
- packages/<package-path>
- directly imported local UI dependencies if required

Do not:
- restyle unrelated screens
- refactor shared design system surfaces unless directly required
- broaden into content or policy cleanup

Execution notes:
- use the real package filter name from package.json, not the folder name
- preserve the existing product language unless the task explicitly changes it
- report visible behavior changes and any manual verification performed" \
  --priority normal \
  --label code-quality-light
```

Example package mapping:

- path: `agency`
- filter: `@create-something/agency`

## 4. Release-readiness verification

Use when the implementation work is done and you want a dedicated verification lane.

Title:

```text
Run release-readiness verification for <surface>
```

Description:

```text
Tier: Automation
Objective: Produce release-readiness evidence for the requested surface.
Verification:
- choose the smallest relevant verification set for the touched surface

Baseline options:
- pnpm check
- pnpm lint
- pnpm test

Optional verification:
- pnpm mcp:gate
- pnpm policy:artifacts:check
- pnpm ground
- targeted Braintrust or smoke commands when applicable

Affected surface:
- <surface>

Allowed scope:
- verification only by default
- the smallest safe follow-up fix only if the task explicitly permits it

Do not:
- refactor opportunistically during verification
- silently widen into unrelated package repair
- mark the release ready without command evidence

Execution notes:
- report pass/fail per command
- record blockers as follow-up Loom tasks instead of absorbing them
- separate evidence collection from implementation unless explicitly combined
- start narrow; do not default to repo-wide gates when a package or lane-specific check is enough
```

Create command:

```bash
pnpm loom:remote create \
  --title "Run release-readiness verification for <surface>" \
  --description "Tier: Automation
Objective: Produce release-readiness evidence for the requested surface.
Verification:
- choose the smallest relevant verification set for the touched surface

Baseline options:
- pnpm check
- pnpm lint
- pnpm test

Optional verification:
- pnpm mcp:gate
- pnpm policy:artifacts:check
- pnpm ground
- targeted Braintrust or smoke commands when applicable

Affected surface:
- <surface>

Allowed scope:
- verification only by default
- the smallest safe follow-up fix only if the task explicitly permits it

Do not:
- refactor opportunistically during verification
- silently widen into unrelated package repair
- mark the release ready without command evidence

Execution notes:
- report pass/fail per command
- record blockers as follow-up Loom tasks instead of absorbing them
- separate evidence collection from implementation unless explicitly combined
- start narrow; do not default to repo-wide gates when a package or lane-specific check is enough" \
  --priority high \
  --label code-quality
```

## 5. Hub deploy or config update

Use when the main scope is Hub config, deploy wiring, or verification of Hub runtime shape.

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

Conditional verification:
- pnpm mcp:hub:fleet:verify when deploy or runtime shape changed
- pnpm mcp:hub:fleet:deploy only when the task explicitly requires a real deploy
- pnpm mcp:hub:vault:sync only when the task requires secret sync and credentials are available

Artifacts in scope:
- config/mcp-hub/registry.json
- config/mcp-hub/state.json
- config/mcp-hub/discovery-packs.json
- config/mcp-hub/intent-routes.json
- packages/cs-mcp-hub-remote/*
- packages/cs-mcp-hub-remote/wrangler*.toml
- scripts/cs-hub-*.sh
- directly affected Hub runbooks in docs/

Do not:
- invent a parallel provisioning flow
- rotate or publish secrets unless the task explicitly requires it
- broaden into unrelated policy or monorepo cleanup

Execution notes:
- prefer existing Hub deploy flows over bespoke customer paths
- call out missing vault inputs, Cloudflare auth gaps, and verification limits explicitly
```

Create command:

```bash
pnpm loom:remote create \
  --title "Create or update <hub-name> from config" \
  --description "Tier: Automation
Objective: Create or update the requested Hub worker from the supplied config and the existing Hub deploy path.
Verification:
- pnpm mcp:hub:build

Conditional verification:
- pnpm mcp:hub:fleet:verify when deploy or runtime shape changed
- pnpm mcp:hub:fleet:deploy only when the task explicitly requires a real deploy
- pnpm mcp:hub:vault:sync only when the task requires secret sync and credentials are available

Artifacts in scope:
- config/mcp-hub/registry.json
- config/mcp-hub/state.json
- config/mcp-hub/discovery-packs.json
- config/mcp-hub/intent-routes.json
- packages/cs-mcp-hub-remote/*
- packages/cs-mcp-hub-remote/wrangler*.toml
- scripts/cs-hub-*.sh
- directly affected Hub runbooks in docs/

Do not:
- invent a parallel provisioning flow
- rotate or publish secrets unless the task explicitly requires it
- broaden into unrelated policy or monorepo cleanup

Execution notes:
- prefer existing Hub deploy flows over bespoke customer paths
- call out missing vault inputs, Cloudflare auth gaps, and verification limits explicitly" \
  --priority high \
  --label hub-deploy
```

## 6. Docs and runbook update

Use when a change is documentation-first and should stay that way.

Title:

```text
Update <doc-or-runbook-surface> for <change>
```

Description:

```text
Tier: Judgment
Objective: Update the relevant docs or runbook so it matches the current system behavior.
Verification:
- linked commands, scripts, and file paths checked against the repo

Artifacts in scope:
- docs/<path>
- package-local docs directly tied to the change

Allowed scope:
- documentation only

Do not:
- change runtime code
- introduce process that conflicts with Loom, Symphony, or policy guidance
- widen into speculative architecture work

Execution notes:
- prefer canonical docs over historical memos
- keep examples executable against the repo as it exists now
```

Create command:

```bash
pnpm loom:remote create \
  --title "Update <doc-or-runbook-surface> for <change>" \
  --description "Tier: Judgment
Objective: Update the relevant docs or runbook so it matches the current system behavior.
Verification:
- linked commands, scripts, and file paths checked against the repo

Artifacts in scope:
- docs/<path>
- package-local docs directly tied to the change

Allowed scope:
- documentation only

Do not:
- change runtime code
- introduce process that conflicts with Loom, Symphony, or policy guidance
- widen into speculative architecture work

Execution notes:
- prefer canonical docs over historical memos
- keep examples executable against the repo as it exists now" \
  --priority normal \
  --label policy
```

## 7. Parent coordination task

Use when one lead agent is coordinating multiple subagent lanes.

Title:

```text
Coordinate <initiative> across subagent lanes
```

Description:

```text
Tier: Automation
Objective: Coordinate the child lanes required to complete the initiative.

Child lanes:
- <lane 1>
- <lane 2>
- <lane 3>

Completion condition:
- all child tasks completed with evidence
- lead-agent reconciliation complete
- any remaining blockers split into follow-up tasks

Allowed scope:
- task decomposition
- coordination
- final reconciliation
- final verification

Do not:
- absorb all child implementation work into the parent task
- let child agents widen scope without creating new tasks

Execution notes:
- use stable agent names
- keep ownership boundaries explicit
- collect evidence from each lane before closing the parent task
```

Create command:

```bash
pnpm loom:remote create \
  --title "Coordinate <initiative> across subagent lanes" \
  --description "Tier: Automation
Objective: Coordinate the child lanes required to complete the initiative.

Child lanes:
- <lane 1>
- <lane 2>
- <lane 3>

Completion condition:
- all child tasks completed with evidence
- lead-agent reconciliation complete
- any remaining blockers split into follow-up tasks

Allowed scope:
- task decomposition
- coordination
- final reconciliation
- final verification

Do not:
- absorb all child implementation work into the parent task
- let child agents widen scope without creating new tasks

Execution notes:
- use stable agent names
- keep ownership boundaries explicit
- collect evidence from each lane before closing the parent task" \
  --priority high \
  --label code-quality
```

## Recommended labels

- `code-quality-light`: narrow implementation work, docs, config, scripts, package-scoped fixes
- `code-quality`: broader implementation, runtime, tests, packaging, release verification
- `policy`: policy artifacts, governance docs, runbooks, approval behavior
- `hub-deploy`: explicit Hub config and deploy work when using Symphony hub-deploy lanes

Use one primary label per task unless there is a strong reason not to.

Choose `code-quality-light` instead of `code-quality` when the main scope is:

- one package or script
- a docs-only or config-only fix
- a task expected to pass with narrow package checks instead of repo-wide gates
- a change that should stay on lightweight bootstrap and dependency reuse

Choose `hub-deploy` instead of `code-quality` when the main scope is:

- `config/mcp-hub/*.json`
- `packages/cs-mcp-hub-remote/*`
- `packages/cs-mcp-hub-remote/wrangler*.toml`
- `scripts/cs-hub-*.sh`
- Hub deploy verification or vault-sync steps

## Completion evidence examples

Examples:

- `pnpm mcp:gate:typecheck passed after narrowing fix to packages/webflow-template-review-mcp`
- `pnpm policy:artifacts:check passed; authz compile not required`
- `pnpm --filter @create-something/agency check passed; verified UI in preview`
- `pnpm check passed; pnpm lint failed in packages/concierge-chat, follow-up task created`

Keep evidence concrete and command-based.
