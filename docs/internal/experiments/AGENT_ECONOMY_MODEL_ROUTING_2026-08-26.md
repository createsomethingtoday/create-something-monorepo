# Governed Codex Model Routing Economics

- Experiment ID: `EXP-AGENT-ECONOMY-2026-08-26`
- Linear: `CRE-1877`
- Artifact class: internal experiment
- Status: **SUPPORTED — NOT VALIDATED**
- Evidence grade: benchmark
- Started: 2026-08-26
- Last reviewed: 2026-08-26
- Review owner: CREATE SOMETHING
- Public publication: not approved

```text
╔══════════════════════════════════════════════════════════════════╗
║  EXPERIMENT: GOVERNED CODEX MODEL ROUTING                        ║
║                                                                  ║
║  3x Luna / High: 1.14 credit-equivalent                          ║
║  Equal judged result to single-agent controls in Trial 2         ║
║                                                                  ║
║  OUTCOME: SUPPORTED — REPLICATION REQUIRED                       ║
╚══════════════════════════════════════════════════════════════════╝
```

## Research question

Can CREATE SOMETHING preserve strong operational judgment while reducing agent
execution cost by routing tasks according to their shape rather than assigning
the strongest model to every step?

The candidate operating pattern is:

```text
Sol / Low       → govern, classify, diagnose, synthesize
Luna / High × N → execute independent, bounded, verifiable work
deterministic judge → accept, reject, or escalate the result
```

This is not yet a tested end-to-end routing system. The completed trials test
the component claims behind that pattern.

## Prior art and contribution

The existing [Dual-Agent Routing Experiment](../../../packages/io/src/routes/papers/dual-agent-routing-experiment/+page.svelte)
found that a cheaper model could handle bounded voice-audit work, but its
implementation phase exposed extraction failures. Its durable lesson was that
model routing is only useful when implementation quality gates can reject bad
work.

This experiment extends that question in four ways:

1. it compares the current Codex Sol, Terra, and Luna model family;
2. it separates model selection, reasoning effort, and serving tier;
3. it uses hidden behavioral tests and mutation scoring for implementation work;
4. it tests operational judgment traps that cannot be reduced to a green test.

## Hypotheses

### Component hypothesis A: economical execution

For independent tasks with deterministic acceptance criteria, multiple
Luna/High agents can match the externally judged correctness of a single
Terra/High or Sol/High agent while using fewer credit-equivalent units.

### Component hypothesis B: economical judgment

For coupled operational audits, Sol/Low can retain the classification and
causal-diagnosis quality expected by CREATE SOMETHING while using less reasoning
than a higher-effort Sol configuration would require.

### Component hypothesis C: serving speed

Fast serving can reduce Sol/Low wall-clock latency without changing the quality
contract. It is not assumed to reduce tokens or billed cost.

### Null hypothesis

Task-shaped routing does not preserve the required quality bar after repeated,
randomized runs, or its aggregation, latency, and failure-recovery costs erase
the apparent savings.

These hypotheses were articulated after the exploratory runs. They are a model
for the replication, not preregistration evidence for the current sample.

## Method

### Trial 1: read-only operational audit

One agent inspected a deliberately non-qualifying repository root, enumerated a
large public package surface, ran an acceptance command, inspected its output
path, and explained the compiler/runtime boundary.

Two material judgment traps were present:

- A failed home-base qualification was an expected finding, not a reason to
  label the benchmark itself blocked.
- The acceptance output was a dangling symlink whose target had been removed,
  not evidence of a path collision.

The audit therefore measured both exhaustive retrieval and operational
judgment.

### Trial 2: write-enabled three-slice suite

The suite contained debugging, test authoring, and bounded implementation. The
three Luna agents received independent slices. Terra and Sol received the whole
suite as single-agent controls.

The judge was separate from the subject agents:

- public tests measured declared behavior;
- hidden tests measured withheld behavior;
- five mutants tested whether the authored tests rejected plausible defects;
- repository status checked that only three authorized files changed.

### Cost and latency

Credit-equivalent values were calculated from redacted session telemetry using
the Codex rate card observed on 2026-08-26 for uncached input, cached input, and
output. The exact token categories, receipt identifiers, rate-card version,
source, and formula are preserved in the
[Trial 1 receipt](./agent-economy-trial-1-telemetry-2026-08-26.json) and
[Trial 2 receipt](./agent-economy-trial-2-telemetry-2026-08-26.json).
They are not invoice dollars. Session critical path, not summed subagent time,
is the fan-out latency measure.

For the Sol/Low serving-tier pair, token categories and elapsed time were
captured directly from the local Codex runner. Fast's displayed base-rate credit
equivalence excludes any separate Fast service-tier adjustment.

Machine-readable results are preserved in
[agent-economy-model-routing-2026-08-26.json](./agent-economy-model-routing-2026-08-26.json).

## Results

### Trial 2: independently verifiable execution

| Strategy        | Public | Hidden | Mutants | Authorized files only | Critical path |  Tokens | Credit-equivalent |
| --------------- | -----: | -----: | ------: | --------------------- | ------------: | ------: | ----------------: |
| 3× Luna / High  |  17/17 |    3/3 |     5/5 | yes                   |      98.865 s | 859,682 |          1.137818 |
| 1× Terra / High |  14/14 |    3/3 |     5/5 | yes                   |      78.676 s | 391,791 |          4.267320 |
| 1× Sol / High   |  17/17 |    3/3 |     5/5 | yes                   |     129.263 s | 586,459 |         12.071900 |

The public assertion count differs because the Terra subject grouped some
assertions. All three subjects passed the same hidden behaviors and killed the
same five mutants.

In this sample, Luna fan-out used 73.34% fewer credit-equivalent units than
Terra/High and 90.57% fewer than Sol/High. It was 25.66% slower than Terra/High
and 23.52% faster than Sol/High.

### Trial 1: reasoning effort did not repair judgment

| Terra effort        | Retrieval and judgment                                          |   Elapsed |    Tokens | Credit-equivalent |
| ------------------- | --------------------------------------------------------------- | --------: | --------: | ----------------: |
| High                | Core facts correct; incomplete export list; two judgment errors |  83.546 s |   501,373 |          6.248520 |
| Ultra, exact prompt | Complete export list; same two judgment errors                  | 307.422 s | 1,158,457 |         15.430340 |

Ultra used 2.47× the credits and 3.68× the elapsed time. It improved exhaustive
retrieval but did not repair either material judgment error.

A separate clarified Ultra run was fully correct, but the prompt changed. It is
excluded from the effort-only comparison and suggests that precise acceptance
language can matter more than increased effort.

### Trial 1: Sol/Low retained judgment

| Serving tier | Quality       | Elapsed |   Input | Cached input | Output | Reasoning output |
| ------------ | ------------- | ------: | ------: | -----------: | -----: | ---------------: |
| Default      | Fully correct |   140 s | 739,952 |      665,856 |  9,619 |            1,936 |
| Fast         | Fully correct |    59 s | 517,259 |      457,728 |  6,824 |            1,223 |

Both Sol/Low runs completed the full export inventory and correctly handled the
two operational judgment traps.

Fast finished 57.86% sooner in this pair. It also used fewer tokens, but that
token difference is observational: the agents followed different investigation
paths, so serving tier is not established as the cause.

## Honest assessment

### What this supports

- Independent work with strong deterministic judges can be assigned to cheaper
  agents without lowering observed correctness in this suite.
- More reasoning effort is not a reliable substitute for a precise acceptance
  contract or stronger operational judgment.
- Sol/Low is a credible governor candidate for CREATE SOMETHING because it
  retained the classification and causal diagnosis Terra missed.
- Model, effort, and serving tier should be measured as separate decisions.

### What this does not prove

- Luna fan-out is not universally cheaper or faster.
- Sol/Low is not proven sufficient for security review, destructive migration,
  production promotion, or long-horizon coupled implementation.
- Fast is not proven to reduce tokens or total billed credits.
- The current sample does not establish statistical significance.
- The governor-plus-executor architecture has not yet been tested end to end.

### Where intervention was needed

- The clarified Terra/Ultra prompt explicitly corrected the benchmark-status
  and symlink-readback acceptance language.
- Both local Sol/Low runners initially launched one acceptance build from the
  repository root before completing the authoritative isolated run. Git-visible
  status remained unchanged, but ignored `dist` output may have been refreshed.
- The benchmark author constructed the task decomposition and the hidden judge.

## Material limitations

1. Each model/effort cohort has one run.
2. Cohort order was not randomized.
3. Trial 2 was synthetic and designed to decompose cleanly.
4. Model behavior, rates, serving infrastructure, and Codex orchestration can
   change.
5. Public-test counts were not identical across every subject even though the
   hidden judge was identical.
6. Aggregation cost was implicit in the parent session rather than isolated as
   its own governor metric.
7. The checked-in receipt is a portable redacted numeric projection; raw local
   transcripts remain private and are not independently published.

## Prospective replication protocol

The next phase is preregistered here. Do not alter these gates after starting a
replication batch without recording a new experiment version.

### Cohorts

- Sol/Low default
- Sol/Low Fast
- Sol/Medium default
- Terra/High
- Luna/High fan-out
- Sol/Low governor plus Luna/High executors

### Task families

- read-only operational audit;
- debugging;
- test authoring;
- bounded implementation;
- coupled architecture and governance review.

### Sampling and ordering

- Minimum 10 runs per task family per cohort.
- Randomize cohort order within each task instance.
- Use exact prompt hashes and immutable fixture revisions.
- Reset each subject to an identical seed.
- Keep judges hidden from subject agents.

### Validation gates

| Gate                                                | Prospective threshold |
| --------------------------------------------------- | --------------------: |
| Deterministic judge pass rate                       |                  100% |
| Unauthorized mutations                              |                     0 |
| Material judgment error rate                        |                   ≤5% |
| Luna fan-out credits / Sol/High credits             |                  ≤25% |
| Luna fan-out latency / fastest single-agent latency |                 ≤130% |

Track uncached input, cached input, cache writes, output, reasoning output,
elapsed time, retries, tool failures, aggregation tokens, and serving tier. Use
the actual billed rate for economic conclusions.

### Decision rule

The routing hypothesis becomes **validated for a named task family** only when
all quality gates pass and the economic threshold holds across the complete
randomized replication batch. Validation is task-family-specific, not a global
model ranking.

If quality passes but the economic gate fails, record the result as
`quality-supported / economy-invalidated`. If any consequential quality gate
fails, stop promotion and preserve the failure as evidence.

## Reproducibility contract

A replication receipt must include:

- experiment and protocol version;
- Linear issue and immutable source SHA;
- task-family and fixture IDs;
- exact prompt hash and policy-artifact hashes;
- model, effort, service tier, and agent count;
- start/end timestamps and retry count;
- public, hidden, mutation, and judgment results;
- before/after repository status;
- uncached, cached, cache-write, output, and reasoning tokens;
- rate-card version and billed or credit-equivalent computation;
- raw receipt location and a public-safe redacted pointer.

## Database / Automation / Judgment

| Tier       | Experiment ownership                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Database   | Immutable fixtures, prompt hashes, session telemetry, judge receipts, and rate-card version     |
| Automation | Subject runners, fan-out orchestration, hidden judge, mutation scorer, and receipt generator    |
| Judgment   | Task-family classifier, routing policy, material-error rubric, promotion gate, and human review |

The compiler or routing policy can make selection exact and testable. A runtime
still performs the selected work, and receipts prove what actually happened.

## Living research transparency

| Field           | Current value                                                                     |
| --------------- | --------------------------------------------------------------------------------- |
| Claim status    | supported                                                                         |
| Confidence      | medium-low                                                                        |
| Evidence grade  | benchmark                                                                         |
| Last reviewed   | 2026-08-26                                                                        |
| Next review due | after the first randomized replication batch or 2026-09-26, whichever comes first |
| Review owner    | CREATE SOMETHING                                                                  |

Current best read: task-shaped routing is promising enough to replicate. The
evidence supports Sol/Low as a governor candidate and Luna/High fan-out as an
executor candidate, but it does not yet authorize a default production routing
policy.

Counter-signals:

- Terra/High was the fastest Trial 2 control.
- Sol/Low remained materially more expensive at base-equivalent rates than the
  cheaper model cohorts.
- Higher Terra effort improved retrieval but not judgment.
- Fast and default Sol/Low runs were not identical trajectories.

Open questions:

- Does Sol/Medium offer a better governor quality/cost point than Sol/Low?
- What is the governor's aggregation cost in an end-to-end fan-out route?
- Which task features reliably predict whether work is truly independent?
- How often does a hidden judge fail to detect a semantically poor but
  test-passing implementation?
- Does the result persist across repository domains and model updates?

## Outcome declaration

**SUPPORTED — NOT VALIDATED**

The completed trials justify a replicated experiment and a provisional routing
hypothesis. They do not justify a public universal claim or production-default
change.

## Paper promotion gate

The likely future paper is not “which model wins?” Its stronger question is:

> What if capability governs execution instead of performing all execution?

Promote this experiment toward a paper only after:

1. the randomized replication protocol completes;
2. at least one end-to-end governor-plus-executor cohort is measured;
3. raw receipts are packaged into a portable, redacted evidence bundle;
4. the relationship to the older dual-agent-routing result is synthesized;
5. two review passes and human `publish-approved` are recorded under
   [the publication policy](../../policies/v1/policy.paper-experiment-release-gate.v1.md).

## Update log

- 2026-08-26: Initial internal experiment created from Trial 1, Trial 2, the
  Terra effort control, and the Sol/Low serving-tier control. Outcome declared
  supported but not validated. Randomized replication protocol preregistered.
