# Agent-Run Receipt Charter

> Status: canonical operating charter
> Scope: CREATE SOMETHING internal operating model and client translation path

## Thesis

CREATE SOMETHING is the proof business for a fully AI-managed company.

The company is run by agents wherever the work can be bounded by policy,
verified by the real source of truth, repaired through a known path, and closed
with a receipt. The client promise is direct: we prove the operating system on
CREATE SOMETHING first, then install the same agent-run-with-receipts model for
client workflows.

This is not "chatbots for business." It is business operations redesigned so
agents run the work, receipts prove the work, and people govern exceptions.

## Operating Principle

```text
Agents operate.
Receipts prove.
Humans govern exceptions.
```

Human approval is not the baseline control. A receipt is the baseline control.
Approval is one receipt type used when policy says the evidence is not strong
enough, the authority is not granted, or the action carries irreversible risk.

## Receipt Baseline

Every agent-run lane must produce a receipt contract before work starts. The
contract names the evidence required for the lane to be trusted.

Required receipt fields:

| Field | Meaning |
| --- | --- |
| Intent | What business objective or client outcome the agent serves |
| Authority | Why this agent is allowed to act in this lane |
| Source of truth | Which repo, Linear issue, app, API, log, database, browser surface, or client system owns truth |
| Action | What changed, where, when, and by which agent/tool |
| Verification | How the system knows the work succeeded |
| Rollback or recovery | How to undo, retry, compensate, or escalate |
| Client-facing proof | The concise evidence artifact a client or operator can trust |

If a lane cannot state this contract, it is not ready for autonomous operation.

## Autonomy Model

CREATE SOMETHING uses the operator-agent autonomy ladder as the default
authority language:

| Level | Name | Agent-run scope | Required receipt |
| --- | --- | --- | --- |
| A0 | Read-only scout | Inspect repo, docs, logs, browser state, Linear, receipts, dashboards, and source records | diagnostic receipt |
| A1 | Local proposal | Draft plans, prompts, diffs, messages, issue notes, and handoff packets | proposal receipt |
| A2 | Local self-heal | Apply deterministic local fixes with bounded validation | validation receipt plus rollback note or rollback-proof receipt |
| A3 | Internal production lab | Run reversible CREATE SOMETHING internal production actions under explicit policy/runbook | pre-action receipt, post-action receipt, live verifier, rollback evidence |
| A4 | Operator-required | Destructive, credentials, billing, legal, reputational, client production, broad external writes, or unknown rollback | explicit operator receipt before action |

A4 is not a failure of autonomy. It is the system proving that the receipt
contract is incomplete for the risk.

## Self-Heal Loop

Agent-run work follows the same loop across CREATE SOMETHING and client
installations:

```text
Signal -> Decision -> Action -> Verification -> Receipt -> Next decision
```

- Signal: a request, incident, webhook, Slack message, Linear issue, log, diff,
  browser state, failed check, or client event.
- Decision: policy routes the lane to run, wait, stop, escalate, rollback, or
  ask for a missing receipt.
- Action: an agent or deterministic tool acts inside the authority envelope.
- Verification: the strongest available source of truth checks the outcome.
- Receipt: the lane records what happened, why it was allowed, how it was
  verified, and what to do next.
- Next decision: continue, close, self-heal, rollback, or escalate.

The self-heal path is allowed only when the receipt contract names the verifier
and rollback/recovery path before the repair begins.

## Client Translation

CREATE SOMETHING is the working reference implementation. A client engagement
installs the same model around one workflow at a time.

Client installation deliverables:

- workflow map and source-of-truth map;
- approved autonomy level per action;
- MCP/API/app access boundary;
- agent behavior contract;
- receipt contract;
- verifier and golden task suite;
- rollback or recovery runbook;
- operating cockpit or proof surface;
- client-facing receipt format.

The client does not buy "AI." The client buys a workflow that can be delegated
because the receipt system is strong enough to trust.

## Zellij And Linear Cockpit Contract

Zellij lanes and Linear issues are implementation surfaces for this charter.

Every visible agent lane should name:

- the Linear issue or operator task;
- autonomy level;
- authority envelope;
- receipt contract;
- rollback or recovery path;
- escalation condition;
- verifier;
- evidence destination.

The lane is complete only when the receipt exists. Agent text alone is never a
receipt.

## Stop Conditions

Stop or escalate before action when:

- the source of truth is unknown or unreachable;
- authority is missing or ambiguous;
- verification cannot distinguish success from failure;
- rollback/recovery is unknown for a meaningful mutation;
- client production, credentials, billing, legal, external sends, or destructive
  actions are involved without a policy-granted receipt path;
- the receipt would live only in chat;
- the agent asks to widen scope instead of satisfying the current receipt
  contract.

## Positioning Line

CREATE SOMETHING is an AI-native operating company. Agents run the business,
receipts prove the work, and humans govern the exceptions. We use that operating
system to make client workflows agent-run with receipts too.
