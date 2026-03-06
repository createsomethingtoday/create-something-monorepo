# policy.paper-experiment-release-gate.v1

- Status: `draft`
- Owner: `CREATE SOMETHING publication operations`
- Effective date: `TBD`

## Purpose

Define the release gate for `.io` papers, `.io` experiments, and related policy artifacts so promotion is driven by explicit evidence and human approval rather than activity heuristics.

## Scope

- `.io` paper publication
- `.io` experiment publication
- Policy review artifacts that govern the publication cycle
- Preview, production, verification, and rollback gates

## Artifact Classes

- `paper`
- `experiment`
- `policy`

## Policy Statements

1. Loom MUST remain the source of truth for work selection and task state.
2. One Loom task MUST map to one branch and one PR for publication work.
3. Review state MUST be represented with labels, not by inventing extra policy lifecycle states.
4. `.io` publication work MUST complete two review passes before human approval.
5. Production publication MUST require a human-applied `publish-approved` label before merge to `main`.
6. Preview deployment MAY occur for `paper` and `experiment` artifacts after draft PR creation and quality checks pass.
7. `policy` artifacts MUST remain `draft` until promoted under `policy.policy-lifecycle-governance.v1`; policy-only changes MUST NOT auto-publish to production while still `draft`.
8. Commit count MUST NOT be used as a deploy trigger, review trigger, or promotion trigger.
9. Post-deploy verification MUST confirm the published route is reachable or create a follow-up incident.
10. Rollback MUST remain human-controlled and MUST capture rationale plus incident reference.

## Review Labels

- `paper-cycle`
- `experiment-cycle`
- `policy-cycle`
- `ready-review-1`
- `ready-review-2`
- `publish-approved`
- `deployed`

## Preview Eligibility

Required:

- cycle label present on Loom task / PR
- draft PR exists
- required quality checks pass
- artifact class is `paper` or `experiment`

Blocked when:

- artifact class is `policy` and no corresponding publication route exists
- repo state is dirty or branch/PR ownership is ambiguous
- commit count is the only justification for running

## Production Eligibility

Required:

- Review 1 complete
- Review 2 complete
- human applied `publish-approved`
- merge to `main`
- post-merge deploy path is defined

Blocked when:

- PR is still draft
- required evidence is missing
- policy artifact remains `draft` and is being treated as a production publication
- change entered `main` outside the approved PR path

## Required Evidence

- Loom task ID
- PR URL
- Review 1 report
- Review 2 release summary
- Post-deploy verification summary

## Operational Notes

- Policy-only runs MAY exercise the lifecycle end-to-end to validate governance, CI, and approval wiring without creating publishable `.io` routes.
- Those runs still require Review 1, Review 2, human `publish-approved`, and merge through the approved PR path.
- Policy-only runs MUST NOT create a production route deployment expectation while the governing policy artifact remains `draft`.

## Rollback Authority

- Human reviewer
- Operator
- Admin

## Evidence

- PR history with label transitions
- Loom task history and linked branch/PR
- CI logs for preview, approval gate, and post-deploy verification
- Rollback record with rationale and incident reference

## Source Anchors

- `STANDARDS.md`
- `docs/policies/v1/policy.policy-lifecycle-governance.v1.md`
- `packages/agent-sdk/agents/paper_agent.py`
- `.github/workflows/io-paper-cycle-preview.yml`
- `.github/workflows/io-paper-cycle-post-merge.yml`
