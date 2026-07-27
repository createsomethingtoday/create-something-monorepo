# Harness Ablation Loop

Use this loop to determine which instructions, hooks, skills, MCP surfaces,
policies, memory layers, or review stages materially improve an agent workflow.

The outcome is a causal decision with a receipt: **retain**, **rewrite**,
**move**, **remove**, or **unresolved**. A component does not earn permanence
because it sounds prudent or because the full harness passes.

## Use when

Run an ablation when:

- adding or substantially changing `AGENTS.md`, `CLAUDE.md`, a skill, or a hook
- upgrading the model or harness may have made old guidance redundant
- a workflow succeeds but its context, latency, or review cost keeps growing
- two controls appear to enforce the same behavior
- a natural-language rule may belong in a deterministic check
- Control tuning needs evidence that a harness component still earns its cost

Do not use ablation as a reason to disable a live safety control. Safety-critical
arms run only in an isolated evaluation or a no-write shadow environment.

## Before starting

Prepare:

1. A falsifiable hypothesis for every component.
2. Representative tasks with observable acceptance criteria.
3. A pinned model, harness version, tool set, fixture state, and evaluator.
4. At least two repetitions; use more when model variance could change the
   decision.
5. An approved isolated or shadow executor and a budget for any paid runs.

Keep human acceptance separate from the ablation score. The comparison can show
that one configuration performed better on the declared metrics; it cannot
manufacture product, security, or commercial approval.

## First action

Copy the example manifest and replace every synthetic assumption:

```bash
cp evals/harness-ablation/example.manifest.json /tmp/my-harness-ablation.manifest.json
```

The manifest is the Judgment artifact. It names the hypothesis, components,
tasks, metrics, normalization scales, materiality thresholds, repetitions, and
randomization seed.

## Plan the experiment

```bash
pnpm agent:harness-ablation -- plan \
  --manifest /tmp/my-harness-ablation.manifest.json \
  --format markdown
```

The plan contains:

- `control`: none of the declared CREATE SOMETHING harness components
- `full`: every declared component
- one `without-<component>` leave-one-out arm per component
- a stable SHA-256 manifest and plan identity
- a deterministic randomized execution schedule
- an explicit isolated-execution flag for safety-sensitive arms

The planner does not launch an agent, remove files, spend model credits, or
write to production. The owning harness must apply each arm exactly as declared.
This separation keeps execution authority and experimental judgment visible.

## Execute the schedule

Run each scheduled row through the same owning executor. Change only the
declared component set. Preserve the model, harness version, task fixture,
tools, permissions, evaluator, timeout, and budget across arms.

Record one result object per arm, task, and repetition:

```json
{
  "armId": "without-root-instructions",
  "taskId": "bounded-package-change",
  "repetition": 1,
  "metrics": {
    "taskSuccess": 1,
    "policyViolations": 0,
    "humanCorrectionMinutes": 3,
    "totalTokens": 24000,
    "costUsd": 0.9,
    "latencyMs": 115000,
    "escalationQuality": 1
  }
}
```

Follow the generated schedule instead of grouping all control or full runs
together. The seeded order makes the plan reproducible while reducing ordering
and warm-cache bias.

## Compare complete evidence

```bash
pnpm agent:harness-ablation -- compare \
  --manifest /tmp/my-harness-ablation.manifest.json \
  --results /tmp/my-harness-ablation.results.json \
  --format markdown
```

The comparator fails closed when the experiment ID or plan hash drifts, a run
is duplicated, a metric is missing, or the arm/task/repetition matrix is
incomplete. It reports raw metric deltas alongside normalized utility so an
operator can inspect the actual tradeoff.

## Interpret decisions

| Decision     | Meaning                                                                       | Next action                                                            |
| ------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `retain`     | Removing the component caused a material utility loss.                        | Keep it and preserve the receipt.                                      |
| `rewrite`    | The component has some benefit but excessive overhead.                        | Make it smaller or more local, then rerun.                             |
| `move`       | An instruction mainly enforces policy and a deterministic alternative exists. | Move the behavior into a hook or check, then rerun.                    |
| `remove`     | The component is harmful or adds material overhead without net value.         | Remove it through normal review, then verify the full harness.         |
| `unresolved` | Evidence stayed inside the materiality thresholds.                            | Sharpen tasks, increase repetitions, or leave the component unchanged. |

These are recommendations, not mutation authority. Changes to the harness still
follow the owning review, security, and promotion workflow.

## Tier mapping

| Tier           | Ownership                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Database**   | Versioned manifests, plan hashes, run receipts, comparison receipts, and task fixtures.                                   |
| **Automation** | The planner/comparator CLI and the isolated executor that runs each scheduled arm.                                        |
| **Judgment**   | Hypotheses, metric weights, materiality thresholds, safety boundaries, and the final retain/rewrite/move/remove decision. |

## Example artifacts

- `evals/harness-ablation/example.manifest.json`
- `evals/harness-ablation/example.results.json`

The example result provenance says
`synthetic-documentation-example-not-real-evaluation-evidence`. It proves the
receipt contract, not that the example components help in the real repository.

Verify the implementation and example readback with:

```bash
pnpm agent:harness-ablation:verify
```

## Done

The loop is complete when:

- the run matrix is complete and bound to the current plan hash
- raw metrics and the normalized contribution agree with the written decision
- safety-sensitive arms have isolated or shadow execution evidence
- an operator has reviewed any proposed harness mutation
- the receipt names the next decision and where evidence is retained

## References

- [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://arxiv.org/abs/2602.11988)
- [Claude Code hooks guide](https://code.claude.com/docs/en/hooks-guide)
