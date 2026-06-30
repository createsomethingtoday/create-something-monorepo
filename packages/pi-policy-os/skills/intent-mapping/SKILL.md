---
name: intent-mapping
description: Intent mapping for ambiguous, long-running, shared, or production-bound work. Use when the user wants to clarify a plan, scope a goal, prepare Linear work, or resolve decisions before implementation.
---

# Intent Mapping

Use this skill to turn fuzzy intent into a durable execution packet before work
starts. The goal is shared understanding, not a planning ceremony.

Intent mapping is the CREATE SOMETHING adaptation of a relentless interview:
ask one useful question, recommend the likely answer, then wait. Continue until
the open decisions are resolved enough to choose the correct workflow lane.

## Repo Rules

- Read `AGENTS.md`, package-local `AGENTS.md`, relevant README files, and nearby
  tests or docs before asking questions that the repo can answer.
- Use Linear for shared, delegated, long-running, production-bound, or
  evidence-bearing work.
- Use `pnpm agent:solo-loop` for solo current-checkout exploration.
- Use `pnpm agent:claim-worktree -- --issue CRE-123` for isolated
  implementation work that needs a durable handoff.
- Do not create Loom tasks, local issue files, GitHub issues, or a second
  tracker for this workflow.

## Question Loop

Ask one question at a time. Multiple questions at once hide dependencies between
decisions and make it harder for the user to correct the path.

Each question must include:

- the decision being resolved
- your recommended answer
- why that recommendation fits the repo, product, or workflow
- what the answer will change about implementation, validation, or handoff

If the answer can be discovered from the codebase, docs, Linear issue, browser
state, logs, or another owning truth surface, inspect that source instead of
asking the user.

Prefer concrete choices over abstract discussion. Good questions ask for a
decision that changes the work.

## Tier Mapping

Classify the work before recommending a lane:

| Tier           | Intent question                                                 | Useful evidence                                      |
| -------------- | --------------------------------------------------------------- | ---------------------------------------------------- |
| **Database**   | What state, resource, artifact, or source of truth must change? | schema, fixture, API response, config, policy doc    |
| **Automation** | What execution path, tool, worker, route, or command must run?  | test, CLI, smoke, workflow log, browser proof        |
| **Judgment**   | What policy, approval, fallback, or operator decision applies?  | Linear evidence, approval note, policy artifact, ADR |

If the work crosses tiers, keep the tier ownership explicit in the packet.

## Intent Packet

Stop asking once you can produce this packet without guessing:

```text
Linear: <CRE-123, create one, or none>
Lane: <solo-loop | claim-worktree | PR/promotion | research/no-edit>
Tier: <Database | Automation | Judgment | mixed>
Goal: <one concrete outcome>
Decisions:
- <decision and chosen answer>
Non-goals:
- <explicitly excluded work>
Acceptance criteria:
- <observable done condition>
Verification:
- <commands, smoke checks, browser checks, or external truth surfaces>
Stop conditions:
- <when to pause, ask, or escalate>
Policy artifacts:
- <AGENTS.md, policy docs, runbooks, issue links, approval requirements>
Evidence target:
- <Linear comment, PR body, deploy note, local summary, or none>
```

For Linear-tracked work, include the packet in the issue description or a Linear
comment before implementation starts. For solo-loop work, include the packet in
the starter prompt or first agent message.

## Completion Bar

Intent mapping is complete only when:

- every open decision that affects implementation, validation, or handoff has a
  chosen answer or an explicit stop condition
- the correct lane is selected
- the verification surface is named
- production, deploy, merge, credential, and third-party mutation boundaries are
  explicit
- the user has had a chance to correct the packet before implementation begins
