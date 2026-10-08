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

An unsigned DMG or simulator archive is development evidence only. Production
requires all of the following against the exact candidate bytes:

- Developer ID Application signing and strict `codesign` verification;
- Apple notarization, ticket stapling, and Gatekeeper assessment;
- a signed iPhone build installed on the physical device;
- two consecutive physical Mac/iPhone acceptance runs covering touch ink, a
  spaced note, movement, conversion, Wi-Fi disconnect/queue/reconnect,
  Mac relaunch, JSON/SVG/PNG export, revocation, and re-pair rejection;
- a redacted receipt with build identities, revisions, final document/export
  hashes, and artifact SHA-256.

Signing and notarization use an already-authorized Apple owner surface. Never
commit certificates, provisioning profiles, app-specific passwords, or API
keys. Retain the previous signed DMG and hash as the rollback artifact.

The `Draw native release candidate` workflow owns the production candidate.
Its first job produces unsigned development evidence. Its
`draw-apple-production` job is restricted to protected branches, requires an
operator review, and remains disabled unless the repository variable
`DRAW_SIGNING_ENABLED` is exactly `true`.

The protected environment requires these secrets:

- `APPLE_CERTIFICATE` and `APPLE_CERTIFICATE_PASSWORD`: base64 Developer ID
  Application `.p12` and its export password;
- `IOS_CERTIFICATE` and `IOS_CERTIFICATE_PASSWORD`: base64 Apple Distribution
  `.p12` and its export password;
- `IOS_MOBILE_PROVISION`: base64 App Store Connect provisioning profile for
  `agency.createsomething.draw`;
- `APPLE_API_ISSUER`, `APPLE_API_KEY`, and `APPLE_API_PRIVATE_KEY`: App Store
  Connect issuer, key ID, and base64 `.p8` private key.

On an approved run, the workflow builds and verifies the Developer ID DMG,
builds the App Store Connect IPA, uploads it to TestFlight, creates a draft
GitHub release, and downloads the release assets again to prove their hashes
match `production-release.json`. The release stays draft until two clean
physical Mac/iPhone acceptance receipts are attached.

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
