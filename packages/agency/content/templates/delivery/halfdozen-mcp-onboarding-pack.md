# Half Dozen MCP Onboarding Pack

**Purpose:** internal onboarding template for the Half Dozen team using CREATE SOMETHING-managed MCPs

---

## 1. What this pack is for

Use this document when onboarding the Half Dozen team to one or more MCPs.

The onboarding goal is not just:

- what the MCP is
- how to connect it
- what tools it exposes

The onboarding goal is also:

- who should use it
- what it is safe to do with it
- what actions require review
- what actions are blocked
- what to do when the MCP fails or returns uncertain state

This pack should be used together with:

- `mcp_contract.yaml`
- `agent_contract.yaml`
- `outcome_contract.md`
- `golden_tasks.yaml`
- `runbook.md`

---

## 2. MCP inventory for Half Dozen

Current MCP families in this repo include:

- `halfdozen-notion-mcp`
- `halfdozen-operator-notion-mcp`
- `halfdozen-gmail-sync`
- `halfdozen-dm-mcp`
- `halfdozen-zoom-sync`
- `half-dozen-youtube-sync`
- `halfdozen-telemetry-mcp`

For each MCP being onboarded, complete the table below.

| MCP | Primary users | Primary workflow | Safe actions | Approval-required actions | Blocked actions | Owner |
|-----|---------------|------------------|--------------|---------------------------|-----------------|-------|
| `MCP_NAME` | `TEAM_OR_ROLE` | `WORKFLOW` | `AUTO-ALLOW` | `APPROVAL-REQUIRED` | `BLOCKED` | `OWNER` |

---

## 3. Team onboarding objectives

By the end of onboarding, every Half Dozen user should know:

1. Which MCP to use for which workflow
2. Which workspace or system each MCP touches
3. What they can do without asking
4. What requires explicit review or approval
5. What should never be attempted through the MCP
6. Where to look when something fails
7. Where traces, logs, and audit evidence live

---

## 4. Per-MCP onboarding section

Copy this section once per MCP.

### MCP: `MCP_NAME`

#### What it is

- purpose: `SHORT DESCRIPTION`
- primary workflow: `WORKFLOW`
- source systems: `SYSTEMS`

#### Who should use it

- intended users: `ROLE_OR_TEAM`
- not intended for: `ROLE_OR_TEAM`

#### What it reads

- `RESOURCE_OR_SYSTEM`
- `RESOURCE_OR_SYSTEM`

#### What it writes or triggers

- `WRITE_ACTION`
- `WRITE_ACTION`

#### Policy boundary

- auto-allow:
  - `LOW-RISK ACTION`
- approval-required:
  - `RISKY ACTION`
- block:
  - `DISALLOWED ACTION`

#### Human path

- approval owner: `ROLE_OR_NAME`
- fallback owner: `ROLE_OR_NAME`
- escalation owner: `ROLE_OR_NAME`

#### Known failure modes

- `FAILURE_MODE`
- `FAILURE_MODE`

#### What to do when it fails

1. `FIRST_RESPONSE`
2. `CHECK TRACE OR LOG`
3. `USE MANUAL FALLBACK`
4. `ESCALATE TO OWNER`

#### Evidence and observability

- logs: `WHERE`
- traces/evals: `LANGFUSE_OR_OTHER`
- approval record: `WHERE`

---

## 5. Live onboarding agenda

Use this sequence during the actual onboarding session.

### Part 1. Workflow framing

- Explain what workflow the MCP supports
- Explain which systems it touches
- Explain why that workflow exists

### Part 2. Policy framing

- Show the `auto-allow`, `approval-required`, and `block` classes
- Explain one concrete example of each
- Make the trust boundary explicit

### Part 3. Operator behavior

- Show the normal path
- Show the approval path
- Show the fallback path
- Show where to escalate

### Part 4. Evidence and review

- Show where traces are stored
- Explain that Langfuse is for observability and evals, not policy enforcement
- Show the runbook and golden-task checks

---

## 6. Required materials before onboarding

- completed artifact set for the MCP or workflow
- valid access path and auth state
- named owners
- known fallback/manual path
- at least one completed golden-task scenario

Do not run a team onboarding without these.

---

## 7. Completion checklist

- team knows when to use this MCP
- team knows what is safe
- team knows what needs approval
- team knows what is blocked
- team knows fallback/manual path
- team knows who owns incidents
- team knows where evidence is stored

If any of these are unclear, onboarding is incomplete.
