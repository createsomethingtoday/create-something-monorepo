# Draw Mac-only release procedure

Policy scope: macos. The paired-iOS path and its physical iPhone gates are unchanged.
This procedure does not authorize new credentials, grants, provider turns or a
production release with missing evidence. Human evidence is an explicit reviewed
assertion; scripts validate its binding and required fields, not the truth of a
human observation.

## Candidate

1. Review and merge the final source through PR/CI. Commit a fresh immutable app
   version. Preserve the prior app/artifact and a profile backup before replacement.
2. On the existing authorized signing surface, build the exact clean source and
   notarize/staple it using existing approved credentials. Do not rebuild after
   acceptance. Alternatively dispatch `Draw macOS signed candidate` from main;
   its protected job is disabled unless the existing signing flag is true. It
   uploads only an Actions candidate artifact and requires no iOS credentials.
3. Set `DRAW_DMG_PATH` to one exact absolute DMG path, `GITHUB_SHA` to its clean
   source commit, and run `DRAW_INSTALLED_SKIP_BUILD=1
   DRAW_REQUIRE_PRODUCTION_RELEASE=1 pnpm --dir apps/draw-native verify:installed`.
   This mounts read-only, validates both app and DMG before execution, launches
   only its owned child, disables LAN, uses an isolated native home/ephemeral
   WebView, verifies the executable’s embedded source SHA and clean-build marker,
   confirms child exit before relaunch/cleanup, and records byte hashes.
   The ephemeral WebView does not prove composition persistence across process
   exits. Qualify that separately on the installed release profile with synthetic
   data, after preserving existing user data.
4. Perform the two actual physical Mac UI runs. Record native UI and live-agent
   observations only after execution. Browser mocks, sampled screenshots and the
   old debug candidate do not qualify a newly signed artifact. For the provider
   check, the owner creates the explicitly scoped read-only grant and enters any
   token only into the approved local runner. No tokens enter receipts. Do not
   reuse the historical runner without adapting its exact binary/profile/content
   bindings for the signed artifact and reviewing that adaptation.

## Owner receipt and validation

`create-something/draw-mac-owner-acceptance@1` has `scope: macos`, `sourceSha`, and
`artifact` copied from the qualified installed receipt (`sha256`, `appSha256`,
`executableSha256`). `nativeUI.runs` contains exactly two distinct IDs, `physicalMac:
true`, `status: passed`, ISO `completedAt` timestamps no earlier than installed
acceptance, and true observations for:

- `canvasEdit`, `undoRedo`, `jsonSvgPngExport`, `importRecovery`
- `persistenceRelaunch`, `composeSaveRestore`, `motionExport`
- `agentProposalApproveRejectUndoRedo`

`liveAgent` requires `status: passed`, `scope: read-only`, `ownerApproved`,
`syntheticOnly`, `readbackVerified`, `revocationVerified`, `postRevocationDenied`,
and the SHA-256 of the reviewed redacted raw provider receipt. `rollback` requires
`status: passed`, `isolatedRestoreVerified`, prior `artifactSha256` and
`profileSha256` (the sorted relative-path/NUL/content/NUL directory hash used by
`hashBackup`). No symlinks are accepted in the backup. Retain backups privately;
public receipts expose hashes, not profile contents or paths.

Run, with explicit files and an output that does not already exist:

```sh
DRAW_RELEASE_VERSION=<committed-version> GITHUB_SHA=<exact-source-sha> \
  node apps/draw-native/scripts/mac-release-receipt.mjs \
  <exact.dmg> <installed-acceptance.json> <owner-acceptance.json> \
  <prior-artifact> <profile-backup-directory> <redacted-provider-receipt.json> \
  <new-mac-release-receipt.json>
```

The validator writes no credentials and does not publish. It rejects iOS scope,
missing gates and hash mismatches. Do not fabricate a successful receipt to satisfy
it. Keep protected review records for the actual runs; the output is an integrity
binding of those reviewed records, not a substitute for them.

The provider runner must produce `create-something/draw-provider-readonly@1`
with `sourceSha`, tested `executableSha256`, `startedAt` after installed acceptance,
and `completedAt`. It must record true `synthetic`, `providerStarted`,
`authenticatedPreflightPassed`, `gatewayReadProofPresent`, `providerTerminated`,
`nativeProcessExited`, `postRevocationDenied`, and `syntheticContentUnchanged`;
`providerExitCode: 0`, `editsAllowed: false`, `persistentRegistration: false`, and
`scopeConfirmedByOwner: "read-only; 0 proposal layers"`. Any blocker fails validation.
Readback still requires owner review of that exact receipt and its tool evidence.
The historical runner does not yet emit this bound schema: its adaptation and
review are required before live acceptance, and old receipts cannot qualify.

## Draft, byte readback, publication and installation

Only after validation and owner review, create a fresh `draw-macos-vVERSION`
GitHub draft targeting the exact accepted source commit. Attach that DMG, the
redacted Mac release receipt and SHA-256 manifest. Never clobber a published tag,
reuse a tag with different source, or replace last-known-good assets on failure.
Download every uploaded asset to a new directory and independently compare hashes
with the validated local files. Record the release URL, source and downloaded
hashes. Keep the draft unpublished if any lookup/readback is ambiguous or fails.

Before publication, confirm the draft still targets the accepted source and has
only the verified assets, all applicable reviews passed, and the exact-artifact
owner acceptance and rollback evidence remain valid. Then publish that immutable
Mac release. iOS assets or claims must not be added to this Mac-only channel.

Install the same accepted bytes on the intended Mac, retaining the previous app
and untouched profile backup. Verify the installed code signature and executable
hash, then perform installed UI readback. If replacement or verification fails,
stop and restore the preserved app/profile using the reviewed rollback procedure;
do not run an older app on newly migrated data. Update public download copy only
with the verified release URL, version, signing/notarization and artifact hash.

## Current blockers

The valid local Developer ID identity does not establish notarization access.
Neither credential presence nor an unverified profile name is proof of successful
notarization. If credentials are missing, the owner must configure them securely;
no release workflow or credential-store operation should be triggered to probe
for credentials. Live provider acceptance, exact signed-artifact native acceptance
and rollback rehearsal are separately pending until performed.
