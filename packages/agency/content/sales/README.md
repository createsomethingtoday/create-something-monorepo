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

3. **Commercial interface spec (machine-readable source of truth)**
   - `policy-os-interface-spec.yaml`
   - Purpose: standardize one-pager inputs/outputs, call script branch logic, and taxonomy.

4. **Discovery note (required after every call)**
   - `../templates/sales/discovery-note-template.md`
   - Purpose: standardize proposal inputs in one pass.

5. **Proposal input template (delivery handoff)**
   - `../templates/sales/policy-os-proposal-input-template.md`
   - Purpose: convert discovery output into proposal scope and contract artifact implications.

6. **Follow-up sequence (post-call execution)**
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
2. Run discovery script as a branching guide.
3. Capture discovery note.
4. Assign fit (`high|medium|low`) and select close path.
5. Execute follow-up sequence and lock next action.
6. Build proposal using:
   - `mcp_contract.yaml`
   - `agent_contract.yaml`
   - `outcome_contract.md`

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
- Do not skip risk-classification in the note template.
- Do not produce proposals with missing approval boundaries.
