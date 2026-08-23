---
name: workflow-compiler
description: Create, revise, validate, simulate, and explain local governed runbooks, playbooks, and workflows through the Workflow Compiler CLI. Use when a builder wants Codex to turn recurring work into versioned, inspectable workflow artifacts.
---

# Workflow Compiler Builder

Codex is the paired operator for this workflow. The repository remains authoritative:
Codex proposes bounded changes, and the public Workflow Compiler CLI validates,
simulates, and explains the resulting contract.

## Local-first boundary

- Start with a repository-local workflow. This starter has no credentials,
  network calls, hosted state, telemetry, or execution controls.
- The skill does not execute live actions. It must not claim that a replay,
  compiled artifact, or tool plan performed a real external action.
- Treat connected systems, remote credentials, scheduled triggers, shared
  approvals, and continuous operation as a separate cloud graduation decision.
- Codex or OpenAI use is not an official OpenAI partnership, endorsement,
  reseller relationship, or certification.

## Builder loop

1. Ask for the outcome, the human owner, the evidence required to move forward,
   and the action that must stop.
2. In the builder's chosen new directory, create the local starter:

   npx workflow-compiler init --template local-runbook --dir WORKFLOW_DIRECTORY

3. Read PLAYBOOK.md, RUNBOOK.md, workflow.json, and cases.json before
   proposing changes. Keep the proposed change limited to the requested
   workflow behavior.
4. Validate the governed definition:

   npx workflow-compiler validate --workflow workflow.json

5. Simulate the historical pass, wait, and stop cases:

   npx workflow-compiler simulate --workflow workflow.json --cases cases.json

6. Explain the compiled contract in operator language:

   npx workflow-compiler explain --workflow workflow.json --cases cases.json

7. Show the changed source and simulation result. Do not add a connected
   runtime or execute a tool merely because the pass case is eligible.

## Approval rule

Codex may propose a local source edit and run validation. An action that affects
an external system, a credential, a production runtime, or a shared decision
requires explicit approval and its own reviewed contract. A blocked result is a
successful safety outcome, not a failed prompt.

## Builder handoff

At the end of a local builder session, leave:

- a versioned playbook and runbook;
- a workflow definition and replay cases;
- the run, wait, and stop explanation;
- a concise note about the next missing evidence or approval boundary.

Only compile generated artifacts after the simulation matches expectations:

npx workflow-compiler compile --workflow workflow.json --cases cases.json --out artifacts

The generated artifacts remain local and inspectable. Share only sanitized,
non-secret examples unless the operator explicitly approves another boundary.
