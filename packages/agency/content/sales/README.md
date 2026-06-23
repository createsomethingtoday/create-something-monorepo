# Workflow Infrastructure Sales Assets v1

**Primary buyer:** Ops/RevOps  
**Primary channel:** Live discovery and mapping calls  
**Core phrase:** Production-safe workflow infrastructure

---

## Asset map

1. **Buyer brief (send before or after first call)**
   - `policy-os-buyer-brief-ops-revops.md`
   - Purpose: frame problem, outcomes, offer ladder, and CTA in under 3 minutes.

2. **Public Atlas canvas (send as a low-friction warmup)**
   - `/atlas` or `/services#atlas-warmup`
   - Purpose: let cold or medium-fit buyers start from an industry starter map, understand the trust boundary, and carry readiness metadata into booking without exposing secrets or running production tools.
   - Starter maps: RevOps lead handoff, prior authorization prep, RFI/submittal control, marketplace review queue, and insurance claims intake.

3. **Discovery script (run live for 20-30 minutes)**
   - `discovery-call-script.md`
   - Purpose: qualify fit, map tier, handle objections, and close to a concrete next step.

4. **Discovery policy and standards**
   - `discovery-policy.md`
   - Purpose: define what discovery must produce, what shortcuts are prohibited, and how to route into policy/control work.

5. **Operator runbook**
   - `discovery-runbook.md`
   - Purpose: run workflow-first discovery consistently and convert calls into package-routing decisions.

6. **Operator checklist**
   - `operator-checklist.md`
   - Purpose: single internal checklist covering the full path from first contact to release readiness.

7. **Commercial interface spec (machine-readable source of truth)**
   - `policy-os-interface-spec.yaml`
   - Purpose: standardize one-pager inputs/outputs, call script branch logic, and taxonomy.

8. **Discovery note (required after every call)**
   - `../templates/sales/discovery-note-template.md`
   - Purpose: standardize proposal inputs in one pass.

9. **Client-facing Workflow Mapping Session agenda**
   - `../templates/sales/workflow-mapping-session-agenda.md`
   - Purpose: align stakeholders on session inputs, structure, and outputs before the paid mapping session.

10. **Delivery artifact templates**
   - `../templates/delivery/README.md`
   - `../templates/delivery/mcp_contract.yaml`
   - `../templates/delivery/agent_contract.yaml`
   - `../templates/delivery/outcome_contract.md`
   - `../templates/delivery/golden_tasks.yaml`
   - `../templates/delivery/runbook.md`
   - `../templates/delivery/halfdozen-mcp-onboarding-pack.md`
   - `../templates/delivery/halfdozen-mcp-onboarding-checklist.md`
   - Purpose: convert workflow mapping outputs into implementation-ready artifact drafts.

11. **Proposal input template (delivery handoff)**
   - `../templates/sales/policy-os-proposal-input-template.md`
   - Purpose: convert discovery output into proposal scope and contract artifact implications.

12. **Follow-up sequence (post-call execution)**
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
2. Offer the public Atlas canvas when the buyer needs a low-friction way to understand the mapping process.
3. If the buyer fits a starter-map lane, ask them to load the closest industry workflow and edit the owner, systems, approval point, and stop condition.
4. Review `discovery-policy.md`, `discovery-runbook.md`, and `operator-checklist.md`.
5. Run discovery script as a branching guide.
6. Capture discovery note, including Atlas readiness/session metadata when present.
7. Assign fit (`high|medium|low`) and select close path.
8. For high-fit work, send `workflow-mapping-session-agenda.md`.
9. Execute follow-up sequence and lock next action.
10. Build proposal using:
   - `mcp_contract.yaml`
   - `agent_contract.yaml`
   - `outcome_contract.md`
   - `golden_tasks.yaml`
11. After the Workflow Mapping Session, instantiate the delivery templates before implementation starts.

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
- Do not position Braintrust as the policy control plane; it is observability and eval infrastructure.
