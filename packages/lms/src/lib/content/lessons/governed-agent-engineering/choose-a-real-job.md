# Choose a Real Job

## Outcome

Leave with a one-page work contract for an agent that solves a real operator problem. The contract must be specific enough that another person can tell whether the run succeeded.

## The problem

“Build an AI agent” is a technology choice without a job. A useful starting point is an observable request: *Given a new client message, identify the requested action, retrieve the authorized context, prepare a response, and stop before sending it.* That sentence gives the system an input, an output, and a human gate.

Grantbot and GiGi are useful design cases because an assistant touching a person's messages, devices, and work cannot be judged by fluent prose alone. A source repository, a working integration, a delivered build, and acceptance on the person's own device are separate claims. Keep them separate from the first design page.

## Map the three tiers

| Tier | Question | Example artifact |
| --- | --- | --- |
| Database | What can the agent know, and where did it come from? | A source inventory with owner, freshness, and permitted scope |
| Automation | What can it read, compute, or propose? | A typed tool contract and a trace of one run |
| Judgment | What requires human choice or stops the run? | A policy file with approval and escalation rules |

Start with a **read-and-draft** workflow. A message is an input, not proof that the sender has authorized every downstream action. If a tool would send a message, charge money, access a device, or alter a third-party account, put that action outside the first slice.

## Exercise

Choose one job in your own environment. Write this contract in a file named `WORK_CONTRACT.md`:

```text
Operator and owner:
Trigger:
Authorized input sources:
One question the agent must answer:
Output artifact and location:
Actions allowed without review:
Actions requiring human approval:
Forbidden actions:
Freshness requirement:
Success evidence:
Failure or uncertainty behavior:
```

For example, a client-assistant job could produce a draft reply with citations to the allowed messages. Its success evidence is a trace showing the exact source messages used and a reviewable draft. “The model said it sent the reply” is not evidence of delivery.

## Check your understanding

1. Can a second operator identify the owner of every input?
2. Can the agent finish safely when a source is missing or stale?
3. Does your success condition name an artifact or observable state, rather than “looks good”?
4. Is the human gate attached to the action that needs it?

**Keep:** `WORK_CONTRACT.md`. In the next lesson, the contract becomes a runnable loop.

## Go deeper

- [AI Engineering from Scratch: The Agent Loop](/reference/14-agent-engineering/01-the-agent-loop)
- [CREATE SOMETHING Three-Tier Framework](https://github.com/createsomethingtoday/create-something-monorepo/blob/main/docs/THREE_TIER_FRAMEWORK.md)
