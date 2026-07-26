---
name: voice-validator
description: Validate prose for reader use, evidence, clarity, and CREATE SOMETHING property voice
category: quality-assurance
triggers:
  - '*.md publish'
  - 'content review'
  - 'before deployment'
related:
  - writing-for-humans
  - target-reader-review
  - voice-audit-worker
composable: true
priority: P0
---

# Voice Validator

Use this compatibility skill to apply the canonical writing system:

- `packages/dotfiles/codex/skills/writing-for-humans/SKILL.md` owns drafting and structural editing.
- `packages/dotfiles/codex/skills/target-reader-review/SKILL.md` owns independent judgment.
- `docs/policies/v1/policy.prose-quality.v1.md` owns enforcement boundaries.
- `.claude/rules/voice-canon.md` owns the final clarity, honesty, humanity, and revision pass.

## Validation Sequence

1. Name the reader, artifact type, purpose, and complete review scope.
2. Find the answer, recommendation, or default path.
3. Check the information hierarchy and paragraph jobs before editing sentences.
4. For operator content, simulate orientation, default selection, starting, completion, recovery, and verification.
5. Check visible characters and actions, familiar-to-new information flow, and emphasis.
6. Check material claims against evidence, uncertainty, and limitations.
7. Remove clutter and unexplained terminology without erasing exact labels or technical meaning.
8. Separate deterministic tool findings from editorial judgment.

## Voice Principles

- **Clarity over cleverness:** make the idea or action easy to follow.
- **Specificity over generality:** support material claims with the right evidence or honest limit.
- **Honesty over polish:** keep failures, uncertainty, and intervention visible when relevant.
- **Useful over interesting:** help the reader understand, decide, or act.
- **Grounded over trendy:** prefer precise mechanisms and durable concepts to empty novelty.

These principles do not require a number in every sentence, a master citation in every artifact, or owned vocabulary where familiar language is clearer.

## Operator Standard

An actionable artifact should make these elements discoverable:

1. outcome
2. use when
3. prerequisites
4. first action
5. expected result
6. recovery
7. completion proof

Combine elements in short artifacts when the sequence stays clear. Put one recommended path before alternatives.

## Contextual Review Signals

- unsupported marketing or relative claims
- abstract nouns before concrete actors, actions, or consequences
- buried conclusions
- repeated conclusions
- unexplained owned terms
- commands without expected results or recovery
- tables and checklists that serve machine parsing rather than the human reader

Do not treat one token as proof of poor prose. Preserve exact UI labels, quotations, legal language, code, and precise field terminology.

## Completion

Return `pass`, `revise`, or `hold` using the packet in `target-reader-review`. Finish consequential publication with a human final read. A green linter is evidence of its declared rules only; it is not proof of usable prose.
