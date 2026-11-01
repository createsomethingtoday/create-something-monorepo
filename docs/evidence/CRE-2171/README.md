# Agency icon-led hero continuation

Tracked work: [Linear CRE-2171](https://linear.app/createsomething/issue/CRE-2171/extend-agency-isometric-wayfinding-through-practice-field-reports-and). Independent read-only review: [Paperclip create-something CRE-207](https://paperclip.createsomething.agency/CRE/issues/CRE-207). This continues the original, independently authored geometry in [CRE-2168](../CRE-2168/README.md).

## Page decisions

| Route | Hero relationship | Contextual sign decision |
| --- | --- | --- |
| Practice | Sample task, human review, draft record. The hero states that practice has no live access. | Keep the in-story workbench/evidence signs. Move the prototype proof sign from the booking cluster to the evidence-to-handoff transition. |
| Field Reports | Source record, review limits, read report. The visual does not mark a report as a passed client result. | Keep the report index as the primary choice and the existing Map sign in the final handoff. |
| Stack | Your accounts, decisions, and records. These are owned parts, not numbered purchase steps. | Keep the existing report sign, naming Template Review precisely. |
| Services | Agreed work, your approval, your handoff. The diagram does not imply larger Build or managed Control is included in the membership. | Keep the existing Map, Agent Foundation, and Control chooser and its destinations; keep the report sign. |

All four openings use one reusable isometric artifact in place of their route-specific background image. The mobile layout uses a compact labeled glyph rail between the hero actions and the fact rail. Visible labels carry meaning; SVG glyphs are supplementary. The Services-specific H1 typography override was removed. The shared Agency operator typography remains, while the hero copy column is constrained beside the artifact. The full $900/month one-workstream terms, separate Build/Control agreements, AI/hosting/third-party costs, primary CTAs, and booking URLs remain as before.

The design reviewer recommended a compact phone treatment and fewer duplicate signs. Their live comparison did not reproduce the apparently blank Services secondary CTA in the user's screenshot. The cause of that captured state remains unknown. Local browser review shows the button text and destination. The immutable preview must recheck its visible text, focus, hover, and pressed states before promotion.

## Local verification

Agency `check` and `build`, the public copy gate inside `check`, `pnpm performance:pages:check` (257/257), and `git diff --check` passed. A targeted prose check of the new hero component found zero findings. Real browser inspection at 1440, 390, and 320 CSS pixels found all four hero variants, the expected signs and destinations, and no hero background images. No horizontal overflow was measured at those widths. The 768 and 1024 pixel Services openings were visually reviewed. Its 768 pixel page scroll width exceeds the viewport by 10 pixels on both the old live page and this build; the hero content itself remains within view. Screenshots are preserved in the task-owned `output/cre-2170-wayfinding/` folder in the reused worktree. These are local results; PR, immutable preview, and production readback belong in Linear closeout.
