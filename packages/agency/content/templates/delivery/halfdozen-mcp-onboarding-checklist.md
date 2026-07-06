# Half Dozen MCP Onboarding Checklist

**Purpose:** practical checklist for onboarding the Half Dozen team to one MCP or a small MCP bundle

---

## Pre-onboarding

- identify the MCP being onboarded
- identify the workflow it supports
- identify the team members attending
- confirm the artifact set exists:
  - `mcp_contract.yaml`
  - `agent_contract.yaml`
  - `outcome_contract.md`
  - `golden_tasks.yaml`
  - `runbook.md`
- confirm approval owner
- confirm fallback owner
- confirm the MCP is reachable and authenticated

---

## During onboarding

- explain the workflow in plain language
- explain the source systems and touched systems
- explain the `auto-allow` actions
- explain the `approval-required` actions
- explain the `block` actions
- walk one happy-path example
- walk one approval-path example
- walk one failure/fallback example
- show where logs or traces live
- explain Langfuse correctly as observability/evals only

---

## Per-user understanding check

Each attendee should be able to answer:

- when should I use this MCP?
- what should I never do with this MCP?
- when do I need approval?
- what do I do if the system state looks wrong?
- where do I go if a tool fails?
- who owns the workflow?

---

## Post-onboarding

- share the artifact pack
- share the runbook
- share the golden-task examples
- record open questions
- assign any unresolved policy decisions
- set a checkpoint date for usage review

---

## Exit criteria

- users can describe the workflow correctly
- users can identify approval boundaries
- users can identify blocked actions
- fallback path is understood
- owners are named
- review date is set
