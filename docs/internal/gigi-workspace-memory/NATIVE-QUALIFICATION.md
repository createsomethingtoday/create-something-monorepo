# Sanitized native memory qualification — CRE-2382

Independent Sol 6.1 lane, 2026-11-09; source
`99dbc201c18a7fc89e3bd2a02d99264325d6053d`, clean before/after. Original durable
report: `/Users/createsomething/Documents/GiGi Memory/2026-11-09/NATIVE-QUALIFICATION.md`.
Evidence: `/tmp/gigi-memory-cre2382-20261109/evidence`. This summary intentionally
excludes host configs, auth/session files, private scratch and synthetic databases.

## Artifact and scope

New isolated `GiGi Memory CRE2382 QA.app`, bundle ID
`agency.createsomething.gigi.memoryqa.cre2382`, macOS 27.0.1 arm64 Tauri/Wry WebKit.
Debug/ad-hoc signed, inherited 0.3.4 package version; no installed app changed.
Main SHA-256 `647e71dca43cdfd458cedc70c2968ffd53bbdca0bd077aa7c6135e4438528d2d`;
MCP `c0193e5c07cec27d9b0252241bebf1551807b6d298ee671fbb51d2e6068a4f3d`.
Compiler output records exact source and dirty=false. Bundled exact-source MCP,
integrations, Codex, notification dylib and agent skill were tested. CTX and
third-party release packaging were not qualified by this QA build.

## Observed results

- Actual native create/correct/replace/forget passed at 880×620 and 1512×949.
  Revision, source, confidence, citation and workspace scope read back correctly.
  Forget removed live payloads and future search matches; backup/conversation
  limitations were visible.
- Unicode Élodie/ÉLODIE/élodie retrieval, repeated Platform → Memory navigation
  with retained unsaved draft, focused keyboard controls and minimum-width
  scrolling passed. Real quit/relaunch preserved saved memory at minimum width.
- Directly viewed WebKit dark/green Danny/Astryx baseline: legible provenance,
  wrapped citations, reachable actions, visible focus and no observed clipping.
  Other themes, VoiceOver, pickers/media and OS-floor runtime were outside scope.
- Real embedded Codex CLI 0.167.0 search → request → native review/approval →
  get readback passed. Provider recovered from an invalid search limit 10 to 5;
  no write occurred during search. Proposal remained pending until native approval.
  Inferred lesson readback preserved uncertainty/source and revision citation.
- A separate isolated actual Codex host passed connection and memory search.
  Proposal was rejected before execution with the exact error:
  **“MCP tool call requires approval, but approval policy is never”**.
  No external pending proposal appeared on native refresh/readback. No policy
  was weakened and no installed host registration/config was changed.

Only invented synthetic records were used. Temporary login copies were deleted
after shutting down QA. Public/DEV apps and release-lane QA processes were untouched.

## Gates

Functional: passed within native/embedded scope; external proposal roundtrip
blocked by host policy. Perceptual: passed within directly viewed native scope.
Release: untested/held by this report; debug QA is not signed/notarized release
qualification. Installed-host proposal, signed-candidate runtime, macOS13 floor,
VoiceOver, live Google/phone and human acceptance remain open.
