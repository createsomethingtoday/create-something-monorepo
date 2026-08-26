---
slug: "governed-codex-model-routing"
title: "Governed Codex Model Routing Economics"
publishedAt: "2026-08-26"
published: true
---

> **Outcome: SUPPORTED — NOT VALIDATED.** Seven exploratory trial subjects support task-shaped routing. Every model/effort cohort has only one run, so this is not a universal model ranking or a production routing policy.

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

The suite combined debugging, test authoring, and bounded implementation. Three Luna agents received independent slices; Terra and Sol each received the complete suite as single-agent controls. A separate judge checked public tests, three hidden behaviors, five withheld mutants, and the authorized-file boundary.

Credit-equivalent values use local session telemetry and the rate card visible during the experiment. They are comparative units, not invoice dollars. Fan-out latency is the session critical path rather than summed agent time.

## Results

### Independently verifiable execution

| Strategy | Public | Hidden | Mutants | Authorized files only | Critical path | Tokens | Credit-equivalent |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| 3× Luna / High | 17/17 | 3/3 | 5/5 | yes | 98.865 s | 859,682 | 1.137818 |
| 1× Terra / High | 14/14 | 3/3 | 5/5 | yes | 78.676 s | 391,791 | 4.267320 |
| 1× Sol / High | 17/17 | 3/3 | 5/5 | yes | 129.263 s | 586,459 | 12.071900 |

Terra grouped some public assertions, so public assertion counts are not directly comparable. All three subjects passed the same hidden behaviors and killed the same five mutants.

In this sample, Luna fan-out used **73.34% fewer** credit-equivalent units than Terra/High and **90.57% fewer** than Sol/High. It was **25.66% slower** than Terra/High and **23.52% faster** than Sol/High.

### More Terra effort did not repair judgment

| Terra effort | Retrieval and judgment | Elapsed | Tokens | Credit-equivalent |
| --- | --- | ---: | ---: | ---: |
| High | Core facts correct; incomplete export list; two judgment errors | 83.546 s | 501,373 | 6.248520 |
| Ultra, exact prompt | Complete export list; same two judgment errors | 307.422 s | 1,158,457 | 15.430340 |

Ultra used **2.47×** the credits and **3.68×** the elapsed time. It improved exhaustive retrieval without repairing either material judgment error. A separate clarified Ultra run was fully correct, but its prompt changed, so it is excluded from the effort-only comparison. That counter-signal suggests acceptance language may matter more than additional effort.

### Sol/Low retained judgment

| Serving tier | Quality | Elapsed | Input | Cached input | Output | Reasoning output |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Default | Fully correct | 140 s | 739,952 | 665,856 | 9,619 | 1,936 |
| Fast | Fully correct | 59 s | 517,259 | 457,728 | 6,824 | 1,223 |

Both Sol/Low runs completed the inventory and handled both judgment traps correctly. Fast finished **57.86% sooner** in this pair. Its lower token count is observational: the agents followed different investigation paths, so serving tier is not established as the cause. The displayed credit equivalence also excludes any separate Fast-tier adjustment.

## Interpretation

The evidence supports three bounded conclusions:

1. Independent work with strong deterministic judges can be assigned to cheaper agents without lowering observed correctness in this suite.
2. More reasoning effort is not a reliable substitute for a precise acceptance contract or stronger operational judgment.
3. Sol/Low is a credible governor candidate because it retained the classification and causal diagnosis Terra missed.

It does **not** prove that Luna fan-out is universally cheaper or faster, that Sol/Low is sufficient for high-risk production work, that Fast causally reduces tokens, or that the architecture is statistically validated.

## Material limitations

1. Every reported model/effort cohort has one run.
2. Cohort order was not randomized.
3. The implementation suite was synthetic and designed to decompose cleanly.
4. Model behavior, prices, serving infrastructure, and orchestration can change.
5. Public-test counts differ even though the hidden judge was identical.
6. Aggregation cost remained implicit in the parent session.
7. The benchmark author designed the decomposition and hidden judge.
8. Both Sol/Low runners initially launched one acceptance build from the repository root before completing the authoritative isolated run; ignored build output may have been refreshed.
9. Local session receipts are not yet a portable public evidence bundle.

## Prospective replication gate

The next batch must run at least **10 trials per task family per cohort**, randomize cohort order, use immutable fixtures and prompt hashes, reset subjects identically, and keep judges hidden.

| Gate | Threshold |
| --- | ---: |
| Deterministic judge pass rate | 100% |
| Unauthorized mutations | 0 |
| Material judgment error rate | ≤5% |
| Luna fan-out credits / Sol/High credits | ≤25% |
| Luna fan-out latency / fastest single agent | ≤130% |

The task families are read-only operational audit, debugging, test authoring, bounded implementation, and coupled architecture/governance review. A Sol/Low governor plus Luna/High executors must also be tested end to end.

Validation is task-family-specific. If quality passes but the economic gate fails, record `quality-supported / economy-invalidated`. If any consequential quality gate fails, stop promotion and preserve the failure.

## Living-research transparency

```yaml
claim_status: supported
confidence: low
evidence_grade: benchmark
last_reviewed: 2026-08-26
next_review: after_randomized_replication
supporting_evidence:
  - seven exploratory trial subjects
  - shared hidden behavior checks and five mutation gates in Trial 2
  - exact-prompt Terra effort comparison
counter_signals:
  - one run per model and effort cohort
  - clarified Terra Ultra succeeded after acceptance language changed
  - token differences in the Sol Fast pair are not causal evidence
open_questions:
  - does the result replicate across ten randomized runs per task family?
  - what does aggregation cost add to governor-plus-executor routing?
  - where does low-effort judgment fail on coupled or high-risk work?
```

## Evidence and reproducibility

The source repository preserves a machine-readable ledger, integrity validator, prompt and fixture requirements, and the prospective decision rule under CRE-1877. Private session paths and raw transcripts are intentionally excluded from this public route; the numeric projection is checked against the durable ledger during release.

Relevant public references:

- [Dual-Agent Routing Experiment](/papers/dual-agent-routing-experiment)
- [OpenAI: Latest model guide](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI: GPT-5.6 Sol model](https://developers.openai.com/api/docs/models/gpt-5.6-sol)

## Update log

- **2026-08-26:** Initial exploratory result published as **SUPPORTED — NOT VALIDATED**. No production routing default changed.
