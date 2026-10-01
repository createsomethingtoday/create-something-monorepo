# CRE-2206 installed Codex beta evidence

Local macOS beta, 2026-10-01. Installed Codex CLI 0.159.2 uses its existing ChatGPT sign-in. No API fallback or credential extraction.

## Verification

- Integrations: 81 passed, 1 optional real-CTX test skipped; TypeScript typecheck passed.
- Desktop web/scripts: 56 passed in the regular run. The two installed-companion gates were then enabled against the installed app and passed, including linked-record/backup/restart and profile isolation checks (58 unique desktop tests).
- Rust: 43 library tests and 6 MCP tests passed.
- Clippy all targets with warnings denied passed; retired-provider check and diff check passed.
- Local ad-hoc app and DMG built. Developer ID signing/notarization remains deferred.
- The bundled native verifier ran three real provider turns against a new synthetic profile: correct $450.00 fee/contact/task, no write before approval, approved task rename with retained fields/relations, rejected rename unchanged, six messages resumed after companion restart. See codex-chat-acceptance.json.
- Native visual verification: pending Mac unlock.

## Installed candidate and rollback

Installed at `/Users/micahjohnson/Applications/GiGi.app`. DMG: `/Users/micahjohnson/Documents/GiGi Codex Beta/GiGi-CRE-2206-local.dmg`. Previous app retained at `/Users/micahjohnson/Documents/GiGi Codex Beta/GiGi-before-CRE-2206.app`. Existing business profile is preserved; acceptance used a separate synthetic profile.

## Scope and recovery

Embedded chat offers GiGi reads and approved edits to existing records. Creation, relation changes and backups use manual/external-agent workflows. Provider transcript history is separate from SQLite backup and does not automatically sync to mobile chat. Unidentified turn delivery stays blocked; uncertain saves fence workspace writes until matching record readback. No automatic mutation replay. Chat profiles are capped at 100 conversations to retain unresolved fences.

Early verifier attempts caught an unsupported advertised Codex method, a first-turn transcript timing failure, prose-only approval requests and a cents/dollars reporting mistake. Those failures were retained and resolved before the successful bundled run; the monetary assertion requires literal `$450.00`.

## Installed binary SHA-256

- `MacOS/gigi`: `eb59c5949f429837170e533566a8e8e33b75522ed866a0a8bce1410a71383145`
- `Resources/gigi-codex`: `340d85cb37a2f47e2ea5d305e552e396469181a5591fac52f63ae7bd72ef35bc`
- `Resources/gigi-mcp`: `444ee3f85d5dff0f902883ea0e8946e41d81ddf2e833d1aa8258132cc570ad3a`
