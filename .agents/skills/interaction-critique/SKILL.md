---
name: interaction-critique
description: Critique a real UI interaction by walking its complete task, keyboard behavior, correction, reopening and feedback. Use for evidence-backed interaction findings; a critique request does not authorize implementation.
---

# Critique a real interaction

Use this for one bounded interaction or short task, such as choosing recipients,
filtering a queue, editing a booking or submitting a form. It complements
`cs-design` and Canon review; it does not replace their brand or release rules.
For comparing distinct solutions, use `design-direction-test` instead.

## Establish the task

Identify the user, intended outcome, starting state, target revision/environment,
and permitted actions. State which visible behavior would count as success.
Choose a representative task with realistic uncertainty or a plausible mistake.
Review-only means observe and recommend: do not edit code, save customer changes,
submit forms, publish, or deploy. Use an authorized local fixture or disposable
record for state-changing steps. If that is unavailable, report the blocked step.

## Walk the behavior

Exercise the actual rendered UI through its ordinary entry point. Inspect source
or tests to explain an observation, not as a substitute for experiencing it.
Record the exact action, visible response and consequence at each relevant step:

- **Find and open:** What receives visual emphasis? Does that prominence guide
  the user's intended priority? What gets focus, and is the next action obvious?
- **Navigate and act:** Try the normal pointer path and keyboard path; inspect
  focus visibility, filtering, selection, submission and dismissal as applicable.
- **Correct and continue:** Make a safe mistake, reverse it, dismiss and reopen.
  Check retained state, focus return and whether content moves while the user
  still needs it. A stable order during selection may help correction; it is
  a hypothesis to test, not a rule for every control.
- **Understand the result:** Can the user tell what happened and what to do next?
  For motion, watch playback and interruption: does it explain a destination,
  state change or confirmation, and does it delay work? Inspect reduced motion
  when motion carries meaning.

Follow the task one step beyond its apparent completion to catch repeated manual
recovery. Replay the sequence once if a finding depends on reproducibility.
Check a relevant narrow viewport when layout could change the interaction.
Skip inapplicable probes and name material evidence gaps. A screenshot cannot
establish keyboard behavior, timing, persistence or successful service writes.
Internal dogfooding supplies observations, not proof of customer adoption.

## Return a bounded critique

Lead with the effect on the task. Return the task and evidence boundary, then
prioritize only findings supported by the walkthrough. For each finding provide:

`Action/state → observed behavior → user consequence → proposed correction → same-task recheck`.

Include a screenshot, recording timestamp or reproducible locator where useful.
Separate observed failures from hypotheses and personal preference. Preserve
useful behavior as well as faults. Limit the initial pass to the three most
consequential findings; stop when the task and relevant recovery paths have been
exercised, or when a named access/authorization gap prevents them. State any
untested accessibility, runtime or perceptual claims. Implementation requires
its own authorized scope; do not silently turn findings into edits.

## Source and adaptation

Adapted from the [Linear product-design discussion](https://www.youtube.com/watch?v=icRjQePEa_A),
using its English captions as evidence:

- [2:38](https://www.youtube.com/watch?v=icRjQePEa_A&t=158s): placement and prominence express a product opinion about work priorities.
- [10:29](https://www.youtube.com/watch?v=icRjQePEa_A&t=629s): label-picker walkthrough covers initial focus, arrow navigation, correcting selection and regrouping after reopening. Correction here is toggling a selection, not evidence of a general undo system.
- [17:30](https://www.youtube.com/watch?v=icRjQePEa_A&t=1050s): purposeful animation communicates movement and confirmation.
- [22:26](https://www.youtube.com/watch?v=icRjQePEa_A&t=1346s): builders using the product notice repeated friction.

The bounded report, authorization boundary, accessibility probes and stopping
rule above are workflow adaptations for agents, not claims that the video
prescribes this checklist. Linear's product choices are examples to interrogate,
not patterns every product should copy.
