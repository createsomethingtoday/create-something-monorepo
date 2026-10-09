# CREATE SOMETHING Draw Native

Draw is a Mac-authoritative Tauri application with an iPhone touch companion.
Both surfaces render the mapping-canvas document contract. The Mac owns the
canonical document, revision, undo/redo, storage, import, reset, and export. The
iPhone submits versioned operations and mirrors committed Mac state.

## Pair an iPhone

1. Put the Mac and iPhone on the same trusted Wi-Fi network. A USB cable is
   useful for installation and debugging, but is not required during a session.
2. Open Draw on Mac, choose **Pair**, and keep the six-digit code visible.
3. Open Draw on iPhone, choose **Link**, select the discovered Mac, compare the
   certificate fingerprint, and enter the code.
4. Approve the iPhone Local Network prompt. If discovery is empty, confirm both
   devices are on the same non-isolated network and that Local Network access is
   enabled in iOS Settings for Draw.

The session capability expires after 12 hours and is stored in Apple Keychain.
Choose **Revoke** on the Mac to invalidate the phone immediately. Re-pairing is
required after revocation or expiry.

## Offline and recovery

When Wi-Fi drops, iPhone actions remain visibly queued. Reconnect from the Link
panel. Draw fetches the authenticated Mac snapshot, rebases only unapplied
phone actions, assigns new operation IDs, and commits them sequentially. The Mac
never accepts a stale document replacement from the phone.

If Local Network permission was denied, enable it in **Settings > Privacy &
Security > Local Network > Draw**, then reopen the Link panel. On guest or
client-isolated Wi-Fi, use a trusted hotspot or another LAN that permits device
discovery.

## Local verification

```bash
pnpm --dir apps/draw-native test:native
pnpm --dir packages/mapping-canvas check
pnpm --dir packages/mapping-canvas test -- --run
pnpm --dir packages/mapping-canvas verify:native-ui
pnpm --dir apps/draw-native build:dmg
DRAW_INSTALLED_SKIP_BUILD=1 pnpm --dir apps/draw-native verify:installed
```

The installed verifier mounts the DMG read-only, copies the app into an isolated
temporary location, launches with isolated application data, checks packaged
dependencies, and verifies canonical persistence across relaunch. Its receipt
is written under `apps/draw-native/output/installed-acceptance/`.

## Production release gates

Mac and paired-iOS release scopes are separate. An unsigned or merely compiled
artifact is development evidence. Never reuse a version/tag for different bytes.

### Mac-only

The `Draw macOS signed candidate` workflow (`draw-macos-release.yml`) is manually
dispatched from `main`, requires the existing `draw-apple-production` environment
and `DRAW_SIGNING_ENABLED=true`, and does not require iOS signing credentials or
upload to TestFlight. Its signed job verifies an explicitly selected DMG before
launching an isolated copy. It does not publish a GitHub release.

Mac release retains all of these gates against one exact artifact:

- Developer ID Application signing for team `PRP5VQQPPB`, strict signature checks;
- Apple notarization, app and DMG stapling, app-execution and DMG Gatekeeper checks;
- exact installed app/executable/DMG hashes, source commit, version and isolated relaunch;
- two clean physical Mac UI runs including edit/undo/redo, JSON/SVG/PNG export,
  import recovery, persistent relaunch, Compose save/restore and motion export,
  plus approved/rejected local-agent proposals and shared undo/redo;
- explicitly owner-approved, synthetic, live read-only provider acceptance with
  observed readback, revocation and authenticated post-revocation denial;
- preserved prior artifact and untouched profile backup with an isolated rollback
  rehearsal. Older binaries must never be tested against the newly written live profile.

The machine receipt alone is insufficient. `receipt:macos` checks the installed
receipt plus a separately reviewed owner acceptance receipt, raw provider receipt,
prior artifact and profile backup. Missing, failed, stale-source or mismatched
artifact evidence fails closed. Its fixture tests are synthetic and are not real
acceptance receipts. See [the exact Mac handoff](docs/macos-release.md).

### Paired iOS

The existing `draw-native-release.yml`, now named `Draw paired iOS release
candidate`, retains signed iPhone packaging, TestFlight, and two consecutive
physical Mac/iPhone acceptance runs covering touch ink, spaced notes, movement,
conversion, Wi-Fi disconnect/queue/reconnect, Mac relaunch, export, revocation and
re-pair rejection. Those gates remain mandatory for the paired iOS release; a
Mac-only receipt never claims they passed. Its draft release stays draft until
both clean physical receipts are attached. The existing paired receipt and
`draw-vVERSION` channel remain separate from `draw-macos-vVERSION`.

Signing and notarization use an already-authorized Apple owner surface. Never
commit certificates, private keys, certificate passwords or API credentials.
`DRAW_SIGNING_ENABLED` and protected environment access are not configured by
these changes. New credential configuration requires the owner's secure handoff.

## Offline-first local development pilot

This branch no longer starts the desktop LAN listener or Bonjour advertisement
by default. Phone pairing requires launching with
`CREATE_SOMETHING_DRAW_ENABLE_LAN=1`; the Pair action explains this when disabled.
This is a compiled development change with isolated launch/persistence evidence, not a new release.
Cloud sharing/agent relay remain separate explicit features; disabling LAN alone
is not an outbound-network sandbox.

The [offline file pilot](../../packages/mapping-canvas/offline-agent/README.md)
works on an explicitly selected Canvas JSON export. It creates reviewed copies,
never writes `paired-session.json`, and is not live native agent integration.


Native host edits use `draw_host_apply_batch` for a single caller-revision-checked,
atomic commit per UI batch. It is trusted UI IPC, not an external agent API;
agent grants, native layer-lock policy and shared authoritative history are pending.
See the [current audit and acceptance](../../packages/mapping-canvas/docs/offline-desktop-audit.md).
For disposable native tests, set both `CREATE_SOMETHING_DRAW_HOME` to a new test
profile and `CREATE_SOMETHING_DRAW_EPHEMERAL_WEBVIEW=1` to avoid installed WebView
storage. This does not replace a signed-app or real native UI acceptance run.

The Local agent panel now offers ephemeral read access and selected-layer proposals.
A private Unix socket accepts inspect/propose/status only; every edit requires native
owner review. UI, phone, and approved agent changes share durable Undo/Redo, and a
retained profile lock excludes a second cooperating native writer. No real grant
or provider connection was activated during acceptance. See
[the current test matrix and preview](../../packages/mapping-canvas/docs/native-agent-review-slice.md).
