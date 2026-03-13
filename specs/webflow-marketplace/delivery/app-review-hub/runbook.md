# Workflow Runbook

**Status:** Working draft  
**Client:** `Webflow Marketplace team`  
**Workflow:** `app_review_hub_lane`  
**Primary owner:** `Marketplace review lead`

## 1. Purpose

This runbook defines how operators and reviewers monitor, intervene in, and recover the app review Hub lane safely.

Use it for:

- reviewer approvals and state changes
- exception response
- blocked-action review
- fallback/manual execution
- rollback and containment

## 2. Workflow summary

- business objective: reduce queue friction and improve consistency for app review without removing reviewer ownership of final decisions
- workflow boundary: starts when an app enters the review queue and ends when the reviewer validates the evidence and records the decision
- systems in scope:
  - `CREATE SOMETHING MCP Hub`
  - `Airtable Marketplace Assets`
  - `webflow-app-review-mcp`
- policy boundary:
  - auto-allow: reads, queue context, field-map lookup, recommendation drafting, feedback refinement
  - approval-required: reviewer-owned workflow writes (`assign_self`, `unassign_self`, `save_draft_feedback`, `set_review_status`, `request_changes`, `approve_version`, `reject_version`), broader version review state changes, broad asset metadata edits, Marketplace status changes
  - block: creator-facing sends, reviewer-lane control-plane actions

## 3. Roles

- workflow owner: `Marketplace review lead`
- technical owner: `Senior Systems Architect`
- approval owner: `Assigned reviewer`
- fallback owner: `Marketplace review lead`

## 4. Normal operating procedure

### Auto-allow path

1. reviewer opens the app review lane
2. lane loads queue, asset, version, and field-map context
3. lane drafts recommendation or feedback when requested
4. reviewer validates before taking any state-changing action

### Approval-required path

1. reviewer decides to assign themselves, save draft feedback, move review status, request changes, approve, reject, update version review state, or change Marketplace status
2. action is treated as explicit reviewer-owned state change
3. Hub executes the write path only after reviewer intent is clear
4. audit event is written

### Block path

1. prohibited or out-of-scope action is requested or inferred
2. Hub blocks the action with explicit reason
3. reviewer or operator decides whether manual handling is needed

## 5. Exception handling

### Source-state mismatch or missing evidence

- signal: queue state, asset state, or version state do not support a confident recommendation
- operator action:
  1. stop workflow execution at the affected step
  2. verify Airtable manually
  3. continue in manual review mode if needed
- exit condition: evidence is restored or reviewer completes the decision manually

### Reviewer identity ambiguity

- signal: the runtime cannot prove which reviewer initiated the action
- operator action:
  1. do not execute the write path
  2. revert the reviewer lane to read-only mode
  3. complete the update manually in Airtable if required
  4. route the issue to the Senior Systems Architect for hardening
- exit condition: reviewer identity is cleanly attributable again

### Tool or auth failure

- signal: downstream read or write tool fails, auth expires, or the lane cannot load current state
- operator action:
  1. determine whether failure is transient
  2. retry only if policy allows and the action is safe to repeat
  3. move to manual path if confidence or availability does not recover quickly
- exit condition: workflow completes safely or manual path completes

### Reviewer trust failure

- signal: reviewer believes recommendation quality is too noisy or misleading to use
- operator action:
  1. stop relying on the recommendation for that submission
  2. capture false-positive or false-negative details
  3. continue manually
  4. review the issue during pilot tuning
- exit condition: submission completes and the quality issue is logged for pilot review

## 6. Manual fallback

When the workflow cannot proceed safely:

1. stop the automated path
2. open the submission manually in Airtable
3. complete the review using normal Marketplace review procedure
4. record the failure mode or ambiguity
5. send the issue to the pilot owner for follow-up

Fallback success condition:

- no unsafe write is executed
- no reviewer decision is lost
- the app review still completes

## 7. Rollback and containment

Use rollback or containment when:

- blocked actions are not being blocked
- approval-required actions execute without clear reviewer identity
- audit fields are missing
- recommendation quality is degraded enough to create operational risk

Immediate containment options:

1. disable write paths in the reviewer lane
2. switch the lane to read-only evidence mode
3. route all state changes to manual Airtable handling
4. stop the reviewer lane entirely

Recovery steps:

1. identify root cause
2. confirm safe operating state
3. reconcile affected submissions if needed
4. rerun write-gate checks before re-enable

## 8. Observability and evidence

Required evidence sources:

- Hub trace records
- `cs-telemetry`
- Airtable update history
- reviewer notes from pilot

Required review cadence:

- daily during alpha and beta
- weekly after stabilization unless incident rate increases

## 9. Escalation matrix

- policy ambiguity: `Senior Systems Architect`
- technical failure: `Senior Systems Architect`
- workflow exception: `Marketplace review lead`
- customer-impacting incident: `Marketplace review lead`

## 10. Change management

Any change to the workflow must update:

- `reviewer-hub-rollout-spec.md`
- `reviewer-hub-runtime-posture.md`
- `reviewer-hub-policy-records.yaml`
- `reviewer-playbook.md`
- this runbook

No broader rollout change is complete until the documentation and release checks are updated together.
