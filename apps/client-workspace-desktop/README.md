# Client Workspace Desktop

The installable CREATE SOMETHING client delivery. Tauri owns the macOS process,
Application Support storage, local runtime lifecycle, and packaging. A bundled
Bun executable runs the production `@create-something/client-workspace` server;
the client supplies and authenticates their own installed Codex CLI.

The app never reads or copies Codex credential files. It discovers the `codex`
command, checks its public version/login status, and connects through
`codex app-server` only after a client opens a verified workspace.

## Local build

```bash
pnpm --filter @create-something/client-workspace-desktop prepare:runtime
pnpm --filter @create-something/client-workspace-desktop fixture
APPLE_SIGNING_IDENTITY="Apple Development: ..." \
  pnpm --filter @create-something/client-workspace-desktop build:dmg
```

`prepare:runtime` retains a local Ed25519 test key under the repository's ignored
`output/client-workspace-desktop/trust/` directory and bundles only a development
keyring containing its public key. The fixture script uses the local private key
to create synthetic signed V2 deliveries and negative packages.

A production build is deliberately fail-closed:

```bash
CLIENT_WORKSPACE_TRUST_KEYRING_FILE=/absolute/path/to/reviewed-keyring.json \
APPLE_SIGNING_IDENTITY="Developer ID Application: ..." \
  pnpm --filter @create-something/client-workspace-desktop build:dmg:release
```

Without `CLIENT_WORKSPACE_TRUST_KEYRING_FILE`, `build:dmg:release` exits before
building and never generates or bundles a development trust root.

Developer ID signing, notarization, public hosting, and client invitation are
separate production release gates.

## Installed-app verification

Verify the final bundles before exercising the client workflow:

```bash
codesign --verify --deep --strict --verbose=2 \
  "src-tauri/target/release/bundle/macos/CREATE SOMETHING Client Workspace.app"
hdiutil verify \
  "src-tauri/target/release/bundle/dmg/CREATE SOMETHING Client Workspace_0.2.0_aarch64.dmg"
shasum -a 256 \
  "src-tauri/target/release/bundle/dmg/CREATE SOMETHING Client Workspace_0.2.0_aarch64.dmg"
```

Mount the DMG read-only, copy the app into an isolated install directory, and
launch the copied `.app` through macOS LaunchServices. The optional
`CREATE_SOMETHING_CLIENT_WORKSPACE_HOME` override keeps verifier state out of
the operator's normal Application Support directory. Production clients launch
the app normally and use the default Application Support location.

The installed workflow must prove Codex preflight, trusted delivery import,
tamper rejection, workspace open, bounded edit approval, diff, preview,
activity receipt, and receipt/delivery restoration after native quit/relaunch.

## Trust rotation and revocation

The signed app owns a versioned `create-something/client-workspace-keyring@1`
artifact. It declares the exact issuer, app version, legacy-migration policy,
revoked key IDs, and one or more Ed25519 public keys. Private signing keys never
enter the repository, app bundle, delivery package, logs, or receipts.

Use this bounded rotation sequence:

1. Generate the next Ed25519 key in the approved secret manager and retain its
   recovery owner. Export only the public key.
2. Add the new key ID/public key to the reviewed keyring while retaining the
   current key. Build, sign, notarize, and distribute an app release containing
   both keys.
3. After that app version is the supported minimum, sign new V2 deliveries with
   the new key ID and set their `minimumAppVersion` accordingly.
4. After the overlap window, add the former key ID to `revokedKeyIds`. A revoked
   key remains present so the policy can distinguish revocation from an unknown
   signer.
5. Build and promote the revoking app through the normal release gate. Do not
   mutate an already shipped keyring in place.

Rollback means distributing the last known-good signed app/keyring pair and
continuing to sign with a key that remains trusted and unrevoked there. Never
remove a newly compromised key from `revokedKeyIds` merely to make an older
delivery install. Emergency revocation, Developer ID signing, notarization, and
public distribution require their owning production approval and rollback note.

## Local control-plane boundary

Each native launch creates a 256-bit capability, passes it only to the owned Bun
server and initial webview navigation, exchanges it for an HttpOnly same-site
cookie, and immediately removes it from the URL. The capability is absent from
`runtime.json`, logs, browser responses, and receipts. The server rejects a wrong
Host, wrong Origin, missing capability, or malformed capability and adds a strict
local-app CSP and security headers. Runtime metadata and logs are owner-readable
only. The app uses a single-instance guard, validates stale process identity,
retries loopback bind races, and terminates the owned Bun/Codex/preview process
group during normal quit.

Desktop previews are same-origin, script-disabled iframe documents. This keeps
HTML and CSS complete while preventing delivered JavaScript from reaching the
parent control plane. A future interactive preview must use a separately
authenticated origin; it must not add both script and same-origin sandbox grants
to the current loopback iframe.
