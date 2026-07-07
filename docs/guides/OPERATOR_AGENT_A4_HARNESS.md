# Operator Agent A4 Harness

The A4 target is reachable only as operator-authorized autonomous execution.
The harness can prepare, validate, execute, verify, and roll back high-risk work
after an explicit approval packet is recorded. It must not turn A4 into
unattended authority over credentials, billing, client production, destructive
writes, or irreversible data operations.

## Promotion Shape

1. A3 proves reversible CREATE SOMETHING internal production ownership on a
   bounded surface.
2. The A4 harness drafts an approval packet with exact target, action,
   validation, rollback, stop conditions, and post-action smoke.
3. The operator approves the packet in Linear or another signed durable surface.
4. The agent executes only the approved packet.
5. The harness records pre-action receipt, execution receipt, post-action smoke,
   rollback readiness, and final outcome.

## Required Packet

```text
Authority level: A4
Issue:
Approver:
Approval surface:
Approved at:
Expires at:
Target:
Action:
Risk class:
Named risks:
Forbidden side effects:
Validation:
Rollback:
Post-action smoke:
Stop conditions:
Evidence target:
```

## Stop Conditions

The harness must stop before execution when the approval packet is missing,
ambiguous, stale, or mismatched with the proposed action. It must also stop when
the action touches a broader surface than approved, cannot be verified, lacks a
known rollback, or changes credentials, billing, account access, client
production, destructive state, or irreversible data without naming that exact
risk in the packet.

## Omnigent Candidate Layer

Omnigent is a strong candidate for the shared API and MCP-style meta layer
above CREATE SOMETHING agents. Treat it as a transport and policy host first,
not as the authority source.

Useful fit:

- common interface over Codex, Claude Code, Pi, Cursor, and custom YAML agents
- server-level policies for approvals, spend, and tool limits
- shared live sessions for operator review and handoff
- local or cloud sandbox execution for long-running agent work
- OpenAI-compatible gateway support, including local Ollama routes

Adoption path:

1. Wrap one read-only CREATE SOMETHING scout profile in Omnigent.
2. Expose only A0/A1 commands through the meta layer.
3. Mirror every Omnigent session receipt back to Linear.
4. Add an MCP adapter only after receipts match the local harness receipts.
5. Permit A4 execution only when Omnigent forwards a repo-owned approval packet
   that passes the same local policy checks.

The repo-owned policy packet remains authoritative. Omnigent can coordinate
agents, sessions, sandboxes, and collaboration, but it must not replace Linear,
policy artifacts, validation commands, rollback evidence, or operator approval.

The repo adapter manifest is:

```text
config/operator-agent/omnigent-a4-adapter.json
config/operator-agent/omnigent-readonly-scout.profile.json
config/operator-agent/fixtures/omnigent-readonly-scout.receipt.json
```

Validate it with:

```bash
node scripts/operator-agent-omnigent-adapter.mjs check --json
node scripts/operator-agent-omnigent-adapter.mjs trial-check --json
node --test scripts/test/operator-agent-omnigent-adapter.test.mjs
```

The manifest deliberately exposes only A0/A1 commands until an A4 packet passes
deterministic validation. It records Omnigent as a `transport-policy-host`:
useful for common session APIs, policies, collaboration, and sandbox routing,
but not a replacement for CREATE SOMETHING's authority model.

The read-only scout profile is the first live-trial shape. The checked-in
fixture proves the receipt contract before Omnigent is installed on a host:
`signal`, `context`, `policy`, `action`, `validation`, `rollback`,
`nextDecision`, and `evidenceTarget` must all be present, `writesPerformed`
must stay `0`, and the receipt must mirror to Linear. A live Omnigent run that
cannot produce the same fields stops before any write commands are exposed.

Before any real high-risk action is exposed through Omnigent, validate the
approval packet:

```bash
node scripts/operator-agent-omnigent-adapter.mjs approval-check \
  --packet <packet.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The packet must bind to the same Linear issue, target, and action that the
harness is about to execute. It must also include `approvedAt` and `expiresAt`
timestamps, and it must remain within the validator freshness window. The packet
must name exact risks for credentials, billing, client production, destructive
writes, and irreversible data. A packet that omits one of those risks, mismatches
the expected target/action, is stale, is expired, or lacks rollback/smoke/stop
conditions fails closed even if the operator approved a related action.

After the packet validates, produce a dry-run preflight receipt before any
execution path is exposed:

```bash
node scripts/operator-agent-omnigent-adapter.mjs preflight-check \
  --packet <packet.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The preflight receipt must keep `wouldExecute` as `false` and `writesPerformed`
as `0`. It may name the execution, validation, smoke, rollback, and stop
condition plans, but it must not run them. A failed admission packet produces an
empty execution plan and remains a stop condition.

After preflight, validate the disabled execution receipt schema. This remains a
closed gate until a separate operator execution approval is recorded for the
same issue, target, action, packet, and preflight receipt:

```bash
node scripts/operator-agent-omnigent-adapter.mjs execution-receipt-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The execution receipt check must keep `executionEnabled`, `executionApproved`,
and `wouldExecute` as `false`, with `writesPerformed` at `0`. It validates that
the preflight receipt matches the packet, but it does not run the action. A
failed or mismatched preflight receipt produces empty execution plans and remains
a stop condition.

After the disabled execution receipt validates, bind a separate execution
authorization artifact to the same packet, preflight receipt, and execution
receipt:

```bash
node scripts/operator-agent-omnigent-adapter.mjs execution-authorization-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The authorization artifact must use an allowed approval surface, name the exact
A4 risks, and bind to the same issue, target, action, packet, preflight receipt,
and disabled execution receipt. A valid authorization only proves that the
operator authorization artifact is admissible. It still keeps
`executionEnabled`, `executionApproved`, `wouldExecute`, and `writesPerformed`
closed at `false`, `false`, `false`, and `0` until a separate explicit
execution command revalidates the authorization immediately before acting.

## Regression Cadence

Run the A3 proof check and deterministic heal test before any A4 packet work:

```bash
node scripts/operator-agent-a3-ownership-proof.mjs check --json
node --test scripts/test/operator-agent-a3-ownership-proof.test.mjs
node scripts/operator-agent-omnigent-adapter.mjs check --json
node scripts/operator-agent-omnigent-adapter.mjs trial-check --json
node --test scripts/test/operator-agent-omnigent-adapter.test.mjs
```

For production execution, add the target-specific validation, deployment or
write command, post-action smoke, and rollback receipt to the same Linear issue.
