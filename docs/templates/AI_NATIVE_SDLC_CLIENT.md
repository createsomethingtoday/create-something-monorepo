# Client delivery pilot

Copy into the client-owned repository and link from its work issue. This is a fillable onboarding checklist, not permission to activate integrations. Keep customer data and credentials out of this template.

- Client and repository:
- Work issue and originating request:
- Accountable technical owner and business acceptance owner:
- Implementation agent/session and independent reviewer/session:
- Canonical architecture, data catalog and access policy:
- Allowed local actions and target environment:
- External-write authority receipt (or explicitly unavailable):
- Production promotion authority receipt (or explicitly unavailable):
- Risk, exclusions, privacy and retention requirements:
- Secret manager and client account owner (no secret values):
- Boot, smoke, test and product-review commands:
- Evidence storage and retention owner:
- Rollback procedure and recovery owner:
- Baseline window and matched cohort definition:
- Feature, bug and maintenance work issues:
- Four-week start/end dates and weekly review owner:
- Week-four decision and supporting receipts:

For each work issue, initialize the change record with `node scripts/change-evidence/cli.mjs init RECORD.json`. Set issue, request, repository, owner, builder, scope, acceptance, policy and permitted actions before work. Record the exact tested commit; finish implementation before writing its evidence record. For an uncommitted prototype, do not claim evaluated-commit evidence: commit the scoped implementation first or retain the prototype outside the validated handoff.

Collect human review minutes, rework minutes, escaped defects over a stated observation window, request-to-verified-release hours and total delivery cost (human plus model/compute, with currency and costing assumptions). Each metric needs baseline/observation period, sample size, cohort, collection window, source and limits. Unavailable values are null with a reason. Never substitute test counts for business outcomes.

Week-four acceptance: another operator can initialize, validate and read a record; at least one real feature, bug and maintenance change has evidence for each participating repository; every promotion has independent review and exact-artifact proof; sampled production changes have post-release observation; unknown metrics and unmatched cohorts are explicit. Continue only if the owner accepts the measured quality/cost tradeoff. Revise when evidence is incomplete or operator burden is unacceptable; stop on unresolved permission or data-isolation violations. No universal speedup target is assumed.

Map establishes this contract and baseline. Build implements the bounded changes and checks. Control maintains evaluations, handles authorized incidents and reviews results. For AI-containing products, attach task-success, grounding, permission, escalation, adversarial-input, latency and cost evaluations in addition to ordinary tests.
