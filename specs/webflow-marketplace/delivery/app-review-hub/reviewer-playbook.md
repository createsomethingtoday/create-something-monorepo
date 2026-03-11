# Reviewer Playbook

**Status:** Working draft  
**Audience:** Webflow Marketplace app reviewers  
**Workflow:** App review Hub lane

## Purpose

This playbook explains how reviewers should use the MCP Hub during app review.

The Hub is there to accelerate queue access, evidence gathering, and feedback drafting. It does not replace reviewer judgment.

## What the Hub is for

Use the Hub to:

- load app queue, asset, and version context quickly
- inspect app-review status and rejection taxonomy
- draft a recommendation from the current asset and version history
- refine creator feedback into clearer, more actionable language

Do not use the Hub to:

- let it make the final decision for you
- treat draft recommendations as official state changes
- use it as a generic Airtable editor
- send creator-facing communication without review

## Standard reviewer flow

1. Open the submission in the app review lane.
2. Confirm asset, version, and current review context.
3. Review the asset and version history.
4. Use the recommendation and feedback prompts if helpful.
5. Validate the recommendation against the actual app-review evidence.
6. Add your own security, compliance, or Marketplace judgment.
7. Choose the final reviewer action.
8. If the reviewer lane is still read-only, record the official state change manually in Airtable.

## When to trust the Hub

Trust the Hub most when:

- it is summarizing current queue or version state
- it is mapping fields and allowed statuses
- it is helping rewrite feedback without changing intent

Trust it less when:

- the issue depends on product judgment, risk tolerance, or policy nuance
- the recommendation depends on missing external evidence
- the recommendation implies a state change you have not yet approved

## When to override the Hub

Override the recommendation when:

- the evidence is incomplete or misleading
- the recommendation overstates certainty
- important review context is missing
- the system suggests changing metadata outside the reviewer playbook

If you override, note why during pilot so the workflow can improve.

## Write actions

These actions remain reviewer-owned:

- requesting changes on a version
- approving a version
- rejecting a version
- changing version review state where broader update semantics are explicitly allowed
- changing Marketplace status

Treat every write action as a deliberate reviewer action, not an automatic follow-through from the recommendation.

Until write gates pass, complete official state changes manually in Airtable.

## Escalate instead of improvising when

- field mappings or write behavior seem wrong
- reviewer identity in the Hub session is unclear
- the recommendation is too uncertain to trust
- the Hub exposes metadata-editing behavior outside review scope
- the workflow suggests something outside app review scope

## Pilot feedback loop

During alpha and beta, report:

- false positives
- false negatives
- unclear evidence
- workflow friction
- places where feedback drafting saved time
- places where the recommendation created extra work

The goal of pilot is not only accuracy. It is reviewer trust, attribution safety, and operational usefulness.
