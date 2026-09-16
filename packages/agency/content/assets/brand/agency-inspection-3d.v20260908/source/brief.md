# Outline inspection study

Owner: CREATE SOMETHING. Target: technical-review process section. Family: material-prototype-study. CRE-1972.

Approved purpose: let ordinary scrolling reveal one selected part of an existing connected system. The outline treatment turns the prior inspection artwork into a spatial explanation. This is a conceptual model of code review, not a real product architecture, audit finding or repair result.

## Four states

1. Intact: three connected modules on one base, with surrounding modules retained.
2. Select: a narrow amber boundary identifies the agreed part.
3. Inspect: the center casing rises and a separate internal layer exposes two connection halves. Camera and neighbors remain fixed.
4. Findings: a restrained red outline highlights the connection to inspect. The reader decides the next scope; nothing is automatically repaired, approved or launched.

Existing process copy supplies the meaning in accessible HTML. Caption and final scope note distinguish the model from real evidence and review from implementation. The original generated inspection image remains the loading/WebGL/no-JavaScript fallback. Reduced motion shows a static exploded model and removes sticky scroll spacing.

## Source and rendering

Procedural Three.js geometry: src/lib/visual/inspectionRenderer.ts. Pure reversible state: inspectionSceneState.ts. Page/lifecycle integration: InspectionScrollStory.svelte. No generated model, image-generation call, external asset download, vendor reference pixels or new dependencies. Original geometry and authored source are the editable masters. Ivory edges, charcoal faces, fixed orthographic camera, amber selection and red finding; no ambient camera or idle animation. DPR capped at 1.5. Render on scroll, resize and visibility changes. Load near the viewport or for this component’s deep links. Dispose resources on exit. On context loss, show the fallback and retry with a new canvas.

The existing Agency image studies and docs/PERFORMANCE_LAB_VISUAL_GRAMMAR.md provide the local style reference. Adopt the connected-system inspection metaphor; do not copy branded objects or imply physical hardware services. Prior image masters remain in agency-technical-review.v20260908.

## Verification and refresh

Supporting scene regressions cover closed/open state, reversal, bounded malformed progress. They run in Agency check. Primary verification uses real browser scrolling, with two forward/reverse traversals at 1440x1000 and 390x844. Compare screenshots for changed and restored states. Check keyboard anchors, deep-link reload, context-loss retry, reduced motion, no JavaScript and WebGL failure. Verify the booking handoff without creating a booking.

Replace the model when the service scope changes or the explanation no longer fits. Also replace it if accessibility or rendering fails on a supported viewport. Model geometry is illustrative and never audit evidence. Rollback: revert scoped PR and redeploy Agency; original images remain in the source tree.
