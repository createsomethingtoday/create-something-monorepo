# Jev routing advisor for Paperclip

This is a bounded process-adapter command for the `create-something` Paperclip instance. It recommends a model lane; it does not assign work, change an issue, authorize a write, or decide completion.

The Paperclip run must be tied to exactly one assigned issue. The wrapper resolves that issue from `PAPERCLIP_TASK_ID` or, when the process adapter omits it, from the run's linked issues. It accepts API bases with or without `/api` and sends the run ID header on Paperclip requests. Its description must contain exactly one `jev-routing` fenced JSON packet with exactly `taskId`, `summary`, `goal`, and `riskFlags`. `taskId` must equal the resolved issue ID. The packet is the only task content sent to TypeSafe. Use a task-relevant summary without credentials or unnecessary client data. Supported risk flags are `security_boundary`, `identity`, `payments`, `production_release`, and `destructive`.

Exact risk rules bypass Jev: `security_boundary` recommends Daybreak; identity, payments, production release, and destructive work recommend Astra. Each retains a human gate. Other packets receive a typed Jev choice among Luna, Sol, Astra, Daybreak, and abstain. Every outcome is advisory. A malformed response or provider failure abstains. Missing task context or credential exits with a clear error. In Paperclip, the wrapper posts a structured issue comment; a repeat run reuses an existing receipt from this agent for the same packet hash, avoiding a duplicate Jev call.

The process adapter should invoke `python3` with `scripts/paperclip-jev-router/route.py` from a stable merged monorepo checkout. Bind `TYPESAFE_API_KEY` through a Paperclip company secret reference in the adapter environment. Do not put it in agent instructions, repository files, command arguments, or a startup MCP launcher. Keep automatic heartbeat disabled for the initial canary. Assign one scoped issue with an explicit packet and inspect the native run receipt before enabling further work.

Validation without a provider call:

```bash
python3 -m unittest discover -s scripts/paperclip-jev-router -p 'test_*.py' -v
python3 -m py_compile scripts/paperclip-jev-router/route.py
```

The first production canary must confirm the secret binding, the exact task ID, a valid `jev-1.13.0` response, and a Paperclip run receipt. Then compare recommendations against independently labeled historical tasks. Model confidence is not authority or proof that a task is complete.

## Automatic A1 escalation

`escalate.py` is a separate process agent. It scans only `in_review` issues, reads each full issue because Paperclip truncates descriptions in list responses, and moves at most one approved issue per run from Luna to Sol or Sol to Astra. Initial dispatch remains operator initiated. The escalation agent does not call Jev again: it verifies the existing Jev receipt, the original executor's exact model and successful run, a later independent verifier run and failure receipt, and a board approval made before execution. It requires one explicit production goal, acceptance criteria, a positive fallback reserve, a total task cost cap of at most $50, and an expiry within 30 days. Unknown cost, model drift, a live run, missing evidence, or an uncertain execution holds the issue.

The issue description must contain exactly one `paperclip-escalation-v1` fenced JSON object. Its fields are `schema`, `taskId`, `linearIssue`, `productionGoal`, `acceptanceCriteria`, `autonomyLevel`, `riskFlags`, `routingReceiptCommentId`, `selectedAgentId`, `fallbackAgentId`, `verifierAgentId`, `maxTotalLandedCostCents`, `fallbackReserveCents`, and `expiresAt`. `schema` is `paperclip-escalation.v1`; `autonomyLevel` is `A1`; `riskFlags` is empty. `productionGoal` must equal the goal in the current `jev-routing` packet. Agent IDs identify three distinct Codex agents. The controller verifies the selected model from the native run events, then sets an issue-level model override for the adjacent fallback lane in the same assignment update. Paperclip redacts other agents' model config from an agent token, so this override is required to enforce the chosen lane. Daybreak and high-authority work always stop for operator review. Cost fields are integer cents. The reserve is a preflight allocation, not a real-time provider spending limit.

A board-authored issue comment must contain one `paperclip-escalation-approval-v1` fenced JSON object with exactly `taskId` and `policyHash`. `policyHash` is the SHA-256 of the escalation policy encoded with sorted keys and compact JSON separators. Given the complete policy as a JSON file, `python3 scripts/paperclip-jev-router/escalate.py --approval-for policy.json` prints the exact comment to post. This comment must predate the selected executor run. The independent verifier agent must then post one `paperclip-verification-v1` fenced JSON object with `schema`, `taskId`, `policyHash`, `sourceRunId`, `verifierRunId`, `result`, `failureKind`, `criteriaPassed`, `criteriaTotal`, `observedLandedCostCents`, `costBasis`, and `evidence`. `schema` is `paperclip-verification.v1`. Only a failed `quality` verdict with unmet criteria can trigger automatic escalation. A passed verdict does nothing; environment, scope, security, release, identity, payment, destructive, or unknown failures require operator recovery. The verifier's run must be later than the source run and its comment must be authored during that run.

The controller writes the fallback assignment and a `paperclip-escalation-decision-v1` comment in one Paperclip issue update, using a deterministic comment request ID. The comment binds the policy hash, source and verifier runs, models, cost allocation, and reason. A later scan will not reassign an already escalated issue. The fallback remains subject to its own verifier and the normal production promotion gate; there is no second automatic fallback.

Run the controller with Paperclip's injected `PAPERCLIP_API_URL`, `PAPERCLIP_API_KEY`, `PAPERCLIP_RUN_ID`, `PAPERCLIP_COMPANY_ID`, and `PAPERCLIP_AGENT_ID`, plus plain non-secret `JEV_ADVISOR_AGENT_ID` and `ESCALATION_APPROVER_USER_ID`. `ESCALATION_APPLY=true` enables assignments; omission gives a dry scan. Bind the controller to its own process agent with `canAssignTasks` and no agent or skill creation permissions, one concurrent run, and a timer only after native canary evidence. Keep its checkout pinned to the merged revision. To stop automatic escalation, disable that agent's heartbeat and set `ESCALATION_APPLY=false`; preserve issue decision receipts and review any active fallback before reassignment.

Validation:

```bash
python3 -m unittest discover -s scripts/paperclip-jev-router -p 'test_*.py' -v
python3 -m py_compile scripts/paperclip-jev-router/escalate.py
```
