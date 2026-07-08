# cmux Ornith Codebase Loop

This runbook defines the local lane where CREATE SOMETHING operators drive Codex
directly, and Codex uses a visible cmux workspace to supervise the specialized
local Ornith executor.

This is not the Claude/Webflow exception lane. For Claude connector work, use
[CMUX_CLAUDE_WEBFLOW_BRIDGE.md](./CMUX_CLAUDE_WEBFLOW_BRIDGE.md).

## Operating Model

```text
Operator
  -> Codex as primary agent surface and done authority
    -> cmux as visible terminal cockpit
      -> Ornith through Ollama / OpenAI-compatible local endpoint
      -> operator-agent receipts
    -> Linear / git / validation evidence
```

Ornith is the local worker. Codex owns coordination, grounding, review,
verification, and the done decision. Linear owns shared task state and durable
evidence.

## First-Class Command

Open the lane:

```bash
pnpm cmux:ornith
```

Preview the lane without opening cmux:

```bash
pnpm cmux:ornith -- --dry-run
```

Review the latest receipt-backed candidate output:

```bash
pnpm cmux:ornith:receipt
```

Review a specific receipt:

```bash
pnpm cmux:ornith:receipt -- --receipt .cache/operator-agent-system/<receipt>.json
```

The launcher opens a cmux workspace and runs:

1. `cmux ping`
2. `ollama list`
3. `pnpm operator-agent:doctor -- --json`
4. `pnpm operator-agent:model-probe -- --timeout-ms 60000 --json`
5. `pnpm operator-agent:batch-eval -- --surface docs/guides --limit 3 --timeout-ms 60000 --json`
6. one visible `ollama run ornith:9b ...` prompt that explains Ornith's role
   and asks Codex for the next bounded target or receipt path

`--timeout-ms` controls the model probe timeout and defaults to 60000ms for the
visible cmux lane. `--batch-timeout-ms` controls the batch-eval model candidate
timeout and also defaults to 60000ms so a cmux lane does not sit silently for a
long background reliability window before falling back to deterministic
receipt-backed candidates. Use a longer explicit timeout only when the operator
is intentionally benchmarking local model latency.

The receipt-backed `operator-agent:batch-eval` output is the authoritative
candidate source. The free-form visible chat is not allowed to name files,
propose edits, or claim repository inspection unless Codex provides that
evidence in the prompt.

Use `pnpm cmux:ornith:receipt` to turn the latest batch-eval receipt into a
review packet. The reviewer reads only receipt evidence: scorecard, inspected
files, gates, blockers, dry-run status, validation, rollback, and pre-receipt
paths. It does not approve, patch, revise, or close Linear work.

## Authority Boundary

The cmux Ornith lane is no-write by default:

- allowed: readiness, model probe, pattern review, bounded batch-eval,
  receipt-backed candidate proposals, receipt review
- not allowed by this launcher: `patch`, `revise`, production deploys,
  credential changes, destructive cleanup, git reset, or direct Linear closure
- promotion path: Codex reviews the receipt, grounds target files, asks for a
  bounded patch only when the candidate is specific, then runs validation

Patch/revise authority remains CLI-only and operator/Codex-gated until identity,
approval, rollback, and audit behavior are boringly reliable.

## Cost Model

Local Ornith inference does not consume hosted frontier-model tokens. The real
costs are device uptime, CPU/GPU/RAM, heat, battery, disk, and operator review.
Codex usage still applies for supervision, grounding, review, and escalation.

This lane is cheaper when Ornith handles repeatable discovery and Codex reviews
exceptions. It is not cheaper when Ornith produces vague candidates that require
frontier-model cleanup.

## Stop Conditions

Stop and keep the result as a receipt instead of patching when:

- `operator-agent:doctor` is not locally ready
- model health is degraded or disabled
- Ornith emits ungrounded file guesses
- the candidate requires broad refactors or cross-package edits
- the candidate touches credentials, production, customer data, or third-party
  mutation surfaces
- cmux cannot read the terminal output by workspace/surface id

## Validation

For this lane definition:

```bash
node --check scripts/cmux-ornith-lane.mjs
node --check scripts/cmux-ornith-receipt.mjs
pnpm cmux:ornith:test
pnpm cmux:ornith -- --dry-run
pnpm cmux:ornith:receipt
git diff --check -- scripts/cmux-ornith-lane.mjs scripts/test/cmux-ornith-lane.test.mjs docs/guides/CMUX_ORNITH_CODEBASE_LOOP.md packages/dotfiles/cmux/README.md package.json
```
