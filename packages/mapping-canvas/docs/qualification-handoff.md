# Draw qualification handoff

Source qualification resumed from `ad8dec0a59f7c2a3e425ee06d0c76b0e408e993b`.
See `apps/draw-native/evidence/source-qualification-resume.json` for exact hashes
and observed checks. This is not native GUI, real-provider, or release acceptance.

## Completed without native control

Reviewed the isolated Canon import-error proposal. Adopted the readable recovery
dialog and validation before replacement, preserving pending saves on invalid
files. Fixed its async-read race: active gestures, buffered notes, agent mutations,
native recovery, or a changed document prevent replacement. Source review cleared
the change; delayed-read tests cover the admission helper. The original proposal's
seven browser assertions remain evidence for that proposal, not this final patch
or native behavior. Brand assets are unchanged.

88 focused checks passed: 64 Canvas/editing/pairing/metadata/download tests,
14 offline-file/native-queue tests, one disposable synthetic gateway test, and nine
import-admission/note-buffer tests. Svelte reported zero errors/warnings; the
updated native frontend built. No Rust/native executable rebuild was needed for
these source checks. Existing native tests were not rerun or newly claimed.

## Artifact distinction

The existing arm64 development executable still hashes to
`fc46f59c55071a26e3ef25b288720bfac7fbd605922dcf0efc7a19b1fc296fdd`.
It is ad-hoc linker signed, with no TeamIdentifier, and predates the approved
branding and import polish. It must not be described as the current-source app.
Its recorded isolated process (PID 21715) was read-only verified alive; recheck
identity at handoff because PIDs and access sessions are transient.

The isolated document remains the exact approved synthetic content, revision 3.
All three historical provider receipts say `providerStarted: false`. Camera-only
changes explain the third preflight mismatch; the corrected synthetic gateway
test passes. No real provider result or authenticated revocation has been verified.

## Coordinated acceptance sequence

1. Wait for PCN to release native UI ownership. If native control remains
   unavailable, Micah must perform the following UI/terminal steps locally.
   Do not retry the native pipe in a loop or launch a second Draw authority.
2. Confirm the recorded isolated Draw process/profile and exact synthetic Canvas.
   In **Local agent access**, start the already-approved temporary read-only
   session with **0 layers available for proposals**. No broader or persistent
   grant is authorized. Do not paste the token into chat or save it to a file.
3. Run `python3 packages/mapping-canvas/scripts/run-approved-provider-test.py`
   from this preserved checkout. Enter `READ ONLY` when the UI matches, then
   paste the session token at the hidden local terminal prompt. The runner
   identifies the exact process-owned socket; a socket path is not a token.
   It performs one bounded Claude read attempt and closes only that isolated
   native process afterward. If interrupted, revoke local access in Draw.
4. Review the new receipt, gateway proof, actual provider tool result and final
   readback together. Require matching document/note content, unchanged synthetic
   content, provider termination, native exit, and authenticated post-revocation
   denial. A timeout, missing proof, or provider prose alone is not success.
   Do not automatically repeat an attempt if a provider actually started.
5. After that handoff, prepare one separately identified current-source native
   candidate for actual offline launch/reopen, edit/undo/redo, malformed import
   retention and retry, and branded Dock/Finder/About checks. Preserve this
   executable and profile; do not replace the installed app. Capture source,
   binary/bundle hashes and native evidence for that exact candidate.
6. Signing, notarization, installer/release verification, real-provider edits,
   plugin installation/registration, and public distribution remain separate
   gates. Existing read-only approval does not authorize broader provider access.

PCN currently owns native UI. No UI, provider, grant, registration, installation,
or publishing action was performed during this source qualification.
