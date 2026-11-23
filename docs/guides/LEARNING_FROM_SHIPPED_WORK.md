# Finding a better way to do work we already support

Start with a recent instance of someone doing the job. What outcome did they need? Who noticed a problem, when did they notice it, and who could still correct it? Describe the sequence before proposing a feature. A later commit can establish sequence. A request, observed workaround, or decision record can explain why the next change mattered.

## The template validator

The operator identified the Webflow template validator as a case where questioning the existing review process led to a new tool. A creator who can find an objective issue while preparing a submission has an opportunity to fix it before a reviewer encounters it. The creator walkthrough documents an actual path from validation to a located issue and fix instructions. Submission approval stays with the reviewer. The origin account explains the design choice. The walkthrough establishes the capability. Measuring avoided rework would require observations from submissions. [Creator walkthrough](../../packages/webflow-template-validation/CREATOR_WALKTHROUGH.md) · [Review field report](../../packages/agency/src/routes/field-reports/template-review/+page.svelte)

## Replay on Ground

A maintainer reviewing an apparently unused export wants to know whether changing it could break a public interface. Ground can search a package for imports. In the reviewed mcp-core adoption case, maintainers retained 49 package-local candidates as public API. The adoption verifier already checks their identities, re-exports, and export kinds. For this fixed inventory, reuse that decision. [Reviewed findings](../guides/GROUND_MONOREPO_ADOPTION.md) · [Adoption verifier](../../scripts/ground-adoption-contract.mjs)

On November 23, 2026, the installed Ground 0.5.1 CLI found five exports and flagged two on this package-scoped run:

```sh
ground find dead-exports packages/mcp-core/src/feedback.ts --scope packages/mcp-core
rg -n 'FEEDBACK_TOOL_SCHEMA|createFeedbackToolHandler' packages/mcp-core/src/index.ts
```

The Ground command returned exit code 1 to indicate findings. The CLI displayed the scope and reminded the reader to inspect the public API. The second command found both names on the same public re-export line. Here the validator analogy suggests moving **the evidence** earlier: a reviewer could see the entry-point declaration beside the finding during ordinary CLI triage. A re-export establishes a public interface; external use of a particular symbol remains a separate question. [Public entry point](../../packages/mcp-core/src/index.ts) · [Reviewed decision and package evidence](../internal/ground-adoption-adjudication.v1.json)

### Experiment before changing the CLI

At the next package review outside the adoption fixture, the reviewing maintainer can compare today's scoped output with a hand-annotated copy that adds a source line for each verified public re-export. Include an internal-only candidate and an ambiguous entry point. Leave unresolved exposure marked unknown. Have reviewers inspect comparable cases in alternating order, recording time to a justified disposition, source lookups, and any unsafe removal recommendations.

Extend the existing report only if the annotation reduces repeated lookup work without introducing unsafe recommendations or obscuring uncertainty. If the normal review already supplies the declaration, or the time goes into establishing consumer behavior, keep the current report and investigate that step instead. The two-symbol replay establishes that the extra lookup exists in this CLI path. Its cost and frequency across packages remain open.

## Apply it to another workflow

Give the [rethink-workflow skill](../../.agents/skills/rethink-workflow/SKILL.md) a component or artifact path. It traces the producer and consumer, reports which sources it inspected, and identifies evidence still needed to judge an alternative.

Use one row per real case in the owning work record. Link the dated source for each observation.

| Desired outcome | Current step and actor | Constraint to preserve | Alternative to try | Evidence that would change the decision |
| --- | --- | --- | --- | --- |
| What is someone trying to accomplish? | Where did they wait, repeat work, or look something up? | Which approval, evidence, or quality requirement matters? | Could a step disappear, move, or change hands? What existing capability can test that? | Who will compare the alternatives, on which cases, and what result would make them stop? |

For a historical replay, choose a cutoff before the follow-up decision. Draft the question from evidence available at that cutoff, then compare it with the later decision record. Mark retrospective analogies explicitly. Preserve cases where the best next action was measurement, reuse, or leaving the workflow alone. Repeated, sourced relationships across cases can inform a future ontology change.
