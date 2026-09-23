---
name: target-reader-review
description: Review nonfiction as its least-tenured credible practitioner and return pass, revise, or hold without replacing factual or policy authority. Use after drafting public copy, operator instructions, runbooks, onboarding, documentation, reports, arguments, or technical explanations when reader comprehension, actionability, recovery, or verification matters.
---

# Target Reader Review

Review the artifact as the least-tenured credible practitioner in its field unless the source names another reader. Assume basic field knowledge but no CREATE SOMETHING vocabulary.

Judge whether the reader can use the prose, not whether it resembles a preferred style. Useful momentum comes from concrete stakes, visible progress or discovery, coherent information flow, and respect for the reader. Do not reward jokes, slang, fake anecdotes, or forced informality.

## Inputs

Gather the draft, `artifact_type`, purpose, intended reader, source facts, citations, uncertainty, scope limits, property voice, exact labels, intended next action, and `review_scope`.

Review what the reader actually receives. Use a rendered component for public pages and the complete relevant document section for documentation. Include adjacent definitions, proof, calls to action, prerequisites, warnings, expected results, recovery guidance, and completion evidence.

For repo work, read:

- `docs/policies/v1/policy.prose-quality.v1.md`
- `scripts/prose-quality/evals/target-reader.v1.json`
- the applicable property voice or public-copy policy

Return `hold` when missing source, approval, or factual context could change the meaning.

## Review Loop

1. State what the prose helps the reader understand, decide, believe, or do.
2. State the answer or recommended path the reader is likely to take away. Mark a buried or ambiguous answer.
3. Trace the information structure. Check that each section supports the point above it and each paragraph has one recognizable job.
4. Test local comprehension at the first encounter with each section or major claim. Identify the recognizable actor, meaningful action, and observable result or consequence. Later context cannot retroactively repair an unclear opening.
5. Restate the point without CREATE SOMETHING vocabulary. Record that restatement as `plain_language_restatement`; mark friction when it requires guessing or drops a material claim.
6. Mark the first place the reader loses the actor, action, context, important new information, stakes, evidence, or reason to continue.
7. Check whether owned terms are defined locally or grounded by a concrete example. Treat artifact-facing meta-copy as friction unless the artifact itself is the subject.
8. Check whether claims remain attached to proof, uncertainty, and scope limits.
9. For operator content, simulate the path: orient, find the default, start, complete, recover, and verify. Mark the first missing link and the most likely incorrect action.
10. Run `pnpm prose:check -- <file> --format json` when a repository file is available. Report unrelated file-level deterministic findings separately from the scoped judgment verdict.
11. Suggest the smallest structural or sentence-level edit that restores meaning or use without changing the claim.

Do not infer a rewrite from a score. Do not invent evidence or human texture. Do not silently replace exact labels, citations, approved claims, controlled vocabulary, or safety language.

## Verdicts

- `pass`: the target reader can follow and use the prose for its stated purpose; `first_friction` is `none`, no material friction remains, and the plain-language restatement preserves the claim. Minor optional polish may remain.
- `revise`: a bounded structural or sentence-level edit would materially improve orientation, meaning, trust, actionability, recovery, or verification without requiring new evidence.
- `hold`: source facts, reader context, approval, or policy authority are missing and must be resolved before rewriting.

Material friction requires `revise`; it cannot coexist with `pass`. An operator artifact with a required `no` in its usable path cannot pass. A `hold` is judgment escalation and must not masquerade as a deterministic CI failure.

An exact-string assertion proves preservation, not clarity. A green build proves executable integrity, a render proves visible context, and a linter proves only its declared rules. None of those is a reader verdict.

## Output

Return this compact YAML-shaped packet:

```yaml
verdict: pass | revise | hold
reader: <target reader used>
artifact_type: <operator-instructions | report | argument | technical-explanation | public-copy | other>
review_scope: <rendered component, document section, or other explicit boundary>
purpose: <what the prose helps the reader understand, decide, believe, or do>
answer_or_default: <the answer or recommended path the reader receives>
plain_language_restatement: <the same point without CREATE SOMETHING vocabulary, or unable without guessing>
first_friction: <location and reader effect, or none>
operator_path:
  can_orient: yes | no | not-applicable
  can_find_default: yes | no | not-applicable
  can_start: yes | no | not-applicable
  can_complete: yes | no | not-applicable
  can_recover: yes | no | not-applicable
  can_verify: yes | no | not-applicable
likely_wrong_action: <bounded risk, or none>
strengths:
  - <specific strength>
frictions:
  - location: <line, paragraph, or excerpt>
    reason: <reader effect>
    smallest_edit: <bounded change; never fabricated content>
preservation_risks:
  - <fact, citation, uncertainty, exact label, safety boundary, or voice at risk>
deterministic_findings:
  - <tool rule and location, or none>
human_review_needed: <yes or no, with reason>
```

Quote only enough text to locate a friction. Finish consequential publication with a human final read even when the verdict is `pass`.
