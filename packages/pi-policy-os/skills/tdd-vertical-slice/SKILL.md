---
name: tdd-vertical-slice
description: Test-first vertical-slice development for CREATE SOMETHING packages. Use when adding behavior or fixing bugs where a public interface test can drive the change.
---

# TDD Vertical Slice

Use this skill when the work should be driven by one behavior at a time. The
goal is not "write all tests first"; the goal is a tight red-green-refactor loop
through the same public interface real callers use.

## Policy

This is a Policy OS quality loop:

- **Database**: fixtures, records, bindings, resources, and policy artifacts are
  explicit.
- **Automation**: one test or smoke drives one executable behavior.
- **Judgment**: acceptance criteria and approval boundaries stay visible.

Do not create issue-tracker state from this skill. Use Linear only when the work
is shared, delegated, long-running, production-bound, or needs durable evidence.

## Before Writing Tests

1. Read the nearest `AGENTS.md`, package README, and existing tests.
2. Verify local package imports with `pnpm exports` before using
   `@create-something/*` symbols.
3. Use Context7 for unstable third-party APIs.
4. Identify the public interface that should carry the behavior.
5. Name the first observable behavior in user or operator language.

Ask only when the public interface or acceptance behavior is ambiguous. For a
narrow confirmed bug or implementation request, proceed with the smallest
defensible behavior.

## Loop

Run one vertical slice at a time:

1. **Red**: add one failing test or smoke for one behavior.
2. **Green**: implement the smallest code path that passes it.
3. **Refactor**: remove duplication and improve locality while tests stay green.
4. **Repeat**: add the next behavior only after the previous slice is green.

Never write a batch of speculative tests for imagined behavior. Tests should
respond to the real interface and what the previous slice revealed.

## Test Surface Rules

Prefer tests that:

- cross the same interface callers use
- assert observable behavior rather than private structure
- keep fixtures small and explicit
- survive internal refactors
- use real code paths unless an external boundary must be adapted

Avoid tests that:

- mock internal collaborators just to reach private functions
- assert implementation shape instead of behavior
- check a database or filesystem side effect while bypassing the owning
  interface
- require broad environment setup when a smaller public command can prove the
  same behavior

## Useful Commands

```bash
pnpm exports <package> <symbol>
pnpm --filter <package> test
pnpm --filter <package> check
pnpm check
pnpm lint
git diff --check
```

For fresh worktrees, run `pnpm bootstrap:worktree` before commands that expect
workspace binaries such as `pnpm exec tsc` or `pnpm exec tsx`.

## Completion Bar

The slice is complete only when:

- the new behavior test or smoke passes
- relevant package checks pass
- no unrelated tests were weakened or deleted
- imports and public exports are verified when changed
- Linear evidence is updated when the work requires handoff, review, promotion,
  rollback, or durable completion evidence
