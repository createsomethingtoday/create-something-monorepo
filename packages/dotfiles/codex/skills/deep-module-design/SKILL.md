---
name: deep-module-design
description: Design or review CREATE SOMETHING modules for leverage, locality, testability, and clear Database/Automation/Judgment ownership.
---

# Deep Module Design

Use this skill when a Codex session is choosing an interface, refactoring shallow
code, reducing duplicated behavior, or making a package easier to test and
navigate.

A deep module gives callers a small interface with meaningful capability behind
it. Good depth creates:

- leverage: one interface removes repeated caller work
- locality: change and bugs stay concentrated
- testability: behavior is verified through the same interface callers use

## Framework Mapping

Before editing, classify what the module owns:

| Tier       | Design question                                                                  |
| ---------- | -------------------------------------------------------------------------------- |
| Database   | What state, resources, config, fixtures, records, or policy artifacts live here? |
| Automation | What execution, transformation, worker path, command, or tool behavior runs?     |
| Judgment   | What approval, fallback, escalation, policy, or operator decision is encoded?    |

Mixed-tier modules are allowed when the interface stays small and testable. Split
only when the current shape is shallow, leaky, or hard to validate.

## Vocabulary

- Module: anything with an interface and implementation.
- Interface: everything callers must know, including types, invariants, config,
  permissions, side effects, and error modes.
- Implementation: behavior hidden behind the interface.
- Seam: where behavior can vary without editing callers.
- Adapter: a concrete implementation at a seam.
- Depth: useful behavior behind the interface.
- Leverage: repeated caller work removed by the module.
- Locality: future change confined by the module.

## Review Loop

1. Read the nearest `AGENTS.md`, package README, policy docs, and tests.
2. Name the domain concept in existing repo language.
3. Run the deletion test:
   - if deletion makes complexity disappear, the module is probably a
     pass-through
   - if deletion spreads complexity across callers, it is earning its place
4. Count what callers must know, including hidden env, ordering, retry, cache,
   approval, and external-account requirements.
5. Check Database/Automation/Judgment ownership.
6. Prefer replacing a shallow interface over layering another wrapper on top.
7. Test through the public interface real callers use.

## Proposal Format

Use this format before editing shared architecture:

```text
Concept: <domain concept>
Current interface: <what callers must know today>
Problem: <specific friction with file or command evidence>
Proposed interface: <smallest stable surface>
Tier ownership: Database=<...>, Automation=<...>, Judgment=<...>
Leverage: <callers or workflows simplified>
Locality: <future changes confined here>
Test surface: <command or test through the public interface>
Migration: <replace, collapse, or keep adapter; include rollback note>
```

Do not refactor on taste alone. Tie every proposal to evidence: duplicated
setup, hard tests, runtime leakage, repeated policy checks, bug locality, Ground
results, or a concrete caller simplification.

Use Linear for tracked, shared, delegated, production-bound, or handoff-worthy
architecture work. Do not create GitHub issues, local issue files, Loom tasks,
or alternate trackers for this flow.
