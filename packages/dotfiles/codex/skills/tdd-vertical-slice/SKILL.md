---
name: tdd-vertical-slice
description: Test-first vertical-slice development for CREATE SOMETHING Codex sessions. Use when adding behavior or fixing bugs through a public interface test.
---

# TDD Vertical Slice

Use this skill when Codex should build or fix behavior one slice at a time. The
loop is one failing behavior check, one minimal implementation, then refactor
while green.

## Repo Rules

- Start from `AGENTS.md` and any package-local `AGENTS.md`.
- Use Linear for shared, delegated, production-bound, or evidence-bearing work.
- Use `pnpm bootstrap:worktree` in fresh worktrees before commands that need
  workspace binaries.
- Verify `@create-something/*` imports with `pnpm exports`.
- Use Context7 for unstable external APIs.

## Loop

1. Identify the public interface real callers should use.
2. Name one observable behavior in user or operator language.
3. Red: add one failing test or smoke for that behavior.
4. Green: implement only enough code to pass.
5. Refactor: improve duplication, locality, and naming while tests stay green.
6. Repeat only after the current slice is green.

Do not write all tests first. That creates speculative tests that lock in the
agent's guessed design instead of the real interface.

## Good Tests

Prefer tests that:

- cross the public interface
- assert behavior rather than implementation shape
- use small explicit fixtures
- survive internal refactors
- exercise real code paths unless an external boundary must be adapted

Avoid tests that:

- mock internal collaborators to reach private logic
- assert private structure or call order without user-visible behavior
- bypass the owning interface to inspect storage directly
- weaken existing coverage to make the slice green

## Commands

```bash
pnpm exports <package> <symbol>
pnpm --filter <package> test
pnpm --filter <package> check
pnpm check
pnpm lint
git diff --check
```

## Completion Bar

The slice is complete only when:

- the behavior check passes
- relevant package checks pass
- imports and exports are verified when touched
- no unrelated tests were weakened or deleted
- Linear evidence is updated when required by the repo workflow
