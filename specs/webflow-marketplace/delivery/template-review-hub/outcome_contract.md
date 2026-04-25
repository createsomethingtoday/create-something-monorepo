# Outcome Contract

**Status:** Working draft  
**Client:** `Webflow Marketplace team`  
**Workflow:** `template_review_hub_lane`  
**Date:** `2026-03-09`

## 1. Current reviewer scope

### In scope

- reviewer entry through one MCP Hub template review lane
- queue lookup plus asset, version, and reviewer context for template submissions
- reviewer packet access for Airtable submission truth and latest automation evidence
- published-first analyzer jobs and evidence gathering from submitted URLs
- reviewer-safe workflow writes such as self-assignment, request changes, controlled status updates, and draft feedback saves
- hardening of broader decision actions only when they are explicitly enabled and traced

### Out of scope

- autonomous creator-facing communication
- `webflow-local` originality or plagiarism analysis in the current reviewer lane
- subjective design, originality, or UX decisions made without human review
- broad Airtable mutation beyond the reviewer-safe workflow surface
- Marketplace-wide rollout beyond the current reviewer baseline
- Hub control-plane administration from the reviewer lane

## 2. Business objective

The purpose of this reviewer baseline is to:

- reduce time spent on objective checklist work
- improve consistency of objective review findings
- establish a production-safe path for a governed reviewer lane in the MCP Hub

Target outcome in 30 days:

- deliver a reviewer workflow that the Marketplace team can use on live submissions with human decision ownership intact and measurable time savings on objective review work

## 3. Success criteria

The current reviewer baseline is successful if:

- risky actions are not executed without reviewer approval
- the Marketplace review lead accepts the governed workflow path
- reviewers report that objective checklist work is faster and clearer
- required audit fields are visible for recommendations, writes, and escalations
- golden-task checks pass at the agreed threshold

Primary KPI:

- reduction in reviewer time spent on objective checks per submission

Secondary KPIs:

- recommendation acceptance rate
- false-positive rate
- escalation rate
- reviewer trust and usability feedback

## 4. Workflow boundary

### Systems in scope

- CREATE SOMETHING MCP Hub
- Airtable Marketplace Assets
- Webflow published sites and reviewer submission URLs
- `webflow-template-review-mcp`
- `webflow-site-analyzer-mcp`

### Trust boundary

- auto-allow: queue/context reads, reviewer packet reads, published-first analyzer jobs, and evidence gathering
- approval-required: reviewer-safe workflow writes and any broader decision tool that is explicitly enabled on the current lane
- block: creator-facing sends without review, destructive/out-of-scope actions, and reviewer-lane control-plane mutations

### Ownership boundary

- workflow owner: `Marketplace review lead`
- technical owner: `Senior Systems Architect`
- approval owner: `Assigned reviewer`

## 5. Fallback and manual path

If the governed workflow cannot complete safely:

1. stop at the uncertainty, mapping, or tool-failure boundary
2. review the submission manually using Airtable and the published site
3. complete the required reviewer action outside the Hub if necessary
4. record the exception for pilot or hardening review

Fallback is considered acceptable if:

- no creator-facing decision is issued without human validation
- no unsafe write action bypasses policy
- the review can still be completed manually

## 6. Delivery artifacts

This delivery produces:

- `mcp_contract.yaml`
- `agent_contract.yaml`
- `outcome_contract.md`
- `golden-task-checks.md`
- `runbook.md`
- `reviewer-playbook.md`
- `checklist-map.md`
- `launch-scorecard.md`

## 7. Release gates

The workflow does not expand beyond the current reviewer baseline until:

- pilot workflow scope is approved
- policy boundary is approved
- golden-task checks pass
- manual fallback is rehearsed
- reviewer playbook is reviewed with active reviewers
- Marketplace review lead and Senior Systems Architect sign off

## 8. Risks and assumptions

### Risks

- Airtable field mappings may still contain gaps or behaviors that require manual fallback
- objective checks may generate false positives or incomplete evidence that reduce reviewer trust
- Hub policy or routing behavior may need hardening once live reviewer traffic starts

### Assumptions

- current MCP surfaces are reused rather than rebuilt
- active reviewers are available to validate the lane on real submissions
- the Marketplace team is willing to adopt a governed reviewer baseline before broader expansion

## 9. Decision record

### Approved next step

- harden the current reviewer-ready Hub lane around reviewer packets, published-first analyzer evidence, and reviewer-safe writes

### Decision owner

- `Marketplace review lead`

### Target date

- `2026-03-17`
