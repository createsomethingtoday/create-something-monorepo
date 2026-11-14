# R21 bounded actual-output audit

Acceptance: at ordinary supported 320px+ viewport and the fixture's nested owning width, the editor retains usable timeline content. Pointer motion across its ruler maps monotonically rightward. A too-small canvas must have a coherent scrollable 2D surface or an explicit supported fallback rather than negative/NaN geometry.

Confirmed user-visible failure at local http://localhost:5191/next/timeline, source freeze HEAD 5f9bfab3f. No source changes, package validation, server restart, sync, deployment or external writes were performed.

Method: exact R17 CSS stress (`text-reflow-repair-r17/interactions.mjs`): snapshot all existing computed font sizes, double each inline with important; apply line-height 1.5, letter-spacing .12em, word-spacing .16em and paragraph margin-bottom 2em. Viewport320x900, deviceScaleFactor1, mobilefalse. This is CSS stress, not native zoom or full WCAG certification.

Normal 320: nested editor/canvas198px, positive .9667px/frame; ruler clicks at 25% and75% of actual ruler span produce frames14 then44. Stressed320: nested editor/canvas102px, fixed label140px, derived -.6333px/frame. Directly viewed screenshot shows only the truncated Paper label in the canvas; ruler, keyframes and playhead disappear. Editor overflow is hidden and scrollWidth equals102, with no scrollable timeline surface. Real clicks in visible canvas at25% and75% produce no callback. The failure is unreachable ruler/content, not experimentally demonstrated reversed or NaN callbacks. Keyboard ArrowRight remains functional (frame13), and the existing summary remains available, but neither explains the lost pointer editing surface.

Narrow fix location: TimelineEditor.svelte visible-area calculation near119, canvas owner sizing/rendering near490-518, overflow near531. Preserve a positive usable timeline span through explicit minimum-width scrollable canvas or adapt label width with an explicit minimum timeline area; keep drawing/pointer conversion aligned. Do not merely clamp pixelsPerFrame while hiding timeline content. Fix is not implemented in this audit.

Functional correctness: FAILED within declared CSS stress; ordinary320 ruler control passed. Offline local browser runtime only; no production assertion.
Perceptual/product quality: FAILED under declared stress; normal and stress screenshots directly viewed. The nested canvas loses its primary visual editing content. No claim to full visual/accessibility coverage.
Release readiness: UNTESTED; read-only evidence audit, no deployable change or shipping action. Source freeze respected; evidence is the sole write scope.

Files: audit.mjs/results.json reproduce stress and measured widths; control.mjs/control.json exercise actual normal ruler and stressed keyboard fallback; normal-320.png and stress-320.png were directly viewed.
