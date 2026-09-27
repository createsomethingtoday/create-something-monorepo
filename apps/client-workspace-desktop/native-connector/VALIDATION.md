# Implementation evidence — 2026-09-27

Scope: Paperclip **create-something CRE-86**, child of CRE-83; canonical Linear
CRE-2140. The current assignment supersedes the earlier CRE-85 dispatch. This
handoff records the engineer's bounded source implementation. The orchestrator
integrated the single-owner dual-origin runtime afterward; current verification
must be read with the additional evidence below.

## Integrated candidate verification

- Rust lifecycle/policy: 16 passing tests, including a positive capability
  challenge, an unrelated-403 refusal, foreground SIGKILL guardian cleanup,
  immediate revocation, stale-marker refusal and direct-guard denial.
- Workspace: 119 passing tests; production adapter-node dual-origin smoke passes
  with local capability, remote signed Access JWT, exact Host and Origin, and
  multipart POST checks. The same smoke passed using packaged Bun/resources.
- Svelte check: zero errors and warnings. Rust clippy and formatting pass.
- This is still an unsigned, unenrolled source candidate. Guardian SIGKILL and
  detached descendants remain uncontained; installed-client packaging, client
  identity enrollment, live tunnel and browser acceptance remain release gates.
- A synthetic unsigned candidate build with a development public keyring and the
  installed cloudflared executable completed after the guardian change. All 96
  included file hashes matched its manifest, no symlinks remained, and its
  packaged Bun passed the dual-origin smoke. It was moved out of delivery output;
  this is packaging proof only, not a signed or enrolled release.
- The candidate used Bun 1.3.6 and this Mac's cloudflared 2026.6.1. The local
  cloudflared CLI reports a newer release is available; select and review the
  production binary before signing a client artifact. The runtime manifest now
  records both versions and hashes.

## Original Paperclip engineer handoff

From repository root:

```sh
/Users/micahjohnson/.cargo/bin/cargo test --locked --offline --manifest-path apps/client-workspace-desktop/native-connector/Cargo.toml
/Users/micahjohnson/.cargo/bin/cargo clippy --locked --offline --manifest-path apps/client-workspace-desktop/native-connector/Cargo.toml --all-targets -- -D warnings
/Users/micahjohnson/.cargo/bin/cargo fmt --manifest-path apps/client-workspace-desktop/native-connector/Cargo.toml --check
/Users/micahjohnson/.cargo/bin/cargo build --locked --offline --release --manifest-path apps/client-workspace-desktop/native-connector/Cargo.toml
/Users/micahjohnson/.nvm/versions/node/v22.21.1/bin/node node_modules/tsx/dist/cli.mjs --test packages/client-workspace/test/*.test.ts
/Users/micahjohnson/.nvm/versions/node/v22.21.1/bin/node /Users/micahjohnson/.nvm/versions/node/v22.21.1/lib/node_modules/corepack/dist/pnpm.js auth:retired-provider:check
git diff --check
```

- Rust: **12 tests**, including real synthetic runtime/tunnel processes, descendant
  teardown, unrelated-process preservation, persistent revocation, CLI local-terminal
  requirement, locks, enrollment binding, state replacement and private-file checks.
- Workspace: **117 tests**, including the new connector-mode auth and registry tests.
- Clippy: no warnings. Rust formatting and native optimized build: pass.
- Retired identity provider check: pass.

From `packages/client-workspace`, using the same absolute Node 22.21.1 executable:

```sh
node node_modules/@sveltejs/kit/svelte-kit.js sync
node node_modules/svelte-check/bin/svelte-check --tsconfig ./tsconfig.json --fail-on-warnings
node node_modules/vite/bin/vite.js build
```

Svelte: **0 errors / 0 warnings**. Vite adapter-node production build: pass.
A synthetic JSON file matching the emitted tunnel schema passed
`/opt/homebrew/bin/cloudflared tunnel --config <run-scratch>/synthetic-tunnel.json ingress validate`
with **cloudflared 2026.6.1**. This was offline ingress validation, not a tunnel
connection or credential test. The scratch file was removed.

## TDD and environment notes

Policy tests initially failed on missing Rust implementation. The two TypeScript
regressions then failed with a demo unexpectedly registered and HTTP 200 instead
of 403. The state-removal regression also failed before inode-bound state checks.
All pass after their corresponding fixes.

`pnpm bootstrap:worktree` was attempted but the harness shell PATH reported missing
`xz`. Focused dependencies were installed from the frozen lockfile/offline cache
using Node 22.21.1 and its Corepack pnpm 9.15.0, with scripts disabled. Canon's
existing `svelte-kit sync` / `svelte-package` generated its missing dist declarations;
Svelte checking then passed. No dependency lockfile change is included. CTX reported
an unavailable verified index and could not repair its daemon directory under the
sandbox; no historical proof is claimed.

## Limits and next owner

The [README](README.md) owns detailed production gates and rollback. No real
credentials, signed client release, client device, live tunnel, browser acceptance,
first-party client enrollment, deployment or merge were used or claimed. In
particular, the original handoff did not contain foreground supervisor SIGKILL;
the addendum below records the subsequent bounded fix and remaining limits.

The orchestrator owns independent review, release assets/signing, identity and
device acceptance, promotion, rollback verification and Linear CRE-2140 closeout.

## Foreground crash containment addendum

This follow-up branch tests and contains **foreground CLI SIGKILL**. The process
test first failed: synthetic Bun, a Bun descendant, and cloudflared remained
alive after the approving CLI died. With an inherited-socket guardian owning
both process groups, the same test now passes: immediate `revoke` waits for
the guardian to terminate both groups, confirms their disappearance, and leaves
an unrelated process running. A direct `guard` invocation without the inherited
parent socket is denied. A simulated uncleared activity marker prevents a new
run and makes revoke return `revoked_disconnect_unconfirmed`.

The guardian itself can still be SIGKILLed, and detached descendants can escape
the groups. In that case the marker is retained and does not establish actual
disconnection; an operator must independently verify and resolve the orphan
before any restart or rollback. Live tunnel, installed-device and browser
acceptance remain open production gates.

Worktree disposition: preserved at
`/private/tmp/cre-2140-connector-implementation` on
`codex/cre-2140-connector-implementation` for source provenance. The integrated
candidate is in draft PR #1790 on `codex/cre-2140-client-rust-connector`.
