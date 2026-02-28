# POLICY OS Follow-up Sequence (Post-Discovery)

Use this sequence after a discovery call to convert diagnosis into a concrete decision.

---

## Required inputs before sending follow-up

- buyer fit level (`high|medium|low`)
- workflow candidate
- risk class
- required approvals
- integration systems
- recommended package tier
- next-step owner and target date

---

## Day 0 (within 4 hours): recap + decision path

### Goal
Confirm shared diagnosis and lock next action.

### Template
Subject: POLICY OS recap + next step

Hi {{Name}},

Thanks again for the discussion. Here is the operating summary from today:

- Workflow candidate: {{workflow}}
- Risk class: {{risk_class}}
- Systems in scope: {{systems}}
- Recommended path: {{tier}}

Based on this, the next step is:
- {{next_step}}
- Owner: {{owner}}
- Target date: {{date}}

If this summary is accurate, I will proceed with the above path.

Best,  
{{sender}}

---

## Day 2: risk and economics anchor

### Goal
Re-anchor on failure cost and governance value.

### Template
Subject: quick check on failure-cost baseline

Hi {{Name}},

Before we finalize scope, I want to confirm one baseline:
what is the current cost of a failure in this workflow (cleanup time, delay, or customer impact)?

This baseline is how we size the initial policy boundary and pilot target.

Best,  
{{sender}}

---

## Day 5: path-specific follow-up

### High fit
Subject: confirm mapping session stakeholders

Hi {{Name}},

To finalize the Policy Mapping Session, please confirm:
- decision owner
- ops/technical stakeholders
- preferred slot this week

Deliverable remains: pilot scope, policy boundary, and 30-day plan.

Best,  
{{sender}}

### Medium fit
Subject: confirm MCP wedge + assurance triggers

Hi {{Name}},

For the MCP-only wedge, please confirm:
- single workflow boundary
- trigger criteria for entering Autonomy Assurance
- checkpoint date for trigger review

Best,  
{{sender}}

### Low fit
Subject: re-entry condition alignment

Hi {{Name}},

Agreed to pause for now. Please confirm the re-entry condition:
{{reentry_condition}}

When that condition is met, we can reopen with a scoped mapping call.

Best,  
{{sender}}

---

## Day 10: timeline checkpoint

### Goal
Prevent silent stall.

### Template
Subject: timeline check

Hi {{Name}},

Quick timeline check: should we keep the current next-step date, or reset it?

If reset, please share the new owner and date so we can keep this moving cleanly.

Best,  
{{sender}}

---

## Day 14: close loop

### Goal
Resolve to one of three outcomes.

### Template
Subject: close loop on next step

Hi {{Name}},

I want to close this loop with one clear outcome:
1. proceed now,  
2. proceed later with a set date, or  
3. pause indefinitely.

Reply with the option and I will update our plan accordingly.

Best,  
{{sender}}

---

## Exit criteria

- Every sequence ends with a named owner and date, or explicit pause condition.
- Medium-fit sequences include documented assurance trigger criteria.
- High-fit sequences result in a scheduled Policy Mapping Session.

