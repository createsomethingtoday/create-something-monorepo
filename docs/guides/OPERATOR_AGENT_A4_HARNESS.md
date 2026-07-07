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

After authorization, admit an explicit execution command artifact. This is still
not a runner; it proves only that the command request binds to the same
authorization chain:

```bash
node scripts/operator-agent-omnigent-adapter.mjs execution-command-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The command artifact must bind to the same issue, target, action, packet,
preflight receipt, disabled execution receipt, and authorization artifact. It
must use an allowed command surface and execution mode. A valid command artifact
sets `commandOk` to `true`, but `executionReady`, `executionEnabled`,
`executionApproved`, `wouldExecute`, and `writesPerformed` remain closed because
the manifest keeps `authority.a4Execution` as `blocked` and the command runner
as disabled.

After command admission, produce a disabled executor proof before any runner
implementation can spawn a process:

```bash
node scripts/operator-agent-omnigent-adapter.mjs executor-proof-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The proof revalidates the whole chain and rejects any command receipt that
claims a runner is enabled, execution is ready, a process was spawned, or
commands were executed. A valid proof sets `executorProofOk` to `true`, but it
also records `runnerBlocked`, `processSpawned`, `executedCommands`,
`executionReady`, `executionEnabled`, `wouldExecute`, and `writesPerformed` as
`true`, `false`, `[]`, `false`, `false`, `false`, and `0`. This is the final
fail-closed receipt before any future operator-approved policy change can enable
a narrowly scoped executor with rollback and smoke proof.

After the disabled executor proof, validate the proposed policy patch before
any PR or operator action applies it:

```bash
node scripts/operator-agent-omnigent-adapter.mjs executor-enable-proposal-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The enablement proposal names the exact future policy patch, target scope,
write ceiling, rollback proof, post-action smoke proof, and public access
fail-closed proof that must exist before a later PR can enable the runner. A
valid proposal sets `enablementProposalOk` to `true`, but it still records
`policyChangeApplied`, `runnerEnabled`, `executionReady`, `executionEnabled`,
`wouldExecute`, and `writesPerformed` as `false`, `false`, `false`, `false`,
`false`, and `0`. The proposal check does not edit the manifest and does not
grant execution authority.

After the proposal receipt exists, validate the exact policy patch as a dry run
before any PR applies it:

```bash
node scripts/operator-agent-omnigent-adapter.mjs policy-patch-dry-run-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The policy-patch dry run must match the proposal receipt's
`proposedPolicyPatch` exactly and may preview only
`authority.a4Execution`, `a4ExecutionCommand.runnerEnabled`, and
`a4ExecutorProof.runnerEnabled`. It must also keep `dryRunOnly` as `true`,
`policyFileChanged` and `policyChangeApplied` as `false`, and
`writesPerformed` as `0`. A valid dry-run receipt still records
`runnerEnabled`, `executionReady`, `executionEnabled`, `wouldExecute`, and
`writesPerformed` as `false`, `false`, `false`, `false`, and `0`. This gate
validates what a later operator-reviewed PR would change; it does not change the
checked-in manifest or grant execution authority.

After the dry-run receipt exists, a future policy-application PR can validate
its candidate manifest against the exact reviewed patch before applying it:

```bash
node scripts/operator-agent-omnigent-adapter.mjs policy-application-diff-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The application diff verifier compares the current blocked manifest to the
candidate manifest after applying the dry-run receipt's `policyPatchPreview` in
memory. It accepts only that exact diff and rejects unrelated manifest edits,
missing runner fields, missing required rollback/smoke/public fail-closed
proofs, drifted dry-run receipts, or verifier artifacts that claim execution
already happened. A valid diff receipt still keeps `policyChangeApplied`,
`runnerEnabled`, `executionReady`, `executionEnabled`, `wouldExecute`, and
`writesPerformed` as `false`, `false`, `false`, `false`, `false`, and `0` in
the verifier PR.

After the application diff receipt validates, inspect the candidate enabled
manifest for readiness without spawning a runner:

```bash
node scripts/operator-agent-omnigent-adapter.mjs enabled-manifest-readiness-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

This readiness gate proves only that the candidate manifest would enable
`authority.a4Execution`, `a4ExecutionCommand.runnerEnabled`, and
`a4ExecutorProof.runnerEnabled` after the verified policy patch. The current
checked-in manifest must still be blocked, `processSpawned` must be `false`,
`executedCommands` must be `[]`, and `wouldExecute` plus `writesPerformed` must
remain `false` and `0`. A later implementation PR still needs to add a runner
that revalidates the whole chain immediately before any write.

After the enabled-manifest readiness receipt exists, validate the future runner
implementation contract before adding any runner path:

```bash
node scripts/operator-agent-omnigent-adapter.mjs runner-implementation-contract-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The runner implementation contract must require immediate full-chain
revalidation before any write, a checked-in enabled policy, command receipt
binding, `maxWritesPerRun` of `1`, rollback proof, post-action smoke proof, and
public-access fail-closed proof. While the checked-in manifest is still blocked,
the contract verifier must keep `processSpawned` as `false`,
`executedCommands` as `[]`, `runnerEnabled`, `executionReady`,
`executionEnabled`, and `wouldExecute` as `false`, and `writesPerformed` as `0`.
It rejects contracts that claim execution already happened, allow execution
while current policy is blocked, omit public fail-closed proof, or loosen the
write ceiling. A later implementation PR must still prove the checked-in policy
is enabled and rerun this full chain immediately before any write.

After the runner implementation contract receipt exists, validate the future
runner implementation plan before adding any executable entrypoint:

```bash
node scripts/operator-agent-omnigent-adapter.mjs runner-implementation-plan-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The runner implementation plan must stay plan-only. It may name the future
entrypoint, guards, revalidation sequence, rollback plan, post-action smoke
plan, public-access fail-closed plan, stop conditions, and receipt outputs, but
it must not add an executable entrypoint or claim execution readiness. The
verifier requires guards for checked-in policy enablement, full-chain
revalidation, command receipt binding, write ceiling enforcement, rollback,
post-action smoke, public fail-closed proof, mismatch stops, expiry stops, and
drift stops. While the current manifest is blocked, `processSpawned` must be
`false`, `executedCommands` must be `[]`, `runnerEnabled`, `executionReady`,
`executionEnabled`, and `wouldExecute` must be `false`, and `writesPerformed`
must be `0`.

After the runner implementation plan receipt exists, validate the candidate
implementation diff before a PR adds the executable entrypoint:

```bash
node scripts/operator-agent-omnigent-adapter.mjs runner-implementation-diff-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The runner implementation diff verifier is still candidate-only. It validates
that the future PR would add only the planned entrypoint,
`scripts/operator-agent-omnigent-runner.mjs`, with the same guards,
revalidation sequence, proof hooks, and receipt outputs from the accepted plan.
It rejects unrelated file additions, any claim that the entrypoint is already
checked in, missing rollback/smoke/public fail-closed hooks, loosened write
ceilings, and any process or command execution markers.

After the candidate runner diff receipt exists, validate the release admission
packet before merging any policy or runner PR:

```bash
node scripts/operator-agent-omnigent-adapter.mjs release-admission-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The release admission packet binds the candidate enabled-manifest readiness
receipt, candidate runner diff receipt, policy PR evidence, runner PR evidence,
manual merge order, rollback note, Linear evidence, and public-access
fail-closed proof into a single review artifact. It requires the policy-enabled
manifest PR to merge before the runner-entrypoint PR and requires both PRs to
report successful checks and merge readiness. It is not an execution command:
the checked-in manifest remains blocked, `processSpawned` is `false`,
`executedCommands` is `[]`, `runnerEnabled`, `executionReady`,
`executionEnabled`, and `wouldExecute` remain `false`, and `writesPerformed`
remains `0`.

After the release admission receipt exists, validate the future supervised
execution runbook:

```bash
node scripts/operator-agent-omnigent-adapter.mjs execution-runbook-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The execution runbook is still runbook-only. It must name the target validation
commands, approved write command, post-action smoke commands, rollback
commands, public-access fail-closed proof, final receipt outputs, stop
conditions, Linear evidence, and `maxWritesPerRun` of `1`. It rejects runbooks
that skip target validation, omit rollback or smoke, drop final receipt outputs,
loosen the write ceiling, request auto execution, or claim process/command
execution while the checked-in manifest is blocked. This gate does not spawn the
runner and does not execute the write command.

After the execution runbook receipt exists, validate the shareable receipt
bundle for asynchronous operator review:

```bash
node scripts/operator-agent-omnigent-adapter.mjs receipt-bundle-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --execution-runbook-receipt <execution-runbook-receipt.json> \
  --receipt-bundle <receipt-bundle.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The receipt bundle is the "share only the receipts" artifact. It must reference
the full validated receipt chain, include Linear evidence, GitHub check
evidence, public-access fail-closed proof, a redaction policy, and an operator
summary. It must be `shareable`, `bundleOnly`, and redaction-applied, and it
must explicitly report `containsSecrets`, `containsRawLogs`, `containsPrompts`,
`rawLogsIncluded`, `promptsIncluded`, and `rawTranscriptIncluded` as false. The
gate rejects missing receipt references, unredacted references, leaked prompts
or logs, stale execution-runbook receipts, and any claim that a runner process,
command, approval, or write occurred. This is still a review artifact only:
checked-in `authority.a4Execution` remains blocked.

After the receipt bundle receipt exists, validate the manual publication packet
that says where the redacted bundle may be shared:

```bash
node scripts/operator-agent-omnigent-adapter.mjs receipt-publication-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --execution-runbook-receipt <execution-runbook-receipt.json> \
  --receipt-bundle <receipt-bundle.json> \
  --receipt-bundle-receipt <receipt-bundle-receipt.json> \
  --receipt-publication <receipt-publication.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The receipt publication packet is not a publisher. It validates that the
operator intends to share the redacted bundle only through an allowed surface
(`Linear` or `signed-release-record`), with an intended audience, publication
evidence, public-access fail-closed proof, redaction policy, and no-execution
markers. It rejects auto-publish claims, completed publication claims,
third-party write claims, leaked raw artifacts, stale receipt-bundle receipts,
missing audience, or any process/command/write marker. The verifier does not
post to Linear, write a signed record, deploy, rotate secrets, or mutate any
third-party system.

After the receipt publication receipt exists, validate the operator review
decision packet:

```bash
node scripts/operator-agent-omnigent-adapter.mjs receipt-review-decision-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --execution-runbook-receipt <execution-runbook-receipt.json> \
  --receipt-bundle <receipt-bundle.json> \
  --receipt-bundle-receipt <receipt-bundle-receipt.json> \
  --receipt-publication <receipt-publication.json> \
  --receipt-publication-receipt <receipt-publication-receipt.json> \
  --receipt-review-decision <receipt-review-decision.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The review decision packet records the human judgment after the receipt bundle
has been made available for review. Allowed decisions are
`approved-for-manual-next-step`, `changes-requested`, `rejected`, and
`blocked`. Even an approved decision is review-only evidence: it must name the
reviewer, timestamp, reviewed surfaces, public-access fail-closed proof,
redaction policy, operator summary, and the next manual step, while keeping
`authority.a4Execution` blocked and all execution markers false. The verifier
rejects unknown decisions, missing reviewer or timestamp, missing reviewed
surfaces, leaked raw artifacts, stale publication receipts, and any claim that
approval caused execution, posting, runner enablement, or writes.

After an approved receipt-review decision exists, validate the manual next-step
handoff packet:

```bash
node scripts/operator-agent-omnigent-adapter.mjs manual-next-step-handoff-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --execution-runbook-receipt <execution-runbook-receipt.json> \
  --receipt-bundle <receipt-bundle.json> \
  --receipt-bundle-receipt <receipt-bundle-receipt.json> \
  --receipt-publication <receipt-publication.json> \
  --receipt-publication-receipt <receipt-publication-receipt.json> \
  --receipt-review-decision <receipt-review-decision.json> \
  --receipt-review-decision-receipt <receipt-review-decision-receipt.json> \
  --manual-next-step-handoff <manual-next-step-handoff.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The manual next-step handoff packet turns an approved review decision into a
human-readable follow-up issue proposal for an operator. It must include the
approved receipt-review-decision receipt, proposed issue title and body, owner,
required receipt references, public-access fail-closed proof, redaction policy,
operator summary, and explicit no-execution markers. It is not an issue
creator, poster, runner, deployer, or production writer. The verifier rejects
unapproved or drifted review receipts, missing owner or proposed issue fields,
issue-created claims, Linear-created claims, third-party write claims, leaked
secrets, raw logs, prompts, raw transcripts, and any process/command/write
marker. `authority.a4Execution` remains blocked.

After the operator manually creates the proposed follow-up issue, validate the
issue evidence packet:

```bash
node scripts/operator-agent-omnigent-adapter.mjs manual-follow-up-issue-evidence-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --execution-runbook-receipt <execution-runbook-receipt.json> \
  --receipt-bundle <receipt-bundle.json> \
  --receipt-bundle-receipt <receipt-bundle-receipt.json> \
  --receipt-publication <receipt-publication.json> \
  --receipt-publication-receipt <receipt-publication-receipt.json> \
  --receipt-review-decision <receipt-review-decision.json> \
  --receipt-review-decision-receipt <receipt-review-decision-receipt.json> \
  --manual-next-step-handoff <manual-next-step-handoff.json> \
  --manual-next-step-handoff-receipt <manual-next-step-handoff-receipt.json> \
  --manual-follow-up-issue-evidence <manual-follow-up-issue-evidence.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The manual follow-up issue evidence packet proves that an operator-created
Linear issue matches the approved handoff. It must include the handoff receipt,
issue identifier, issue URL, created-by, created-at, owner, created issue title
and labels, required receipt references, public-access fail-closed proof,
redaction policy, operator summary, and explicit no-execution markers. This
gate does not call Linear, create the issue, post a comment, enable a runner,
deploy, rotate secrets, or mutate any third-party system. It rejects mismatched
issue metadata, missing owner or creation evidence, verifier-created issue
claims, verifier posting/write claims, leaked raw artifacts, stale handoff
receipts, and any process/command/write marker. `authority.a4Execution` remains
blocked.

After the follow-up issue evidence is accepted, validate the scoped work intake
packet:

```bash
node scripts/operator-agent-omnigent-adapter.mjs follow-up-work-intake-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --execution-runbook-receipt <execution-runbook-receipt.json> \
  --receipt-bundle <receipt-bundle.json> \
  --receipt-bundle-receipt <receipt-bundle-receipt.json> \
  --receipt-publication <receipt-publication.json> \
  --receipt-publication-receipt <receipt-publication-receipt.json> \
  --receipt-review-decision <receipt-review-decision.json> \
  --receipt-review-decision-receipt <receipt-review-decision-receipt.json> \
  --manual-next-step-handoff <manual-next-step-handoff.json> \
  --manual-next-step-handoff-receipt <manual-next-step-handoff-receipt.json> \
  --manual-follow-up-issue-evidence <manual-follow-up-issue-evidence.json> \
  --manual-follow-up-issue-evidence-receipt <manual-follow-up-issue-evidence-receipt.json> \
  --follow-up-work-intake <follow-up-work-intake.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The follow-up work intake packet turns the manually created issue into a
bounded implementation intake record. It must include the manual issue evidence
receipt, issue identifier and URL, owner, intended assignee, implementation
surface, scoped files or modules, validation plan, rollback plan,
public-access fail-closed proof, redaction policy, operator summary, and
explicit no-execution markers. This gate does not claim the issue, create a
worktree, create a branch, open a PR, enable a runner, deploy, rotate secrets,
or mutate any third-party system. It rejects mismatched issue evidence, empty
scope, missing validation or rollback plans, verifier-created claim/worktree/
branch/PR claims, verifier third-party write claims, leaked raw artifacts,
stale evidence receipts, and any process/command/write marker.
`authority.a4Execution` remains blocked.

After an operator claims the follow-up issue and prepares an isolated workspace,
validate the workspace evidence packet:

```bash
node scripts/operator-agent-omnigent-adapter.mjs implementation-workspace-evidence-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --execution-runbook-receipt <execution-runbook-receipt.json> \
  --receipt-bundle <receipt-bundle.json> \
  --receipt-bundle-receipt <receipt-bundle-receipt.json> \
  --receipt-publication <receipt-publication.json> \
  --receipt-publication-receipt <receipt-publication-receipt.json> \
  --receipt-review-decision <receipt-review-decision.json> \
  --receipt-review-decision-receipt <receipt-review-decision-receipt.json> \
  --manual-next-step-handoff <manual-next-step-handoff.json> \
  --manual-next-step-handoff-receipt <manual-next-step-handoff-receipt.json> \
  --manual-follow-up-issue-evidence <manual-follow-up-issue-evidence.json> \
  --manual-follow-up-issue-evidence-receipt <manual-follow-up-issue-evidence-receipt.json> \
  --follow-up-work-intake <follow-up-work-intake.json> \
  --follow-up-work-intake-receipt <follow-up-work-intake-receipt.json> \
  --implementation-workspace-evidence <implementation-workspace-evidence.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The implementation workspace evidence packet proves an operator-prepared issue
claim, worktree path, branch name, base ref, base SHA, implementation surface,
scope, validation plan, rollback plan, public-access fail-closed proof,
redaction policy, and operator summary. It is still receipt-only: the verifier
does not claim the issue, create the worktree, create the branch, open a PR,
enable a runner, deploy, rotate secrets, expose raw artifacts, or mutate any
third-party system. It rejects drifted intake receipts, missing workspace or
base evidence, invalid base SHAs, implementation-surface drift, scope gaps,
verifier-created claim/worktree/branch/PR markers, verifier third-party write
claims, leaked raw artifacts, and any process/command/write marker.
`authority.a4Execution` remains blocked.

After an operator opens the implementation PR and checks finish, validate the
PR evidence packet:

```bash
node scripts/operator-agent-omnigent-adapter.mjs implementation-pr-evidence-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --execution-runbook-receipt <execution-runbook-receipt.json> \
  --receipt-bundle <receipt-bundle.json> \
  --receipt-bundle-receipt <receipt-bundle-receipt.json> \
  --receipt-publication <receipt-publication.json> \
  --receipt-publication-receipt <receipt-publication-receipt.json> \
  --receipt-review-decision <receipt-review-decision.json> \
  --receipt-review-decision-receipt <receipt-review-decision-receipt.json> \
  --manual-next-step-handoff <manual-next-step-handoff.json> \
  --manual-next-step-handoff-receipt <manual-next-step-handoff-receipt.json> \
  --manual-follow-up-issue-evidence <manual-follow-up-issue-evidence.json> \
  --manual-follow-up-issue-evidence-receipt <manual-follow-up-issue-evidence-receipt.json> \
  --follow-up-work-intake <follow-up-work-intake.json> \
  --follow-up-work-intake-receipt <follow-up-work-intake-receipt.json> \
  --implementation-workspace-evidence <implementation-workspace-evidence.json> \
  --implementation-workspace-evidence-receipt <implementation-workspace-evidence-receipt.json> \
  --implementation-pr-evidence <implementation-pr-evidence.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The implementation PR evidence packet proves an operator-opened draft PR with
matching issue, PR URL and number, title, head ref, base ref, head SHA, commit
SHA, merge state, check conclusions, changed files or modules, validation plan,
rollback plan, public-access fail-closed proof, redaction policy, and operator
summary. It remains evidence-only: the verifier does not create the PR, mark it
ready for review, merge it, enable a runner, deploy, rotate secrets, expose raw
artifacts, or mutate any third-party system. It rejects drifted workspace
receipts, invalid PR URLs, failed checks, scope gaps, verifier-created PR
markers, ready-for-review or merge markers, verifier third-party write claims,
leaked raw artifacts, and any process/command/write marker.
`authority.a4Execution` remains blocked.

After PR evidence validates, record an operator merge or promotion decision:

```bash
node scripts/operator-agent-omnigent-adapter.mjs implementation-merge-decision-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --execution-runbook-receipt <execution-runbook-receipt.json> \
  --receipt-bundle <receipt-bundle.json> \
  --receipt-bundle-receipt <receipt-bundle-receipt.json> \
  --receipt-publication <receipt-publication.json> \
  --receipt-publication-receipt <receipt-publication-receipt.json> \
  --receipt-review-decision <receipt-review-decision.json> \
  --receipt-review-decision-receipt <receipt-review-decision-receipt.json> \
  --manual-next-step-handoff <manual-next-step-handoff.json> \
  --manual-next-step-handoff-receipt <manual-next-step-handoff-receipt.json> \
  --manual-follow-up-issue-evidence <manual-follow-up-issue-evidence.json> \
  --manual-follow-up-issue-evidence-receipt <manual-follow-up-issue-evidence-receipt.json> \
  --follow-up-work-intake <follow-up-work-intake.json> \
  --follow-up-work-intake-receipt <follow-up-work-intake-receipt.json> \
  --implementation-workspace-evidence <implementation-workspace-evidence.json> \
  --implementation-workspace-evidence-receipt <implementation-workspace-evidence-receipt.json> \
  --implementation-pr-evidence <implementation-pr-evidence.json> \
  --implementation-pr-evidence-receipt <implementation-pr-evidence-receipt.json> \
  --implementation-merge-decision <implementation-merge-decision.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The implementation merge decision packet proves an operator reviewed the PR
evidence and chose `approved-for-manual-merge`, `hold`, or `request-changes`.
It must bind to the same PR URL, PR number, head ref, base ref, commit SHA,
merge state, checks, validation evidence, rollback plan, public-access
fail-closed proof, redaction policy, and operator summary. This gate still does
not mark a PR ready for review, merge it, deploy it, enable a runner, rotate
secrets, expose raw artifacts, or mutate any third-party system. It rejects
unsupported decisions, drifted PR evidence receipts, failing checks, missing
validation or rollback evidence, verifier ready/merge/deploy markers, verifier
third-party write claims, leaked raw artifacts, and any process/command/write
marker. `authority.a4Execution` remains blocked.

After an approved merge decision and operator-performed merge or promotion,
validate the manual merge evidence packet:

```bash
node scripts/operator-agent-omnigent-adapter.mjs implementation-merge-evidence-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --execution-runbook-receipt <execution-runbook-receipt.json> \
  --receipt-bundle <receipt-bundle.json> \
  --receipt-bundle-receipt <receipt-bundle-receipt.json> \
  --receipt-publication <receipt-publication.json> \
  --receipt-publication-receipt <receipt-publication-receipt.json> \
  --receipt-review-decision <receipt-review-decision.json> \
  --receipt-review-decision-receipt <receipt-review-decision-receipt.json> \
  --manual-next-step-handoff <manual-next-step-handoff.json> \
  --manual-next-step-handoff-receipt <manual-next-step-handoff-receipt.json> \
  --manual-follow-up-issue-evidence <manual-follow-up-issue-evidence.json> \
  --manual-follow-up-issue-evidence-receipt <manual-follow-up-issue-evidence-receipt.json> \
  --follow-up-work-intake <follow-up-work-intake.json> \
  --follow-up-work-intake-receipt <follow-up-work-intake-receipt.json> \
  --implementation-workspace-evidence <implementation-workspace-evidence.json> \
  --implementation-workspace-evidence-receipt <implementation-workspace-evidence-receipt.json> \
  --implementation-pr-evidence <implementation-pr-evidence.json> \
  --implementation-pr-evidence-receipt <implementation-pr-evidence-receipt.json> \
  --implementation-merge-decision <implementation-merge-decision.json> \
  --implementation-merge-decision-receipt <implementation-merge-decision-receipt.json> \
  --implementation-merge-evidence <implementation-merge-evidence.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The implementation merge evidence packet proves an operator manually merged or
promoted the implementation PR after an `approved-for-manual-merge` decision.
It must bind to the same PR URL, PR number, head ref, base ref, commit SHA, a
merge commit SHA, merge state, checks, validation evidence, rollback plan,
public-access fail-closed proof, redaction policy, and operator summary. This
gate still does not mark a PR ready for review, merge it, deploy it, enable a
runner, rotate secrets, expose raw artifacts, or mutate any third-party system.
It rejects drifted merge-decision receipts, non-approved decisions, invalid
merge SHAs, failing checks, missing validation or rollback evidence, verifier
ready/merge/deploy markers, verifier third-party write claims, leaked raw
artifacts, and any process/command/write marker. `authority.a4Execution`
remains blocked.

After manual merge evidence validates, record the operator's post-merge
validation evidence:

```bash
node scripts/operator-agent-omnigent-adapter.mjs implementation-post-merge-validation-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --execution-runbook-receipt <execution-runbook-receipt.json> \
  --receipt-bundle <receipt-bundle.json> \
  --receipt-bundle-receipt <receipt-bundle-receipt.json> \
  --receipt-publication <receipt-publication.json> \
  --receipt-publication-receipt <receipt-publication-receipt.json> \
  --receipt-review-decision <receipt-review-decision.json> \
  --receipt-review-decision-receipt <receipt-review-decision-receipt.json> \
  --manual-next-step-handoff <manual-next-step-handoff.json> \
  --manual-next-step-handoff-receipt <manual-next-step-handoff-receipt.json> \
  --manual-follow-up-issue-evidence <manual-follow-up-issue-evidence.json> \
  --manual-follow-up-issue-evidence-receipt <manual-follow-up-issue-evidence-receipt.json> \
  --follow-up-work-intake <follow-up-work-intake.json> \
  --follow-up-work-intake-receipt <follow-up-work-intake-receipt.json> \
  --implementation-workspace-evidence <implementation-workspace-evidence.json> \
  --implementation-workspace-evidence-receipt <implementation-workspace-evidence-receipt.json> \
  --implementation-pr-evidence <implementation-pr-evidence.json> \
  --implementation-pr-evidence-receipt <implementation-pr-evidence-receipt.json> \
  --implementation-merge-decision <implementation-merge-decision.json> \
  --implementation-merge-decision-receipt <implementation-merge-decision-receipt.json> \
  --implementation-merge-evidence <implementation-merge-evidence.json> \
  --implementation-merge-evidence-receipt <implementation-merge-evidence-receipt.json> \
  --implementation-post-merge-validation <implementation-post-merge-validation.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The implementation post-merge validation packet proves an operator ran checks
and smoke validation after the implementation PR was manually merged. It must
bind to the same PR URL, PR number, head ref, base ref, commit SHA, merge
commit SHA, check conclusions, post-merge checks, smoke evidence, validation
evidence, rollback plan, public-access fail-closed proof, redaction policy, and
operator summary. This gate still does not deploy, enable a runner, rotate
secrets, expose raw artifacts, or mutate any third-party system. It rejects
drifted merge-evidence receipts, failed post-merge checks, missing smoke or
rollback evidence, verifier deploy markers, verifier third-party write claims,
leaked raw artifacts, and any process/command/write marker.
`authority.a4Execution` remains blocked.

After post-merge validation evidence passes, record the production release
decision packet:

```bash
node scripts/operator-agent-omnigent-adapter.mjs implementation-production-release-decision-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --execution-runbook-receipt <execution-runbook-receipt.json> \
  --receipt-bundle <receipt-bundle.json> \
  --receipt-bundle-receipt <receipt-bundle-receipt.json> \
  --receipt-publication <receipt-publication.json> \
  --receipt-publication-receipt <receipt-publication-receipt.json> \
  --receipt-review-decision <receipt-review-decision.json> \
  --receipt-review-decision-receipt <receipt-review-decision-receipt.json> \
  --manual-next-step-handoff <manual-next-step-handoff.json> \
  --manual-next-step-handoff-receipt <manual-next-step-handoff-receipt.json> \
  --manual-follow-up-issue-evidence <manual-follow-up-issue-evidence.json> \
  --manual-follow-up-issue-evidence-receipt <manual-follow-up-issue-evidence-receipt.json> \
  --follow-up-work-intake <follow-up-work-intake.json> \
  --follow-up-work-intake-receipt <follow-up-work-intake-receipt.json> \
  --implementation-workspace-evidence <implementation-workspace-evidence.json> \
  --implementation-workspace-evidence-receipt <implementation-workspace-evidence-receipt.json> \
  --implementation-pr-evidence <implementation-pr-evidence.json> \
  --implementation-pr-evidence-receipt <implementation-pr-evidence-receipt.json> \
  --implementation-merge-decision <implementation-merge-decision.json> \
  --implementation-merge-decision-receipt <implementation-merge-decision-receipt.json> \
  --implementation-merge-evidence <implementation-merge-evidence.json> \
  --implementation-merge-evidence-receipt <implementation-merge-evidence-receipt.json> \
  --implementation-post-merge-validation <implementation-post-merge-validation.json> \
  --implementation-post-merge-validation-receipt <implementation-post-merge-validation-receipt.json> \
  --implementation-production-release-decision <implementation-production-release-decision.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The implementation production release decision packet proves an operator
reviewed post-merge validation evidence and chose `approved-for-manual-release`,
`hold`, or `request-changes`. It must bind to the same PR URL, PR number,
commit SHA, merge commit SHA, checks, post-merge checks, smoke evidence,
validation evidence, rollback plan, public-access fail-closed proof, redaction
policy, and operator summary. This gate still does not deploy, enable a runner,
rotate secrets, expose raw artifacts, or mutate any third-party system. It
rejects drifted post-merge validation receipts, unsupported decisions, failed
checks, missing smoke or rollback evidence, verifier deploy markers, verifier
third-party write claims, leaked raw artifacts, and any process/command/write
marker. `authority.a4Execution` remains blocked.

After an `approved-for-manual-release` decision exists, record the production
release admission packet:

```bash
node scripts/operator-agent-omnigent-adapter.mjs implementation-production-release-admission-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --execution-runbook-receipt <execution-runbook-receipt.json> \
  --receipt-bundle <receipt-bundle.json> \
  --receipt-bundle-receipt <receipt-bundle-receipt.json> \
  --receipt-publication <receipt-publication.json> \
  --receipt-publication-receipt <receipt-publication-receipt.json> \
  --receipt-review-decision <receipt-review-decision.json> \
  --receipt-review-decision-receipt <receipt-review-decision-receipt.json> \
  --manual-next-step-handoff <manual-next-step-handoff.json> \
  --manual-next-step-handoff-receipt <manual-next-step-handoff-receipt.json> \
  --manual-follow-up-issue-evidence <manual-follow-up-issue-evidence.json> \
  --manual-follow-up-issue-evidence-receipt <manual-follow-up-issue-evidence-receipt.json> \
  --follow-up-work-intake <follow-up-work-intake.json> \
  --follow-up-work-intake-receipt <follow-up-work-intake-receipt.json> \
  --implementation-workspace-evidence <implementation-workspace-evidence.json> \
  --implementation-workspace-evidence-receipt <implementation-workspace-evidence-receipt.json> \
  --implementation-pr-evidence <implementation-pr-evidence.json> \
  --implementation-pr-evidence-receipt <implementation-pr-evidence-receipt.json> \
  --implementation-merge-decision <implementation-merge-decision.json> \
  --implementation-merge-decision-receipt <implementation-merge-decision-receipt.json> \
  --implementation-merge-evidence <implementation-merge-evidence.json> \
  --implementation-merge-evidence-receipt <implementation-merge-evidence-receipt.json> \
  --implementation-post-merge-validation <implementation-post-merge-validation.json> \
  --implementation-post-merge-validation-receipt <implementation-post-merge-validation-receipt.json> \
  --implementation-production-release-decision <implementation-production-release-decision.json> \
  --implementation-production-release-decision-receipt <implementation-production-release-decision-receipt.json> \
  --implementation-production-release-admission <implementation-production-release-admission.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The implementation production release admission packet proves an operator bound
an approved manual release decision to a release environment and release window.
It must bind to the same issue, PR URL, PR number, commit SHA, merge commit SHA,
checks, post-merge checks, smoke evidence, validation evidence, rollback plan,
public-access fail-closed proof, redaction policy, and operator summary. This
gate still does not deploy, enable a runner, rotate secrets, expose raw
artifacts, or mutate any third-party system. It rejects drifted production
release decision receipts, non-approved release decisions, failed checks,
missing release-window evidence, verifier deploy markers, verifier third-party
write claims, leaked raw artifacts, and any process/command/write marker.
`authority.a4Execution` remains blocked.

After release admission evidence passes, record the production deploy evidence
packet:

```bash
node scripts/operator-agent-omnigent-adapter.mjs implementation-production-deploy-evidence-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --execution-runbook-receipt <execution-runbook-receipt.json> \
  --receipt-bundle <receipt-bundle.json> \
  --receipt-bundle-receipt <receipt-bundle-receipt.json> \
  --receipt-publication <receipt-publication.json> \
  --receipt-publication-receipt <receipt-publication-receipt.json> \
  --receipt-review-decision <receipt-review-decision.json> \
  --receipt-review-decision-receipt <receipt-review-decision-receipt.json> \
  --manual-next-step-handoff <manual-next-step-handoff.json> \
  --manual-next-step-handoff-receipt <manual-next-step-handoff-receipt.json> \
  --manual-follow-up-issue-evidence <manual-follow-up-issue-evidence.json> \
  --manual-follow-up-issue-evidence-receipt <manual-follow-up-issue-evidence-receipt.json> \
  --follow-up-work-intake <follow-up-work-intake.json> \
  --follow-up-work-intake-receipt <follow-up-work-intake-receipt.json> \
  --implementation-workspace-evidence <implementation-workspace-evidence.json> \
  --implementation-workspace-evidence-receipt <implementation-workspace-evidence-receipt.json> \
  --implementation-pr-evidence <implementation-pr-evidence.json> \
  --implementation-pr-evidence-receipt <implementation-pr-evidence-receipt.json> \
  --implementation-merge-decision <implementation-merge-decision.json> \
  --implementation-merge-decision-receipt <implementation-merge-decision-receipt.json> \
  --implementation-merge-evidence <implementation-merge-evidence.json> \
  --implementation-merge-evidence-receipt <implementation-merge-evidence-receipt.json> \
  --implementation-post-merge-validation <implementation-post-merge-validation.json> \
  --implementation-post-merge-validation-receipt <implementation-post-merge-validation-receipt.json> \
  --implementation-production-release-decision <implementation-production-release-decision.json> \
  --implementation-production-release-decision-receipt <implementation-production-release-decision-receipt.json> \
  --implementation-production-release-admission <implementation-production-release-admission.json> \
  --implementation-production-release-admission-receipt <implementation-production-release-admission-receipt.json> \
  --implementation-production-deploy-evidence <implementation-production-deploy-evidence.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The implementation production deploy evidence packet proves an operator
performed the admitted production deployment and attached redacted deployment
proof, post-deploy smoke proof, production validation proof, rollback plan, and
public-access fail-closed proof. It must bind to the same issue, release
environment, release window, PR URL, PR number, commit SHA, merge commit SHA,
checks, and post-merge checks as the release admission receipt. This gate still
does not deploy, enable a runner, rotate secrets, expose raw artifacts, or
mutate any third-party system. It rejects drifted release admission receipts,
missing deployment identifiers, failed checks, missing production smoke or
validation evidence, verifier deploy markers, verifier third-party write
claims, leaked raw artifacts, and any process/command/write marker.
`authority.a4Execution` remains blocked.

After production deploy evidence passes, record the post-deploy validation
packet:

```bash
node scripts/operator-agent-omnigent-adapter.mjs implementation-production-post-deploy-validation-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --execution-runbook-receipt <execution-runbook-receipt.json> \
  --receipt-bundle <receipt-bundle.json> \
  --receipt-bundle-receipt <receipt-bundle-receipt.json> \
  --receipt-publication <receipt-publication.json> \
  --receipt-publication-receipt <receipt-publication-receipt.json> \
  --receipt-review-decision <receipt-review-decision.json> \
  --receipt-review-decision-receipt <receipt-review-decision-receipt.json> \
  --manual-next-step-handoff <manual-next-step-handoff.json> \
  --manual-next-step-handoff-receipt <manual-next-step-handoff-receipt.json> \
  --manual-follow-up-issue-evidence <manual-follow-up-issue-evidence.json> \
  --manual-follow-up-issue-evidence-receipt <manual-follow-up-issue-evidence-receipt.json> \
  --follow-up-work-intake <follow-up-work-intake.json> \
  --follow-up-work-intake-receipt <follow-up-work-intake-receipt.json> \
  --implementation-workspace-evidence <implementation-workspace-evidence.json> \
  --implementation-workspace-evidence-receipt <implementation-workspace-evidence-receipt.json> \
  --implementation-pr-evidence <implementation-pr-evidence.json> \
  --implementation-pr-evidence-receipt <implementation-pr-evidence-receipt.json> \
  --implementation-merge-decision <implementation-merge-decision.json> \
  --implementation-merge-decision-receipt <implementation-merge-decision-receipt.json> \
  --implementation-merge-evidence <implementation-merge-evidence.json> \
  --implementation-merge-evidence-receipt <implementation-merge-evidence-receipt.json> \
  --implementation-post-merge-validation <implementation-post-merge-validation.json> \
  --implementation-post-merge-validation-receipt <implementation-post-merge-validation-receipt.json> \
  --implementation-production-release-decision <implementation-production-release-decision.json> \
  --implementation-production-release-decision-receipt <implementation-production-release-decision-receipt.json> \
  --implementation-production-release-admission <implementation-production-release-admission.json> \
  --implementation-production-release-admission-receipt <implementation-production-release-admission-receipt.json> \
  --implementation-production-deploy-evidence <implementation-production-deploy-evidence.json> \
  --implementation-production-deploy-evidence-receipt <implementation-production-deploy-evidence-receipt.json> \
  --implementation-production-post-deploy-validation <implementation-production-post-deploy-validation.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The implementation production post-deploy validation packet proves an operator
validated the production deployment after the deploy evidence was recorded. It
must bind to the same deployment ID, deployment URL, release environment,
release window, issue, PR URL, PR number, commit SHA, merge commit SHA, checks,
post-merge checks, deployment evidence, post-deploy smoke proof, production
validation proof, and rollback plan as the deploy evidence receipt. It also
adds monitoring evidence and rollback-readiness proof for closeout. This gate
still does not deploy, enable a runner, rotate secrets, expose raw artifacts, or
mutate any third-party system. It rejects drifted deploy evidence receipts,
failed checks, missing monitoring or rollback-readiness evidence, verifier
deploy markers, verifier third-party write claims, leaked raw artifacts, and
any process/command/write marker. `authority.a4Execution` remains blocked.

After post-deploy validation passes, record the production release closeout
packet:

```bash
node scripts/operator-agent-omnigent-adapter.mjs implementation-production-release-closeout-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --execution-runbook-receipt <execution-runbook-receipt.json> \
  --receipt-bundle <receipt-bundle.json> \
  --receipt-bundle-receipt <receipt-bundle-receipt.json> \
  --receipt-publication <receipt-publication.json> \
  --receipt-publication-receipt <receipt-publication-receipt.json> \
  --receipt-review-decision <receipt-review-decision.json> \
  --receipt-review-decision-receipt <receipt-review-decision-receipt.json> \
  --manual-next-step-handoff <manual-next-step-handoff.json> \
  --manual-next-step-handoff-receipt <manual-next-step-handoff-receipt.json> \
  --manual-follow-up-issue-evidence <manual-follow-up-issue-evidence.json> \
  --manual-follow-up-issue-evidence-receipt <manual-follow-up-issue-evidence-receipt.json> \
  --follow-up-work-intake <follow-up-work-intake.json> \
  --follow-up-work-intake-receipt <follow-up-work-intake-receipt.json> \
  --implementation-workspace-evidence <implementation-workspace-evidence.json> \
  --implementation-workspace-evidence-receipt <implementation-workspace-evidence-receipt.json> \
  --implementation-pr-evidence <implementation-pr-evidence.json> \
  --implementation-pr-evidence-receipt <implementation-pr-evidence-receipt.json> \
  --implementation-merge-decision <implementation-merge-decision.json> \
  --implementation-merge-decision-receipt <implementation-merge-decision-receipt.json> \
  --implementation-merge-evidence <implementation-merge-evidence.json> \
  --implementation-merge-evidence-receipt <implementation-merge-evidence-receipt.json> \
  --implementation-post-merge-validation <implementation-post-merge-validation.json> \
  --implementation-post-merge-validation-receipt <implementation-post-merge-validation-receipt.json> \
  --implementation-production-release-decision <implementation-production-release-decision.json> \
  --implementation-production-release-decision-receipt <implementation-production-release-decision-receipt.json> \
  --implementation-production-release-admission <implementation-production-release-admission.json> \
  --implementation-production-release-admission-receipt <implementation-production-release-admission-receipt.json> \
  --implementation-production-deploy-evidence <implementation-production-deploy-evidence.json> \
  --implementation-production-deploy-evidence-receipt <implementation-production-deploy-evidence-receipt.json> \
  --implementation-production-post-deploy-validation <implementation-production-post-deploy-validation.json> \
  --implementation-production-post-deploy-validation-receipt <implementation-production-post-deploy-validation-receipt.json> \
  --implementation-production-release-closeout <implementation-production-release-closeout.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The implementation production release closeout packet proves an operator
finalized the redacted release receipt set after post-deploy validation. It
must bind to the same deployment ID, deployment URL, release environment,
release window, issue, PR URL, PR number, commit SHA, merge commit SHA,
checks, post-merge checks, deployment evidence, post-deploy smoke proof,
production validation proof, monitoring evidence, rollback plan, rollback
readiness, and public-access fail-closed proof as the post-deploy validation
receipt. It also adds final status, closeout evidence, receipt-publication
evidence, and operator handoff. This gate still does not deploy, enable a
runner, close Linear issues, post updates, rotate secrets, expose raw
artifacts, or mutate any third-party system. It rejects drifted post-deploy
validation receipts, non-closed final status, missing closeout or handoff
evidence, verifier deploy markers, verifier third-party write claims, leaked
raw artifacts, and any process/command/write marker. `authority.a4Execution`
remains blocked.

After release closeout passes, record the production ownership review packet:

```bash
node scripts/operator-agent-omnigent-adapter.mjs implementation-production-ownership-review-check \
  --packet <packet.json> \
  --preflight-receipt <preflight-receipt.json> \
  --execution-receipt <execution-receipt.json> \
  --authorization <authorization.json> \
  --command-artifact <command.json> \
  --command-receipt <command-receipt.json> \
  --executor-proof-receipt <executor-proof.json> \
  --enablement-proposal <proposal.json> \
  --enablement-proposal-receipt <proposal-receipt.json> \
  --policy-patch <policy-patch-dry-run.json> \
  --policy-patch-receipt <policy-patch-receipt.json> \
  --candidate-manifest <candidate-manifest.json> \
  --application-diff-receipt <application-diff-receipt.json> \
  --readiness-receipt <readiness-receipt.json> \
  --runner-contract <runner-contract.json> \
  --runner-contract-receipt <runner-contract-receipt.json> \
  --runner-plan <runner-plan.json> \
  --runner-plan-receipt <runner-plan-receipt.json> \
  --runner-diff <runner-diff.json> \
  --runner-diff-receipt <runner-diff-receipt.json> \
  --release-admission <release-admission.json> \
  --release-admission-receipt <release-admission-receipt.json> \
  --execution-runbook <execution-runbook.json> \
  --execution-runbook-receipt <execution-runbook-receipt.json> \
  --receipt-bundle <receipt-bundle.json> \
  --receipt-bundle-receipt <receipt-bundle-receipt.json> \
  --receipt-publication <receipt-publication.json> \
  --receipt-publication-receipt <receipt-publication-receipt.json> \
  --receipt-review-decision <receipt-review-decision.json> \
  --receipt-review-decision-receipt <receipt-review-decision-receipt.json> \
  --manual-next-step-handoff <manual-next-step-handoff.json> \
  --manual-next-step-handoff-receipt <manual-next-step-handoff-receipt.json> \
  --manual-follow-up-issue-evidence <manual-follow-up-issue-evidence.json> \
  --manual-follow-up-issue-evidence-receipt <manual-follow-up-issue-evidence-receipt.json> \
  --follow-up-work-intake <follow-up-work-intake.json> \
  --follow-up-work-intake-receipt <follow-up-work-intake-receipt.json> \
  --implementation-workspace-evidence <implementation-workspace-evidence.json> \
  --implementation-workspace-evidence-receipt <implementation-workspace-evidence-receipt.json> \
  --implementation-pr-evidence <implementation-pr-evidence.json> \
  --implementation-pr-evidence-receipt <implementation-pr-evidence-receipt.json> \
  --implementation-merge-decision <implementation-merge-decision.json> \
  --implementation-merge-decision-receipt <implementation-merge-decision-receipt.json> \
  --implementation-merge-evidence <implementation-merge-evidence.json> \
  --implementation-merge-evidence-receipt <implementation-merge-evidence-receipt.json> \
  --implementation-post-merge-validation <implementation-post-merge-validation.json> \
  --implementation-post-merge-validation-receipt <implementation-post-merge-validation-receipt.json> \
  --implementation-production-release-decision <implementation-production-release-decision.json> \
  --implementation-production-release-decision-receipt <implementation-production-release-decision-receipt.json> \
  --implementation-production-release-admission <implementation-production-release-admission.json> \
  --implementation-production-release-admission-receipt <implementation-production-release-admission-receipt.json> \
  --implementation-production-deploy-evidence <implementation-production-deploy-evidence.json> \
  --implementation-production-deploy-evidence-receipt <implementation-production-deploy-evidence-receipt.json> \
  --implementation-production-post-deploy-validation <implementation-production-post-deploy-validation.json> \
  --implementation-production-post-deploy-validation-receipt <implementation-production-post-deploy-validation-receipt.json> \
  --implementation-production-release-closeout <implementation-production-release-closeout.json> \
  --implementation-production-release-closeout-receipt <implementation-production-release-closeout-receipt.json> \
  --implementation-production-ownership-review <implementation-production-ownership-review.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The implementation production ownership review packet proves an operator
reviewed the redacted release closeout receipts and chose the next ownership
lane. Allowed decisions are `advance-to-a4-enablement-review`,
`hold-at-evidence-only`, and `request-changes`. Even an advance decision is
only evidence for a separate explicit A4 enablement approval packet; it is not
execution authority. The packet must bind to the same issue, deployment,
release window, closeout evidence, receipt-publication evidence, operator
handoff, and public-access fail-closed proof as the release closeout receipt.
It also adds decision rationale, evidence review, readiness assessment,
residual risks, and required follow-ups. This gate still does not deploy,
enable policy, enable a runner, close Linear issues, post updates, rotate
secrets, expose raw artifacts, or mutate any third-party system. It rejects
drifted closeout receipts, invalid decisions, missing readiness evidence,
verifier issue-mutation or policy-enablement claims, leaked raw artifacts, and
any process/command/write marker. `authority.a4Execution` remains blocked.

After ownership review passes, validate the production A4 enablement approval
packet:

```bash
node scripts/operator-agent-omnigent-adapter.mjs implementation-production-a4-enablement-approval-check \
  <same chain arguments as implementation-production-ownership-review-check> \
  --implementation-production-ownership-review-receipt <implementation-production-ownership-review-receipt.json> \
  --implementation-production-a4-enablement-approval <implementation-production-a4-enablement-approval.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The implementation production A4 enablement approval packet proves an operator
explicitly approved the next policy-enablement review packet after ownership
review. It must bind to the same ownership review artifact and receipt, use
`Linear` or `signed-release-record` as the approval surface, name the approval
decision, accept the exact A4 risk classes, include rollback and post-action
smoke proof, carry the public-access fail-closed proof, and cite the future
policy patch proposal. The rollback authorization scope is limited to
`reversible-internal-production-only`.

This gate is still approval evidence only. It does not change checked-in
policy, enable a runner, deploy, close or update Linear issues, post updates,
rotate secrets, expose raw artifacts, or mutate third-party systems. It rejects
drifted ownership review receipts, invalid approval decisions, missing risk
acceptance, broader rollback scopes, verifier policy-enablement or issue
mutation claims, leaked raw artifacts, and any process/command/write marker.
`authority.a4Execution` remains blocked.

After the A4 enablement approval packet passes, validate the candidate
policy-enablement PR evidence:

```bash
node scripts/operator-agent-omnigent-adapter.mjs implementation-production-policy-enablement-pr-check \
  <same chain arguments as implementation-production-a4-enablement-approval-check> \
  --implementation-production-a4-enablement-approval-receipt <implementation-production-a4-enablement-approval-receipt.json> \
  --implementation-production-policy-enablement-pr <implementation-production-policy-enablement-pr.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The implementation production policy enablement PR packet proves a candidate PR
proposes only the approved policy fields: `authority.a4Execution`,
`a4ExecutionCommand.runnerEnabled`, and `a4ExecutorProof.runnerEnabled`. It must
bind to the A4 enablement approval artifact and receipt, include PR URL,
number, base ref, head ref, commit SHA, the policy patch proposal reference,
rollback boundary, post-action smoke, and the public-access fail-closed proof.
The rollback authorization scope remains
`reversible-internal-production-only`.

This gate validates PR evidence only. It does not apply the policy patch,
enable a runner, merge or mutate PRs, close or update Linear issues, deploy,
post updates, rotate secrets, expose raw artifacts, or mutate third-party
systems. It rejects drifted A4 enablement approval receipts, unapproved policy
fields, missing enabled-policy fields, broader rollback scopes, verifier PR or
issue mutation claims, leaked raw artifacts, and any process/command/write
marker. `authority.a4Execution` remains blocked in this verifier branch.

After the policy-enablement PR evidence passes, validate the operator merge
decision packet:

```bash
node scripts/operator-agent-omnigent-adapter.mjs implementation-production-policy-enablement-merge-decision-check \
  <same chain arguments as implementation-production-policy-enablement-pr-check> \
  --implementation-production-policy-enablement-pr-receipt <implementation-production-policy-enablement-pr-receipt.json> \
  --implementation-production-policy-enablement-merge-decision <implementation-production-policy-enablement-merge-decision.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The implementation production policy enablement merge decision packet proves an
operator reviewed the candidate policy-enablement PR receipt and chose one of
`approve-policy-enablement-merge`, `hold-at-evidence-only`, or
`request-changes`. It must bind to the PR evidence artifact and receipt, carry
the same PR URL, number, refs, commit SHA, policy patch proposal reference,
proposed policy changes, rollback boundary, post-action smoke, public-access
fail-closed proof, and include decision rationale, evidence review, readiness
assessment, and redaction policy. The rollback authorization scope remains
`reversible-internal-production-only`.

This gate validates merge-decision evidence only. It does not merge or mutate
PRs, apply the policy patch, enable a runner, close or update Linear issues,
deploy, post updates, rotate secrets, expose raw artifacts, or mutate
third-party systems. It rejects drifted policy-enablement PR receipts,
unapproved decisions, missing rationale or readiness evidence, broader rollback
scopes, verifier PR or issue mutation claims, leaked raw artifacts, and any
process/command/write marker. `authority.a4Execution` remains blocked in this
verifier branch.

After the policy-enablement merge decision passes, validate separate manual
merge evidence:

```bash
node scripts/operator-agent-omnigent-adapter.mjs implementation-production-policy-enablement-merge-evidence-check \
  <same chain arguments as implementation-production-policy-enablement-merge-decision-check> \
  --implementation-production-policy-enablement-merge-decision-receipt <implementation-production-policy-enablement-merge-decision-receipt.json> \
  --implementation-production-policy-enablement-merge-evidence <implementation-production-policy-enablement-merge-evidence.json> \
  --expected-issue CRE-123 \
  --expected-target <target> \
  --expected-action <action> \
  --json
```

The implementation production policy enablement merge evidence packet proves a
separate manual merge of the policy-enablement PR after an approved merge
decision. It must bind to the merge-decision artifact and receipt, carry the
same PR URL, number, refs, head commit SHA, policy patch proposal reference,
proposed policy changes, rollback boundary, post-action smoke, and
public-access fail-closed proof, and include merge status, merge commit SHA,
merged-by, merged-at, merged policy state, immediate full-chain revalidation
plan, and redaction policy. The rollback authorization scope remains
`reversible-internal-production-only`.

This gate validates manual merge evidence only. It does not merge or mutate
PRs, apply the policy patch in this verifier branch, enable a runner, close or
update Linear issues, deploy, post updates, rotate secrets, expose raw
artifacts, or mutate third-party systems. It rejects drifted merge-decision
receipts, non-approved merge decisions, missing merged-policy state, missing
immediate revalidation proof, broader rollback scopes, verifier policy or PR
mutation claims, leaked raw artifacts, and any process/command/write marker.
`authority.a4Execution` remains blocked in this verifier branch.

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
