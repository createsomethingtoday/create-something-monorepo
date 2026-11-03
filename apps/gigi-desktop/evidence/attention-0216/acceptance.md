# GiGi 0.2.16 acceptance — CRE-2300

Source artifact: `2d95c8a67f8d1a787ce155e5782dbb57901981eb`, clean app/integrations source identity embedded at build. Later commits add release evidence and download-page metadata only.

## Acceptance criteria

- Durable workspace-scoped attention for dated saved tasks/gigs and exact read-backed agent states; no unattended model turns or record writes.
- Contextual Ask GiGi drafts and readable, escaped answers; every record mutation retains exact proposal review and verified readback.
- Native alerts are opt-in, private by default, quiet-hour aware and claimed once. Clicking only requests navigation to a current item; it cannot approve work.
- Preserve Studio, Paper and Midnight. Keyboard/focus recovery and 880-pixel component layout remain usable.
- Qualify a Developer ID signed, notarized and stapled app and matching DMG; publish immutable bytes, pin the download page and verify the live public release.

## Functional gate

324 desktop tests pass, zero skips, with the final signed shipping MCP enabled. 173 Rust tests pass. Integration suite: 298 pass, one optional CTX skip. Retired-provider and public-distribution checks pass. One earlier Rust run under simultaneous compilation hit a timing threshold; a full rerun without compiler contention passed without weakening it.

Native acceptance used an isolated synthetic workspace. A real subscribed Codex read, exact proposal rejection, approved synthetic rename and independent MCP readback passed. Closed-drawer approvals and replies, restart persistence, permission denial/recovery, OS alert submission, source-specific Ask drafts, Escape and focus recovery passed. No real customer records were changed.

Notification Center cannot be opened by the available UI controller (`timeoutReached`). The operator was asked to click the delivered alert. The actual OS-click-to-item path remains untested until that result is supplied; routing validation, retained click handling and narrow local Tauri event permissions have regression coverage.

## Perceptual gate

Direct native review covers the feed, approval review, contextual Ask and notification settings across Studio, Paper and Midnight. Included JPEGs show these native states. The two 880-pixel PNGs render the real component/CSS with a saved synthetic fixture; they establish narrow component layout, not native window resizing or native interaction. TASTE references and design decisions are recorded in the adjacent lift review.

Independent Sol 6.1 review inspected actual output, reran focused functional checks and found no remaining source blockers. Its final 58-test delta re-test rendered numbered answers and confirmed separated 1/2/3/12 steps and zero executable injected elements.

## Release gate

Final artifact qualification and publication receipt are stored alongside this document. Previous 0.2.15 immutable installer stays available for rollback. Updates remain manual; users should back up the workspace before switching versions.

Limits: observation stops when GiGi quits. Snooze returns the in-app item but does not repeat a submitted OS alert. No phone alerts, teammate delivery, unattended AI, fresh Mac installation, real Google import or social publication is established by these checks.
