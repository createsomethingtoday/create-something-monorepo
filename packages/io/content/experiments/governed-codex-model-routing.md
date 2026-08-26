---
slug: 'governed-codex-model-routing'
title: 'Governed Codex Model Routing Economics'
publishedAt: '2026-08-26'
published: true
---

> **Outcome: INCONCLUSIVE — QUALITY GATE FAILED.** All three session-time Trial 2 subjects passed their public tests but failed the expanded hidden retry-parser gate. Their cost and timing receipts remain descriptive, but they do not establish an economic routing advantage or a production routing policy.

## Question

Can a capable model at low reasoning effort hold judgment and policy while less expensive, high-effort agents execute independent, verifiable slices—reducing credit-equivalent use without lowering the measured quality bar?

This extends the earlier [Dual-Agent Routing Experiment](/papers/dual-agent-routing-experiment). That work compared a fast worker with a stronger auditor. This experiment asks the same architectural question inside the current Codex Sol, Terra, and Luna family, while separating model choice, reasoning effort, serving tier, and verification.

## Hypothesis

Model choice should follow task shape:

- use a stronger low-effort model as the judgment governor when classification, causal diagnosis, policy, or ambiguity matters;
- use lower-cost high-effort agents for independent slices with deterministic judges;
- treat serving speed as a separate latency decision;
- promote a routing rule only after repeated, randomized trials pass quality and economic gates.

The null hypothesis is that aggregation, latency, retries, or quality failures erase the apparent savings.

## Method

### Trial 1: read-only operational audit

Subjects had to enumerate a public package surface, run an acceptance command, inspect its output, and explain a compiler/runtime boundary. Two judgment traps were deliberate: a failed home-base qualification was an expected benchmark finding, and a dangling symlink was not a path collision.

### Trial 2: three independent implementation slices

The suite combined debugging, test authoring, and bounded implementation. Three Luna agents received independent slices; Terra and Sol each received the complete suite as single-agent controls. A separate judge checked public tests, three hidden test groups, five withheld mutants, and the authorized-file boundary. Review expanded the retry-parser cases after the runs. The original session-time outputs are preserved and scored below; later human-remediated copies are reference implementations only.

Credit-equivalent values use redacted session telemetry and the Codex rate card observed on 2026-08-26. The source receipts preserve the receipt identifiers, token categories, versioned rates, and exact computation for both trials. These are comparative units, not invoice dollars. Fan-out latency is the session critical path rather than summed agent time.

## Results

### Independently verifiable execution

| Strategy        | Public | Hidden | Mutants | Critical path |  Tokens | Credit-equivalent |
| --------------- | -----: | -----: | ------: | ------------: | ------: | ----------------: |
| 3× Luna / High  |  17/17 |    2/3 |     5/5 |      98.865 s | 859,682 |          1.137818 |
| 1× Terra / High |  14/14 |    2/3 |     5/5 |      78.676 s | 391,791 |          4.267320 |
| 1× Sol / High   |  17/17 |    2/3 |     5/5 |     129.263 s | 586,459 |         12.071900 |

Terra grouped some public assertions, so public assertion counts are not directly comparable. All three session-time subjects failed the expanded retry-parser hidden group and passed the other two hidden groups. They also killed the same five mutants.

Descriptively, Luna fan-out used **73.34% fewer** credit-equivalent units than Terra/High and **90.57% fewer** than Sol/High. It was **25.66% slower** than Terra/High and **23.52% faster** than Sol/High. Because no session-time subject passed the full quality gate, these differences are not an economic win and cannot support routing promotion.

### Trial 1 is telemetry-only evidence

Trial 1 preserves portable redacted token receipts, but not timing evidence, the exact prompt, subject outputs, rubric, or judge receipt. Its elapsed values and operator classifications therefore cannot be independently reconciled and are excluded from the supported conclusions in this publication. The Terra effort and Sol serving-tier comparisons remain hypotheses for the prospective replication batch, where immutable prompts, subject artifacts, timing receipts, and judges are required.

## Interpretation

The evidence supports three bounded conclusions:

1. The expanded deterministic judge found a shared retry-parser failure in every session-time Trial 2 cohort, so this trial does not show that cheaper agents retained the required correctness.
2. Trial 1 is insufficient to establish whether reasoning effort or serving tier retained operational judgment.
3. Sol/Low remains a governor hypothesis, not a supported conclusion, until the portable replication gate is run.

It does **not** prove an economic routing advantage, that Luna fan-out is universally cheaper or faster, that Sol/Low is sufficient for high-risk production work, that Fast causally reduces tokens, or that the architecture is statistically validated.

## Material limitations

1. Every reported model/effort cohort has one run.
2. Cohort order was not randomized.
3. The implementation suite was synthetic and designed to decompose cleanly.
4. Model behavior, prices, serving infrastructure, and orchestration can change.
5. Public-test counts differ even though the hidden judge was identical.
6. Aggregation cost remained implicit in the parent session.
7. The benchmark author designed the decomposition and hidden judge.
8. Both Sol/Low runners initially launched one acceptance build from the repository root before completing the authoritative isolated run; ignored build output may have been refreshed.
9. The source repository includes a portable redacted numeric receipt; raw local transcripts remain private and are not independently published.
10. Review-remediated reference implementations pass the expanded judge, but their fixes were human-authored after the measured sessions and are excluded from cohort quality scores.

## Prospective replication gate

The next batch must run at least **10 trials per task family per cohort**, randomize cohort order, use immutable fixtures and prompt hashes, reset subjects identically, and keep judges hidden.

| Gate                                        | Threshold |
| ------------------------------------------- | --------: |
| Deterministic judge pass rate               |      100% |
| Unauthorized mutations                      |         0 |
| Material judgment error rate                |       ≤5% |
| Luna fan-out credits / Sol/High credits     |      ≤25% |
| Luna fan-out latency / fastest single agent |     ≤130% |

The task families are read-only operational audit, debugging, test authoring, bounded implementation, and coupled architecture/governance review. A Sol/Low governor plus Luna/High executors must also be tested end to end.

Validation is task-family-specific. If quality passes but the economic gate fails, record `quality-supported / economy-invalidated`. If any consequential quality gate fails, stop promotion and preserve the failure.

## Living-research transparency

```yaml
claim_status: inconclusive_quality_gate_failed
confidence: low
evidence_grade: benchmark
last_reviewed: 2026-08-26
next_review: after_randomized_replication
supporting_evidence:
  - seven exploratory trial subjects
  - matched session-time telemetry and original Trial 2 subject artifacts
  - expanded deterministic judge and five mutation gates in Trial 2
counter_signals:
  - every session-time Trial 2 subject failed the expanded retry-parser hidden group
  - one run per model and effort cohort
  - Trial 1 quality classifications are not portable
  - token differences in the Sol Fast pair are not causal evidence
open_questions:
  - does the result replicate across ten randomized runs per task family?
  - what does aggregation cost add to governor-plus-executor routing?
  - where does low-effort judgment fail on coupled or high-risk work?
```

## Evidence and reproducibility

The source repository preserves a machine-readable ledger, redacted token telemetry for both trials, Trial 2 timing receipts, the immutable Trial 2 task, session-time subjects, review-remediated reference copies, public tests, hidden judge, and five mutants, plus the rate-card version, formula, integrity validator, and prospective decision rule under CRE-1877. Private session paths and raw transcripts are intentionally excluded from this public route. Token and credit economics and Trial 2 latency are recomputed from durable receipts; the release gate reruns the session-time outputs against the checked-in public, hidden, and mutation judges.

Relevant public references:

- [Dual-Agent Routing Experiment](/papers/dual-agent-routing-experiment)
- [OpenAI: Latest model guide](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI: GPT-5.6 Sol model](https://developers.openai.com/api/docs/models/gpt-5.6-sol)

## Update log

- **2026-08-26:** Review corrected the exploratory outcome to **INCONCLUSIVE — QUALITY GATE FAILED** after preserving and rescoring the original session-time outputs. No production routing default changed.
