---
name: webflow-template-review-write-guardrails
description: Guard reviewer-owned write actions in the Webflow Template Review Hub by enforcing reviewer ownership, trace requirements, blocked ambiguity, and manual Airtable/Admin fallback.
---

# Webflow Template Review Write Guardrails

Use this skill only when reviewer write actions are explicitly enabled for the current reviewer Hub.

If write posture is read-only, or if enablement is ambiguous, stop and use manual Airtable fallback.

## Allowed Write Surface

Only these narrow verbs belong in the reviewer lane:

- `template_review_request_changes`
- `template_review_approve_version`
- `template_review_reject_version`
- `template_review_complete_publishing`
- `template_review_set_price`
- `template_review_bulk_set_price`

Do not substitute broad mutation tools such as `template_review_update_version_review`.

## Preconditions

Before any write:

- reviewer identity must be resolved by session, not prompt text
- review-state writes must target a version assigned to the current reviewer
- price-handoff writes must resolve the asset or template names unambiguously
- the action must be explicitly reviewer-owned
- field mapping and release resolution must be unambiguous

If any precondition fails, fail closed.

## Action Rules

`request_changes`

- require `version_id`
- require non-empty `review_feedback`
- include `improvement_areas` only when the reviewer intends them

`approve_version`

- require reviewer ownership
- keep publishing metadata narrow and explicit
- stop if release mapping is uncertain

`reject_version`

- require reviewer ownership
- require non-empty `reject_reason`
- require non-empty `rejection_feedback`

`complete_publishing`

- require reviewer ownership
- require clean release resolution
- treat ambiguous release selection as a stop condition

`set_price`

- require explicit asset selection or clean asset resolution
- require a whole-number USD target
- return `publishing_context.mrp_id` for the Admin handoff

`bulk_set_price`

- require a list of template names and one target price
- stop for ambiguous or not-found template rows instead of guessing
- return the `admin_handoff` list so Admin can finish the Marketplace update

## Trace Requirements

Do not trust a write path unless traces preserve:

- `correlation_id`
- reviewer identity
- `asset_id`
- `version_id`
- decision or policy class
- downstream tool identity

If traces cannot attribute the write cleanly, keep the Hub read-only.

## Stop Conditions

Stop and route to manual fallback when:

- actor context is missing
- assignment ownership does not match
- unsupported fields may be silently dropped
- policy state is unclear
- a blocked action unexpectedly executes

Use [reviewer-hub-runtime-posture.md](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/specs/webflow-marketplace/delivery/template-review-hub/reviewer-hub-runtime-posture.md), [reviewer-hub-rollout-spec.md](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/specs/webflow-marketplace/delivery/template-review-hub/reviewer-hub-rollout-spec.md), and [reviewer-hub-implementation-checklist.md](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/specs/webflow-marketplace/delivery/template-review-hub/reviewer-hub-implementation-checklist.md) as the control documents.
