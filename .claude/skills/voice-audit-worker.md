---
name: voice-audit-worker
description: Execute a bounded reader-use and voice audit for CREATE SOMETHING prose
category: orchestration
context: fork
agent: voice-auditor
tools: Read, Grep, Glob
triggers:
  - 'voice audit convoy'
  - 'content compliance check'
related:
  - writing-for-humans
  - target-reader-review
  - voice-validator
composable: false
priority: P1
---

# Voice Audit Worker

Audit only the supplied artifact and review scope. Do not search for an unassigned local worker directory or mutate orchestration status files.

Read:

- `packages/dotfiles/codex/skills/writing-for-humans/SKILL.md`
- `packages/dotfiles/codex/skills/target-reader-review/SKILL.md`
- `docs/policies/v1/policy.prose-quality.v1.md`
- the applicable property voice or public-copy policy

## Protocol

1. Confirm the artifact type, target reader, purpose, source facts, and review scope from the assignment.
2. Return `hold` if missing facts, approval, or context could change the meaning.
3. Find the answer, recommendation, or default path.
4. Check structure, paragraph jobs, information flow, evidence, limits, and local terminology.
5. For operator content, simulate orientation, default selection, starting, completion, recovery, and verification.
6. Run the repository prose check only when the assignment supplies a local file and execution authority. Keep its findings separate from judgment.
7. Recommend the smallest repair that preserves facts, exact labels, technical boundaries, and property voice.

Do not invent metrics, examples, customer details, citations, outcomes, or human texture. Do not apply automatic terminology substitutions. Do not require tables, checklists, philosophy, or master citations unless the artifact's actual job needs them.

## Output

Return the YAML-shaped packet defined by `target-reader-review`, followed by no more than three prioritized edits. Include the exact review scope and any preservation risk.

Record completion through the owning Linear or agent workflow supplied with the assignment. This compatibility skill does not own task status or done authority.
