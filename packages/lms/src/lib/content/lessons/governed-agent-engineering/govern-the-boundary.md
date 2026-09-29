# Govern the Boundary

## Outcome

Write a policy artifact that determines what the workflow can do, what requires approval, and what happens when authority is unclear.

## Policy must travel with the task

A prompt saying “be careful” is not a control. The execution path needs to know which tool calls are permitted. Reviewers need to know why a run stopped. Operators need a way to revoke access without asking the model to remember a new instruction.

The three tiers now meet: **Database** records identity, consent, grants, and source state; **Automation** checks them before each tool call; **Judgment** defines the rules and who can approve an exception.

## Write the first policy

Create `POLICY.md` beside your work contract:

```text
Purpose: Draft a response to one authorized message for human review.

May run:
- Read the exact authorized message and approved context.
- Produce a local draft and trace.

Must ask a human before:
- Sending a message or changing an external account.
- Expanding to another device, contact, source, or provider.
- Charging, purchasing, enrolling, or publishing.

Must stop when:
- Identity, source ownership, consent, or provider eligibility is uncertain.
- A source is revoked, stale beyond the work contract, or unavailable.
- A tool returns a denial or a result inconsistent with its schema.

Approval receipt:
- Who approved which exact action, for which source and destination, when.
- The final provider or device readback after the action.
```

This document becomes enforceable only when the runtime checks it. Add a function to your loop that refuses any action outside `read_source`, `draft`, and `stop_*`. Try to call `send_message` and verify it returns `approval_required` without sending anything.

## The Grantbot/GiGi lesson

A handoff can establish source ownership and a tested software baseline while device permissions, provider eligibility, and the person's acceptance remain open. Do not let a green build silently promote the work to “accepted.” The policy should name those gates and the person who owns each decision.

## Check your understanding

Could a third-party document persuade your agent to call a tool? Could a stale approval authorize a new destination? Could a denial be mistaken for a retriable timeout? If the answer to any is yes, tighten the enforcement point before connecting real accounts.

**Keep:** `POLICY.md` and a denied-action trace.

## Go deeper

- [Prompt injection and safety topics](/reference?phase=18-ethics-safety-alignment)
- [CREATE SOMETHING policy examples](https://github.com/createsomethingtoday/create-something-monorepo/tree/main/docs/policies)
