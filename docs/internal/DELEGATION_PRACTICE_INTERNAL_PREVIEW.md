# The Delegation Practice Internal Preview Protocol

Status: draft runbook; not an invitation
Owner: CREATE SOMETHING
Tracked work: CRE-1261
Canonical experience: `docs/THE_DELEGATION_PRACTICE_EXPERIENCE.md`

## Purpose

Test whether an accountable operator can use The Delegation Practice without
repository knowledge or live facilitation. The preview should reveal where the
method produces useful artifacts, where it creates confusion, and whether its
proof changes a consequential workflow decision.

This protocol does not authorize contacting a participant, sharing a build,
publishing the route, using client data, or granting production authority.

## Intended participant

One accountable operator or practitioner who owns, reviews, or improves a real
workflow. The participant should be able to name the workflow's stakes and
decision owner. They do not need software-development or MCP knowledge.

## Safety boundary

Use a representative workflow when the real workflow contains sensitive data.
Do not enter:

- credentials, tokens, passwords, or secrets;
- private client records or unpublished client evidence;
- personal data or personally identifying information;
- production URLs, access details, or confidential policy text; or
- claims that have not been approved for the preview audience.

The preview stores the draft only in the participant's browser. It does not
write to a database or production system. Starting over erases the browser-local
preview state from the visible session.

## Prepared starting state

The facilitator provides a local or separately approved preview URL opened to a
blank `/practice` draft. The facilitator confirms:

1. the route says `Internal preview` and `Not certification`;
2. no example values or prior receipt remain;
3. browser reload and start-over behavior have been checked;
4. the participant understands the safe-entry boundary; and
5. no production tools or credentials are connected.

### Local facilitator setup

From the repository root, start the package-local development server:

```bash
cd packages/agency
pnpm dev --host 127.0.0.1
```

Open the printed loopback URL at `/practice`. Keep the run on the facilitator's
machine unless a separate sharing and preview-environment decision has been
approved. Before handing over the keyboard, use `Start over` and confirm the
route returns to Stage 01 with no receipt.

## Unassisted run

Suggested timebox: 35–45 minutes.

The participant:

1. names one workflow, accountable owner, operator, stakes, and thesis claim;
2. maps the actors, systems, artifacts, handoffs, and constraints;
3. records allowed actions, forbidden actions, policy version, verifier, and rollback trigger;
4. defines a golden task and records one representative field observation;
5. attaches a non-sensitive evidence-receipt reference;
6. tests the Authority Envelope and explains whether authority should preserve, expand, narrow, suspend, revoke, or recertify;
7. names an affected party, notice plan, appeal path, and unresolved concern;
8. sets the next review date;
9. generates and reads the Practice Receipt; and
10. reloads the page, confirms recovery, then leaves the receipt intact for review.

To count as an unassisted run, the facilitator does not explain stage meaning or
repair the participant's answers during the session. Technical failure may end
the run and must be recorded as evidence rather than silently corrected.

## Evidence to return

- The generated Practice Receipt, still labeled `Internal preview` and `Not certification`.
- Start and end timestamps and whether the run finished inside the timebox.
- The first stage where the participant required clarification.
- Any field that invited sensitive, speculative, or performative input.
- The authority decision and whether it changed a real hold, rehearsal, review, or next action.
- Any keyboard, mobile, reload, layout, or reset failure.
- The participant's requested revision before another practitioner uses the experience.

Do not return secrets, private source material, raw client data, or screenshots
containing those values.

## Skeptical review questions

1. Which artifact would still matter if the CREATE SOMETHING framing disappeared?
2. Did the map expose a real stop, owner, or handoff that was previously vague?
3. Could form completion be mistaken for earned authority anywhere?
4. Did proof and owner approval remain visibly separate?
5. Was the affected party's notice and appeal path concrete enough to act on?
6. Which evidence could falsify the receipt or authority decision?
7. What should be held, revised, narrowed, or removed before another run?

Allowed verdicts are `Supported`, `Revise`, `Hold`, and `Falsified`. Every
verdict records a consequence.

## Stop conditions

Stop the preview if:

- the participant is about to enter sensitive or identifying data;
- the route implies certification, production authority, or public proof;
- receipt generation succeeds with missing required artifacts;
- owner approval is inferred from proof completion;
- reload loses a completed draft or start-over fails to erase it;
- a browser or accessibility failure prevents independent completion; or
- the participant cannot identify an accountable owner or affected party.

## Completion boundary

Finishing the route produces a Practice Receipt, not a credential. A successful
internal preview does not authorize public publication, production access,
autonomous execution, wider workflow authority, or transfer of authority to a
different person, system, workflow, policy version, or environment.

## Readiness record

As of 2026-07-14, the local route has passed the prepared-state checks on
desktop and at `390 x 844`: all ten stages accept artifacts, missing artifacts
block receipt generation, proof and owner approval produce different authority
decisions, a complete non-certifying receipt survives reload, and the two-step
reset clears it. Keyboard activation was exercised for the stage rail, next
stage, authority scenario, receipt generation, and reset controls. The narrow
receipt layout was revised after a visual check found overlapping metadata.

This is implementation readiness evidence, not practitioner evidence. No
unassisted human run, invitation, sharing action, public deployment, or
production-authority decision is represented by this record. The first human
preview must return the evidence above before the experience claim can advance
beyond `partial`.
