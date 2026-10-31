# Ship the Handoff

## Outcome

Package your small agent system so another operator can run it, inspect its limits, and decide the next authorized step.

## What delivery means

The work is reviewable when it includes more than code. Another person needs the job, source ownership, policy, run command, traces, failure behavior, and next gate. For a client assistant such as Grantbot/GiGi, the handoff must also say which provider and device checks have happened and which still require the client's own acceptance.

Create a `HANDOFF.md` with these sections:

1. **Outcome and owner.** The exact job and who decides whether it is useful.
2. **Source baseline.** Repository and revision, with the files another developer should read first.
3. **Run contract.** Setup, required environment, command, expected output, and stop conditions.
4. **Permission map.** Sources and actions allowed, denied, or waiting for approval.
5. **Evidence.** Links to the successful and failed local traces, plus provider or device readback if it exists.
6. **Proof level.** Authored, tested, reviewed, merged, deployed, delivered, and accepted are stated separately.
7. **Rollback and revocation.** How to disable the integration, revoke access, and recover state.
8. **Next gate.** One concrete owner and action, not “continue testing.”

The package should run exactly as handed over. If a value cannot be supplied, fail loudly at startup. A plausible placeholder that survives a paste and only fails on the next live event is not a handoff.

## Graduation exercise

Ask another operator to follow the run contract without your help. They should be able to reproduce both evaluation cases and identify the approval point. Record where they got stuck and improve the artifact. This is a better test of a reusable agent capability than a demo in its author's terminal.

## Continue learning

You now have a control loop and governance spine. Use the [523-lesson reference library](/reference) for the underlying math, model mechanics, protocols, agent patterns, safety, and production engineering. Return to this field course whenever a new capability changes the data source, tool surface, human gate, or evidence required.

**Final artifacts:** `WORK_CONTRACT.md`, `agent_loop.py`, `SOURCES.md`, `POLICY.md`, `EVALUATION.md`, two traces, and `HANDOFF.md`.
