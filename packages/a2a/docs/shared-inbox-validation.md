# Shared inbox implementation receipt — CRE-2448

Scope: implement and validate a self-service, many-to-many shared-inbox product.
Source baseline: `8a7fb92bed65209a39f307422ab7cef604f4af9b`. The final commit, PR and
sanitized evidence location are recorded in
[CRE-2448](https://linear.app/createsomething/issue/CRE-2448/a2a-shared-inboxes-self-service-owners-multiple-agents-invitations-and).
The unrelated root checkout was preserved. Production and installed App bindings
were not changed by this implementation pass.

## Acceptance criteria and evidence

| Criterion | Evidence and boundary |
| --- | --- |
| Verified owners register multiple agents and inboxes | Actual HTTP handlers with signed local owner sessions; nonallowlisted verified owner; bearer and cross-origin management denied |
| New owners enroll through first-party Identity | Application-scoped mailbox verification, default-off flag, fixed A2A return link; tests include pending/verified state, scoped recovery, discovery and populated migration |
| Exact-agent invitation and reciprocal owner approval | Wrong-owner rejection, single-use/expiry, concurrent acceptance, own-agent enrollment, membership generation and admission boundary tests |
| Agent belongs to several inboxes; same-owner agents isolated | Domain and HTTP/MCP integration tests; caller identity comes from immutable approved OAuth-family binding |
| Durable connection and current authority | Stable Identity family through rotation; revoked/mismatched family rejection; no reapproval of revoked binding; no claim or dispatch through stale membership |
| Conversations, assigned work, context and revocation | Idempotent send, claim/finish/reassignment fencing, explicit history boundaries, immutable SHA-256 text copies, bounded Unicode reads/search, expiry and race tests |
| Delivery survives retry and reassignment | Independent event replay positions, duplicate suppression, backlog progress, current Identity and DB checks before callback, encrypted credentials |
| Owner console is usable | Independent Sol browser review against actual local handlers; 320/390/768/1024/1025/1440; keyboard, labels, focus, reduced motion, long history and context pagination |
| Legacy consent remains unchanged | Additive shared tables and gated routes/tools; v1 regressions remain in the full A2A suite; no pairwise-to-group data conversion |

The local disposable acceptance bundle runs actual workerd, native D1, actual
Identity handlers and A2A authentication. Its six added shared scenarios cover
multi-owner membership, concurrent invitation acceptance, idempotent send,
concurrent claims, membership revocation and Identity family revocation. The
existing renewal/fault scenarios also run. Outgoing effects are disabled and
the report explicitly labels host fault handling unproven.

Independent reviews demonstrated failing regressions before fixes for reused
history through idempotency, stale invitations after removal, reassignment event
replay, and backlog starvation. Product review found a real API ownership-field
mismatch masked by an early mocked fixture; the reusable fixture now invokes
actual handlers. It also found missing context continuation, hidden posts after
50 messages, and a narrow-screen header collision. The corrected states were
directly viewed and exercised. Delayed responses cannot overwrite a switched
inbox, and catching up pages does not duplicate the newly posted message.

Visual baseline: existing Canon Performance Lab paper/ink A2A console and local
Geist typography. Mobbin ClickUp and Quo conversation screens informed author/time
hierarchy and separation of context. This is a bounded functional console pass;
it makes no new public marketing or video claim. Identity signup/verification
pages were directly viewed locally; actual mailbox delivery is separate.

## Quality gates

- **Functional: passed locally.** Independent final Sol re-test: A2A **160/160**,
  Identity **147/147**, A2A TypeScript checks passed. Subsequent PR review regression
  pass: A2A **164/164**, TypeScript and web build passed. Parent native workerd/D1 lab:
  **21/21** scenarios passed with outgoing effects disabled. Web build and both
  Worker dry-run bundles passed; retired identity-provider scan passed.
  Node/SQLite fixtures and the native workerd/D1
  lab exercise the actual implementation. They do not establish deployed behavior
  or the host's internal scheduling and credential management.
- **Perceptual/product: passed for inspected local states.** Independent review
  covered the shared console and actual local API output. Real-owner onboarding
  and the complete hosted agent lifecycle remain untested.
- **Release readiness: untested for public enablement.** The source is gated off.
  The web/Worker artifacts build, but public enrollment, actual per-agent host
  grant separation, natural OAuth/subscription renewal, idle callbacks and
  production readback require release acceptance. No installed plugin was updated.

Use [shared-inboxes.md](shared-inboxes.md) for commands, migration ordering,
remaining host qualification and rollback. Keep the Linear issue open through
that checkpoint. `Worktree disposition: preserved at
/private/tmp/cre-2448-a2a-shared-inboxes / codex/cre-2448-a2a-shared-inboxes`.

## PR review corrections

The renewal race regression first demonstrated that renewing during credential
verification permanently suspended an otherwise authorized event. The corrected
path retries and reloads the renewed credentials before egress. Tests cover the
same event being accepted after retry, a stale credential being rejected during
renewal, and revocation still suspending delivery.

The browser regression first demonstrated missing owner controls on
`approval_required` requests. Custodians now get the existing reassignment and
cancellation actions, using the same version and authorization checks as before.
`scripts/shared-inbox-approval-check.mjs` exercises both actions against the actual
local HTTP/SQLite fixture and reads their committed states. Start that fixture
with `A2A_FIXTURE_PORT=4188`; it does not touch production or another local server.

A second PR review reproduced notices being appended by failed repeated leave
requests. The notice now follows the successful membership compare-and-set in
the same transaction; zero, one and multiple affected work requests are covered.
It also reproduced false idempotency conflicts after reassignment. Both owner
and agent sends now reconcile an immutable fingerprint of their original payload,
while returning the current assignment and preserving authorization/history checks.
The fingerprint is internal metadata in the still-unreleased migration 0007.

Latest checks after these corrections: A2A **166/166**, TypeScript and acceptance
TypeScript passed; actual local workerd/native D1 **23/23** scenarios passed,
including repeated leave with no writes and owner/agent reconciliation after the
original assignee leaves. Outgoing effects remain disabled.
