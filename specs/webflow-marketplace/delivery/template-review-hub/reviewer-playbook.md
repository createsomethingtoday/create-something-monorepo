# Reviewer Playbook

**Status:** Working draft  
**Audience:** Webflow Marketplace reviewers  
**Workflow:** Template review Hub lane

## Purpose

This playbook explains how reviewers should use the MCP Hub during template review.

The Hub is there to accelerate objective review work and improve consistency. It does not replace reviewer judgment.

## What the Hub is for

Use the Hub to:

- load queue, asset, version, and reviewer context quickly
- read the reviewer packet for submission truth plus latest automation evidence
- run or inspect published-first analyzer jobs when fresh evidence is needed
- inspect `Auto`, `Partial`, and `Manual` findings before deciding
- support reviewer-safe writes once ownership is established

Do not use the Hub to:

- let it make the final decision for you
- send creator-facing communication without review
- treat low-confidence findings as if they are settled facts

## Standard reviewer flow

1. Open the submission in the Hub review lane.
2. Confirm queue, asset, and version context.
3. Read `template_review_get_review_context` for reviewer ownership and workflow state.
4. Read `template_review_get_reviewer_packet` for Airtable submission truth, latest automation evidence, and manual-only gaps.
5. If the packet is stale or missing analyzer evidence, enqueue a published-first analyzer run and poll until it completes.
6. Read the findings in three groups:
   - `Auto`: objective items with direct published evidence
   - `Partial`: useful signals that still need reviewer validation
   - `Manual`: intentionally human-owned judgment
7. Validate the evidence for any important fail or partial finding.
8. Assign the version to yourself before any reviewer-owned write action.
9. Add subjective review judgment outside the system's objective recommendation.
10. Choose the reviewer action allowed by the current lane policy, or fall back to manual handling if confidence is too low.

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

If you override, note why during the current hardening cycle so the workflow can improve.

## Write actions

These actions remain reviewer-owned:

- request changes
- controlled review-status changes
- any broader decision tools that are explicitly enabled on the current lane

Treat every write action as a deliberate reviewer action, not an automatic follow-through from the recommendation.

## Escalate instead of improvising when

- field mappings or write behavior seem wrong
- the recommendation is too uncertain to trust
- reviewer packet evidence is stale or missing
- analyzer jobs fail or return incomplete evidence
- the Hub blocks an action you expected to take
- the workflow suggests something outside review scope

## Pilot feedback loop

During pilot and hardening, report:

- false positives
- false negatives
- unclear evidence
- workflow friction
- places where packet or analyzer evidence saved time
- places where the recommendation created extra work

The goal of pilot is not only accuracy. It is reviewer trust and operational usefulness.
