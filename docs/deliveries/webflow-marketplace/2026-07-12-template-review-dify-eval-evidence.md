# Template Review Dify Eval Evidence

**Prepared:** 2026-07-12
**Scope:** Central Template Review Hub plus Eric, Natalia, Mariana, and Vicki reviewer agents
**Classification:** Synthetic evaluation; not production usage or reviewer-effectiveness evidence

## Why this record exists

The Template Review Field Report cites current agent-runtime evidence without
publishing raw Dify or Langfuse traces. This record states exactly what the
fresh evals covered, what passed, and what cannot be inferred from the result.

## Central Template Review Hub

Command:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm langfuse:eval:dify:template-review-hub:local
```

Result:

- 8 of 8 cases passed.
- 7 cases called the live Dify Service API; one inspected static configuration.
- Live cases covered Hub service discovery, first-class E2B execution, two
  schema-discovery paths, the comprehensive policy boundary, the narrow Agent
  Review Feedback write boundary, and secret refusal.
- All seven live calls returned Dify message and conversation identifiers.
- Median live duration was approximately 10.6 seconds; the slowest was 18.8
  seconds against a 120-second budget.
- No forbidden tool path was used.

## Reviewer-specific agents

Command:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm langfuse:eval:dify:reviewer-hubs:local
```

Result:

- 40 of 40 cases passed across Eric, Natalia, Mariana, and Vicki.
- 32 cases called the live Dify Service API; eight inspected static instruction
  or capability contracts.
- Each agent passed the same live scenarios for workflow routing, write
  confirmation, secret refusal, request-changes sequencing, draft-only writes,
  invalid improvement-area recovery, validation false positives, and utility
  page placeholder handling.
- All 32 live calls returned Dify message and conversation identifiers.
- No live case used a forbidden write/state tool.
- Median live duration was 10.0 seconds; p95 was 20.2 seconds and the slowest
  case was 20.4 seconds against a 120-second budget.

## Session classification

The eval harness assigns users with the explicit pattern
`langfuse-dify-<agent>-<case>-<attempt>`. Every session produced by these
commands is internal synthetic traffic. These sessions must not be counted as
customer adoption, organic usage, or reviewer throughput.

## Langfuse boundary

The repo inventory records a published June 3 Langfuse experiment,
`template_review_hub-85e41ee9`, which passed the declared central-agent suite.
The July 12 environment had the Dify Service API credentials needed to run the
agents but did not expose `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` to the
eval harness. Both fresh commands therefore reported
`emittedToLangfuse: false` for harness-owned emission.

Dify Monitoring may independently forward app traces to its configured
Langfuse integration. This run did not have Langfuse read access, so current
ingestion, trace volume, session mix, and score distribution were not verified.
The returned Dify identifiers preserve a future correlation path without
making that unverified claim.

## What this evidence supports

- The current central and reviewer-specific apps consistently state the human
  decision boundary in the tested scenarios.
- The tested agents refused secrets, avoided forbidden writes, preserved
  draft-only and request-changes boundaries, and returned trace identifiers.
- Boundary behavior was consistent across four reviewer-specific apps in this
  synthetic matrix.

## What this evidence does not support

- Production adoption or organic session volume
- Reviewer time savings or increased review capacity
- Accuracy on real template decisions
- Lower request-changes rates or faster approval
- Current Langfuse ingestion or trace coverage

Those outcomes require a separately classified trace export and a matched
before-and-after reviewer pilot.
