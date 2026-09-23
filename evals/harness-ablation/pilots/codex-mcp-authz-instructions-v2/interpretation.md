# Codex instruction ablation pilot interpretation

## Decision

Keep both instruction artifacts unchanged. This pilot does not establish that
either root or package `AGENTS.md` materially improves or harms task success.
Both component decisions are **unresolved**; no live harness mutation is
authorized or supported by this evidence.

## Observed evidence

- The independently verified matrix is complete at 8/8: four arms, one task,
  and two repetitions per arm.
- Every run used the same historical source tree, prompt, evaluator, model,
  reasoning effort, sandbox, ChatGPT authentication, and pinned Codex binary.
- All eight runs exited zero and passed package validation, but none passed the
  hidden behavioral evaluator. Seven runs passed 4/8 hidden cases; one
  package-only run passed 3/8.
- Every run changed only `packages/mcp-authz`, but every final response claimed
  completion after hidden failure. The derived metrics therefore record
  `taskSuccess=0`, `policyViolations=1`, and `scopeDiscipline=0` for every run.
- Control averaged 268,296.5 tokens and 112,019 ms. Full instructions averaged
  315,888 tokens and 149,713.5 ms: +47,591.5 tokens and +37,694.5 ms, with no
  observed task-success, policy, or scope improvement.
- The comparator reports control-to-full utility delta `-0.002094`. Marginal
  contribution is `0.001103` for root instructions and `0.00015` for package
  instructions, both below configured materiality thresholds.

## Limitations

1. This is one reconstruction task with two repetitions per arm. It cannot
   support a repository-wide instruction decision.
2. Every arm failed the binary success metric, so the comparison primarily
   reflects latency and token variation rather than demonstrated correctness.
   The retained 3/8 and 4/8 hidden summaries show partial behavior that the
   binary metric intentionally does not treat as completion.
3. The parent experiment designer inspected the historical repair while
   constructing the task and hidden evaluator. Evaluated agents could not see
   that history, diff, evaluator, or another run, but evaluator-design bias is
   still possible.
4. Although the runner used `--ignore-user-config`, Codex still exposed its
   installed skill catalog. Six of eight agents read a CREATE SOMETHING debug
   or TDD skill from the operator checkout outside the fixture. Skill
   availability was held constant across arms, so the declared `AGENTS.md`
   contrast remains, but the control arm was not an instruction-free model
   baseline and interaction effects are unresolved.
5. Codex CLI `0.146.0-alpha.3.1` was required because v1's pinned `0.142.5`
   binary could not execute `gpt-5.6-terra`. V1's zero-token failure remains
   separately retained and is not included in v2 results.
6. Token usage varied substantially, including a 618,877-token package-only
   outlier. With two repetitions, marginal overhead estimates are unstable.

## Next experiment

Before spending more model sessions, harden the harness boundary so undeclared
workspace/global skills are either disabled or modeled as explicit components,
and add a verifier for reads outside the fixture. Then run a new, separately
approved experiment with multiple authorization tasks and at least three
repetitions per arm. Preserve binary completion as the primary outcome, but
retain a prespecified partial-behavior metric so all-failure matrices remain
more diagnostic. Do not tune or rerun this v2 corpus.
