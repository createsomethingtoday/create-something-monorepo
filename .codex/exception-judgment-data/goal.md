# Shared judgment contract correction — CRE-2061

## Authorized milestone
On 2026-09-22 the user invoked ultragoal to complete the corrections recommended by
the full TypeSafe documentation review. Deliver the corrected reusable contracts,
offline CLI and regression evidence in PR 1748. This technical milestone has an
available deterministic verifier and can be activated independently. The original
exception-review effectiveness outcome is preserved in [business-goal.md](business-goal.md)
and is not satisfied or waived by completing this milestone.

Baseline: PR 1748 at aec8afcb6; v1 integrity/exception-only replay passes 195 package tests.
The docs review identifies information loss, inference/policy coupling and incomplete
request compilation. Existing checkout is clean; root and other active worktrees remain
untouched. Runtime goal preflight found no active goal. Node 22 and pnpm work locally.

## Execution contract
- Outcome: preserve full Noul/Choice/Score questions and responses; immutable evidence,
  question sets and inference runs; independent versioned policy decisions; explicit
  development-label provenance and unchanged strict business-effectiveness gate.
- Primary verifier: fresh-process CLI on complete published-API-shaped fixtures:
  capture -> compile -> record -> decide -> replay. Raw outputs round-trip losslessly;
  changing only decision policy produces a new decision with the same inference ID
  and no provider invocation. Tampering, mismatched versions/types/options/legends,
  missing answers/usage, leakage and invalid input fail closed.
- Supporting checks: TypeScript build/typecheck, full package suite, official docs
  conformance review and independent artifact digest/composition audit. Synthetic
  fixtures prove software behavior only; no model accuracy or live-call claims.
- Verification surface: Node library and actual filesystem CLI on this machine,
  plus remote PR readback. No UI or live provider execution is required for this
  offline contract milestone; no new provider client is introduced.
- Authorization: user-approved shared-contract corrections, tests, docs, Linear,
  isolated commits/push and existing PR update. Preserve owning merge gates; inspect
  CI failures and do not bypass them. No production source-system writes, cron
  activation, messages, purchases or changes to exception decision authority.
- Resources: existing workspace tools and repository access. No numerical budget
  supplied. No paid inference needed.
- Completion: corrections implemented and verified, review findings dispositioned,
  durable evidence pushed and PR ready for review with CI state accurately recorded.
  No claim of merged/deployed business adoption. Effectiveness remains separately open.
- Recovery: update plan/evidence after phase exits. Record external mutation targets
  and read back push/PR state. After two same failures revisit the hypothesis before
  retrying. Resume from plan; preserve v1 evidence and compatibility where useful.
- Blockers: lost repository/tool access or required external review; record exact
  missing permission/evidence. Apply runtime three-turn blocker rule only if truly
  unable to progress. Reviewer-label absence is not a blocker for this milestone.

Plan: [plan.md](plan.md). Worktree: /private/tmp/cre-2061-judgment-data.
