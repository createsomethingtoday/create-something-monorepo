# .io Paper and Experiment Review Templates

These templates adapt the useful parts of OpenAI-style release writing for CREATE SOMETHING `.io`.

They are not publishing law. They are review scaffolds for moving papers and experiments from raw artifact to decision-grade publication.

## Paper Template

Use this for `.io` papers, especially framework, architecture, policy, and case-study papers.

```markdown
## Release Thesis

One paragraph answering:

- What changed?
- Why should an operator or system architect care?
- What decision should this paper make easier?

## Evidence Snapshot

| Claim | Evidence | Status | Reusable Artifact |
|-------|----------|--------|-------------------|
| ... | ... | validated / partial / proposed | ... |

## What This Improves

Explain the practical improvement in plain language before philosophical interpretation.

## System Shape

Show the architecture, workflow, or control boundaries.

Prefer Database / Automation / Judgment when the paper is about MCP, policy, review, or agent systems.

## Evaluation

Document the validation surface:

- datasets, traces, codebase scope, or production surface inspected
- pass/fail checks
- limits of the evidence
- what was not tested

## Governance and Safety

State where human judgment remains required, which policies apply, and how rollback or correction works.

## How to Apply This

Give a concise transfer pattern for another project.

## What to Remove or Devalue

Name the weaker framing, tooling, or behavior that should not carry forward.

## Next Decision

End with the next operating decision this paper enables.
```

## Experiment Template

Use this for `.io` experiments and experiment write-ups.

```markdown
## Experiment Release Summary

One paragraph answering:

- What was tested?
- What changed in the system?
- What result matters?

## Hypothesis

State the falsifiable claim.

## Evaluation Surface

| Surface | Measurement | Result | Status |
|---------|-------------|--------|--------|
| ... | ... | ... | pass / partial / fail |

## System Under Test

Show the architecture, data flow, tool flow, or interaction path.

## Results

Lead with numbers, artifacts, and observed behavior.

## What Worked

List the patterns worth keeping.

## What Failed or Remains Manual

Name the unresolved boundaries. Use `manual` as a valid state rather than hiding uncertainty.

## Cost and Runtime

Capture time, token cost, infra cost, browser minutes, or other relevant operational limits.

## Reproducibility

State the required inputs, commands, accounts, or fixtures.

## Transfer Pattern

Explain how the result should move into `.space`, `.agency`, policy, or a reusable MCP/skill artifact.

## Next Decision

End with the next build, review, or product decision this experiment enables.
```

## Prism Review Lane

Prism can be used as an external review workspace for:

- citation and literature passes
- proofread and clarity passes
- LaTeX/PDF drafts for formal papers
- reviewer comments before the repo edit

Prism must not become the source of truth. Accepted edits come back into:

- `packages/io/content/papers/*.md`
- `packages/io/content/experiments/*.md`
- `packages/io/src/lib/config/fileBasedPapers.ts`
- `packages/io/src/lib/config/fileBasedExperiments.ts`

The source of truth remains Git, Loom, PR labels, checks, and deploy verification.
