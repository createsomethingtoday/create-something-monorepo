# Research Content Transparency

Papers and experiments on `.io` are public research artifacts. They can be
markdown-backed files under `content/` or dedicated Svelte routes under
`src/routes/`.

## Living Document Standard

New research artifacts and materially updated artifacts should include a short
transparency section when they make claims that can drift:

- platform behavior
- standards or protocol interpretation
- market sentiment
- benchmarks or model capability
- operational evidence
- implementation claims
- external product or vendor positioning

Use the shared template:

```text
docs/examples/living-research-transparency.template.yaml
```

The public section can be prose, YAML, or a compact table, but it should answer:

- claim status: hypothesis, supported, validated, contested, or superseded
- confidence: low, medium, or high
- evidence grade: official docs, implementation evidence, benchmark, market signal, community sentiment, field signal, or anecdotal
- last reviewed date and next review date
- current best read
- supporting sources or evidence
- counter-signals and open questions
- update log

This standard does not require retrofitting every historical artifact before
small edits. It does apply when a paper or experiment is promoted, republished,
used as sales or delivery evidence, compared against newer research, or updated
because the ecosystem changed.

## Sources And Citations

Prefer source links close to the claim when the source is central to the paper
or experiment. Use a `## Sources` or `## References` section for source sets at
the end.

For living research, sources should not only prove that a citation exists. They
should describe what the source supports and whether it is still current.

## Evidence Boundaries

Separate public-safe proof from private evidence:

- public-safe proof: docs, public URLs, published benchmark summaries, release IDs, PRs, issue IDs, redacted screenshots
- private evidence: raw logs, credentials-adjacent output, client data, private traces, internal screenshots

If private evidence is required to support a claim, cite the public-safe pointer
and name the evidence class without exposing sensitive details.

## Update Mechanics

Use `updated_at`, route metadata dates, or frontmatter dates for catalog
freshness. Use the transparency section for claim freshness.

A date change alone is not enough. Record what changed and why in the update
log when a claim status, confidence, source set, or counter-signal changes.
