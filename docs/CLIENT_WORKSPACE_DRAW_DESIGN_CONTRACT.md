# Client Workspace and Draw: shared operator design

Scope: Linear CRE-2143; Paperclip create-something CRE-90. Implementation candidate only. Source review and production promotion are separate assignments.

These are task surfaces in the Judgment tier: the operator chooses a project, directs bounded work, inspects evidence, and decides whether an action should proceed. Existing Database and Automation contracts remain authoritative.

## Shared contract

Import Canon `styles/tokens.css` and the opt-in `styles/workspace.css`. Wrap only the intended product surface in `.cs-workspace`. The stylesheet introduces no global palette overrides, scripts, component behavior, or external fonts. Other applications and Draw Motion retain their current presentation.

- **Orientation:** small brand and product name, current project, then contextual actions. Project names remain visible at 390px. No synthetic project/task links or invented integration state.
- **Hierarchy:** compact sans headings, readable body text, mono record metadata; near-black shell layers and precise borders. White primary actions. No decorative glow, animation, browser traffic lights, or campaign-scale headlines.
- **Spacing:** Canon spacing aliases own rhythm. Controls use 36px minimum height, 44px on narrow/coarse-pointer surfaces. Content wraps; activity and diff can scroll without moving approvals out of reach.
- **States:** `data-work-state` maps idle, planning, running, approval, success, warning, failure to Canon semantic colors. Dark surfaces use existing soft tokens for readable text and blend the matching semantic color into the background. State words carry meaning independently of color. Draw waiting is approval/review, failed is failure, completed is success. Canvas artwork colors remain document data.
- **Focus:** blue Canon focus ring, visible attachment focus, skip links, native disclosure semantics, accessible labels and pressed states. Workspace section links retain all rails and move focus to headings on narrow layouts; no hidden unmounted conversation or approval state.
- **Feedback:** approvals precede activity history; activity and diff share a readable evidence rail. Secondary history and delivery controls are disclosed. Draw status is announced politely; it no longer implies success with an unconditional green dot.

## Product boundaries

Client Workspace retains session start, restoration, chat, reference image upload, approval/decline, diff, preview sandbox attributes, checkpoint/update/rollback, receipt export, close and reset. The project list describes governed edits rather than labeling the checked-in demo a signed delivery. Preview chrome names the actual selected project rather than a fabricated `.preview` address. Remote preview copy says controlled device.

Draw retains its document model, undo/redo, editing commands, keyboard shortcuts, project selector, agent connection, import/export, sharing, native pairing, and Motion links. Only the canvas route opts into the shared appearance. AgentActivity has a semantic-state presentation mapping; WorkbenchPanel gains empty/search feedback. No agent connection logic, native connector, credential, backend, authorization, or runtime boundary is changed.

## References and adaptation

Repository authority: Canon Performance tokens and naming contract; Performance Lab design language; Performance Page Sharpness tool archetype. Paperclip's [DESIGN.md](https://github.com/paperclipai/paperclip/blob/master/DESIGN.md) was read on 2026-09-27 for operational hierarchy, restrained chrome, token ownership, and state/feedback conventions. Its [MIT license](https://github.com/paperclipai/paperclip/blob/master/LICENSE) was reviewed. No upstream source, branded assets, or layout was copied. Mobbin was not used: the existing journeys and requested reference provided the interaction contract.

## Verification and promotion

See `CRE_2143_UI_HANDOFF.md` for exact checks, rendered evidence, limitations and worktree disposition. UI fixtures are explicitly distinct from live agent or production acceptance. Independent source review and release QA must approve the candidate before merge or deployment.
