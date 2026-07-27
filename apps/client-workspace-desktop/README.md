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
`output/client-workspace-desktop/trust/` directory and bundles only its public
key. Set `CLIENT_WORKSPACE_TRUST_PUBLIC_KEY_FILE` for a managed release trust
root. The fixture script uses the local private key to create a synthetic signed
delivery and an intentionally tampered negative package.

Developer ID signing, notarization, public hosting, and client invitation are
separate production release gates.

## Installed-app verification

Verify the final bundles before exercising the client workflow:

```bash
codesign --verify --deep --strict --verbose=2 \
  "src-tauri/target/release/bundle/macos/CREATE SOMETHING Client Workspace.app"
hdiutil verify \
  "src-tauri/target/release/bundle/dmg/CREATE SOMETHING Client Workspace_0.1.0_aarch64.dmg"
shasum -a 256 \
  "src-tauri/target/release/bundle/dmg/CREATE SOMETHING Client Workspace_0.1.0_aarch64.dmg"
```

Mount the DMG read-only, copy the app into an isolated install directory, and
launch the copied `.app` through macOS LaunchServices. The optional
`CREATE_SOMETHING_CLIENT_WORKSPACE_HOME` override keeps verifier state out of
the operator's normal Application Support directory. Production clients launch
the app normally and use the default Application Support location.

The installed workflow must prove Codex preflight, trusted delivery import,
tamper rejection, workspace open, bounded edit approval, diff, preview,
activity receipt, and receipt/delivery restoration after native quit/relaunch.
