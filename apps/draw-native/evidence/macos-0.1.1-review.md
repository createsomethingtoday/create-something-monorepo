# Draw 0.1.1 macOS review candidate — October 4, 2026

Text polish completed before packaging. Notes now offer per-block title,
heading, subheading, body, lists and quotation roles, selected-text emphasis
and links, a live preview, explicit save/cancel and optional height fitting.
Existing rich notes remain editable. Adjacent equivalent formatting runs stay
compact during sequential typing. Explicit Fit drawing reserves visible
canvas-control space and can fit unusually tall artwork at smaller zoom.
The existing mapping-canvas.v1 contract remains intact; no destructive format
migration was introduced.

## Verified candidate

- Draw 0.1.1, Apple Silicon arm64, macOS 13+, agency.createsomething.draw.
- Existing Developer ID Application identity for team PRP5VQQPPB; strict
  signatures, hardened runtime and secure timestamp verified.
- Apple Accepted app submission: d9fdfe18-89b6-4a30-a014-d288850d548a.
- Apple Accepted DMG submission: f615d4c5-d120-4fb2-b6fa-d5d72209144f.
- App and DMG tickets stapled and validated. Both Gatekeeper assessments
  report Notarized Developer ID; syspolicy_check distribution passes.
- Final DMG SHA-256:
  25c4394b1ab71ab7e71ec28b0711f084bf6a5dace321cc212c9e30a57153e141.
- Read-only mounted DMG app matches the signed/stapled source bundle content.
- Packaged fresh launch/relaunch and copied populated legacy document
  acceptance pass with preserved session, revision and document data.
  The verifier terminates only its own spawned processes.
- Canvas tests: 339 pass. Native Rust tests: 26 pass. Svelte check: zero
  errors/warnings. Native-role browser contracts pass.
- Real browser acceptance at 1440px and 390px covers mixed formatting,
  sequential typing, re-editing, cancel, history, reload, long content,
  JSON roundtrip and rendered SVG/PNG exports. Tall notes now fit clear of
  canvas controls at both widths.

See output/installed-acceptance/installed-acceptance.json for exact packaged
receipt and packages/mapping-canvas/output/playwright/note-authoring/ for
screenshots and numeric browser acceptance evidence.

## Remaining acceptance and scope

The exact candidate's native GUI walkthrough remains unperformed: the native
computer-use transport closed after the Mac reconnect. Packaged process
launch and persistent-state acceptance do not substitute for native GUI
editing/export acceptance. Resume with native controls reconnected, use a
disposable CREATE_SOMETHING_DRAW_HOME, and verify formatted note editing,
keyboard save/cancel/undo, JSON/SVG/PNG export and restart in the packaged app.
Do not replace the operator's installed app or use existing business data.

Physical iPhone release acceptance is outside this macOS task. No installed
app replacement, website deployment, merge, push, App Store publication or
announcement occurred. Linear creation was skipped following automatic
approval review's rejection of private path disclosure. Evidence and ownership
remain on the isolated review branch.

Worktree disposition: retained until review on codex/draw-text-desktop-20261004.
