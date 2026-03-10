# Pilot Kickoff Checklist

**Status:** Working draft  
**Audience:** Pilot owner, operators, and reviewers  
**Pilot target:** Monday, 2026-03-16

## 1. Objective

Use this checklist before opening the reviewer alpha to make sure the template review Hub lane is safe, understandable, and observable.

## 2. Pilot scope

This pilot is for `alpha-ready reviewer use`, not for broad rollout.

Pilot posture:

- small reviewer group
- human-owned final decisions
- approval-gated writes
- active capture of trust, quality, and workflow issues

## 3. Pre-pilot readiness checks

### Hub and connectivity

- `CREATE SOMETHING MCP Hub` is reachable from the reviewer lane
- downstream review tools are visible and callable
- required auth is active for Airtable and any enabled telemetry systems
- routing and policy behavior are consistent with the contracts in this pack

### Review workflow

- queue entries can be loaded
- asset and version context can be loaded
- Phase A reviewer-visible template-review-context tools are confirmed
- any analysis or originality capability not yet connected is treated as out of scope for Phase A

### Action safety

- request-change, approve, and reject actions require reviewer intent
- blocked actions are rejected with clear reasons
- manual fallback path is documented and understood
- audit and trace evidence is available for pilot review

### Reviewer readiness

- pilot reviewers are named
- reviewers have the playbook and know the alpha scope
- operators know who owns exception handling
- feedback capture location is agreed before kickoff

## 4. Minimum artifact set

Confirm the pilot group has access to:

- `delivery-package.md`
- `reviewer-playbook.md`
- `runbook.md`
- `golden-task-checks.md`
- `checklist-map.md`
- `launch-scorecard.md`
- `team-walkthrough.md`
- `reviewer-hub-policy-records.yaml`

## 5. First-day pilot flow

1. Select a small set of live or representative submissions.
2. Run the Hub lane on each submission.
3. Compare Hub findings to reviewer judgment.
4. Record timing, friction, and trust observations.
5. Route any write action through the approval-gated path only.
6. Move any uncertain or unstable submission to manual review.

## 6. What to capture during alpha

For every meaningful issue, record:

- submission or asset identifier
- what the Hub recommended
- what the reviewer decided
- whether the issue was a false positive, false negative, or missing evidence problem
- whether the problem affected trust, speed, or safety
- whether the issue belongs to data, automation, or judgment

## 7. Daily alpha review

Review this every day of alpha:

- recommendation quality
- reviewer trust
- blocked-action behavior
- write-path safety
- unresolved Airtable mapping issues
- repeated manual fallback causes

## 8. Exit criteria for week one

Week-one alpha is successful if:

- reviewers can complete real review work with the lane
- the workflow reduces effort on at least some objective checks
- no unsafe write occurs
- failures are containable through the documented fallback path
- the team has a specific hardening list for beta

## 9. Stop or narrow the pilot if

- approval-gated actions execute without clear reviewer intent
- blocked actions are not being blocked reliably
- evidence is too incomplete to support reviewer trust
- false-positive or false-negative rates create operational drag
- reviewers cannot recover quickly through the manual path
