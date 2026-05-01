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
- inspect evidence for `pass`, `fail`, `partial`, and `manual` checklist items
- review plagiarism or originality signals
- draft clearer creator feedback

Do not use the Hub to:

- let it make the final decision for you
- send creator-facing communication without review
- treat low-confidence findings as if they are settled facts

## Standard reviewer flow

1. Open the submission in the Hub review lane.
2. Confirm queue, asset, and version context.
3. Run the template review analysis.
4. Read the findings in four groups:
   - `pass`: exact checks with source-backed evidence that the item appears satisfied
   - `fail`: exact checks with source-backed evidence of non-compliance
   - `partial`: useful signals where available inputs do not prove the whole checklist item
   - `manual`: items that still require reviewer judgment or unsupported inputs
5. Validate the evidence for any important fail or partial finding.
6. Add subjective review judgment outside the system's objective recommendation.
7. Edit the draft feedback if needed.
8. Choose the final reviewer action: request changes, approve, reject, or continue manual review.

## How to read findings

### `Pass` and `Fail`

These are the strongest objective findings when they are based on deterministic exact checks and include a concrete source.

Reviewer expectation:

- validate quickly, especially for important failures
- trust the evidence when the source is direct and confidence is appropriate
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

### `Confidence` and `source`

Every analyzer finding should identify `confidence` and `source`.

Reviewer expectation:

- treat high-confidence deterministic checks as evidence, not as final decisions
- verify low-confidence findings before using them in feedback or decisions
- treat unavailable sources as a manual review cue

## When to trust the Hub

Trust the Hub most when:

- the issue is deterministic
- evidence is direct and specific
- the finding includes a clear source
- the same finding is consistent across multiple tools or views

Trust it less when:

- the finding depends on design quality or taste
- the recommendation is low confidence
- the evidence appears incomplete
- the tool cannot fully see the required part of the system
- the finding depends on variables panel data, class usage graph, element-level combo stack depth, collection slugs, ecommerce setup, or browser-backed analysis hidden by the no-Steel posture

Reviewer rule:

Deterministic exact checks can be trusted as evidence. Manual, partial, unavailable-source, or low-confidence checks require human verification.

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

Treat every write action as a deliberate reviewer action, not an automatic follow-through from the recommendation.

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
