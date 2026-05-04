# Workflow Infrastructure Sales Assets v1

**Primary buyer:** Ops/RevOps  
**Primary channel:** Live discovery and mapping calls  
**Core phrase:** Production-safe workflow infrastructure

---

## Asset map

1. **Buyer brief (send before or after first call)**
   - `policy-os-buyer-brief-ops-revops.md`
   - Purpose: frame problem, outcomes, offer ladder, and CTA in under 3 minutes.

2. **Discovery script (run live for 20-30 minutes)**
   - `discovery-call-script.md`
   - Purpose: qualify fit, map tier, handle objections, and close to a concrete next step.

3. **Discovery policy and standards**
   - `discovery-policy.md`
   - Purpose: define what discovery must produce, what shortcuts are prohibited, and how to route into policy/control work.

4. **Operator runbook**
   - `discovery-runbook.md`
   - Purpose: run workflow-first discovery consistently and convert calls into package-routing decisions.

5. **Operator checklist**
   - `operator-checklist.md`
   - Purpose: single internal checklist covering the full path from first contact to release readiness.

6. **Commercial interface spec (machine-readable source of truth)**
   - `policy-os-interface-spec.yaml`
   - Purpose: standardize one-pager inputs/outputs, call script branch logic, and taxonomy.

7. **Discovery note (required after every call)**
   - `../templates/sales/discovery-note-template.md`
   - Purpose: standardize proposal inputs in one pass.

8. **Client-facing Workflow Mapping Session agenda**
   - `../templates/sales/workflow-mapping-session-agenda.md`
   - Purpose: align stakeholders on session inputs, structure, and outputs before the paid mapping session.

9. **Delivery artifact templates**
   - `../templates/delivery/README.md`
   - `../templates/delivery/mcp_contract.yaml`
   - `../templates/delivery/agent_contract.yaml`
   - `../templates/delivery/outcome_contract.md`
   - `../templates/delivery/golden_tasks.yaml`
   - `../templates/delivery/runbook.md`
   - `../templates/delivery/halfdozen-mcp-onboarding-pack.md`
   - `../templates/delivery/halfdozen-mcp-onboarding-checklist.md`
   - Purpose: convert workflow mapping outputs into implementation-ready artifact drafts.

10. **Proposal input template (delivery handoff)**
   - `../templates/sales/policy-os-proposal-input-template.md`
   - Purpose: convert discovery output into proposal scope and contract artifact implications.

11. **Follow-up sequence (post-call execution)**
   - `../templates/sales/policy-os-follow-up-sequence.md`
   - Purpose: move high and medium fit deals to decision with clear owner and date.

---

## Message taxonomy

- Core phrase: "Production-safe workflow infrastructure."
- Client-facing delivery vector: `Skills + MCP`
- Technical proof vector: `MCP + Skills`

---

## Operating flow

1. Send one-pager.
2. Review `discovery-policy.md`, `discovery-runbook.md`, and `operator-checklist.md`.
3. Run discovery script as a branching guide.
4. Capture discovery note.
5. Assign fit (`high|medium|low`) and select close path.
6. Confirm target price lane, owner-compensation fit, and operator-load budget before proposal.
7. For high-fit work, send `workflow-mapping-session-agenda.md`.
8. Execute follow-up sequence and lock next action.
9. Build proposal using:
   - `mcp_contract.yaml`
   - `agent_contract.yaml`
   - `outcome_contract.md`
   - `golden_tasks.yaml`
10. After the Workflow Mapping Session, instantiate the delivery templates before implementation starts.

---

## Fit-to-next-step policy

1. **High fit**
   - Next step: paid Workflow Mapping Session.
   - Must exit call with owner, stakeholder set, and calendar date.

2. **Medium fit**
   - Next step: scoped MCP-only wedge.
   - Must define assurance trigger criteria and checkpoint date.

3. **Low fit**
   - Next step: park or refer.
   - Must define explicit re-entry condition and timing window.

---

## Usage discipline

- Use script language blocks as defaults, then adapt to buyer wording.
- Do not reduce discovery to "what do you want to connect?"
- Do not skip risk-classification in the note template.
- Do not produce proposals with missing approval boundaries.
- Do not produce Policy OS proposals without monthly recurring revenue, gross-margin floor, owner-compensation fit, and operator-load budget.
- Do not position Braintrust as the policy control plane; it is observability and eval infrastructure.
