---
name: debug-feedback-loop
description: Repro-first debugging for CREATE SOMETHING Codex sessions. Use when a bug, failing check, flaky behavior, or performance regression needs a tight pass/fail loop before code changes.
---

# Debug Feedback Loop

Use this skill to keep Codex debugging sessions evidence-led. The goal is one
tight command that can prove the bug is present before changing code, then prove
it is gone after the fix.

## Repo Rules

- Start from `AGENTS.md` and any package-local `AGENTS.md`.
- Preserve Linear as the coordination source of truth.
- Use `pnpm agent:solo-loop` for solo current-checkout work.
- Use `pnpm agent:claim-worktree -- --issue CRE-123` for shared, delegated,
  long-running, or production-bound work.
- Do not create GitHub issues, local issue files, Loom tasks, or alternate
  trackers for this loop.

## Tier Order

Debug in the CREATE SOMETHING order:

| Tier       | Question                                                               | Evidence                                                |
| ---------- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| Database   | Is the data, config, fixture, binding, or external state correct?      | fixture, API response, DB row, env value, trace         |
| Automation | Did the command, worker, tool, route, or job execute correctly?        | test, CLI, smoke, browser check, workflow log           |
| Judgment   | Was the right policy, approval, fallback, or escalation path selected? | policy artifact, Linear evidence, approval, route trace |

Lower-tier failures make higher-tier theories unreliable.

## Required Loop

Do not start with a likely cause. First build a feedback loop.

A valid loop is:

- red-capable: asserts the reported symptom, not only "does not crash"
- deterministic: same verdict every run, or a measured high repro rate
- narrow: reaches the real failing path with the smallest useful setup
- agent-runnable: one command or script Codex can run unattended

Prefer existing repo commands:

```bash
pnpm exports <package> <symbol>
pnpm --filter <package> test
pnpm --filter <package> check
pnpm check
pnpm lint
pnpm agent:solo-loop:check
```

Use browser automation for UI regressions, Context7 for unstable third-party
APIs, and Ground before claiming duplicate code, dead exports, orphaned modules,
or environment-boundary mistakes.

## Workflow

1. Name the exact symptom and owning truth surface.
2. Build one red-capable command or scripted check.
3. Reproduce the failure and minimize the load-bearing inputs.
4. Only then list 3 to 5 falsifiable hypotheses.
5. Instrument one hypothesis at a time with tagged temporary logs.
6. Add the smallest regression test or smoke at the public interface.
7. Apply the fix and rerun both the regression check and original loop.
8. Remove temporary instrumentation and record Linear evidence when required.

## Completion Bar

Do not call the bug fixed until:

- the original loop passes
- the regression check passes, or the missing test surface is documented
- temporary logs and throwaway harnesses are removed
- the final explanation names the proven cause and the evidence
- Linear evidence is updated for shared, delegated, production-bound, or handoff
  work
