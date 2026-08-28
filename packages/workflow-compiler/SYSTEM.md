# Marketplace Submission System Map

This is the end-to-end explanation for a terminal-first Marketplace
submission-to-review workflow. It connects the existing Marketplace Submission
Cloud app to the local Workflow Compiler so an operator can show the system,
test its governing contract, and hand it to a builder without pretending that
the terminal performed a live submission.

**The operating idea:** the application receives and routes real work; the
compiler turns its contract into a versioned map, a replayable proof surface,
and a clear stop when evidence or authority is missing.

## Use this in a walkthrough

1. Start with the creator's public submission form. The existing Marketplace
   Submission Cloud app owns form intake, published-site checks, Validator App
   preflight, upload handling, and the downstream Airtable Automation webhook.
2. Show the terminal workflow beside it. The Marketplace starter gives Codex a
   local copy of the governing path: the evidence each transition needs, the
   owner of each action, and the point at which the agent must wait or stop.
3. Run validation, simulation, and explanation locally. The output makes the
   expected receipt chain visible before anyone connects another system.
4. Return to the owning application to prove a live result. A current
   submission, preflight, handoff, reviewer decision, or creator message is
   proved only by that application's receipt and its source of truth.

The terminal package does not execute live actions. It does not send to
Webflow, Airtable, a reviewer, or an OpenAI endpoint; it does not read
credentials or make an approval decision.

## The system at a glance

    Creator
      -> Marketplace Submission Cloud
      -> form and published-site validation
      -> Validator App preflight
      -> Airtable Automation handoff
      -> Marketplace reviewer
      -> creator decision through the owning review process

    Codex + Workflow Compiler
      -> versioned workflow contract
      -> local validation, replay, and explanation
      -> content-hashed artifacts and receipts
      -> read-only inspection of supplied evidence

The top path moves the submission. The lower path explains and tests the
contract that governs it. They meet at evidence, not at shared credentials.

## The submission path

| Stage | Owning surface | Evidence before the next state | Authority and outcome |
| --- | --- | --- | --- |
| Creator completes the form | Marketplace Submission Cloud | Form payload, published URL, and form schema version; no submission ID exists at this entry | The creator supplies intent; no review routing follows from intent alone. |
| Form and published site validate | Submission Cloud validation path | Local modeled evidence: form-validation receipt and an explicit passed result | The compiler can move from draft to form validated. The live intake applies its check inside one request. |
| Enforced Validator App preflight passes | Validator App preflight called by Submission Cloud | Local modeled evidence: `enforce` policy, preflight receipt, and a passed status | The compiler can move from form validated to preflight passed. A failed required preflight is a stop in the live request. |
| Airtable Automation handoff is confirmed | Airtable Automation and its source record | Live confirmed receipt: submission ID, confirmed handoff state, asset ID, version ID, and review status. Local modeled evidence additionally expects automation version and webhook receipt. | Codex may inspect supplied evidence only after the live confirmed receipt proves the handoff. |
| Reviewer decides | Marketplace review policy and reviewer queue | Local modeled evidence: review-request receipt. The live intake receipt supplies IDs and review status, not a request event. | This is approval required. The assigned reviewer or policy owner decides; an agent does not promote itself. |
| Creator receives a decision | Owning reviewer communication process | Local modeled evidence: decision receipt and creator-contact reference | The compiler keeps this write blocked. Delivery is independently verified by the owning process. |

A webhook receipt alone is not a handoff. It means processing was observed; it
does not prove an asset, version, confirmed state, and review-ready record
exist together.

### Evidence available at the live intake boundary

The Submission Cloud creates its submission ID only after form and preflight
checks. Its successful intake response does not return separate form-validation
or Validator preflight receipts. It returns a published-site validation summary
and, after the webhook wait, either a processing receipt or a confirmed Airtable
receipt with the submission, asset, version, and review-status fields. It does
not return an automation version or webhook receipt.
It does not emit a review-request receipt, reviewer decision, or creator-contact record.

This is why the first two compiler transitions, and the extra handoff fields in
the compiler, are labelled local modeled evidence. The reviewer and creator
stages use the same label: they are requirements in the local model, not
evidence returned by the current intake response. A processing receipt proves
receipt of the submission, not a confirmed handoff. Use a confirmed Airtable
receipt to describe the live handoff as complete.

### Preflight modes

The local Marketplace starter is an enforced contract: it requires
`preflight_status: passed` before its handoff path becomes eligible. That makes
the local replay a clear demonstration of the protected route; it does not
erase the live application's supported runtime modes.

- `enforce` is the live default. A non-passing required result is rejected
  before downstream webhook and Airtable routing.
- `warn` records the attempted check, but a non-passing result can proceed
  because the runtime does not require it. It cannot be reported as a passing
  preflight.
- `disabled` reports `not_required` and performs no required Validator gate, so
  the submission can proceed without a Validator result.

The current successful intake response does not emit a preflight receipt. Do not
use a local compiler artifact as a substitute. A protected-path claim needs a
retained application record correlated to the submission ID or a future emitted
preflight receipt, together with the `enforce` policy and passing result.

## Three tiers, one operating system

| Tier | What it owns here | Examples |
| --- | --- | --- |
| Database | The facts that must exist and be retained | Submission intent, validation result, preflight result, Airtable handoff, reviewer request, and their receipt references |
| Automation | The systems that perform bounded work | Marketplace Submission Cloud, published-site validation, Validator App preflight, Airtable Automation, and local compiler commands |
| Judgment | The rules that decide whether work may proceed | Preflight policy, review policy, explicit reviewer approval, recovery paths, and stop conditions |

The compiler is the local Automation layer for the map. Its workflow definition
also carries the Database requirements and Judgment boundaries so the same
contract can be replayed, inspected, and explained consistently.

## What credentials, receipts, and approvals mean

The live application declares the credentials and runtime bindings it needs,
including Airtable configuration, CSRF origins, Turnstile, upload-worker
authentication, and Validator preflight configuration. Those declarations show
what the owning runtime requires; this document does not expose, inspect, or
assert the current validity of any secret.

The receipt contract is different:

- A local compiler receipt proves a deterministic local check, replay, or
  artifact verification.
- An application or provider receipt proves a specific external result at a
  specific point in time.
- A reviewer approval is required where the workflow marks authority as
  approval required. It is not replaced by a passing preflight, a webhook, or
  an agent message.

Before describing a live run as complete, read the current owner record or
runtime response and retain the matching receipt. Credentials enable a call;
they are not evidence that the call succeeded.

## What Codex and a builder do

Install a released version of the package in the builder's repository, copy the
shipped Codex skill, then create the Marketplace starter:

    npx workflow-compiler init --template marketplace-submission --dir ./marketplace-submission
    cd ./marketplace-submission
    npx workflow-compiler validate --workflow workflow.json
    npx workflow-compiler simulate --workflow workflow.json --cases cases.json
    npx workflow-compiler compile --workflow workflow.json --cases cases.json --out artifacts
    npx workflow-compiler explain --workflow workflow.json --cases cases.json

The starter writes the source and local evidence files:

- workflow.json, the versioned source of the local contract;
- cases.json, sanitized representative evidence and expected outcomes;
- RUNBOOK.md and PLAYBOOK.md, the operator and builder views;
- SOURCES.md, pointers to the owning application and policy surfaces.

The explicit compile step writes inspectable artifacts under `artifacts/`,
including the acceptance summary, evidence ledger,
  governed interaction bundle, and read-only operator console.

Codex can propose changes, validate them, simulate representative outcomes, and
explain supplied local evidence. It may inspect the confirmed-handoff contract
as a read action. It cannot obtain an Airtable record, send a webhook, grant a
review, or contact a creator through this package.

## Handoff to an authenticated execution host

The compiler emits a pass, wait, or stop plan. A future authenticated execution
host may consume a pass plan only after it:

1. has an approved credential and transport boundary for the named system;
2. validates the actual tool result against the expected evidence;
3. writes and retains the external receipt with correlation and recovery data;
4. respects reviewer-owned approvals; and
5. returns wait or stop without constructing a substitute live request when
   the contract is incomplete.

This keeps the hosted infrastructure composable. Builders can explain and test
the workflow now; each live connection becomes a separately reviewed adapter
with its own authority, verification, and rollback path.

## A concise narration

"A creator submits through the Marketplace app. The app validates the form and
published site. Under its default enforced preflight policy, it requires a
passing Validator result before downstream routing. The runtime can instead be
configured to warn or disable that requirement, so the policy and receipt are
part of every live claim. Airtable handoff is complete only when the record is
confirmed and review ready. A reviewer, not the agent, owns the decision.
Alongside that live path, Codex uses the Workflow Compiler to show the exact
evidence, ownership, approvals, and stops. The terminal does not fake the work;
it makes the operating contract legible and replayable. When we connect another
system, its credentials, results, receipts, and rollback stay with the owning
execution host."

## Source and proof boundaries

The map is derived from these repository-owned sources:

- [Marketplace Submission Cloud README](https://github.com/createsomethingtoday/create-something-monorepo/blob/main/apps/marketplace-template-submission-cloud/README.md)
- [submission intake route](https://github.com/createsomethingtoday/create-something-monorepo/blob/main/apps/marketplace-template-submission-cloud/app/api/intake/template/route.ts)
- [published URL and Validator preflight route](https://github.com/createsomethingtoday/create-something-monorepo/blob/main/apps/marketplace-template-submission-cloud/app/api/intake/validate-published-url/route.ts)
- [Workflow Compiler Marketplace starter](https://github.com/createsomethingtoday/create-something-monorepo/blob/main/packages/workflow-compiler/src/starter.ts)
- [Agent-Run Receipt Charter](https://github.com/createsomethingtoday/create-something-monorepo/blob/main/docs/AGENT_RUN_RECEIPT_CHARTER.md)

These sources describe the current contract and ownership. They are not a live
credential inventory, an external receipt, or proof that a particular creator
submission reached review.
