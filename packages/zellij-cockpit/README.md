# CREATE SOMETHING Zellij cockpit

A Zellij 0.44 WASM sidebar for Codex-supervised Claude sessions. It displays task
identity and observed status; Enter or click focuses the exact worker pane.
Claude remains in its native terminal. The plugin never grants tool permissions
or declares a task verified.

The local controller is `scripts/zellij-cockpit.mjs`; Claude observation hooks are
`scripts/zellij-cockpit-hook.mjs`. State belongs in the operator app-data folder,
not the repository. Linear owns tracked work; Codex owns completion verification.

See [the operating guide](../../docs/guides/ZELLIJ_AGENT_COCKPIT.md) for build,
installation, launch, adoption, safe sending, receipts, recovery and rollback.

Build requires Rust with the `wasm32-wasip1` target. Run from the repository root:

```sh
pnpm zellij:cockpit:build
pnpm zellij:agent:test
cargo test --manifest-path packages/zellij-cockpit/Cargo.toml --locked -j 2
```

The Cargo lockfile is committed. Native UI and actual Claude interaction checks
are required before promotion; unit tests and WASM compilation are supporting
checks only.
