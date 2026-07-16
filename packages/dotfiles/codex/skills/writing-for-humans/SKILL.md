---
name: writing-for-humans
description: Draft or edit agent-assisted prose for a real human reader while preserving facts, citations, uncertainty, technical meaning, and CREATE SOMETHING property voice.
---

# Writing for Humans

Use this skill for prose a person must understand, trust, or act on: public copy, documentation, reports, briefs, explanations, proposals, and messages. Do not use it to optimize for an AI detector or to disguise authorship.

The default reader is the least-tenured credible practitioner in the document's actual field. They know basic field concepts but do not know CREATE SOMETHING vocabulary. If the artifact names another reader, use that reader instead.

## Preservation Contract

Before editing, identify and preserve facts, citations, quoted language, uncertainty, scope limits, approved claims, technical labels, and required terminology.

You must not invent metrics, customers, examples, anecdotes, experiences, opinions, quotations, sources, or confidence. Do not add fake human texture. If a useful detail is missing, mark the gap or ask for evidence.

Keep property voice intact. Plain language can explain an owned term without erasing it. Exact UI labels, code, legal language, and quoted text may stay technical when accuracy depends on them.

## Draft and Edit Loop

1. Name the reader, the decision or action the prose supports, and the evidence available.
2. Lead with the concrete change, stake, question, or next move.
3. Move from known language to new language. Define an owned term where the reader first needs it.
4. Prefer concrete nouns and active verbs. Name the actor, action, artifact, boundary, or observed result.
5. Give each paragraph one job. Vary sentence length when the thought changes; do not manufacture rhythm mechanically.
6. Keep claims beside proof and limitations. Preserve uncertainty instead of upgrading it into confidence.
7. Remove repetition that does not change meaning or move the reader forward.
8. Read the result once for meaning and once for useful momentum.

## Review Pattern Clusters

Treat these as contextual pattern clusters, not forbidden tokens:

- stacked abstractions before a concrete example
- repeated restatement of the same conclusion
- canned openings, summaries, or transitions that could fit any document
- excessive symmetry, slogan-like triplets, or identical paragraph rhythm
- unexplained owned terms or acronyms
- confident claims detached from evidence or scope limits
- inflated adjectives where a mechanism or result belongs

One instance is not proof of poor prose or AI authorship. Keep a phrase when it is accurate, natural in context, and serves the reader.

## Repository Verification

For repository prose, read `docs/policies/v1/policy.prose-quality.v1.md`, then run the narrow public check:

```bash
pnpm prose:check -- path/to/file.md --format json
```

Fix deterministic findings. Treat warnings as review prompts, not automatic rewrite instructions. For a broader judgment pass, invoke `$target-reader-review` and calibrate against `scripts/prose-quality/evals/target-reader.v1.json`.

Finish with a human final read for factual integrity, reader momentum, and property voice. A green linter is necessary evidence only where policy says so; it is never proof that the prose is good.

## Attribution

The positive clear-writing loop adapts principles from `softaworks/agent-toolkit`'s `writing-clearly-and-concisely` skill (MIT). This repo keeps its own preservation, property-voice, enforcement, and review boundaries instead of vendoring the upstream reference prompt.
