---
name: deep-module-design
description: Design or review modules for leverage, locality, testability, and clean tier ownership. Use when refactoring, choosing an interface, reducing shallow pass-through code, or improving architecture.
---

# Deep Module Design

Use this skill when architecture work needs sharper design language without
adding process overhead.

A deep module gives callers a small interface with meaningful capability behind
it. It improves:

- **Leverage**: one interface unlocks behavior across many callers.
- **Locality**: knowledge, bugs, and change stay concentrated.
- **Testability**: behavior is testable through the same interface callers use.

Map that module to the CREATE SOMETHING framework before changing it:

| Framework view | Design question                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| **Database**   | What state, records, resources, config, fixtures, or policy artifacts does this module own or expose?  |
| **Automation** | What execution, transformation, tool call, worker path, or harness behavior does this module perform?  |
| **Judgment**   | What policy choice, approval rule, fallback, escalation, or operator decision does this module encode? |

If a module mixes tiers, make the mix explicit. Do not split it just because it
mixes tiers; split only when the interface becomes shallow, hard to test, or
hard to change.

## Vocabulary

Use these terms precisely:

- **Module**: any unit with an interface and implementation. This can be a
  function, class, package, worker route, skill, policy artifact, or workflow
  slice.
- **Interface**: everything callers must know to use the module: types,
  invariants, ordering, config, error modes, permissions, timing, and side
  effects.
- **Implementation**: the behavior hidden behind the interface.
- **Seam**: the place where behavior can vary without editing callers.
- **Adapter**: a concrete implementation that satisfies an interface at a seam.
- **Depth**: the amount of useful behavior behind the interface.
- **Leverage**: how much repeated caller work the module removes.
- **Locality**: how much future change is confined to the module.

## Review Loop

1. **Find the owning concept**
   - Name the domain concept in repo language.
   - Read nearby `AGENTS.md`, package README, policy docs, and existing tests
     before proposing a new interface.

2. **Run the deletion test**
   - If deleting the module makes complexity disappear, it is probably a
     pass-through.
   - If deleting it spreads complexity across callers, it is earning its place.

3. **Check interface weight**
   - Count what callers must know, not just method count.
   - Watch for hidden requirements: call order, env bindings, cache invalidation,
     retries, approval state, or external account state.

4. **Check tier ownership**
   - Database logic should expose correct state and artifacts.
   - Automation logic should execute deterministically and report evidence.
   - Judgment logic should remain policy-shaped and reviewable.

5. **Prefer replace over layer**
   - Do not add a wrapper around a shallow module unless the wrapper becomes the
     real interface and callers move to it.
   - Retire or collapse the old surface when safe.

6. **Test through the public interface**
   - Regression tests should cross the same interface real callers use.
   - If tests need private internals, the module shape is suspect.

## Good Refactor Candidates

Prioritize candidates with concrete evidence:

- Several callers repeat the same setup, fallback, validation, or policy check.
- A test must mock many internals to prove one behavior.
- A worker, command, or route leaks runtime-specific setup into unrelated code.
- One concept requires reading many small files with no single owning module.
- A bug fix has to touch multiple callers because behavior is not localized.
- Ground verifies duplicate functions, dead exports, or orphaned modules.

Do not refactor on taste alone. Connect every proposal to caller leverage,
maintainer locality, test coverage, or tier ownership.

## Interface Proposal Format

Use this compact format before editing shared architecture:

```text
Concept: <domain concept>
Current interface: <what callers must know today>
Problem: <specific friction, with file or command evidence>
Proposed interface: <smallest stable surface>
Tier ownership: Database=<...>, Automation=<...>, Judgment=<...>
Leverage: <callers or workflows simplified>
Locality: <future changes confined here>
Test surface: <command or test that proves behavior through the interface>
Migration: <replace, collapse, or keep adapter; include rollback note>
```

For tracked or production-bound work, attach the proposal and validation
evidence to the relevant Linear issue. Do not create GitHub issues, local issue
files, or a second tracker for this flow.
