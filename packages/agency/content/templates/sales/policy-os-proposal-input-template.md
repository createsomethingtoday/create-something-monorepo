# Map, Build, and Control Proposal Input Template

**Purpose:** Convert discovery outputs into proposal-ready scope in one pass.  
**Use after:** `content/templates/sales/discovery-note-template.md`

---

## Source references

- discovery note path:
- call date:
- fit level (`high|medium|low`):
- recommended stage (`Map|Build|Control|custom`):

---

## Commercial summary (client language)

- buyer objective:
- workflow candidate:
- current failure cost:
- target outcome in 30 days:
- why now:

---

## Scope by operating path

### Map (required baseline)
- systems in scope:
- workflow boundaries:
- business objective and success measures:

### Build (if included)
- implementation deliverables:
- new workflows and integrations:
- approval boundaries:
- release gates:

### Control — Managed AI Operations (if included)
- managed production environment:
- standard-risk starting price: $900 per month after launch
- operating boundary:
- runtime monitoring and incident response:
- policy-tuning cadence:
- AI usage billing owner (`client account|separately metered`):
- monthly usage coverage:
- 75% forecast capacity-review owner:

### Custom operation (if required)
- high-stakes constraints:
- regulatory requirements:
- priority-response requirements:
- trust-boundary requirements:
- orchestration/governance requirements:

---

## Artifact implications

### `mcp_contract.yaml` implications
- tools/resources to define:
- auth scopes:
- error/fallback model:

### `agent_contract.yaml` implications
- allowed actions:
- approval-required actions:
- blocked actions:
- escalation triggers:

### `outcome_contract.md` implications
- pilot scope:
- success criteria:
- fallback/manual path:
- ownership boundaries:

---

## Reliability and risk plan

- primary KPI:
- secondary KPIs:
- initial risk class:
- risk mitigation commitments:

---

## Execution plan

- 30-day plan summary:
- milestones:
- required client stakeholders:
- dependencies:

---

## Commercial terms input

- pricing lane (`project|managed operations|custom`):
- managed production environment:
- Managed AI Operations starting price: $900 per month
- agent count metered: `false`
- AI usage billing owner:
- forecasted usage threshold: `75%`
- capacity-review path:
- automatic overage charge: `false`
- separately scoped Build additions:
- timeline range:
- assumptions:
- exclusions:

---

## Decision close path

- proposed next step:
- decision owner:
- target decision date:
- if deferred: re-entry condition and date:
