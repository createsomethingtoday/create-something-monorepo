---
description: Review prose for reader use, evidence, clarity, and CREATE SOMETHING voice
allowed-tools: Read, Grep, Glob, Bash
---

# Audit Voice Command

Use `/audit-voice [path]` to review a complete rendered component or relevant document section.

## Authority

- Drafting and structure: `packages/dotfiles/codex/skills/writing-for-humans/SKILL.md`
- Independent reader judgment: `packages/dotfiles/codex/skills/target-reader-review/SKILL.md`
- Policy and enforcement boundary: `docs/policies/v1/policy.prose-quality.v1.md`
- Final clarity and revision voice: `.claude/rules/voice-canon.md`

The Voice Canon is the revision layer. It does not replace artifact structure, operator usability, source truth, or property policy.

## Audit Order

1. **Reader and purpose:** Name who must understand or act and what the artifact should change for them.
2. **Answer and structure:** Find the conclusion, recommendation, or default path. Check that supporting sections belong beneath it and paragraphs have one job.
3. **Operator path:** For instructions, simulate outcome, applicability, prerequisites, first action, expected result, recovery, and completion proof.
4. **Information flow:** Keep the main character and action visible. Move from familiar context to important new information.
5. **Evidence and limits:** Keep material claims beside the right proof, uncertainty, and scope boundary. Do not invent missing metrics.
6. **Revision:** Remove throat-clearing, repeated conclusions, hidden verbs, inflated phrasing, and unexplained owned terms. Restore natural voice after cutting.
7. **Tool findings:** Run `pnpm prose:check -- <path> --format json` when possible. Report deterministic findings separately from judgment warnings.

## Contextual Signals

Review these in context rather than applying automatic substitutions:

- marketing language without a named capability or result
- relative claims without evidence or an honest limit
- abstract noun stacks before a concrete actor or consequence
- several choices before a recommended default
- technical or owned terms without local meaning
- commands without expected results or recovery
- machine-oriented tables or checklists that make human prose harder to read

Exact UI labels, legal language, code, quotations, and precise field terms may remain technical. Use the vocabulary owned by the actual artifact; do not force `AI-native development`, `canonical standards`, `papers`, `experiments`, or `masters` into unrelated contexts.

## Output

```yaml
verdict: pass | revise | hold
reader: <target reader>
artifact_type: <type>
review_scope: <rendered component or document section>
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
strengths:
  - <specific strength>
preservation_risks:
  - <fact, citation, exact label, uncertainty, or safety boundary>
deterministic_findings:
  - <tool finding or none>
human_review_needed: <yes or no, with reason>
```

Use `pass` only when the artifact succeeds for its actual job. Use `revise` for a bounded structural or sentence repair. Use `hold` when source truth, approval, or reader context is missing.
