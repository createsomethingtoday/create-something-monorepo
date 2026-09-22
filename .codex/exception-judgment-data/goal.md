# Exception judgment data — CRE-2061

## Outcome and baseline
Make exception-review evidence, applicable constraints, raw semantic judgments, policy results and independently reviewed outcomes durable and replayable in Database Layer. Prove the pilot on independently reviewed, pre-decision held-out cases before claiming effectiveness or activating production decisions.

Baseline: root checkout is dirty and preserved. Isolated branch codex/cre-2061-judgment-data starts at ef21ef3338a3f27264db4d0e33dff8955b07ec26. CRE-2022 / PR 1687 contains unmerged provider work. CRE-2060 owns a separate URL-classification production pilot. CRE-2057 confirms proxy-only labels and no certified historical inputs; its temporary worktree is missing. Historical receipts are documented in Linear but not reconstructed as original evidence.

## Execution contract
- Linear: CRE-2061. Lane: claim-worktree; offline foundation and review-ready PR while effectiveness is blocked. Tier: mixed.
- Database owns versioned evidence, questions, policies, judgment receipts and separately stored review outcomes. Automation assembles only eligible evidence and replays policy. Judgment owns applicability, abstention and human review; no automated approval authority.
- Primary verifier: independent, attributed human labels over certified pre-decision evidence, separated by creator/app group into development and held-out sets; freeze policy/questions before held-out inference. Compare baseline and Jev on exactly the same cases. Report all disagreements, unsupported recommendations, required escalations, coverage, latency and observed review time. Workflow owner must set acceptance thresholds before evaluation. No proxy or synthetic result counts as business proof.
- Supporting verifier: fresh-process CLI replay and negative tests for tampering, missing evidence, source identity conflicts, unknown applicability, missing responses, label leakage, changed policy/questions, duplicate IDs and provider failure.
- Authorization: local implementation, tests, Linear tracking, isolated branch, push and review PR. No source-system writes, creator messages, cron activation, production exception decisions or new purchases. No numerical resource budget was supplied.
- Non-goals: Datasette deployment, replacing authoritative sources, duplicating PR 1687, using model confidence as authority, broad integration into every business workflow.
- Repair: inspect failed check, change one cause, rerun and preserve evidence. After two unchanged failures revisit assumptions and verifier. Reconcile uncertain external mutations before retrying.
- Completion proof: implemented and reviewed foundation, reproducible integrity/replay evidence, independent held-out comparison and business acceptance. Source tests alone do not satisfy completion.
- Blocker: independent reviewer labels and certified evidence cutoffs are unavailable. Owner: Micah plus the App Review policy owner. Smallest unblock: adjudicated eligible cases with reviewer attribution, exact policy, pre-decision evidence and split groups, plus frozen acceptance thresholds.
- Runtime: activation deferred under ultragoal preflight; no active runtime goal. Safe preparation continues. Do not claim automatic continuation.

Plan: [plan.md](plan.md).
