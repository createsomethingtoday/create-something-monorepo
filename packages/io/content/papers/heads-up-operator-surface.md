---
title: 'The Heads-Up Operator Surface'
subtitle: 'How governed agent work becomes portable without losing control'
authors: ['CREATE SOMETHING']
category: 'Research'
abstract: 'Agent work usually assumes a seated operator: a laptop, terminal, browser, issue tracker, and deployment console. This paper argues for a different operating surface. A heads-up display can carry the proof, approval, and intervention loop for governed agent work while the repository, policy artifacts, and deployment receipts remain the source of truth. The result is not hands-free autonomy. It is mobile supervision: the operator can observe, approve, redirect, and verify Codex-backed work throughout the day without treating a physical workstation as the boundary of control.'
keywords: ['Heads-Up Operator Surface', 'Operator Mobility', 'Workflow Trust Layer', 'Proof Surface', 'Policy OS', 'Codex', 'Even G2', 'Cloudflare Tunnel', 'Agent Governance', 'Three-Tier Framework']
publishedAt: '2026-06-22'
readingTime: 15
difficulty: 'intermediate'
published: true
---

## Executive Thesis

The workstation should not be the boundary of agent supervision.

For most teams adopting coding agents, the operating picture still assumes a seated human. The agent runs in a terminal or web session. The repo sits on a laptop. The issue tracker is in a browser tab. Deployment evidence appears in CI, Cloudflare, Vercel, Linear, or a local shell. Approval happens wherever the human happens to be watching.

That model works while the operator is at the machine. It breaks when the workday moves.

The useful claim behind the G2 Cloudflare Codex setup is not that a tunnel can expose a local service. That is implementation plumbing. The useful claim is that a heads-up display can become an **operator surface** for governed agent work:

- observe active agent sessions
- inspect the current repo and issue context
- approve or stop bounded work
- redirect the next step
- verify receipts after commits, merges, and deploys

The agent still needs policy. The repo still owns code. Linear still owns tracked work. Cloudflare still owns the route boundary. The glasses are not the source of truth. They are the surface that lets the operator stay connected to the truth without staying physically tied to the computer.

## What This Paper Gives You

This paper gives teams a practical frame for evaluating heads-up access to agent work.

It is written for operators, founders, technical leads, and agent-system builders who already have capable tools but still rely on a workstation to keep work safe.

It gives you three outputs:

1. A distinction between remote access and portable supervision.
2. A three-tier architecture for heads-up agent control.
3. A security and publication boundary for treating the setup as an experiment instead of overselling it as finished infrastructure.

## The Failure Mode: The Agent Works, The Operator Is Anchored

Agentic development has become increasingly portable at the model layer. A coding agent can inspect a repository, apply patches, run tests, create commits, open pull requests, and deploy production changes when the surrounding workflow allows it.

The operator experience is less portable.

An agent may be able to continue, but the human often has to return to a workstation to answer practical questions:

- What issue is this tied to?
- Which branch is active?
- Did the change pass checks?
- What changed in the repo?
- Is this safe to merge?
- Was production actually updated?
- What should stop until I review it?

This creates a strange inversion. The machine can act across systems, but the person supervising the machine is still anchored to a physical device.

That anchor is not just inconvenient. It changes the workflow. If approval requires the operator to sit back down, then many small decisions either wait too long or get pushed into premature autonomy. Teams then choose between two poor defaults:

- keep the agent weak because supervision is inconvenient
- let the agent do too much because supervision is too costly

A heads-up operator surface creates a third path. The operator remains available for lightweight judgment throughout the day, while the system keeps deeper evidence in the repo, issue tracker, and runtime logs.

## Remote Access Is Not The Product

The setup uses familiar pieces:

- Even G2 glasses
- the Even mobile app
- Even Terminal
- Cloudflare Tunnel
- a local loopback origin
- Codex as the coding-agent provider
- the CREATE SOMETHING monorepo as the working corpus

Those details matter operationally, but they are not the product.

Remote access alone only answers: can the glasses reach the agent?

The operator surface answers a better question: can the operator make a trustworthy decision from that form factor?

That requires a visible operating loop:

| Operator question | Surface requirement |
| --- | --- |
| What is running? | Session list, repo path, branch, issue, active task |
| What changed? | Commit, diff, test, deployment, and receipt summaries |
| Can this continue? | Clear auto-allow, approval-needed, and blocked states |
| What should I do now? | A small set of next actions, not a full desktop replica |
| What proves it? | Links or summaries that point back to source evidence |

The heads-up display should not try to become a laptop. It should carry the minimum surface needed for judgment.

## The Three-Tier Mapping

The heads-up operator surface follows the CREATE SOMETHING three-tier model.

### Database

The durable state remains outside the glasses.

Database includes:

- the monorepo
- Linear issue state
- branch and commit history
- runbooks
- Cloudflare tunnel configuration
- test and deploy evidence
- proof receipts
- policy artifacts

This matters because the glasses are a transient access surface. They should not become the only place where context exists. If a session drops, the next operator should recover from repo and issue evidence, not from memory.

### Automation

Automation is the controlled path that lets the operator reach the work.

In the current experiment, that includes:

- Even Terminal exposing an agent interface
- a local loopback service on the workstation
- Cloudflare Tunnel carrying traffic from the public internet to the local origin
- Codex performing repository actions inside the working directory
- repo scripts for validation, commit, merge, and deploy flows

Automation should remain narrow. The tunnel should expose only the necessary local service. The local service should stay bound to loopback. The agent should still operate through the repo's normal checks and promotion gates.

### Judgment

Judgment is the reason this form factor matters.

The operator decides:

- continue or stop
- merge or hold
- deploy or wait
- rotate a token
- update a runbook
- create a Linear issue
- move a paper from draft to review

The glasses make those decisions available at the edge of attention. They do not remove the need for policy. In fact, the smaller the interface, the more important the policy becomes. The operator needs the system to present a decision state, not a pile of raw logs.

## The Relationship To Workflow Trust

The **Workflow Trust Layer** says connection does not create trust. A tool can be reachable and still be unsafe to use.

The heads-up operator surface extends that idea into form factor.

The question is not:

Can the operator connect from glasses?

The question is:

Can the operator see the trust state of the work from glasses?

That means the surface should preserve three decision states:

| State | Heads-up version |
| --- | --- |
| Auto-allow | Low-risk work continues and keeps a receipt. |
| Approval-needed | The glasses surface a compact decision with evidence. |
| Blocked | The system stops with a reason instead of hiding uncertainty. |

The form factor should make these states faster to inspect, not easier to bypass.

## The Relationship To Proof Surfaces

The **Proof Surface** says agent work becomes operational when a buyer, operator, or reviewer can inspect what ran, what waited, what stopped, and what proves the decision.

The heads-up operator surface is one way to carry that proof surface to the operator.

It should not expose everything. A glasses display is a poor place for raw secrets, long logs, customer data, or dense diffs. It is a good place for a compact proof receipt:

- issue ID
- branch
- commit
- test command and result
- deploy target
- rollback note
- owner decision
- next action

The deeper evidence remains attached behind the receipt.

That separation is the central design rule: **public-safe proof at the edge, private evidence at the source.**

## The Experiment

The working experiment proved a narrow but important path:

1. A local Codex-capable agent session can be exposed through a Cloudflare Tunnel.
2. Even G2 can reach that session through the Even app.
3. The operator can use the glasses to continue repository work.
4. The underlying work still lands in normal repo commits, PRs, merges, and deployments.

The result is a portable control loop:

```text
operator attention
  -> heads-up display
  -> Even app
  -> Cloudflare Tunnel
  -> local Even Terminal / Codex session
  -> monorepo work
  -> tests, commits, PRs, deploy receipts
  -> operator decision
```

The experiment also exposed an important boundary. The browser-gated Cloudflare Access path and the native Even app path are not the same. A mobile native client may not emit the same headers or identity challenge shape that a browser can. When that happens, a separate native route may be required.

That native route must be treated as an experiment. If a hostname or token effectively functions as a bearer secret, it must be short-lived, rotated after exposure, and excluded from public screenshots or docs.

The experiment also showed that portable supervision is not the same as full desktop parity. The glasses can show thinking or session state while still failing to show token-by-token streaming. That is expected when any layer in the path buffers the response, translates the session into polling, or does not preserve the same long-lived Server-Sent Events or WebSocket transport from the provider to the client.

It also means coarse status labels can be misleading. A session may appear idle while new history items continue to arrive. For this form factor, the reliable question is not whether the UI status label looks active. The reliable question is whether the proof surface is still receiving new receipts: history items, commits, test results, deploy records, or blocked-state notes.

This does not invalidate the operator surface. It clarifies what the first version is good for: checking state, issuing direction, and making bounded decisions. A later version can improve live streaming, but the strategic value is already visible when the operator can supervise without reopening the workstation.

## What This Enables

The direct benefit is operator mobility.

An operator can remain available to a working agent without sitting at the machine. That changes the cadence of governed automation.

### Continuous Improvement

Small improvements no longer need to wait for a full workstation session. The operator can inspect context, ask the agent to continue, and leave the detailed implementation loop to Codex.

This is useful for:

- documentation updates
- test-fix loops
- issue triage
- paper drafting
- runbook reconciliation
- small production verification tasks

### Continuous Deployment

Deployment does not become automatic just because the operator is mobile.

Instead, the approval loop becomes more available. The operator can review the proof receipt, confirm that quality gates passed, and allow promotion when the repo policy permits it.

This matters most when the deploy decision is small but time-sensitive: preview verification, production route checks, content publication, or rollback confirmation.

### Continuous Attention

The most valuable change may be attentional.

The operator does not have to keep the full system open all day. The heads-up display can present the next decision only when needed.

That makes the form factor different from a phone, laptop, or desktop dashboard. It is not a place to live. It is a place to glance, decide, and return to the world.

## What This Does Not Enable

This pattern does not make unsafe workflows safe.

It does not remove the need for:

- access control
- token rotation
- source-of-truth issue tracking
- repo checks
- pull request review
- deployment gates
- rollback notes
- private evidence boundaries
- transport-specific UX checks, including whether streaming survives each proxy layer

It also does not mean every workflow belongs on glasses. Dense code review, large diffs, incident forensics, and credential handling still belong on richer surfaces.

The heads-up operator surface is best for supervision, not deep production surgery.

## Security Boundary

The correct security posture is conservative.

Use browser-gated Cloudflare Access when the client can complete the identity flow. Use a native route only when the client cannot send the required browser or service-token shape. Keep the local origin on loopback. Route through a local proxy when the native client needs translation. Rotate any secret that appears in screenshots, terminal logs, or chat transcripts.

Most importantly, do not confuse reachability with authorization.

A successful probe proves that the route works. It does not prove that the route is safe enough for customer data, production secrets, or unattended operation.

The native path is acceptable as a bounded operator experiment. Hardening should move toward first-class identity, signed requests, or service-token support rather than relying on obscurity.

## Publication Boundary

The public paper should not publish raw hostnames used as secrets, bearer tokens, Cloudflare credential paths, local certificate paths, or screenshots that reveal active credentials.

The publishable claim is:

> A governed agent control loop can follow the operator into a heads-up form factor while the repo, policy, issue tracker, and deployment receipts remain the source of truth.

The unpublishable claim is:

> This tunnel configuration is a complete security model.

That distinction is what makes the paper useful instead of reckless.

## Practical Adoption Pattern

Teams can evaluate this pattern without starting from glasses.

Start with one governed workflow:

1. Name the operator decision.
2. Define what can run, wait, and stop.
3. Attach the proof receipt.
4. Keep private evidence behind the receipt.
5. Test the workflow from the normal workstation.
6. Add a mobile surface only after the decision state is compact enough.
7. Add heads-up access only after the mobile surface proves useful.

If the workflow cannot be reduced to a clear decision state, it is not ready for glasses.

If it can, the heads-up display becomes a powerful interface because it carries only what the operator needs.

## Conclusion

The heads-up operator surface is not about replacing the computer.

It is about moving the operator boundary from a physical device to a governed control loop.

The repo still owns code. Linear still owns work state. Cloudflare still owns route boundaries. Policy still owns judgment. Proof still owns accountability. The glasses simply let the operator stay close enough to the loop to make timely decisions.

That is the real benefit: not more autonomy by default, but more available supervision.

For agent systems, that may be the more important unlock.
