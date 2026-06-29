---
name: debug-feedback-loop
description: Repro-first debugging for bugs, failing checks, and performance regressions. Use when something is broken, slow, flaky, or throwing and the next step needs evidence rather than a theory.
---

# Debug Feedback Loop

Use this skill to keep debugging sessions evidence-led. The goal is one tight
command that can prove the bug is present before changing code, then prove it is
gone after the fix.

This is a Policy OS execution loop:

| Tier           | Debug question                                                                | Evidence                                                             |
| -------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Database**   | Is the source data, config, fixture, or external state correct and available? | fixture, API response, DB row, env binding, log excerpt              |
| **Automation** | Did the code path, tool, worker, or job execute correctly?                    | test, CLI run, smoke, trace, workflow log                            |
| **Judgment**   | Was the right policy, approval, route, or fallback applied?                   | policy artifact, Linear evidence, approval record, expected decision |

Check tiers in that order. Lower-tier failures make higher-tier theories noisy.

## Required Loop

Do not start with a likely cause. Start by building a feedback loop.

A valid loop is:

- **Red-capable**: it drives the reported failure path and asserts the specific
  symptom, not just "does not crash".
- **Deterministic**: same verdict every run, or a known high reproduction rate
  for flaky failures.
- **Fast enough**: seconds when possible; narrow minutes when the real path is a
  worker, browser, or CI workflow.
- **Agent-runnable**: a command the agent can run without manual clicking unless
  the task is explicitly human-in-the-loop.

Preferred loop shapes:

1. Package-local test or smoke.
2. CLI command with a fixture and explicit expected output.
3. HTTP `curl` or route smoke against a local or preview server.
4. Browser automation for UI regressions.
5. Captured trace replay, HAR replay, queue payload, or workflow log replay.
6. Small throwaway harness when no public command reaches the path.

For CREATE SOMETHING repos, prefer existing commands before inventing new ones:

```bash
pnpm exports <package> <symbol>
pnpm --filter <package> test
pnpm --filter <package> check
pnpm check
pnpm lint
pnpm agent:solo-loop:check
```

Use Context7 for unstable third-party APIs. Use Ground before claiming duplicate
code, dead exports, orphaned modules, or environment-boundary mistakes.

## Workflow

1. **Name the symptom**
   - Quote or summarize the exact failure, error, wrong output, slow timing, or
     user-visible behavior.
   - Identify the owning truth surface: local command, package test, browser
     route, deployed worker, Linear issue, GitHub check, Airtable/Admin state,
     or another external source.

2. **Build the loop**
   - Produce one command or scripted check that can go red for this bug.
   - If no loop is possible, stop and state what artifact is missing: access,
     logs, fixture, HAR, trace, screen recording, or permission to add temporary
     instrumentation.

3. **Reproduce and minimize**
   - Run the loop and capture the failing output.
   - Remove inputs, config, fixtures, and steps one at a time until the smallest
     load-bearing failure remains.

4. **Rank hypotheses**
   - Write 3 to 5 falsifiable hypotheses only after the loop exists.
   - Each hypothesis must predict what observation or one-variable change would
     confirm or falsify it.

5. **Instrument narrowly**
   - Probe one hypothesis at a time.
   - Tag temporary logs with a unique prefix such as `[DEBUG-20260629-a]`.
   - For performance work, measure before changing code.

6. **Fix with a regression check**
   - Add the smallest regression test or smoke at the correct public interface.
   - If no correct interface exists, record that as an architecture finding and
     keep the original loop as completion evidence.
   - Apply the fix, rerun the regression check, then rerun the original loop.

7. **Clean up and record evidence**
   - Remove temporary logs and throwaway harnesses unless they became real tests.
   - For tracked work, record commands, pass/fail results, branch or worktree,
     deploy or smoke evidence, rollback note, and caveats in Linear.

## Completion Bar

Do not call the bug fixed until all of these are true:

- Original loop now passes.
- Regression check passes, or the lack of a correct test surface is documented.
- Temporary instrumentation is removed.
- The final explanation names the proven cause and the evidence that ruled out
  the wrong theories.
- Linear evidence is updated when the work is shared, delegated, production
  bound, or needed for handoff.
