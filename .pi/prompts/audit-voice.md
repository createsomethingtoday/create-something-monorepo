---
description: Review prose for reader use, evidence, clarity, and CREATE SOMETHING voice
argument-hint: '[path]'
---

# Voice and Reader Audit

Audit `$@` against the canonical prose system:

- drafting and structure: `packages/dotfiles/codex/skills/writing-for-humans/SKILL.md`
- independent judgment: `packages/dotfiles/codex/skills/target-reader-review/SKILL.md`
- policy boundary: `docs/policies/v1/policy.prose-quality.v1.md`
- final revision voice: `.claude/rules/voice-canon.md`

## Audit Loop

1. Identify the artifact type, target reader, purpose, and complete review scope.
2. State the answer, recommendation, or usable path the reader receives.
3. Check structure before sentences: answer first, grouped supports, one paragraph job, evidence beside claims.
4. For operator content, simulate orientation, default-path discovery, starting, completion, recovery, and verification.
5. Repair sentence flow: visible character and action, familiar context first, important new information near the end.
6. Check factual preservation, citations, uncertainty, exact labels, technical boundaries, and property voice.
7. Treat jargon, sentence length, abstraction density, passive voice, and owned-term clusters as contextual review signals unless the owning policy declares a deterministic rule.
8. Run `pnpm prose:check -- <path> --format json` when the repository file is available. Keep tool findings separate from judgment.

Do not require a number for every sentence. Require evidence where a material claim depends on measurement. Do not replace familiar language with owned terminology unless the artifact or property actually owns that term.

## Output

```yaml
verdict: pass | revise | hold
reader: <target reader>
artifact_type: <type>
review_scope: <complete visible boundary>
answer_or_default: <what the reader receives>
first_friction: <location and effect, or none>
operator_path:
  can_orient: yes | no | not-applicable
  can_find_default: yes | no | not-applicable
  can_start: yes | no | not-applicable
  can_complete: yes | no | not-applicable
  can_recover: yes | no | not-applicable
  can_verify: yes | no | not-applicable
frictions:
  - location: <location>
    reason: <reader effect>
    smallest_edit: <bounded repair>
preservation_risks:
  - <risk or none>
deterministic_findings:
  - <finding or none>
```

Finish consequential publication with a human final read. A green tool report is not proof that the prose is usable.
