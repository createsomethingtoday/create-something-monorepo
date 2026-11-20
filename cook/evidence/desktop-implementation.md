# GiGi product recovery implementation

Local synthetic evidence only. Grant's records and interrupted task were never accessed or replayed.

- Chat: caller request UUID is persisted before turn/start. An accepted send receipt is emitted only from provider turn acceptance or matching client message reconciliation. Frontend clears its uncertain send fence on exact request receipt, including empty interrupted transcript. Unknown workspace mutation receipts remain fenced. Legacy unknown requests retain uncertainty and receive explicit guidance to inspect in a new chat without repeating the task. Original live interruption cause remains unproven.
- Music: metadata identity mismatch is called a reference check, not content corruption/change. Zero-byte recorded size is explicit. Native fixture verifies unchanged selected original reconnect, restart persistence and preview-path read. This does not prove decoded playback or explain migrated/cloud-placeholder files.
- Today: explicit performances separate from other commitments using saved kind, preserving existing source/typed-relation dedup. Superseded statuses excluded (native red/green). Working-week panel includes weekly, undated, waiting tasks (saved status or typed Waiting On relation), and pinned notes. Existing urgent window remains unchanged.
- Onboarding: connection, last import receipt, reviewed useful results and setup checkpoint are separately labeled.
- Notes: typed bidirectional Notes/Schedule catalog relation; native create/link/read verifies actual behavior.
- Gmail: DRAFT/SENT provider labels projected as fetched provenance; otherwise Unknown. Scheduling always Unknown because this read does not establish scheduled state. Friendly source labels expose these without rewriting user's records.

Validation: web 404/404 at checkpoint; chat reliability 27/27 after final unknown-mutation fence addition; codex 196/196 including restart receipt; Gmail worker/adapter52/52; native Today8/8; native unchanged music reconnect1/1; integrations typecheck passed; Vite build passed. Logs adjacent. Native Tauri test build used an empty ignored resources directory: suitable for these tests, not a deployable packaged app.

Native Today new functionality's initial attempted red run was blocked by absent resources; do not call it a red-green proof. Superseded and frontend correlated receipt regressions did demonstrate failing then passing behavior. Typed relation and zero-byte/music-label source fixtures also demonstrated failures before the corresponding changes.

Functional: local tests passed, live provider/native playback acceptance untested. Perceptual: awaiting parent Cook fixed-state captures and fresh critic review. Release: not released; parent retains integration, independent final Sol retest and promotion.

Exact commands run:

```
node --test apps/gigi-desktop/web/*.test.mjs
node --test apps/gigi-desktop/web/chat-reliability.test.mjs apps/gigi-desktop/web/chat.test.mjs
node --import tsx --test packages/gigi-integrations/test/codex*.test.ts
node --import tsx --test packages/gigi-integrations/test/codex.test.ts
node --import tsx --test packages/gigi-integrations/test/import-adapter.test.ts packages/gigi-integrations/test/worker.test.ts
npx --yes pnpm@10.11.0 --filter @create-something/gigi-integrations typecheck
npx --yes pnpm@10.11.0 --filter @create-something/gigi-desktop build:web
/Users/createsomething/.cargo/bin/cargo test --manifest-path apps/gigi-desktop/src-tauri/Cargo.toml --test today_windows
/Users/createsomething/.cargo/bin/cargo test --manifest-path apps/gigi-desktop/src-tauri/Cargo.toml recovery_unchanged_reference
```

No independent visual scores assigned. Before/after captures and screenshots are parent-owned. No PR/commit/deploy created by this child. Worktree disposition: preserved in shared t3/gigi-recovery-audit checkout for parent integration.
