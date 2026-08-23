# Solo Operator Control Tower Playbook

- **Status:** v1 internal operating artifact
- **Owner:** named outcome operator
**Scope:** parallel repository, browser, agent, and communication work

## Objective

Advance several bounded work lanes without losing the human decision, source of
truth, or evidence needed to call an outcome complete.

This Playbook composes the fast local loop in
[SOLO_OPERATOR_AGENT_LOOP.md](./SOLO_OPERATOR_AGENT_LOOP.md) with the full
Playbook contract in [CREATE_SOMETHING_PLAYBOOK_SPEC.md](../CREATE_SOMETHING_PLAYBOOK_SPEC.md).
It does not authorize protected writes, publishing, access changes, or production
promotion by itself.

## Three-tier model

| Tier | Control-tower artifact |
| --- | --- |
| Database | lane record, source links, worktree/issue state, receipts, and known unknowns |
| Automation | bounded agent task, CLI check, browser proof, and handoff packet |
| Judgment | authority boundary, approval owner, wait/stop condition, and done decision |

## Lane record

Every active lane must be representable without reopening an agent transcript:

```text
Outcome:
Owning system:
Source evidence:
Executor and allowed actions:
Approval-required actions:
Wait and stop conditions:
Required proof:
Current state and next owner:
```

The packet is a context bridge, not permission. A copied Slack message, browser
tab, or terminal result must retain its source link and must not silently widen
the executor's authority.

## Plays and runbooks

### Play: start and route a lane

1. Name one observable outcome and the source system that can prove it.
2. Select the lane: local solo loop, isolated worktree, read-only research, or
   promotion/PR.
3. Record allowed actions, protected actions, stop conditions, and the receipt
   required to advance.
4. Give the executor the lane packet and one nearest command, file, URL, or
   failing output.

### Runbook: redirect or pause a lane

Trigger: the work drifts, an approval is required, credentials fail, or a new
fact changes the original route.

1. Preserve the latest source evidence and partial receipt.
2. Mark the lane `waiting`, `stopped`, or `needs-decision`; do not call it done.
3. State the smallest next decision or recovery action.
4. Resume only with a fresh bounded instruction that names the revised proof.

### Runbook: browser proof and closeout

Trigger: an implementation, deploy, or handoff claims to be complete.

1. Record the exact source revision and target environment.
2. Verify expected behavior and retired behavior at the relevant desktop and
   mobile sizes.
3. Record console/network conditions separately from unrelated third-party or
   edge-propagation noise.
4. Preserve screenshots or structured readback with the source/target and time.
5. Close only when the required receipt names the result, remaining unknowns,
   next owner, and worktree disposition when applicable.

See [BROWSER_PROOF_AND_CLOSEOUT_RUNBOOK.md](./BROWSER_PROOF_AND_CLOSEOUT_RUNBOOK.md)
for the detailed proof path.

### Runbook: research interrupt

Trigger: a useful tool, article, video, or reference appears during active work.

1. Save the active lane's checkpoint before leaving it.
2. State the question and a short time limit.
3. Capture only the source, relevance, and one of `adopt`, `test later`, or
   `archive`.
4. `Adopt` creates a separately owned task; it does not silently expand the
   current lane.
5. Return to the saved checkpoint.

See [BOUNDED_RESEARCH_INTERRUPT_RUNBOOK.md](./BOUNDED_RESEARCH_INTERRUPT_RUNBOOK.md).

## Recovery and review

- Missing or contradictory source state: stop and reconcile the owning system.
- Expired or invalid auth: use the saved-auth runbook; do not loop on browser
  confirmations or infer success from a login page.
- Protected action: produce a decision brief or exception handoff before retry.
- Review this Playbook after a release, a failed handoff, or five newly observed
  lane interruptions.
