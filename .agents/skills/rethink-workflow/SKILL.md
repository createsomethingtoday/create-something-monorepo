---
name: rethink-workflow
description: Inspect a component, report, or other repo artifact and its available sources to test whether the underlying job could be done a better way.
---

# Rethink a workflow

Start with the supplied artifact and the outcome the user cares about. If only a path is supplied, infer the intended job from a caller or consumer and label that inference. Resolve the target in the requested checkout. If several artifacts match, use the supplied context to narrow them. When the choice would change the answer and remains ambiguous, show the plausible paths and ask which one owns the decision.

When the artifact is an agent, identify who uses it, the decision they face, and which decisions they retain. Check that role against the instructions, the tools available to the deployment, and the controls that enforce approval. Use a realistic follow-up to test whether the agent turns available evidence into a useful next step. Distinguish a listed capability from one exercised in the review.

For a historical replay, pin the revision first. Search that tree and open the target and its dependencies there (for example, `git grep <pattern> <rev>` and `git show <rev>:<path>`). Cite the revision. If a source is only available later, keep it outside the historical answer until the user requests a retrospective comparison.

## Find the evidence for this decision

Follow references in both directions. For code, inspect the owning implementation, a caller or entry point, and the relevant test or example. Use Ground for supported questions about code structure. For a report, trace a concrete output back to its producer or source record and forward to the person or process that uses it. A symbol search, repository index, or Atlas result can locate a source; open the source and read the relevant passage. Check the current implementation for an existing alternative before proposing one.

Choose further sources according to the claim. An approval boundary needs the owning policy or decision. A claim about deployed behavior needs a dated runtime observation. A claim about effort or harm needs evidence about people doing the work. Look first in the owning package, its linked evidence, and authorized work records. For a missing file or broken pointer, try a bounded search by symbol, artifact name, or generating command. Stay within the user's access and task scope.

Give the user a short source inventory for consequential claims. For each, include a retrievable path and symbol, dated record, or other precise locator, what you inspected, and what it establishes. Trace repeated numbers or claims to their originating observation. A report, dashboard, and announcement derived from one receipt count as one observation. When sources disagree, compare scope, date, and authority for the specific claim. Preserve unresolved disagreements that would change the decision. When a summary is the closest accessible source, cite it as a summary and say whether you inspected the underlying record. Mention this beside the claim when independent verification depends on it. For unavailable evidence, distinguish missing from the searched scope, inaccessible, and stale for this decision. State where you looked and which conclusion remains open. Keep private records in their owning workspace.

## Compare a change with the current path

Describe one sequence and identify whether it was observed in use, exercised locally, or reconstructed from documentation, name its constraint, and ask which step could disappear, move, or change hands. Show one alternative and the smallest comparison that could favor either approach. If missing evidence could reverse the recommendation, present it as a hypothesis and identify the next observation. If the target itself cannot be resolved, report the attempted lookup and request its locator.

The [validator and Ground worked examples](../../../docs/guides/LEARNING_FROM_SHIPPED_WORK.md) illustrate how the strength of the recommendation follows from the available sources.
