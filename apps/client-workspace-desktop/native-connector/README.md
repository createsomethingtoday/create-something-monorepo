# Managed macOS connector slice

Foreground Rust supervisor for a **client-owned** workspace runtime and outbound,
locally managed Cloudflare Tunnel. Candidate for Linear CRE-2140 / Paperclip
**create-something CRE-86**, under CRE-83. This is not a shipped, enrolled, signed
or production-accepted connector.

The TypeScript UI, signed delivery verifier, local Codex sign-in, `codex app-server`,
sandbox, normalized approvals and receipts remain authoritative. This executable
adds no HTTP control API, identity provider, credential broker or launchd service.

## Build and verification

From repository root:

```sh
cargo test --locked --manifest-path apps/client-workspace-desktop/native-connector/Cargo.toml
cargo clippy --locked --manifest-path apps/client-workspace-desktop/native-connector/Cargo.toml --all-targets -- -D warnings
cargo fmt --manifest-path apps/client-workspace-desktop/native-connector/Cargo.toml --check
cargo build --locked --release --manifest-path apps/client-workspace-desktop/native-connector/Cargo.toml
```

Tests use synthetic files and local processes, never real cloudflared, Codex,
Cloudflare APIs or client credentials. Fixtures use `PAPERCLIP_RUN_SCRATCH_DIR`
when available. Policy and TypeScript regressions were run red before fixes.

## Release resources and private enrollment

The release owner supplies this immutable, reviewed directory:

```text
runtime/bun
runtime/cloudflared
server/handler.js and assets             (existing adapter-node build)
server/scripts/dual-origin-server.mjs    (exact Host/scheme boundary)
trust/client-workspace-trust-keyring.json (reviewed public production keyring)
```

Desktop `prepare:runtime` copies Bun, the server and the dual-origin wrapper.
It also copies the locked `jose` and `svelte` runtime packages externalized by
adapter-node. Candidate preparation boots the copied release outside the
monorepo and checks anonymous remote denial plus local capability bootstrap;
an in-repo build alone does not prove the release can start.
For a connector candidate it requires `CLIENT_WORKSPACE_TRUST_KEYRING_FILE` and
`CLIENT_WORKSPACE_CLOUDFLARED_PATH`; its runtime manifest records both binary
hashes. The release owner must build and sign the connector executable and
entire immutable resource directory. Never generate a
development trust root for a client release. Resource existence/permissions are
checked here; Apple signatures and asset hashes remain release gates.

Run `pnpm --filter @create-something/client-workspace-desktop
prepare:connector-candidate` with the reviewed keyring and pinned cloudflared
path set in the environment to create a unique unsigned candidate under
`output/client-workspace-connector/`. Its manifest hashes every included file.
The candidate is not an installer: signing, notarization, enrollment and an
installed-device acceptance run must precede client delivery.

Store enrollment outside the repo, owner-owned, mode `0600`. Every field is
required; unknown fields fail. This synthetic example grants no access:

```json
{
  "version": 1,
  "client_id": "synthetic-client",
  "hostname": "workspace.example.com",
  "access_team": "synthetic-team",
  "access_audience": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "allowed_email": "operator@example.com",
  "tunnel_id": "11111111-2222-4333-8444-555555555555",
  "credentials_file": "/client-private/tunnel.json",
  "resources": "/client-private/release",
  "codex_bin": "/client-private/bin/codex",
  "client_home": "/client-private/home",
  "state_dir": "/client-private/connector",
  "port": 21934
}
```

Use canonical absolute paths; resolve installed Codex symlinks first. State's
parent must exist; the connector creates only its own `0700` state directory.
When Codex is installed as an npm JavaScript launcher (`#!/usr/bin/env node`),
set optional `codex_node_bin` to the canonical absolute path of its `node`
executable. The connector verifies that binary and adds only its directory to
the child's search path. Native Codex installations omit this field. Changing
it changes the enrollment binding and requires a new reviewed enrollment.
Credentials must already exist as a private, single-link, owner-owned file.
Only cloudflared reads their contents. Rust never logs or copies credentials;
no token is passed in arguments. Child environments are cleared. Codex uses the
client's normal HOME authentication, with no API key or CODEX_HOME override.
Preview toolchain availability remains a device acceptance gate.

```sh
client-workspace-connector run --config /absolute/private/enrollment.json
client-workspace-connector revoke --config /absolute/private/enrollment.json
```

Every run displays client ID, hostname and exact email on `/dev/tty`, requiring
`CONNECT <client_id>`. There is no unattended option, saved approval or restart.
Declining starts no children. This approves the connectivity session; the existing
workspace approval UI still owns individual Codex command/file decisions.
After the local runtime passes its anonymous-denial gate, the connector prints a
one-run loopback capability URL on the approving terminal. That URL is local
authority; keep it out of shared logs and client records.

One runtime binds loopback and serves both the local capability host and the remote
Access-JWT host. The wrapper rejects any other Host and rewrites the forwarded
scheme itself. Remote mutations require the exact configured Origin.
Connector mode excludes the demo: workspace registration uses existing signed
delivery import. Missing remote or desktop mode fails closed for managed requests.
An optional `local_checkout` in the private connector enrollment can register
an existing client-owned Git checkout without copying it into a delivery. It
contains an exact canonical absolute `root`, a slug `id`, a display `label`,
and nonempty relative `editable_roots` naming subdirectories. The connector
checks the checkout and editable roots before starting children, then displays
the path and roots during each local `CONNECT` approval. Browser input cannot
choose or change those paths. The app has no browser preview for this checkout;
it retains Codex sandbox, per-action approvals, focused diff, receipts and
network-disabled turns. Managed-delivery reset/checkpoint/rollback endpoints
reject this checkout so they cannot replace the client's source. A new root or
editable scope changes the enrollment digest and requires reviewed migration.
For Grantbot/GiGi, inspect Grant's actual canonical checkout and choose the
editable roots with Grant during attended device setup. Do not paste a sample
path or make this configuration on the operator Mac. Grant's own release lane
continues to own PR review, merge and deployment.
Only after a fresh local capability challenge succeeds, the owned runtime remains
alive and an anonymous remote-host request receives 403 does the tunnel start.
This proves the server answering on loopback knows the one-run capability; it is
not authenticated remote acceptance or a kernel socket-ownership attestation.

Generated private tunnel config contains one exact hostname, Access validation
on that ingress rule and a terminal 404 rule. References:
[Cloudflare origin parameters](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/origin-parameters/),
[cloudflared schema](https://github.com/cloudflare/cloudflared/blob/master/config/configuration.go).
The existing origin independently verifies JWT signature, issuer, audience and email.

## Lifecycle and audit

An OS lock admits one supervisor per state directory. A SHA-256 digest binds it
to exact configuration; changing client, paths, port or policy requires a reviewed
enrollment migration. This digest is not a release signature. Config is trusted
local operator input, never browser input. Same-user malicious mutation is outside
this slice's security boundary.

The approved foreground CLI launches a private guardian process through an
inherited Unix socket. The guardian alone starts Bun and cloudflared. Kernel EOF
on that socket makes the guardian stop its owned process groups if the foreground
CLI is killed with SIGKILL; SIGINT/SIGTERM/SIGHUP, revocation, child failure and
ordinary errors also stop them, tunnel first. The guardian holds a separate lock
until shutdown and removes an owner-only `active` marker only after its children
have stopped. Revocation waits for both locks and the marker to clear. A later
startup refuses an uncleared marker instead of claiming an orphaned tunnel is
gone. No persisted PID is used as a kill target, no unrelated process is scanned,
and no existing launchd service is touched. Normally Codex and preview descendants
inherit the runtime group; detached descendants do not.

Revocation syncs a persistent marker before audit. The guardian checks every
200 ms (startup probes have bounded socket timeouts). The revoke command waits
up to five seconds for both locks and the activity marker; timeout is
`revoked_disconnect_unconfirmed`.
Restarts stay denied. No un-revoke API exists. This does not rotate Cloudflare
credentials, invalidate Access sessions or erase local Codex sign-in. Compromise
rotation belongs to the credential owner's separate workflow.

Owner-only `audit.jsonl` contains timestamps and fixed events: `approved`,
`declined`, `starting`, `children_started`, `stopped`, `failed`, `revoked`.
`children_started` proves spawn, not Cloudflare connection. Audit failure prevents
startup; run errors tear down owned children. Child stdout/stderr is discarded.
No prompts, client records or provider errors enter the audit. The digest, lock,
routing config and revocation marker are local state, never release artifacts.
Audit is not tamper-proof against its own OS user; retention/rotation is future work.

## Production gates owned by the orchestrator

1. Independent source/security review and approved merge.
2. First-party Identity enrollment and authorization for an actual client. The
   controlled pilot email policy is not general client enrollment proof.
3. Per-client Access application/audience, exact hostname, locally managed named
   tunnel and private credential provision. Validate generated config with the
   pinned cloudflared binary before connecting.
4. Immutable release manifest, pinned Bun/cloudflared, reviewed public keyring,
   Developer ID signing, notarization and full-bundle verification. No private
   signing keys, credentials or client records in source or evidence.
5. Actual macOS acceptance: local approval, client Codex login, trusted import and
   tamper rejection, authenticated browser, identity/Origin negatives, bounded edit
   approval, preview, receipt, restart recovery and installed preview toolchain.
6. Actual tunnel disconnect, revocation and independent rollback with authenticated
   browser readback; separate credential rotation ownership.
7. Installed-device crash and disconnect acceptance. A synthetic SIGKILL of the
   foreground CLI now exercises guardian cleanup and immediate revocation, but
   the guardian itself can still be killed with SIGKILL and leave children alive.
   Its surviving activity marker blocks restart and disconnect confirmation;
   it does not kill unknown or detached processes. A device operator must
   independently inspect and clear such an incident before a new enrollment.
   Sleep/wake, kernel aborts and power-loss recovery need installed-device proof.
   There is no launchd install or auto-reconnection.

## Independent rollback

Stop the foreground connector and verify tunnel disconnect. Preserve config,
revocation, audit, signed deliveries, receipts and Codex home. Restore only the
previous reviewed signed connector/resources at the same canonical resource path;
starting requires new local approval. Never clear revocation for rollback. A path
or config change requires reviewed enrollment migration. After abnormal termination,
the release owner must prove orphan cleanup before rollback; never delete an
`active` marker merely to bypass that proof. Source rollback of
this candidate changes no pilot service, Tauri install, credentials, workspace
source or third-party route.
