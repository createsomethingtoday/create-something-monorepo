# Reviewer Playbook

**Status:** Working draft  
**Audience:** Webflow Marketplace reviewers  
**Workflow:** Template review Hub lane

## Purpose

This playbook explains how reviewers should use the MCP Hub during template review.

The Hub is there to accelerate objective review work and improve consistency. It does not replace reviewer judgment.

## What the Hub is for

Use the Hub to:

- load queue, asset, and version context quickly
- run objective checks across preview and published URLs
- inspect evidence for pass/fail/manual checklist items
- review analyzer evidence, and any explicitly exposed originality signals, without overstating confidence
- draft clearer creator feedback
- handle Marketplace price-change requests through the Set Price workflow and Admin handoff

The current reviewer Hub baseline is remote-only. Do not expect `webflow-local` to appear in reviewer discovery.

Do not use the Hub to:

- let it make the final decision for you
- send creator-facing communication without review
- treat low-confidence findings as if they are settled facts

## Standard reviewer flow

1. Open the submission in the Hub review lane.
2. Confirm queue, asset, and version context.
3. Run the template review analysis.
4. Read the findings in three groups:
   - `pass`: objective items that appear satisfied
   - `fail`: objective items with evidence of non-compliance
   - `manual`: items that still require reviewer judgment
5. Validate the evidence for any important fail or partial finding.
6. Add subjective review judgment outside the system's objective recommendation.
7. Edit the draft feedback if needed.
8. Choose the final reviewer action: request changes, approve, reject, or continue manual review.

## How to read findings

### `Auto`

These are the strongest objective findings.

Reviewer expectation:

- validate quickly
- trust the evidence unless it is obviously wrong
- use it to save time on repeatable checks

### `Partial`

These findings are useful signals, but not complete decisions.

Reviewer expectation:

- inspect the evidence more closely
- decide whether the issue is real, incomplete, or acceptable
- do not treat partial coverage as automatic failure by itself

### `Manual`

These items are intentionally still human-owned.

Reviewer expectation:

- use the Hub for context if helpful
- make the decision yourself

## When to trust the Hub

Trust the Hub most when:

- the issue is deterministic
- evidence is direct and specific
- the same finding is consistent across multiple tools or views

Trust it less when:

- the finding depends on design quality or taste
- the recommendation is low confidence
- the evidence appears incomplete
- the tool cannot fully see the required part of the system

## When to override the Hub

Override the recommendation when:

- evidence is wrong or misleading
- the issue is technically present but not reviewer-relevant
- a partial signal is being overstated
- the system missed important context you can see manually

If you override, note why during pilot so the workflow can improve.

## Write actions

These actions remain reviewer-owned:

- request changes
- approve version
- reject version
- complete publishing updates
- set or batch-update the asset-side `Set Price` field before the Admin Marketplace follow-up

Treat every write action as a deliberate reviewer action, not an automatic follow-through from the recommendation.

## Price change workflow

When a reviewer or operator needs to change template pricing:

1. Start with the Hub workflow/playbook guidance so the lane uses the price-update flow rather than ad hoc search/edit steps.
2. If one template needs a new price, use `template_review_set_price`.
3. If multiple template names all need the same price, use `template_review_bulk_set_price`.
4. Capture the returned `publishing_context.mrp_id` or `admin_handoff` rows and use those IDs to complete the matching Admin Marketplace update.
5. Treat unresolved names, ambiguous matches, or missing `mrp_id` values as a stop condition that requires manual lookup before Admin changes proceed.

Expected reviewer behavior:

- confirm the target template names and the whole-number USD value
- prefer the batch path when the request is “many templates, one target price”
- return the MRP handoff details with the result instead of making the reviewer re-search the catalog

## Escalate instead of improvising when

- field mappings or write behavior seem wrong
- the recommendation is too uncertain to trust
- preview or published evidence is missing
- the Hub blocks an action you expected to take
- the workflow suggests something outside review scope

## Pilot feedback loop

During alpha and beta, report:

- false positives
- false negatives
- unclear evidence
- workflow friction
- places where feedback drafting saved time
- places where the recommendation created extra work

The goal of pilot is not only accuracy. It is reviewer trust and operational usefulness.
