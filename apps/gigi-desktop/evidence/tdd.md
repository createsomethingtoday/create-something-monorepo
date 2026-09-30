# TDD evidence

Parent slices:
- Agent packaging: `node --test scripts/agent-package.test.mjs` first failed with missing implementation; green after exact installed-companion validation and config generation. Test verifies failure before output when the binary is absent and correct executable path/skill inclusion when present. Fixture executable does not prove live MCP.
- Rust integration boundary: `cargo test integrations::tests --lib` first compiled after icon setup, then failed because unknown operation was not rejected; green with explicit operation allowlist.
- Companion dispatch: test failed with unavailable companion, then green after scoped stdin JSON delivery, bounded stdout decoding and timeout handling. Test companion is synthetic; packaged Effect binary acceptance remains required.

Native UI, real connector and subscription/phone acceptance are separate pending evidence.

Native integration failure: first debug app created workspace but profile write failed with `unknown profile field: displayName`. This proves wrapper unit tests were insufficient; canonical UI field mapping and partial-onboarding recovery are required before acceptance. Test profile retained at root output/gigi-local-acceptance/profile-a.

MCP SDK interoperability: new `scripts/mcp-smoke.mjs` failed with SDK ZodError because empty workspace returned null in object-only structuredContent. Server now includes structuredContent only for object results. Same real SDK/stdin verifier passes 6 calls: empty workspace, create, typed record write, idempotent retry, bounded list and readback. This is local protocol proof, not subscribed-provider or phone acceptance.

Subscribed Codex CLI acceptance attempt: signed-in ChatGPT auth, OPENAI_API_KEY/ANTHROPIC_API_KEY stripped, exact bundled MCP, ephemeral isolated profile. `gigi_workspace_get` succeeded with empty workspace. Workspace creation was denied by CLI approval policy in read-only mode; no task write happened. Subscription tool discovery/read is verified, approved write/readback remains unverified. Full local JSONL retained in ignored output/gigi-local-acceptance/subscription-test.jsonl. Do not count CLI exit 0 as workflow completion.

MCP progressive detail/workspace isolation: new regression failed because records.get did not advertise detail; schema now exposes summary/full and context search verifies requested workspace before launching companion. All 3 MCP binary tests pass.

CTX packaging: test first failed on missing packaging module; pinned-asset/unsupported-platform/checksum rejection test now green. Build obtains official ctxrs/ctx v1.3.1 release and checks pinned per-architecture SHA-256, with release LICENSE copied into app resources. Existing installed local CTX hash differed from release, so it was not silently reused. Bundled runtime verification remains separate.

Identity verification: all 88 owning package tests passed, and pnpm auth:retired-provider:check passed. Production Identity has not been promoted.

Agent setup guidance: failing test first required exact setup commands and shell quoting; implemented and 3 agent setup tests pass. Generated commands include installed binary/data paths and escape apostrophes, spaces, and shell metacharacters.

MCP oversized input: previous line reader allocated entire input before checking limit. New regression failed before bounded reader existed; reader now caps buffering at 1,000,001 bytes, discards oversized frame through delimiter, and accepts the following request. All 4 MCP tests pass.

Source persistence: test first failed because persist_page was absent; canonical mapped broker pages now pass through Rust ownership/provenance validation and the shared records.save transaction. Two tests pass: import/reimport/manual correction preservation and account mismatch rejection; partial record failure reports failedCount and retryCursor, withholds nextCursor, and repaired replay yields exactly two records. Page-level atomicity is not claimed. Live Composio consent/import still pending.

Real bundled CTX verifier FAILED: CTX 1.3.1 auto daemon discovered operator history because child HOME remained the real user home, despite an isolated data root and explicit import path. Two exact test daemons were terminated and verified absent. Only generated test profiles (including unwanted local duplicate indexes) were removed; operator source history was not modified. Redacted failure metadata retained in ignored output/gigi-local-acceptance/ctx-isolation-failure.json. No model API keys were forwarded. Connector lane is repairing subprocess discovery isolation before rerun; this invalidates earlier mocked isolation confidence.

Packaging compatibility: `vtool -show-build` on both pinned CTX and compiled integration companion reports macOS minimum 13.0. Tauri minimum updated from 12.0 to 13.0 so the app does not advertise an unsupported older OS.

Cross-language import smoke now passes Gmail and Calendar: actual TypeScript runner with synthetic broker HTTP/session → canonical adapter → Rust domain validation → SQLite persistence → replay dedupe and source readback. Command: `pnpm --filter @create-something/gigi-integrations exec tsx ../../apps/gigi-desktop/scripts/import-smoke.mjs`. This closes the raw-page/mapped-page integration gap; it does not substitute for real account consent.

## Installed companion roundtrip

The parent verifier passed against `~/Applications/GiGi.app/Contents/Resources`, using a fresh synthetic profile: SQLite mutation history export, real pinned CTX import, bounded title search (one matching hit), repeated sync, and unchanged current SQLite fee. This verifies installed companion paths and actual CTX behavior; native UI acceptance remains pending manual macOS unlock. Combined desktop checks passed 12 Node tests and 27 Rust tests. Real MCP SDK smoke passed six calls over eleven tools. Cross-language synthetic Gmail and Calendar pages each passed projection, Rust validation, persistence, deduplication and provenance readback. These synthetic source checks do not prove live OAuth consent.

## Local packaging repair

Strict codesign verification found the first bundled app lacked a complete resource seal. A local-only Tauri override now supplies ad-hoc signing with hardened runtime disabled for this test build. Rebuilding produced app and DMG; both the built and installed app passed `codesign --verify --deep --strict`. Production signing configuration is unchanged. This is local integrity evidence, not Developer ID or notarization.
