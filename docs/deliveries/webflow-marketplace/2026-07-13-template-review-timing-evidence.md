# Template Review Timing Evidence

**Date:** July 13, 2026
**Linear:** CRE-1235
**Public surface:** /field-reports/template-review
**Decision:** Publish measured machine elapsed time and visibly labeled planning estimates. Keep actual reviewer time saved unmeasured.

## Claim classification

| Claim                                  | Value                                                                      | Classification           | Why                                                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Sequential evidence-collection runtime | About 32 minutes for 50 selected cases; about 39 seconds per selected case | Measured                 | Derived from start and completion timestamps in the historical execution transcript                        |
| Complete human review baseline         | 30–60 active minutes per review                                            | Estimated                | Step-level planning estimate from the current eight-step reviewer playbook                                 |
| Eligible objective-review savings      | 4–22 active minutes per review                                             | Hypothesis               | Interval difference between estimated eligible objective work and estimated reviewer verification          |
| Actual reviewer time saved             | Unmeasured                                                                 | Unmeasured               | No matched before-and-after active-time pilot exists                                                       |
| Reviewer cost or dollarized savings    | Not published                                                              | Unsupported for this use | Available team-cost context spans several work types and cannot be allocated truthfully to template review |

## Measured machine runtime

The May 27 balanced shadow run was executed sequentially:

- start: 2026-05-27T17:38:09.600Z
- completion: 2026-05-27T18:10:40.445Z
- elapsed: 1,950.845 seconds, or 32 minutes 30.845 seconds
- selected cases: 50
- elapsed per selected case: 1,950.845 ÷ 50 = 39.0169 seconds
- usable packets: 49
- screenshots: 98

The public report rounds these values to **about 32 minutes for 50 cases** and **about 39 seconds per selected case**.

This is machine elapsed time for evidence collection, not human active time and not an end-to-end review duration. Each selected case covered one published page at desktop and mobile viewports. The collector ran sequentially. A complete review still includes evidence verification, subjective judgment, feedback editing, and a human-owned final action.

The public calibration record verifies the sample, packet, screenshot, page, and viewport scope. The timing timestamps were recovered from the retained agent execution transcript:

- ctx session: 9ad50f3b-0600-71e2-b9b8-43244546b241
- provider session: 019e64fc-46cf-79c1-838b-3a40d903ee90
- start event: c9bae390-0943-7c35-aeb7-69464e368c4a
- completion event: 0040a954-d782-727d-98f3-d7483081b362

Because the underlying provider transcript is not a public artifact, the timing source remains marked **review** in the public evidence index even though the arithmetic is deterministic.

## Estimated human baseline

The current reviewer playbook has eight steps. For planning, the workflow is grouped as follows:

| Workflow group                                           | Playbook steps | Estimated active minutes |
| -------------------------------------------------------- | -------------- | -----------------------: |
| Open and confirm context                                 | 1–2            |                      2–5 |
| Run analysis, read findings, validate important evidence | 3–5            |                    12–25 |
| Add subjective review judgment                           | 6              |                     8–15 |
| Edit feedback and choose the final action                | 7–8            |                     5–10 |
| **Unrounded total**                                      | **1–8**        |                **27–55** |

The public report rounds that planning interval to **30–60 active minutes**. It must remain labeled **estimated** until reviewers are observed doing comparable work.

## Savings hypothesis

Only the eligible objective-review group is treated as substitutable preparation:

- estimated manual objective work: 12–25 active minutes
- estimated reviewer verification after a packet exists: 3–8 active minutes
- interval-safe difference: [12 − 8, 25 − 3] = 4–22 active minutes

The public report therefore describes **4–22 active minutes** as a hypothesis, not a result. It does not subtract the 39-second machine runtime from human active time: machine elapsed time and reviewer attention are different units of operational work.

Subjective judgment, feedback ownership, and the final action are excluded from the savings hypothesis.

## Finance boundary

A read-only Claude support pass recovered earlier Google Sheets context about review-team cost. That context cannot support a public cost-per-template or dollarized-savings claim:

- the aggregate budget covers template, app, partner, documentation, and support work;
- template-only labor hours are not tracked;
- reviewer active time per case is not measured;
- the original Google connectors were disconnected during the support pass, so the source could not be live-reverified.

No team budget, reviewer rate, blended hourly value, cost per review, or dollarized savings belongs in the public report.

For internal planning only, after a matched pilot verifies active-time savings:

**reviewer time value = verified saved active hours × internal blended hourly capacity**

Neither private input nor the resulting dollar value should be copied to the public report.

## Pilot required to replace the estimates

1. Capture active minutes spent on objective checks before assisted review.
2. Capture reviewer verification minutes after the evidence packet is available.
3. Match submission types and report sample size and mix.
4. Track false positives, missed objective issues, escalations, and reviewer overrides beside time.
5. Report actual savings only after the before-and-after comparison exists.

## Public source records

- [Balanced 50-case multimodal calibration](../../../specs/webflow-marketplace/delivery/template-review-hub/balanced-50-multimodal-calibration-2026-05-27.md)
- [Template Review Hub reviewer playbook](../../../specs/webflow-marketplace/delivery/template-review-hub/reviewer-playbook.md)
