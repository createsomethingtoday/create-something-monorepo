---
name: cs-retro
description: Review a completed coding session, issue, or pull request when asked for a retrospective or when repeated review feedback warrants investigating what future agents could learn from the repository.
---

# CREATE SOMETHING retrospective

Start with the named work, or the current session if the reference is clear. Read the actual review comments, corrections, and affected revisions. Use cs-context for bounded history when the record is incomplete. Keep customer data, credentials, and private transcript excerpts out of the report.

Group findings by the behavior that went wrong. For a recurring problem, cite distinct occurrences and check whether they share a cause. Inspect the relevant examples, instructions, tests, and check wiring at the reviewed revision. Distinguish what was available from what the transcript shows the agent actually used. Read the fix and current source before proposing more work.

Rank the few improvements that would change a future decision. For each, give the observed failure and its evidence, the supported cause or remaining uncertainty, the owning file or check, and a concrete verification step. Prefer wiring an existing check when it already detects the problem. A repeatable failure may justify a regression test; a genuine judgment call may warrant a local example. Say when a later fix already covers the case or the evidence supports only a one-off correction.

Deliver recommendations within the requested scope. A retrospective alone authorizes analysis. Implement changes or publish findings only when the user has authorized that action.
