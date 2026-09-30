# GiGi desktop beta

A Rust/Tauri desktop workspace for music-related work. Each installation owns a private SQLite database. The UI and local MCP companion use the same validated domain operations. CTX supplies supporting history; current records and calculations remain in SQLite.

The local functional beta passed connected desktop and physical cellular-phone acceptance; current receipts and artifact hashes are in `evidence/local-checkpoint.md`. Developer ID signing, notarization and installation of the qualified release remain required before production distribution. See `evidence/tdd.md` for checks and failures; a successful build alone does not prove acceptance.

## Development

From the monorepo root, run `pnpm bootstrap:worktree` first.

- `pnpm --filter @create-something/gigi-desktop test`
- `pnpm --filter @create-something/gigi-desktop test:domain`
- `pnpm --filter @create-something/gigi-integrations test`
- `pnpm --filter @create-something/gigi-integrations typecheck`
- `pnpm --filter @create-something/gigi-desktop build:local`

The local build uses a separate ad-hoc signing configuration, requires macOS 13 or later, and currently targets Apple Silicon. It does not require Grant’s Apple credentials. Production packaging uses `pnpm --filter @create-something/gigi-desktop build` after release signing is configured. An app bundle alone does not establish a signed/notarized production release. Run `verify:release` with the absolute app and DMG paths after production packaging; it exits nonzero for an unqualified pair. Qualification is separate from installing that exact release and repeating the native workflow. The verifier is read-only and must reject the local ad-hoc build. It checks the signed GiGi identifier, Developer ID executable signatures, Gatekeeper and stapled notarization, DMG integrity, and the byte/mode identity of the app mounted read-only from that DMG. An optional `--source-sha` is recorded as a caller assertion, not verified build provenance.

## Local state and agent access

The default macOS state directory is `~/Library/Application Support/agency.createsomething.gigi`. `GIGI_DATA_DIR` selects an isolated test profile for both the desktop and MCP companion. Never point acceptance tests at an existing person's database.

The app's `gigi-mcp` companion exposes bounded typed tools over stdio. The bundled `agent/gigi` skill teaches domain relationships and progressive retrieval. Generate install-specific connector configuration with `scripts/package-agent.mjs`, passing the installed app bundle, a new output directory, and the absolute data root for the reviewed GiGi workspace. The workspace must already exist with its `gigi.sqlite` database. The generated MCP configuration binds that exact profile; an omitted or invalid data root fails before packaging. Provider connection acceptance is separate from generating configuration.

Use an existing subscribed Codex or Claude Code session. Phone access uses that provider's remote connection to the running desktop session. There is no automatic model API fallback. Manual database use remains available when the agent cannot run.

Composio's developer credential belongs in the authenticated broker, never in the distributed desktop app. Each user's connected-account ownership and scopes must be read back before import. CTX must use a workspace-specific data root and explicit source imports.

## Release acceptance

A fresh local install must complete onboarding, linked record creation and correction, source consent/import, agent read/write, restart persistence, backup restoration and disconnected recovery. Verify two independent user profiles cannot cross-link records or source bindings. Micah owns physical phone-on-cellular acceptance after the installed candidate is ready. Capture the exact artifact identity and separate local acceptance from Developer ID/notarization and production distribution receipts.

## Implemented beta scope

The reviewed catalog preserves all 13 entity types and named relationship roles. The beta implements typed record editing, validated links, integer-cent money summaries for USD/CAD/EUR/GBP, source provenance/deduplication, mutation history, and SQLite backup/restore. It does not yet reproduce every Notion formula/rollup or manage binary attachments. Empty or incomplete financial inputs are marked incomplete; the catalog alone is not formula parity.

Imports read bounded Gmail metadata and Calendar event pages. Each saved record is transactional; a failed page returns an explicit retry cursor and preserves completed records. Repeating the page deduplicates by provider, connected account, collection, and external ID and preserves local corrections. It does not send email or modify calendars.

Agent setup generates exact Codex MCP registration and Claude plugin launch commands. Preparing files is not installing a plugin or verifying a session. The user must approve writes in their provider's session; read-only automation cannot supply that acceptance. Use the compact bundled skill and retrieve full details only for selected records.
