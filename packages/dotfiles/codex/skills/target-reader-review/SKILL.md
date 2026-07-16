---
name: target-reader-review
description: Review prose as its least-tenured credible practitioner, separating deterministic policy findings from editorial judgment and returning pass, revise, or hold with preservation risks.
---

# Target Reader Review

Use this skill after a draft exists and the question is whether the intended human can understand it, trust it, and want the next sentence. This is a judgment review, not an AI detector, grammar score, buyer simulation, or brand-cheerleading pass.

The default reader is the least-tenured credible practitioner in the document's actual field. They know basic field concepts but do not know CREATE SOMETHING vocabulary. Use a named target reader when the source provides one.

Useful momentum means concrete stakes, visible progress or discovery, varied rhythm, and respect for the reader. It does not require jokes, slang, fake anecdotes, or forced informality.

## Inputs

Gather the draft, its purpose, intended reader, source facts, required citations, uncertainty, scope limits, property voice, technical labels, intended next action, and `review_scope`. Default `review_scope` to the rendered component, not an isolated sentence. Include referenced cards, proof, calls to action, definitions, and nearby content that the reader actually sees. If missing context could change factual meaning, return `hold` and request the owning evidence.

For repo work, read:

- `docs/policies/v1/policy.prose-quality.v1.md`
- `scripts/prose-quality/evals/target-reader.v1.json`
- the applicable property voice or public-copy policy

## Review Loop

1. Read once for meaning. State what the prose asks the reader to understand, decide, or do.
2. Read the complete rendered component again for useful momentum. Mark the first place where the reader loses the actor, action, stakes, evidence, or reason to continue.
3. Check whether owned terms are defined locally or grounded by a concrete example.
4. Check whether claims remain attached to proof, uncertainty, and scope limits.
5. Check paragraph jobs, sentence rhythm, repeated conclusions, and transitions in context.
6. Separate deterministic tool findings from judgment. Run `pnpm prose:check -- <file> --format json` when a repository file is available. Unrelated file-level deterministic findings do not change the verdict for the excerpt or rendered component under review; report them separately.
7. Suggest the smallest edit that restores meaning or momentum without changing the claim.

Do not infer a rewrite from a score. Do not invent evidence or human texture. Do not silently replace exact labels, citations, approved claims, or controlled property vocabulary.

## Verdicts

- `pass`: the target reader can follow the meaning and the prose earns its next sentence; minor optional polish may remain.
- `revise`: a localized editorial change would materially improve meaning, trust, or momentum without needing new evidence.
- `hold`: factual, source, approval, or reader context is missing; a human or owning system must resolve it before rewriting.

A `hold` is judgment escalation. It must not masquerade as a deterministic CI failure.

## Output

Return this compact YAML-shaped packet:

```yaml
verdict: pass | revise | hold
reader: <target reader used>
review_scope: <rendered component, page section, or other explicit boundary>
purpose: <what the prose helps them understand, decide, or do>
first_friction: <location and concise reason, or none>
strengths:
  - <specific strength>
frictions:
  - location: <line, paragraph, or excerpt>
    reason: <reader effect>
    smallest_edit: <bounded change; never fabricated content>
preservation_risks:
  - <fact, citation, uncertainty, label, or voice at risk>
deterministic_findings:
  - <tool rule and location, or none>
human_review_needed: <yes or no, with reason>
```

The reviewer may quote only the minimum text needed to locate a friction. Finish consequential publication with a human final read even when the verdict is `pass`.
