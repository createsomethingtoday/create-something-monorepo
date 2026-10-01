# CRE-2206 installed Codex beta evidence

Local macOS beta, 2026-10-01. Installed Codex CLI 0.159.2 uses its existing ChatGPT sign-in. No API fallback or credential extraction.

## Verification

- Integrations: 82 passed, 1 optional real-CTX test skipped; TypeScript typecheck passed.
- Desktop web/scripts: 59 passed with installed-companion gates enabled, including linked-record/backup/restart, profile isolation and drawer preservation checks.
- Rust: 43 library tests and 6 MCP tests passed.
- Clippy all targets with warnings denied passed; retired-provider check and diff check passed.
- Local ad-hoc app and DMG built. Developer ID signing/notarization remains deferred.
- The bundled native verifier ran three real provider turns against a new synthetic profile: correct $450.00 fee/contact/task, no write before approval, approved task rename with retained fields/relations, rejected rename unchanged, six messages resumed after companion restart. See codex-chat-acceptance.json.
- Native visual verification passed in the installed macOS app using synthetic data: saved conversation resumed, $450.00/contact/task read correctly, exact held title-only edit approved, title read back with Priority=High, Status=Open and original gig relation retained. Escape dismissed the drawer; opening, status polling and closing preserved the underlying record layout. The normal GiGi Beta Acceptance workspace was restored (3 gigs, 1 task, 2 people).

## Installed candidate and rollback

Installed at `/Users/micahjohnson/Applications/GiGi.app`. DMG: `/Users/micahjohnson/Documents/GiGi Codex Beta/GiGi-CRE-2206-local.dmg`. Previous app retained at `/Users/micahjohnson/Documents/GiGi Codex Beta/GiGi-before-CRE-2206.app`. Existing business profile is preserved; acceptance used a separate synthetic profile.

## Scope and recovery

Embedded chat offers GiGi reads and approved edits to existing records. Creation, relation changes and backups use manual/external-agent workflows. Provider transcript history is separate from SQLite backup and does not automatically sync to mobile chat. Unidentified turn delivery stays blocked; uncertain saves fence workspace writes until matching record readback. No automatic mutation replay. Chat profiles are capped at 100 conversations to retain unresolved fences.

Early verifier attempts caught an unsupported advertised Codex method, a first-turn transcript timing failure, prose-only approval requests and a cents/dollars reporting mistake. Those failures were retained and resolved before the successful bundled run; the monetary assertion requires literal `$450.00`.

The native run also exposed provider completion arriving before a held approval resolved. A failing regression test reproduced it; the adapter now keeps the approval state until resolution, with no automatic write replay. The rebuilt companion is covered by that regression and a fresh three-turn bundled run (acceptance profile 06), which passed all six checks.

The chat is a fixed right-side overlay with a short slide-in animation, reduced-motion support, and no workspace reflow or page DOM replacement during chat updates.

## Installed binary SHA-256

- `MacOS/gigi`: `b046d6b88b6c7c17936157e298ee1c424e6b53ca33e86646801b914eb97e9501`
- `Resources/gigi-codex`: `ce0050ed1331b6b0be56e5ef886ec21dcc4cf05d32559d5bc77d0768fa3f47a5`
- `Resources/gigi-mcp`: `eee5879850c52d1719b716a0caef14e283b5183227d267c7249d832f95bbb123`
