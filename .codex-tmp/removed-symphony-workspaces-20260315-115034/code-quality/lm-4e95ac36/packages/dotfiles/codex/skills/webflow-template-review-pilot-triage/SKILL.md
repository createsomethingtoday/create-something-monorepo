---
name: webflow-template-review-pilot-triage
description: Triage pilot exceptions for the Webflow Template Review Hub, including missing reviewer identity, evidence gaps, auth or tool failures, blocked-action surprises, and trust failures, with exact manual fallback behavior.
---

# Webflow Template Review Pilot Triage

Use this skill for pilot incidents or uncertainty during reviewer-lane use.

## Goal

Contain risk quickly, preserve reviewer ownership, and leave a clear audit trail for tuning.

## Default Triage Order

1. Database: confirm queue state, asset state, version state, and evidence availability.
2. Automation: confirm the Hub can discover and execute the intended tool.
3. Judgment: confirm the workflow stayed inside current reviewer policy.

## Known Failure Modes

### Missing reviewer identity

- stop self-assignment or write actions immediately
- do not work around identity by typing reviewer names into prompts
- continue only through manual Airtable handling if work must proceed

### Missing or conflicting evidence

- stop treating the recommendation as trustworthy
- inspect Airtable, preview, and published URLs manually
- continue the submission in manual review mode if evidence does not recover quickly

### Auth or tool failure

- determine whether the failure is transient
- retry only when the action is safe and idempotent
- otherwise move to manual fallback

### Blocked-action surprise

- if a blocked action executes, treat it as a stop condition
- if a legitimate action is blocked, capture the exact policy mismatch and use the manual path

### Reviewer trust failure

- stop relying on the recommendation for that submission
- capture false positive or false negative details
- complete the submission manually

## Manual Fallback

When safe automation is not available:

1. stop the automated path
2. open the submission in Airtable and Webflow
3. complete the review manually
4. record the failure mode or ambiguity for pilot review

Fallback is successful only when:

- no unsafe write occurs
- no reviewer decision is lost
- the review still completes

## Issue Capture

Capture these details for pilot tuning:

- submission or version involved
- expected action
- actual behavior
- evidence or trace link
- whether the issue was false positive, false negative, policy mismatch, or availability failure

Use [runbook.md](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/specs/webflow-marketplace/delivery/template-review-hub/runbook.md) and [golden-task-checks.md](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/specs/webflow-marketplace/delivery/template-review-hub/golden-task-checks.md) as the escalation source of truth.
