# Workflow Infrastructure Discovery Call Script (Ops/RevOps)

**Audience:** Ops/RevOps leaders  
**Duration:** 20–30 minutes  
**Primary objective:** confirm fit and secure next step for a Workflow Mapping Session  
**Message taxonomy:** core phrase "Production-safe workflow infrastructure"; client-facing `Skills + MCP`; technical proof `MCP + Skills`

**Operator standard:** discovery is workflow diagnosis and policy-boundary mapping, not app-intake alone

---

## 0) Before the call (5 minutes)

Prepare:

- company context (team size, motion, operating systems)
- any public Atlas canvas summary from `/atlas` or `/services#atlas-warmup`
- likely workflow pain candidates (handoffs, approvals, cross-system drift)
- existing automation footprint (if known)
- probable risk profile (low/medium/high)

Anchor mindset:

- diagnose before prescribing
- map risk and workflow economics
- map the trust boundary, not just the integration list
- close to a concrete next action

---

## 1) Minute 0–3: context and intent

Opening:

> "Thanks for making time. I want to use this call to understand where the workflow is breaking down, then decide whether a scoped workflow wedge is the right next step. Sound good?"

Intent prompt:

> "What prompted this conversation now?"

Guardrail:

- if the buyer starts with app names, convert back to workflow language:
  > "What business process are those systems supporting, and where does it break today?"

---

## 2) Minute 3–10: qualification questions

Use these in sequence:

1. **Workflow autonomy**
> "Which workflows are already autonomous versus still manually gated?"

2. **Failure cost concentration**
> "Where are failure costs highest today, in time, dollars, or customer impact?"

3. **Human gate boundaries**
> "Which actions require a human gate today, and where are gates currently missing?"

4. **Cross-system coupling**
> "What systems must stay in sync for this workflow to work end-to-end?"

5. **Business objective**
> "If we fixed one workflow in the next 30 days, what business result would matter most?"

Follow-up probes:

- "What did you already try?"
- "Where does work drift between systems?"
- "What breaks first when volume spikes?"
- "What is the cost of one bad failure?"
- "Who owns this workflow day to day?"

---

## 3) Minute 10–15: diagnosis playback in buyer language

Playback format:

> "Here’s what I’m hearing: [workflow candidate] is failing at [governance boundary], and the cost shows up as [impact]. The issue isn’t just connectivity; it’s controlled execution under risk."

Then validate:

> "Is that accurate, or what should I correct?"

If confirmed, position:

> "That is exactly what this model is designed for: keep safe actions fast, gate risky actions explicitly, and keep every decision auditable."

---

## 4) Minute 15–22: solution mapping to offer ladder

Map problem to delivery tier:

1. **Workflow Infrastructure**
- build trusted workflow substrate
- normalize tool contracts and execution paths

2. **Policy OS**
- policy controls, release gates, approval rules, incident loops
- default path for production-risk workflows

3. **Enterprise Extension**
- high-stakes cross-system orchestration
- strict governance and trust-boundary customization

Live mapping line:

> "Based on your current risk and coupling, you likely start at [tier] with an assurance posture of [approval mode]."

Atlas handoff line:

> "If it would help your team warm up before the paid mapping session, use the public Atlas canvas to sketch the workflow. It will carry a summary, readiness signal, and session ID into the booking notes without touching production systems."

Policy boundary check:

> "Before we talk implementation, let’s sort actions into what can auto-run, what needs approval, and what should be blocked."

---

## 5) Minute 22–26: objection handling with pivots

### Objection: "We already have automations."
Response:

> "That’s useful baseline capability. The gap we usually see is governance under failure: who approves risky actions, what gets blocked, and how decisions are audited."

Pivot:

> "Where do your current automations fail or require manual cleanup?"

### Objection: "This sounds heavy."
Response:

> "It’s phased. We start with one workflow, govern only high-risk actions, and expand coverage only when reliability metrics support it."

Pivot:

> "Would a 30-day pilot on one high-cost workflow be acceptable?"

### Objection: "Why not MCP-only?"
Response:

> "MCP-only is a good wedge for discovery or compliance-constrained starts. Policy OS is what makes automation reliable at production scale."

Pivot:

> "Do you want connectivity only, or governed execution with measurable reliability?"

### Objection: "Can Langfuse handle the policy?"
Response:

> "Langfuse helps us trace, evaluate, and tune runtime behavior. It is not the approval or policy enforcement layer. The policy boundary still has to be designed explicitly."

Pivot:

> "Which actions do you need to auto-allow, review, or block?"

### Objection: price resistance
Response:

> "The right comparison isn’t to generic automation cost. It’s to failure cost: incident cleanup, approval delays, and trust erosion."

Pivot:

> "What does one bad workflow incident actually cost your team?"

---

## 6) Minute 26–30: close to next step

### High fit

Use when pain is clear, buyer has authority, and urgency exists.

> "Next step is a paid Workflow Mapping Session. You’ll get pilot scope, trust boundary, and a 30-day implementation plan."

Commit:

- owner
- date
- required stakeholders
- public Atlas canvas link or summary if the buyer wants to prepare asynchronously

### Medium fit

Use when value is likely but authority, budget, or urgency is partial.

> "We can start with a scoped MCP-only wedge and define explicit triggers for moving into Policy OS."

Commit:

- wedge workflow
- trigger criteria
- review checkpoint date

### Low fit

Use when no urgent workflow economics or no practical sponsorship path.

> "I don’t think this should proceed right now. Let’s park with a re-entry condition."

Commit:

- explicit re-entry condition
- expected timing window

---

## Prewritten content blocks

### 30-second positioning statement

> "CREATE SOMETHING builds production-safe workflow infrastructure. We usually start with a scoped MCP wedge, then layer governance so safe actions stay fast, risky actions are approval-gated, and every decision is auditable."

### 2-minute "how it works in practice"

> "In practice, we map one high-cost workflow, define policy boundaries, and ship three operating artifacts: `mcp_contract.yaml`, `agent_contract.yaml`, and `outcome_contract.md`.  
> Runtime behavior is simple: safe actions auto-allow, risky actions route to approval inbox, disallowed actions block with reason. Then we review reliability KPIs and expand coverage based on evidence."

### Three case-pattern examples

1. **Cross-system drift prevention**  
   CRM and support tooling diverge under volume; governed routing enforces sync paths and reduces reconciliation overhead.
2. **Approval-gated write workflows**  
   Write/send actions require explicit gate while read paths stay fast; reduces unreviewed risky changes.
3. **Incident-to-policy feedback loop**  
   Repeated failure patterns are codified into policy updates, reducing recurrence over time.

### Closing language by fit

1. **High fit:** "Let’s schedule the Workflow Mapping Session and lock stakeholders now."
2. **Medium fit:** "Let’s scope a narrow wedge and define assurance trigger thresholds upfront."
3. **Low fit:** "Let’s pause and re-enter when [condition] is true."

---

## Internal usage protocol

1. Send the one-pager before or immediately after call one.
2. Use this script as a branching guide, not verbatim.
3. Capture outputs in a standard discovery note.
4. Execute post-call follow-up from `../templates/sales/policy-os-follow-up-sequence.md`.
5. Build proposals using the same artifact vocabulary.
6. For high-fit work, send the Workflow Mapping Session agenda before the paid session.

### Discovery note template (required fields)

- workflow candidate
- business objective
- current failure cost
- risk class (`low|medium|high`)
- required approvals
- integration systems
- policy boundary (`auto-allow|approval-required|block`)
- recommended package tier
- buyer authority level
- next step owner and date

---

## Test cases and pass conditions

### Scenario A: Ops lead with failed automations
Pass when buyer restates the 3-tier offer ladder and requests pilot scope.

### Scenario B: technical stakeholder requests architecture depth
Pass when call transitions to trust boundaries, policy runtime, and portability without losing business framing.

### Scenario C: price resistance
Pass when discussion anchors to failure cost and a phased entry path.

### Scenario D: "we only want MCP"
Pass when MCP-only is framed as wedge with explicit assurance trigger criteria.

### Scenario E: multi-stakeholder call
Pass when call closes with named owner, scoped next step, and date.

---

## Acceptance criteria for this script

1. Another team member can run the call flow without ad-lib invention.
2. Every objection path ends with a concrete next action.
3. Discovery notes are proposal-ready in one pass.
4. Script supports a 20–30 minute call without losing core diagnosis steps.

---

## Assumptions and defaults

1. Primary buyer is Ops/RevOps.
2. Primary channel is live discovery calls.
3. Primary success objective is operational reliability.
4. Messaging aligns to current `.agency` phrasing and contract artifacts.
5. Version 1 favors clarity and conversion over long-form technical depth.

**CTA:** createsomething.agency/book
