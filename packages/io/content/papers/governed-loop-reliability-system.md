---
title: 'From Agents to Governed Loops'
subtitle: 'Reliability infrastructure for delegated work control'
authors: ['CREATE SOMETHING']
category: 'Research'
abstract: 'CREATE SOMETHING does not make production work dependable by adding agents alone. Reliability comes from a governed loop: durable state, explicit policy, isolated execution, focused validation, eval evidence, proof receipts, and a next decision. This paper codifies that reliability system and defines the first experiment for testing whether loop-backed agent work outperforms prompt-only agent execution on verified completion, scope control, and safety behavior.'
keywords:
  [
    'Governed Loops',
    'Delegated Work Control',
    'Policy OS',
    'Agent Reliability',
    'Eval Evidence',
    'Proof Surface',
    'Linear',
    'Worktrees',
    'Three-Tier Framework'
  ]
publishedAt: '2026-07-06'
readingTime: 14
difficulty: 'intermediate'
published: true
---

## Executive Thesis

The reliable unit is not the agent.

The reliable unit is the governed loop around the agent.

An agent can write code, call tools, inspect logs, summarize traces, or draft a
release note. Those abilities are useful, but they are not enough for production
work. Production work needs a system that can answer:

1. What state did the worker read?
2. Which policy bounded the action?
3. Where did the execution happen?
4. Which checks proved the result?
5. What evidence survived the session?
6. What should happen next?

CREATE SOMETHING already has the pieces of that system. Linear owns tracked
work and evidence. Worktrees isolate execution. Package legibility contracts
tell workers where to start and how to smoke test. Policy artifacts define
approval and stop boundaries. Eval runners test tool use and forbidden actions.
Proof receipts make the result readable after chat ends.

The point of this paper is to codify those pieces as one reliability system,
then define an experiment that can falsify or strengthen the claim.

## The Reliability Claim

CREATE SOMETHING's claim is not:

> Agents make software delivery reliable.

The claim is:

> Delegated work becomes production-capable when agents, automations, and
> humans operate inside loops with durable state, explicit policy, isolated
> execution, focused validation, eval evidence, proof receipts, and a next
> decision.

This distinction matters because agent-only narratives overfit to the worker.
They ask whether the model can complete a task. Governed-loop narratives ask
whether the system can produce a validated change that can be reviewed,
resumed, rolled back, or safely stopped.

That is the difference between a clever assistant and a production operating
surface.

## The Seven-Part Loop

The current CREATE SOMETHING loop model has seven parts:

| Part          | Reliability question                      | Example surface                       |
| ------------- | ----------------------------------------- | ------------------------------------- |
| Signal        | What changed or needs attention?          | Linear, tests, logs, docs drift       |
| Context       | What must the worker read first?          | `AGENTS.md`, package docs, issue body |
| Policy        | What boundaries control the work?         | versioned policies, intent packet     |
| Executor      | Who or what performs the work?            | Codex, Symphony, script, human        |
| Verification  | How do we know it worked?                 | checks, smokes, evals, screenshots    |
| Proof         | Where does evidence persist?              | Linear comment, PR body, receipt      |
| Next decision | Continue, split, promote, block, or stop? | review state, release gate            |

If any part is missing, the work can still be useful. It is just not a governed
loop yet.

The strongest current examples are intentionally boring:

- `pnpm agent:solo-loop:check` verifies that the local solo-agent lane can read
  the expected control files and run legibility, policy, and unit checks.
- `pnpm agent:skills:test` verifies that repo-owned skills retain their
  behavioral contracts.
- `pnpm thesis:evidence:check` verifies that thesis claims still cite current
  repo artifacts.
- `pnpm policy:artifacts:check` verifies policy markdown and JSON pairs.
- `pnpm braintrust:eval:mcp:list` verifies that MCP eval cases are discoverable
  without sending logs.

These commands do not make agents smarter. They make the work inspectable.

## Three-Tier Failure Localization

The reliability system follows the Database / Automation / Judgment ontology.

### Database

Database is the durable state the loop reads and updates:

- Linear issue state, labels, assignment, comments, and evidence
- git branches, worktree paths, base refs, and diffs
- package metadata, README files, and package-local `AGENTS.md`
- thesis claims, policy artifacts, eval cases, receipts, and generated reports

The database question is:

> Did the loop read the right source of truth?

If Linear has no eligible issue, a worker should not invent one. If package
metadata points at the wrong entrypoint, the fix belongs in the metadata or
README before a worker is expected to guess.

### Automation

Automation is the repeatable execution path:

- worktree creation
- agent or script dispatch
- package checks
- eval runners
- smoke scripts
- generated reports

The automation question is:

> Did the path run, and can it run again?

This is why the repo prefers explicit commands over informal confidence. A
worker should be able to show which command proved which part of the result.

### Judgment

Judgment is the policy boundary:

- whether the task should be solo, Linear-tracked, PR-bound, or release-bound
- whether a production deploy is allowed
- whether a write action requires a named owner
- whether evidence is strong enough to close the issue
- whether the next decision is continue, split, hold, or stop

The judgment question is:

> Did the loop apply the right policy to the observed evidence?

This is where a governed loop differs from a cron job. A cron job repeats.
A governed loop repeats inside an authority boundary.

## What The Repo Already Proves

The repo already contains a reliability substrate:

| Surface                                            | Role                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| `AGENTS.md`                                        | repo workflow, Linear source of truth, worktree and production boundaries |
| `docs/CREATE_SOMETHING_SYSTEMS_THESIS.md`          | canonical systems thesis                                                  |
| `docs/thesis/claims.yaml`                          | machine-checkable thesis claim map                                        |
| `docs/guides/LOOPS_ABOVE_AGENTS.md`                | loop model and promotion ladder                                           |
| `docs/guides/CODING_AGENT_HARNESS_PATTERN.md`      | tracked work, isolation, validation, review, escalation                   |
| `docs/guides/AGENT_LEGIBILITY_CONTRACT.md`         | package boot, smoke, evidence, and escalation contract                    |
| `docs/policies/v1`                                 | versioned policy artifacts                                                |
| `scripts/test/agent-skills-effectiveness.test.mjs` | behavioral tests for repo-owned skills                                    |
| `evals/promptfoo/hub`                              | hub prompt and tool-routing evals                                         |
| `evals/braintrust/mcp`                             | MCP contract and tool-use eval cases                                      |
| `evals/braintrust/dify`                            | Dify agent workflow eval cases                                            |

The evidence is not evenly complete. The thesis evidence map still marks proof
and Atlas interface claims as partial. That is a useful weakness. It means the
repo has a living claim system rather than a marketing document that calls every
claim done.

## The Experiment

The first experiment should test the loop, not the model.

### Research Question

Does a CREATE SOMETHING loop-backed agent process improve verified completion
quality, evidence completeness, and safety behavior compared with prompt-only
agent execution?

### Treatment A: Prompt-Only Agent Execution

The baseline worker receives the task prompt and normal repo access.

It does not receive a required intent packet, required policy artifact list,
required verification plan, or required receipt shape. The worker may still do
good work. The experiment asks whether the surrounding system changes the
result.

### Treatment B: Governed Loop Execution

The loop-backed worker receives the same task plus:

- intent packet
- Database / Automation / Judgment classification
- named source-of-truth artifacts
- explicit policy boundaries
- expected verification commands
- stop conditions
- receipt schema

The worker is evaluated on the output and on the evidence it leaves behind.

### Task Set

Use low-risk repo tasks before testing production-bound work:

- docs-only thesis or evidence update
- package legibility contract repair
- policy artifact validation fix
- MCP registry coverage drift repair
- eval harness list or report improvement
- skill behavioral fixture update
- trust catalog evidence refresh

Each task must have predeclared acceptance criteria and a verifier that can run
without production credentials.

### Metrics

Primary metrics:

- verified completion rate
- evidence completeness
- unrelated file changes
- unsupported claims
- destructive or third-party boundary violations
- reviewer rework rate
- elapsed time and command count

Secondary metrics:

- whether another worker can resume from the receipt
- whether failure localizes to Database, Automation, or Judgment
- whether reruns produce consistent outcomes
- whether the loop adds useful overhead or just ceremony

### Stop Conditions

Stop the experiment when:

- a task would require production, credentials, or third-party mutation
- the verifier cannot prove the acceptance criteria
- the claim cannot be falsified
- the worker widens scope beyond the named task class
- the cost of the loop exceeds its evidence value for low-risk work

Those stop conditions are part of the experiment. A system that stops with a
reason is more trustworthy than a system that completes the wrong work.

## What Would Falsify The Claim

The governed-loop thesis should remain falsifiable.

The claim weakens if:

- prompt-only workers complete the same tasks with equal verification, evidence,
  and safety behavior
- loop receipts do not improve review, handoff, or resume quality
- policy artifacts are cited but do not affect decisions
- eval outputs stay disconnected from publish, hold, rollback, or promotion
  decisions
- loop overhead blocks small work without reducing rework or risk

The goal is not to prove that every task needs maximum process. The goal is to
find which reliability surfaces measurably improve delegated work and which can
stay lightweight.

## Publication Boundary

This paper is a codification artifact, not a production approval.

Publishing a paper or experiment still needs the paper-cycle gate:

- one Linear issue
- one branch and PR
- required quality checks
- review pass 1
- review pass 2
- human `publish-approved` label before production promotion
- post-deploy verification

That boundary matters because the paper itself is part of the reliability
system. The argument should be shipped through the same proof discipline it
recommends.

## Conclusion

Agents are replaceable executors.

Loops are the durable product surface.

CREATE SOMETHING's reliability system is the combination of durable state,
explicit policy, isolated execution, focused validation, eval evidence, proof
receipts, and next decisions. That system is already present in the repo. The
next step is to measure it directly against prompt-only execution and let the
evidence decide which loops deserve more authority.
