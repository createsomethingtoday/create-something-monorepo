# Team Walkthrough Brief

**Status:** Working draft  
**Audience:** Webflow Marketplace team  
**Meeting target:** Tuesday, 2026-03-17

## 1. Meeting objective

Use this session to align the Marketplace team on what is being delivered in the template review Hub lane, how reviewers should use the current live reviewer flow, and what feedback will determine further hardening.

## 2. What is being delivered

The delivery is a reviewer-facing Hub lane that packages the current Webflow review surfaces into one operational workflow for template review.

That workflow is delivered through reviewer-specific Hub surfaces for the current five reviewers rather than one shared write-capable reviewer Hub.

Included in this delivery:

- queue, reviewer context, and submission truth from `webflow-template-review-mcp`
- published-first analyzer evidence from `webflow-site-analyzer-mcp` through reviewer packets and analyzer jobs
- policy-aware action boundaries through the `CREATE SOMETHING MCP Hub`
- reviewer guidance, pilot runbook, and launch checks
- reviewer-specific rollout controls for the pilot cohort

Not included in this delivery:

- full automation of subjective review judgment
- `webflow-local` originality or framework checks
- autonomous creator-facing communication
- unconditional write access without reviewer approval
- a claim that every checklist item is already automated

## 3. Framing for the team

The Hub is not a replacement for Marketplace reviewers.

The Hub is the operating surface that:

- reduces objective checklist effort
- makes evidence easier to inspect
- standardizes policy boundaries for reads, recommendations, and writes
- gives the team a safe pilot path before broader adoption

## 4. Demo sequence

1. Show the review lane entry point and explain which systems are connected.
2. Open a submission and confirm queue, asset, and version context.
3. Open the reviewer packet and show the submission truth + latest automation evidence.
4. If needed, run a fresh published-first analyzer job.
5. Review results in three buckets:
   - `auto`
   - `partial`
   - `manual`
6. Inspect evidence behind a representative fail finding.
7. Show where reviewer edits remain required.
8. Show reviewer-owned actions:
   - request changes
   - controlled status update
   - any currently enabled broader decision tool
9. Show one blocked or fallback scenario so the team sees the safety model.

## 5. Operating model to explain clearly

### Auto

- reads, analysis, checklist scoring, and evidence gathering
- reviewers should expect this to save time on deterministic checks

### Approval-required

- request changes
- approve version
- reject version
- publish-completion updates

These remain explicit reviewer actions.

### Blocked

- out-of-scope writes
- creator-facing sends without reviewer review
- destructive control-plane actions from the reviewer lane

## 6. Known pilot limitations

Be explicit that the first alpha does not solve everything.

Current limitations to call out:

- many checklist items are still `partial` or `manual`
- recommendation quality still needs calibration against reviewer decisions
- broader decision-write confidence still depends on correct Airtable mappings and trace hardening
- published evidence gaps can force manual fallback
- `webflow-local` remains deferred from the official reviewer lane
- reviewer trust is still a deliverable, not an assumption
- broader decision-write enablement will be phased by action, not turned on all at once

## 7. What feedback the team should give

Ask for feedback in these categories:

- false positives
- false negatives
- confusing evidence
- friction in the reviewer flow
- places where the Hub saved time
- places where the Hub created extra work
- policy boundaries that felt too loose or too strict

## 8. Alpha success criteria

The alpha is working if:

- reviewers can use the lane on live submissions without losing control of final decisions
- the Hub consistently returns evidence that is useful for objective review work
- blocked and approval-required actions behave predictably
- pilot feedback produces a clear hardening backlog

## 9. Close the meeting with these decisions

1. Confirm who is in the first alpha reviewer group.
2. Confirm where pilot feedback will be captured.
3. Confirm who owns daily alpha issue triage.
4. Confirm what conditions would pause or narrow the pilot.
5. Confirm the date for the first post-alpha calibration review.
6. Confirm which broader decision writes remain gated and what evidence is needed before widening them.
