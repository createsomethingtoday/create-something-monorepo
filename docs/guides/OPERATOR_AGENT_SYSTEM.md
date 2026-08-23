# Operator Agent System

This guide defines the CREATE SOMETHING operator-owned agent system for using
local and open-weight models as governed engineering workers.

The goal is not to replace Codex, Linear, worktrees, or production gates. The
goal is to let CREATE SOMETHING use its own production as the lab for
AI-native engineering while keeping the loop legible, reversible, and governed.

## Operating Thesis

Agents are workers. The operator system is the product surface.

The system owns:

- signal
- context
- policy
- executor selection
- sub-agent profile
- verification
- proof
- rollback
- next decision

`ornith:9b` is the current default local executor inside that system. It does
not own the loop. CREATE SOMETHING is standardizing the local operator-agent
language on Ornith because its tool-policy and self-heal receipts better match
the system's governed engineering loop than the previous lightweight local
executor.

## Production-Lab Boundary

CREATE SOMETHING internal production may be used for autonomous experiments
when the production-lab policy passes. Client production may not inherit that
permission.

Use:

```bash
pnpm operator-agent:doctor -- --json
pnpm operator-agent:audit
pnpm operator-agent:readiness
pnpm operator-agent:capabilities -- --json
pnpm operator-agent:policy -- --target create-something-internal-production --risk medium --reversible --rollback "revert PR or redeploy last known-good Worker"
pnpm operator-agent:scout -- --surface docs/guides --limit 8
pnpm operator-agent:patch -- --candidate-file .cache/operator-agent-system/<receipt>.json --candidate-id candidate-001
pnpm operator-agent:complete -- --task "Add one bounded completion note" --surface docs/guides --limit 3
pnpm operator-agent:revise -- --candidate-file .cache/operator-agent-system/<receipt>.json --candidate-id candidate-001
pnpm operator-agent:pattern-review -- --timeout-ms 300000 --pattern-scope all
pnpm operator-agent:model-probe -- --timeout-ms 120000 --json
pnpm operator-agent:model-benchmark -- --attempts 3 --timeout-ms 120000 --json
pnpm operator-agent:batch-eval -- --surface docs/guides --limit 3
pnpm operator-agent:schedule:once -- --timeout-ms 300000
pnpm operator-agent:repeat -- --count 100 --run-id "$(date +%Y-%m-%d)-ornith-100" --timeout-ms 300000 --json
pnpm operator-agent:memory-proposal -- --json
```

Receipts are written to:

```text
.cache/operator-agent-system/
.cache/operator-agent-schedule/
```

For secure public access from Codex, Notion, or other operator-controlled
clients, use [OPERATOR_AGENT_PUBLIC_ACCESS.md](./OPERATOR_AGENT_PUBLIC_ACCESS.md).
The public gateway is intentionally no-write and should stay behind Cloudflare
Access plus the gateway bearer token.

Local model scouting has a deterministic fallback. If the selected local model
is too slow or does not return strict JSON before the timeout, the scout still writes a
receipt and returns bounded fallback candidates from the target file list.
Adjust the timeout when measuring model behavior:

```bash
pnpm operator-agent:doctor -- --json
pnpm operator-agent:doctor -- --strict-public --json
pnpm operator-agent:audit
pnpm operator-agent:capabilities -- --json
pnpm operator-agent:model-probe -- --timeout-ms 120000 --json
pnpm operator-agent:model-benchmark -- --attempts 3 --timeout-ms 120000 --json
pnpm operator-agent:scout -- --surface docs/guides --limit 3 --timeout-ms 300000
pnpm operator-agent:scout -- --surface docs/guides --limit 3 --no-model
pnpm operator-agent:pattern-review -- --timeout-ms 300000 --pattern-scope all --json
pnpm operator-agent:batch-eval -- --surface docs/guides --limit 3 --timeout-ms 300000 --json
pnpm operator-agent:schedule:once -- --json
pnpm operator-agent:memory-proposal -- --json
pnpm operator-agent:mcp
```

## Regular Local Run

Start with the read-only doctor when deciding whether the device is ready for
delegation:

```bash
pnpm operator-agent:doctor -- --json
```

The default doctor treats local readiness and public readiness separately. It
can pass for local Codex/MCP use while reporting that public Cloudflare Access
is blocked by the missing dedicated Access token. Use `--strict-public` before
DNS routing or external Notion/Codex use, and `--strict-model` only when the
experiment specifically requires model health to be `ok` rather than degraded
or disabled.

The doctor also emits `evidence.completionAudit`, a requirement-by-requirement
audit for local runtime readiness, schedule heartbeat, all-scope pattern review,
model-backed authority, public Cloudflare Access, and primary-run posture. Use
`pnpm operator-agent:audit` when an operator or downstream agent needs the JSON
verdict directly.
The doctor also reports the latest `model-probe` receipt so a failed cheap JSON
probe is visible without running a new model call. It includes a small
recent-history window for model probes and model-backed schedule receipts; use
`--history-limit <1-20>` when comparing stability across more or fewer recent
runs.

Before any scheduled or model-backed run, inspect the declared local profile:

```bash
pnpm operator-agent:capabilities -- --json
```

The profile is versioned in
[`config/operator-agent-capabilities.v1.json`](../../config/operator-agent-capabilities.v1.json).
Its current `local-readonly` profile declares only repo-local read skills and
read-only MCP tools. It declares no plugins and denies protected writes,
credentials, destructive actions, client production, and external plugin
activation. The manifest is an auditable constraint, not an authority grant:
adding a skill, MCP, or plugin requires review and a separate promotion path.

Use `model-benchmark` when deciding whether an installed local model can be
promoted into bounded model-backed work. It runs repeated strict-JSON probes per
candidate model and writes one aggregate receipt with pass rate and latency:

```bash
pnpm operator-agent:model-benchmark -- --attempts 3 --timeout-ms 120000 --json
pnpm operator-agent:model-benchmark -- --models ornith:9b --attempts 3 --json
```

The benchmark must meet the configured pass-rate threshold before the model is
eligible for bounded batch-eval. It does not grant patch, revise, or production
write authority.

The doctor reports `modelAuthority` as the operator decision label:

- `deterministic-primary`: keep model-backed delegation off by default; rely on
  deterministic receipts.
- `probe-required`: run `model-benchmark` before deciding.
- `probe-first-bounded`: require a fresh passing benchmark/probe before any
  model-backed experiment.
- `model-backed-bounded`: allow bounded model-backed batch-eval while keeping
  patch/revise and production promotion gated.

Use schedule once as the normal device-local heartbeat:

```bash
pnpm operator-agent:schedule:once -- --json
pnpm operator-agent:schedule:once -- --no-model --json
pnpm operator-agent:schedule:once -- --model-pattern-review --json
```

The command runs:

1. the `local-readonly` capability audit
2. deterministic all-scope `pattern-review`
3. `model-probe` when the heartbeat is model-backed
4. bounded `batch-eval`, model-backed unless `--no-model` is supplied or the
   probe fails

It writes one schedule receipt with each child receipt summarized under `runs`.
The scorecard records whether pattern review passed, which source was used
(`model`, `model-repair`, `deterministic`, or `deterministic-fallback`), how
the model probe behaved, how many batch-eval candidates were proposed,
whether any writes were performed, whether batch-eval had to be forced
deterministic, and whether model health was `ok`, `degraded`, or `disabled`.
It also records the capability profile and manifest digest. A model probe that
requires its one bounded contract-repair retry is recorded as `repaired` and
keeps `modelHealth: degraded`; only a first-attempt strict result is `strict`.
`writesPerformed` must remain `0` for the regular run. `modelHealth:
degraded` means deterministic fallback or repair kept the heartbeat useful, but
the local model should not receive broader authority.

Use `--no-model` for fast scheduled-shell or battery-sensitive runs. Use the
default schedule to measure this device's regular reliability with the configured
Ornith executor on bounded batch-eval work while keeping all-scope pattern review
fast and deterministic. Use `--model-pattern-review` only as an experiment; repeated
`model-repair`, `deterministic-fallback`, timeout, or empty-output receipts mean
the device should keep pattern review deterministic and should not widen model
authority.

For a same-day reliability burn-in, run the same schedule-once path through the
repeat runner:

```bash
pnpm operator-agent:repeat -- --count 100 --run-id "$(date +%Y-%m-%d)-ornith-100" --timeout-ms 300000 --json
pnpm operator-agent:repeat -- --count 100 --run-id "$(date +%Y-%m-%d)-ornith-100" --dry-run --json
```

The repeat runner is resumable by `--run-id`. It appends one JSONL progress row
per loop under `.cache/operator-agent-repeat/` and writes a summary receipt after
each iteration. It fails closed when any child schedule receipt records
`writesPerformed` above `0` unless `--allow-writes` is explicitly supplied. Use
`--no-model` only for deterministic throughput checks; the Ornith reliability
burn-in should remain model-backed.

Use `model-probe` before a new model-backed experiment when the latest
model-backed receipt is stale or degraded:

```bash
pnpm operator-agent:model-probe -- --timeout-ms 120000 --json
```

The probe is a small strict-JSON task against the configured OpenAI-compatible
local endpoint. It permits at most one repair attempt when the initial response
breaks the contract, so a passing receipt distinguishes `strict` from
`repaired`. On this device, the lightweight previous executor was fast on
strict JSON probes but failed the deeper tool-policy suite, while `ornith:9b`
passed the stronger local tool-policy and self-heal evidence needed for the
operator-agent lane.
It writes only a local receipt. Passing the probe means the model endpoint can
currently return the required JSON contract; it does not authorize patch/revise
or broad delegation by itself.

On macOS, install the local heartbeat with launchd:

```bash
pnpm operator-agent:schedule:install -- --load
pnpm operator-agent:schedule:status -- --json
```

This creates two user LaunchAgents:

- `agency.createsomething.operator-agent.fast`: hourly `--no-model` heartbeat
- `agency.createsomething.operator-agent.model`: six-hour model-backed heartbeat

Both jobs write receipts under `.cache/operator-agent-schedule/` and logs under
`.tmp/operator-agent-schedule.*.log`. Use
`pnpm operator-agent:schedule:uninstall -- --load` to remove the plists and
boot out the loaded jobs.

## Local MCP Mode

Use the local stdio MCP when Codex should run the operator-agent directly from
this device:

```bash
pnpm operator-agent:mcp
```

The MCP surface exposes readiness, completion audit, the active capability
profile, deterministic pattern review, model probe, model benchmark, bounded
batch-eval, schedule once, runtime status, and Access preflight. It intentionally
does not expose `patch` or `revise`; those remain local CLI-only until identity,
approval, rollback, and audit behavior are reviewed.

## Pattern Review Mode

Pattern review is the local model's first context receipt. It asks the model to
review CREATE SOMETHING's operating patterns from canonical repo sources before
the model scouts or patches anything. The default scope is all repo-owned
pattern files, not only canonical docs.

Use:

```bash
pnpm operator-agent:pattern-review -- --timeout-ms 300000
pnpm operator-agent:pattern-review -- --no-model --json
pnpm operator-agent:pattern-review -- --pattern-scope canonical --no-model --json
```

The receipt includes:

- inspected canonical files
- repo-wide pattern files when `--pattern-scope all` is used, including
  relevant docs, policy files, configs, package scripts, and operator-agent
  runtime/tests
- source coverage for Database, Automation, Judgment, policy artifacts,
  Cloudflare Access, no-write gateway posture, batch eval, and teacher shadow
- model output when available
- deterministic fallback when the model is disabled or returns malformed JSON
- schema repair when the model returns valid JSON with the wrong shape
- `patternReviewGate` blockers when the returned object does not include the
  required CREATE SOMETHING shape
- evidence validation: every `evidenceFiles` entry must match an inspected repo
  file, so invented evidence blocks the model result
- prompt hygiene that keeps raw generated policy JSON out of model source
  excerpts while still counting those files in inspection and coverage
- all-scope pattern review is the normal posture. Use `--pattern-scope
  canonical` only for focused debugging when repo-wide review is too noisy.
- naming and abstraction critique when a proposed label makes the operator
  workflow less concrete. Abstract labels such as system, platform, framework,
  layer, surface, orchestration, agentic, AI-native, abstraction, or composable
  require `namingCritique` with a label, critique, and concrete replacement.
- abstraction is critique-only unless it is anchored to concrete receipts,
  commands, files, gates, or rollback evidence in the same response. The model
  should review the naming pressure; it should not promote that pressure into a
  thesis, operating pattern, or implementation target.
- no abstraction-building next actions: `safeNextActions` must not recommend
  creating, naming, introducing, or extracting a new abstraction. Put those
  concerns in `namingCritique` for operator review instead.

The receipt records `patternReviewSource` as `model`, `model-repair`,
`deterministic`, or `deterministic-fallback`. Treat `model-repair` as useful but
not equivalent to native schema adherence; it means the local model needed a
second pass before its output matched the required review shape.

Scheduled runs intentionally use deterministic pattern review by default. Direct
or `--model-pattern-review` experiments showed that larger local models can summarize
a single policy file, require schema repair, return empty model content, or take
several minutes on all-scope review. That is useful experiment evidence, but not
the default heartbeat.

If a model returns abstract-only output without `namingCritique`, the command
writes a deterministic fallback receipt for inspection but still exits blocked.
Fallback should preserve evidence; it should not hide that the executor failed
the pattern-review rule.

Use the latest pattern-review receipt as local model context before scout,
batch-eval, or teacher-shadow comparison. Naming rules should graduate from this
critique path only after repeated receipts show the same concrete failure mode.

## Memory Proposal Mode

The external agent pattern says the loop should end with a memory/update
artifact, but memory is not authority and should not be silently rewritten by a
local worker. Use memory proposal mode to synthesize durable-context candidates
from recent receipts without mutating the Codex memory store:

```bash
pnpm operator-agent:memory-proposal -- --json
pnpm operator-agent:memory-proposal -- --receipt-dir .cache/operator-agent-system --receipt-dir .cache/operator-agent-schedule --receipt-limit 20 --json
```

The receipt records:

- recent receipts inspected
- candidate memory notes with source receipt paths
- `writesPerformed: 0`
- `memoryStoreMutated: false`
- an explicit operator-controlled write-back note

Promote a proposal into long-term memory only through the normal
operator-approved memory-update path. This keeps Codified Context useful without
turning chat history or model guesses into hidden system state.

## Autonomy Ladder

| Level | Name | Description | Default executor |
| --- | --- | --- | --- |
| A0 | Scout | Read-only candidate discovery | `ornith:9b` or deterministic scan |
| A1 | Patch | One bounded local change | Codex or local model under harness |
| A2 | Self-heal | Deterministic fix for observed drift | script first, model second |
| A3 | Production lab | Reversible CREATE SOMETHING internal production action, plus rollback of that same deploy after failed smoke | policy-gated worker |
| A4 | Escalate | Client, credentials, destructive, billing, irreversible data | operator |

Do not skip from A0 to A3. The same surface should first produce boring scout,
patch, and verify receipts.

## Patch Mode

The first patch slice is intentionally narrow. It exists to prove autonomous
write receipts and validation before broader code-edit authority.

Current patch rules:

- consumes a scout receipt or candidate JSON through `--candidate-file`
- selects a candidate through `--candidate-id`, or defaults to the first
  candidate
- allows only `profile: "docs"`, `profile: "scripts"`, or `profile: "tests"`
- allows low-risk `A0` or `A1` candidates; low-risk `A2` candidates are
  available only for local allowlisted script/test `exact-replace` patches with
  a matching rollback-proof receipt
- writes exactly one existing Markdown file under `docs/`, one allowlisted
  `scripts/operator-agent-*.mjs` file, or one allowlisted
  `scripts/test/operator-agent-*.test.mjs` file
- supports a receipt marker, `patch.type: "append-markdown"` with a bounded
  Markdown payload for docs candidates, or `patch.type: "exact-replace"` for
  allowlisted script/test candidates
- requires `exact-replace` candidates to provide one nonempty search span and
  one nonempty replacement span; the search span must appear exactly once in the
  target file before the write
- requires `--rollback-proof-receipt` before any `A2` local code patch can pass
  the patch candidate gate
- requires a rollback note
- requires allowlisted validation
- writes a preflight receipt and a post-action receipt

Rollback-proof mode:

- consumes a forward candidate through `--candidate-file` and a rollback
  candidate through `--rollback-candidate-file`
- requires both candidates to target the same single file
- runs forward dry-run, forward write, rollback dry-run, and rollback write
  through the normal patch gate
- writes sub-receipts for every patch stage plus one top-level rollback-proof
  receipt
- records the target file SHA-256 before the forward write, after the forward
  write, and after rollback
- passes only when forward validation passes, rollback validation passes, and
  the final SHA-256 exactly matches the pre-write SHA-256

Supported validation commands for patch mode:

```text
git diff --check
node scripts/policy-artifact-check.mjs
node scripts/agent-solo-loop.mjs --check
node --check <relative-file>
node --test <relative-file>
```

Use `--dry-run` to validate the candidate and write receipts without modifying
the target file.

## Complete Mode

Complete mode owns the terminal-state loop instead of making the operator chain
scout, patch, verification, and rollback commands by hand:

```bash
pnpm operator-agent:complete -- --task "Add one bounded completion note" --surface docs/guides --limit 3 --json
pnpm operator-agent:complete -- --candidate-file candidate.json --candidate-id candidate-001 --json
```

With `--task`, Ornith scouts the bounded surface and selects the first candidate
that passes the existing candidate, policy, content, source-grounding, and
usefulness gates. With `--candidate-file`, complete mode starts from a reviewed
candidate. Both paths then run patch preflight, apply the change, and execute
the allowlisted validation commands.

Terminal states are:

- `completed`: validation passed at the requested local or production boundary
- `rolled-back`: validation or production smoke failed, the recorded rollback
  ran, and post-rollback verification passed
- `escalated`: an A4 boundary or unverifiable failure stopped the loop

When local validation fails after a write, complete mode restores the exact
pre-run bytes, verifies the SHA-256 match, and reruns the candidate validation.
It reports `validation-failed-rolled-back` only when both checks pass. Failed or
unverifiable rollback escalates to A4.

### A3 Promotion Packet

Internal production completion requires `--target
create-something-internal-production` plus a versioned promotion packet. This
illustrative skeleton must be replaced with verified commands from the owning
surface before use:

```json
{
  "schemaVersion": "operator-agent-promotion.v1",
  "linearIssue": "CRE-1153",
  "target": "create-something-internal-production",
  "risk": "low",
  "branch": "codex/ornith-completion",
  "remote": "origin",
  "commitMessage": "CRE-1153 complete bounded Ornith work",
  "stages": {
    "promote": [["gh", "pr", "checks", "123", "--watch"]],
    "deploy": [["pnpm", "--filter", "<owning-package>", "deploy"]],
    "smoke": [["pnpm", "--filter", "<owning-package>", "smoke"]],
    "rollback": [["pnpm", "--filter", "<owning-package>", "rollback"]],
    "rollbackSmoke": [["pnpm", "--filter", "<owning-package>", "rollback-smoke"]]
  }
}
```

Run it with:

```bash
pnpm operator-agent:complete -- --candidate-file candidate.json --target create-something-internal-production --promotion-file promotion.json --json
```

The A3 gate requires a low- or medium-risk candidate, a matching Linear issue,
an isolated clean worktree, an existing tracked target, the declared `codex/`
branch, `origin`, and all five lifecycle stages. Complete mode stages and commits
only the candidate files, pushes the declared branch, runs the review/promotion
commands, deploys, and verifies production. A failed production smoke triggers
the recorded rollback and rollback smoke. A deploy with ambiguous state, a
failed rollback, or missing post-rollback proof escalates instead.

Promotion commands use argv arrays and never a shell. Allowlisted executors are
bounded operator-agent Node scripts, stage-named pnpm scripts, Wrangler deploy
or rollback, read-only HTTPS curl smoke checks, and GitHub pull-request review
commands. Force/admin flags, secret or credential operations, billing, data
deletion or migration, and client production are A4 blockers before mutation.

## Batch Eval Mode

Batch eval is the no-write measurement loop for local executors. It runs:

1. scout
2. patch dry-run for each candidate
3. revise for blocked candidates unless `--no-revise` is set
4. patch dry-run for each revised candidate

The scorecard records:

- `candidatesProposed`
- `modelScoutOk`
- `modelParseFailures`
- `dryRunPatchAttempts`
- `initialWritesAllowed`
- `initialGateFailures`
- `revisionsAttempted`
- `revisionsPassed`
- `revisionDepthBlocked`
- `modelRevisionFailures`
- `postRevisionDryRunAttempts`
- `postRevisionWritesAllowed`
- `writesPerformed`

`writesPerformed` must stay `0` in batch eval. Use the scorecard to decide
whether to improve prompts, gates, or model/runtime settings before expanding
write authority.

## Teacher Shadow Mode

Treat GPT-5.5/Codex-class runs as teacher traces and local model runs as shadow
executors. The local model should observe the same repo state, operator
intent, policy artifacts, and final accepted action, then predict:

- candidate selection
- gate outcomes
- needed revision
- rollback note
- validation command
- next decision

This avoids forcing the local model to rediscover CREATE SOMETHING expectations
from scratch. It also gives us a concrete distillation lane: compare the local
prediction against the teacher trace and score whether it would have reached the
same safe end state.

Do not treat teacher-shadow agreement as automatic write authority. It is a
measurement signal. Promote authority only after repeated scorecards show the
local model can match accepted outcomes, avoid blocked actions, and preserve the
loop contract across multiple repo surfaces.

## Revise Mode

Revise mode repairs one content-blocked append payload without writing files. It
loads the selected candidate, records the original `contentGate`, asks the model
to replace only `patch.content`, normalizes the result, then records a revised
candidate under `candidates` so the receipt can be fed into patch dry-run.
Revised candidates use stable lineage instead of repeated `-revised` suffixes:
the first revision becomes `<root-id>-rev1`, and every revised candidate records
`revisionRootId`, `parentCandidateId`, and `revisionDepth`.

Revision depth is capped at three attempts per root candidate. At depth four,
revise mode returns `outcome: "revision-depth-blocked"` without calling the
model; start a new scout candidate or escalate to operator review instead.

Use revise when patch dry-run exposes content blockers:

```bash
pnpm operator-agent:revise -- --candidate-file .cache/operator-agent-system/<blocked-receipt>.json --candidate-id candidate-001
pnpm operator-agent:patch -- --candidate-file .cache/operator-agent-system/<revise-receipt>.json --candidate-id candidate-001-rev1 --dry-run
```

## Sub-Agent Profiles

Sub-agents are policy-bound profiles, not independent authorities.

| Profile | Scope | Allowed actions | Required verifier |
| --- | --- | --- | --- |
| `scout` | repo scan and candidate discovery | read-only proposals | receipt |
| `docs` | markdown, guides, README routing | small docs edits | `git diff --check` |
| `evals` | eval cases, receipts, harness assertions | bounded eval changes | dry-run + model receipt when relevant |
| `scripts` | CLI help, small harness commands | narrow script patches | `node --check` or package test |
| `tests` | targeted tests and fixtures | add or tighten tests | package-local test |
| `ci-readiness` | CI logs, workflow defaults | narrow workflow/runtime fixes | failing check reproduction |
| `production-verifier` | internal production smoke | read/write proof only when policy allows | live smoke + rollback note |
| `security-readonly` | sensitive surface review | findings only | no writes |

## Candidate Schema

```json
{
  "id": "candidate-001",
  "profile": "docs",
  "surface": "docs/guides",
  "title": "Fix stale command in guide",
  "risk": "low",
  "autonomyLevel": "A1",
  "files": ["docs/guides/example.md"],
  "why": "The guide references a command that no longer exists.",
  "proposedAction": "Update the command and add validation note.",
  "validation": ["git diff --check"],
  "rollback": "revert the file change",
  "confidence": 0.74,
  "revisionRootId": "candidate-root",
  "parentCandidateId": "candidate-root-rev1",
  "revisionDepth": 2,
  "patch": {
    "type": "append-markdown",
    "content": "## Validation Note\n\nThis guide now records the bounded fix."
  }
}
```

## Scout Payload Quality

Deterministic scout emits conservative `append-markdown` candidates for Markdown
files so every A0 receipt can be fed directly into A1 patch dry-run. Model scout
may produce better titles and rationale, but the harness still normalizes common
schema drift before policy gates run:

- object-shaped file entries such as `{ "path": "docs/example.md" }`
- non-ASCII punctuation in proposed Markdown payloads
- malformed or truncated JSON output, which is recorded as `modelResult.ok:
  false` before deterministic fallback candidates are used

Passing patch dry-run is not the same as operator-quality content. Model
candidates should be promoted to actual writes only when the proposed Markdown is
specific to the inspected file and does not introduce questionable commands,
credentials, placeholders, or generic advice.

Patch mode now records a `contentGate` for append payloads. Dry-run may pass with
content blockers so the operator can inspect model behavior without writing.
Non-dry-run patch mode stops before writing when content blockers are present.
Patch mode also records a `sourceGate`; non-dry-run patch mode stops before
writing when the proposed append does not reference an existing Markdown heading
or stable source line from the target file.
Patch mode also records a `usefulnessGate`; non-dry-run patch mode stops before
writing when the append only repeats existing source text or acts as a
cross-reference summary.

Current content blockers include:

- code fences
- credential or token placeholders
- `git checkout`, `git reset`, destructive shell commands, or shell pipes
- install commands such as `npm install -g`, `pnpm add`, `yarn add`, or
  `brew install`
- generic headings such as "Common Pitfalls", "Best Practices", "Quick Start",
  "Pre-Deploy Verification Checklist", or "Deployment Checklist" when the
  payload does not reference the target file path
- append payloads that mention the file path but do not cite an existing heading
  or source line from the target file
- append payloads that cite the source but only repeat existing source text
- append payloads that only tell the reader to see the same file or section for
  details

## Loop Contract

Every run must produce:

```text
Loop:
Mode: readiness | scout | policy | patch | revise | verify | handoff
Autonomy level:
Target:
Risk:
Signal:
Context:
Policy:
Executor:
Sub-agent:
Verification:
Outcome:
Proof:
Rollback:
Rollback evidence:
Next decision:
```

## Promotion To Autonomous Production-Lab Work

A surface can move to A3 only after:

1. A0 scout produces useful candidates.
2. A1 patch lands a bounded local change with validation.
3. A2 self-heal proves a deterministic recovery loop.
4. A3 policy gate passes for CREATE SOMETHING internal production.
5. Rollback and post-deploy verification are known before deploy.

The first A3 runs should target CREATE SOMETHING-owned docs, static pages,
eval/report surfaces, or reversible Worker deploys with clear rollback. Avoid
data mutation, account access, credentials, billing, and client production.

### Auto-Rollback

The production-complete agent loop may roll back its own CREATE SOMETHING
internal production deploy without interrupting the operator when all of these
are true:

- the same loop performed the deploy
- post-deploy smoke or production verification failed
- the rollback command or last known-good redeploy path was recorded before
  deploy
- the rollback affects only the just-deployed internal production surface
- post-rollback verification can run
- Linear, PR/release evidence, or a local receipt records the rollback outcome

Notify the operator after rollback with the failed smoke, rollback command,
post-rollback verification, and next QA decision. Stop before rollback when the
rollback path is unknown, touches credentials or billing, deletes data, affects
client production, or cannot be verified after execution.

## Stop Conditions

Stop and escalate when:

- target is client production
- rollback is unknown
- the model asks for broad repo write access without a target inventory
- validation cannot run locally
- production health cannot be checked
- post-rollback health cannot be checked after a failed deploy
- action touches secrets, credentials, billing, account access, or deletion
- the only evidence would be chat text

## Related Artifacts

- `AGENTS.md`
- `docs/guides/LOOPS_ABOVE_AGENTS.md`
- `docs/guides/CODING_AGENT_HARNESS_PATTERN.md`
- `docs/guides/OPEN_WEIGHT_AGENT_EXECUTOR_EVAL.md`
- `docs/policies/v1/policy.operator-agent-production-lab.v1.md`

## Local Patch Proof

- `2026-07-05T17-02-56-064Z-scout-local-scout.json`: deterministic A0 scout over `docs/guides` produced three low-risk docs candidates.
- `2026-07-05T17-03-10-964Z-patch-local-patch.json`: A1 dry-run patch for `candidate-001` passed policy and candidate gates without writing.
- `candidate-local-patch-proof-001`: first bounded Markdown append candidate for proving a useful docs patch path before expanding patch authority.
