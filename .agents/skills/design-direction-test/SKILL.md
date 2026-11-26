---
name: design-direction-test
description: Compare competing UI design directions through the same realistic task in working prototypes, then recommend a direction with observed tradeoffs and a stopping rule. Use when a consequential interaction or information structure remains undecided.
---

# Test competing design directions

Use this when the decision concerns how a task works or how information should
be organized. Cosmetic variants of one layout rarely answer that question.
For reviewing an existing interaction without alternatives, use
`interaction-critique`. Keep Canon and the owning product's approved identity;
`cs-design` continues to govern substantial CREATE SOMETHING UI work.

## Define the decision before building

State the user's job, current baseline, disputed design question, required
capabilities and constraints. Name the evidence that could favor either option.
Choose the smallest fair comparison: usually two genuinely distinct directions
plus the existing baseline where available. Explain the different hypothesis
behind each direction. For example, compare navigation grouped by the user's
next decision with navigation grouped by storage type; do not assume either wins.

Set the comparison budget and stop condition before implementation. A useful
default is one representative task, one recovery case, two candidates and one
repair/retest pass. Change that bound when the task warrants it and explain why.
A request to compare permits review; build prototypes only within authorized
implementation scope. If building is outside scope, provide the concrete test
plan and identify what cannot yet be concluded. Never publish an experiment or
change live customer data just to compare directions.

## Make alternatives testable

When implementation is authorized, build the smallest local working prototypes
that expose the competing behavior. Use equivalent realistic data, entry state,
required capabilities and completion criteria. Keep fixture identity, environment
and revision identifiable. Implement the differentiating interaction and its
important failure/recovery state; leave unrelated polish out of the experiment.

Static drawings can compare composition, but cannot settle keyboard, persistence,
latency or motion questions. Label them accordingly. Do not call mocked responses
live service evidence. Keep the baseline available for comparison and rollback.

## Run the same task on each

Exercise each candidate directly, using the same task script and expected
outcome. Include a keyboard path, a plausible correction and the relevant narrow
viewport. For motion claims, inspect playback, interruption and reduced motion.
Record observable evidence rather than invented scores or unsourced time savings:

- Can the person discover the next action and complete the task?
- What must they remember, search for, undo or repeat?
- Does the information grouping explain the user's intent and consequences?
- What required capability, accessibility or familiar product behavior is lost?

Review the actual output, not just implementation descriptions. A separate
reviewer can replay the same script without seeing the builder's preferred
answer. Internal tests establish prototype behavior; customer preference or
adoption remains unproven without customer evidence.

## Decide and stop

Return a compact comparison table with each hypothesis, tested task result,
concrete evidence, tradeoff and untested claim. Recommend a direction only as
strongly as the evidence allows. Reject a candidate that fails a required
capability even if it looks better. If results are tied, prefer the lower-cost
reversible option or specify one additional observation that would resolve the
actual uncertainty; do not generate variants indefinitely.

After the agreed repair/retest pass, stop with a decision, a bounded unresolved
question or a specific blocker. Provide the selected artifact/revision, remaining
acceptance checks and what may be discarded. Prototype selection is not release
approval. Production integration and promotion follow the owning workflow.

## Source and adaptation

Adapted from the [Linear product-design discussion](https://www.youtube.com/watch?v=icRjQePEa_A),
using its English captions as evidence:

- [27:48](https://www.youtube.com/watch?v=icRjQePEa_A&t=1668s): the code-review surface was explored through multiple built directions that the team tried, beyond deciding only in Figma.
- [29:30](https://www.youtube.com/watch?v=icRjQePEa_A&t=1770s): discussion of a guide that organizes changes into human-oriented sections to explain what happened, alongside access to code.

The video describes a specific product exploration, including five directions;
it does not establish a universal candidate count or prove that intent grouping
always wins. The fair fixtures, two-candidate default, evidence table,
authorization boundary and bounded stopping rule are agent-workflow adaptations.
