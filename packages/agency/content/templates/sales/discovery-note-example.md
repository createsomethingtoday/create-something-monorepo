# Workflow Infrastructure Discovery Note Example

**Purpose:** show the expected level of specificity for post-call discovery capture  
**Use with:** `discovery-note-template.md`

---

## Call metadata

- date: 2026-03-07
- company: ExampleCo
- primary contact: Jordan Lee
- role: RevOps Director
- additional stakeholders: Sales Ops Manager, Engineering Manager
- call owner: CREATE SOMETHING

---

## Problem summary

- triggering event: order-confirmation errors increased after a CRM and billing workflow change
- business objective in next 30 days: reduce manual order reconciliation and prevent incorrect confirmation sends
- current workflow pain (1-2 sentences): Customer order records pass through CRM, internal ops review, and billing, but write actions drift across systems and confirmations are sometimes sent before final approval.
- current workaround: ops team manually reviews spreadsheets twice daily and blocks sends when mismatches are found
- quantified impact (time/cost/risk): 8-10 hours per week of cleanup, delayed bookings, and customer-facing trust risk when incorrect confirmations go out

---

## Workflow qualification

- workflow candidate: quote-to-confirmation workflow
- risk class (`low|medium|high`): high
- required approvals (current + desired): currently manual ops review before send; desired approval gate only for pricing exceptions and account mismatches
- integration systems in scope: HubSpot, internal order database, Stripe, Gmail
- failure hotspots: stale CRM state, duplicate billing records, premature confirmation send
- human gate boundaries (existing/missing): existing gate before send; missing gate on pricing discrepancy path
- policy boundary:
  - auto-allow: read-only CRM lookup, order-state comparison, draft generation for internal review
  - approval-required: sending confirmation email, writing back corrected pricing, creating exception records
  - block: issuing refunds, deleting customer records, overwriting approved pricing without explicit human review
- fallback/manual path: ops team completes exception handling manually in shared inbox and updates source systems directly
- workflow owner: RevOps Director

---

## Package recommendation

- recommended tier:
  - `Policy OS`
- rationale: client already has automation fragments, but failure cost is driven by missing approval boundaries and inconsistent cross-system writes
- if MCP-only wedge recommended, list assurance trigger criteria:
- if Langfuse or eval tooling is discussed, note it as observability only: Langfuse may be added after pilot scoping to trace approval routing and evaluate workflow regressions

---

## Commercial and decision signals

- buyer authority level: strong recommender, final approval with COO
- budget posture: budget available for pilot if risk reduction is clear
- timeline urgency: this quarter
- procurement or security constraints: vendor review required for production write access
- fit level (`high|medium|low`): high

---

## Next step

- next action: schedule paid Workflow Mapping Session
- owner: Jordan Lee
- due date: 2026-03-12
- required participants: RevOps Director, Engineering Manager, Ops lead
- deliverable committed (for example: Workflow Mapping Session output): pilot scope, policy boundary, and 30-day implementation plan

---

## Proposal input block

- `mcp_contract.yaml` implications: define read access to CRM and billing state, gated write tools for confirmation and exception handling, explicit auth scopes for production send paths
- `agent_contract.yaml` implications: auto-allow read and draft actions, approval gate for send/write corrections, block destructive billing actions
- `outcome_contract.md` implications: pilot targets reduction in manual reconciliation and prevention of unreviewed sends
- primary reliability KPI for pilot: unreviewed risky actions prevented
- release-gate conditions: approval routing tested on golden tasks, trace visibility in place, manual fallback confirmed with ops owner
