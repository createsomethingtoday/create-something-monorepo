# GiGi 0.2.10 Tauri polish candidate

Local candidate only. No merge, push, publication, deployment, credential changes, external posts or installed-app replacement occurred.

## Baseline and ownership

- Refreshed `origin/main` on 2026-10-23: `cc86a62e4`. Latest GiGi change there is `8eceb2ed1` (#2041); the repository's immutable download manifest still identifies 0.2.9, DMG SHA-256 `2beae69244c71cd45b6d7ca19761018ee644fe486eb6a2b0d6fa0d69c7c39b91`.
- Main checkout itself was older (0.1.0). This work started from refreshed remote main, not that stale checkout or grantbot.
- Isolated branch: `codex/gigi-beta-polish-030`. All nine other GiGi-named worktrees had clean GiGi/integration paths during the overlap check. They were preserved.
- Worktree disposition: retained at `/Users/createsomething/Documents/Codex/2026-10-23/task/gigi-polish` for candidate review. The branch suffix is a task label; the candidate version is 0.2.10.

## Observations and resulting behavior

- `reference-layout.css` followed `studio.css` and overrode its slate palette and action treatment. The owning studio layer now loads last.
- Active secondary pages were hidden behind the generic More label. The same overflow control now displays the current page name; history controls describe pages rather than workspaces. Destinations and access rules are unchanged.
- Standardized spacing, neutral artwork backgrounds, readable player surfaces and active navigation emphasis without a new shell or feature.
- Native system font stack remains `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. No font file, purchase or new license. Page/section headings use weight 600; ordinary text 400; actions 500; form labels 600. Body/controls use 14px, page titles 32px/28px at narrow widths, metadata 12px with 1.6 line-height. Dates/amounts use tabular figures. Long titles, filenames and credits wrap instead of forcing the column wider.
- Music separates loading and read failure from fresh-library/no-match states. Errors expose a retry; no-match results expose Clear filters. Deferred reads preserve draft filter values, focus and selection. Reset clears both controls and request criteria. Discarded editor values cannot transfer to another item.
- Cancelled Music pickers restore the import action's focus. Artwork saves restore the matching artwork action after the record refresh and dialog closure.
- Database/schema, imports, integrations, MCP catalogs, agent approvals and media ownership/receipt validation were not changed. Rust source is unchanged; Rust/package/plugin versions advance to 0.2.10.

## Validation

- Desktop Node suite: **248 passed, 0 failed, 2 skipped** (250 total).
- Integrations: **291 passed, 0 failed, 1 skipped** (292 total); TypeScript `tsc --noEmit` passed. Loopback/lock fixtures required the approved run outside sandbox restrictions.
- Rust: **152 passed** across library/MCP/integration targets; no failures. Synthetic socket/process tests required the approved run outside sandbox restrictions.
- MCP SDK smoke: 40 tools, 6 successful calls; fresh workspace, typed writes, idempotent retry and bounded readback.
- Bundled companion acceptance passed: actual CTX history import/search, repeat sync and unchanged authoritative SQLite facts. The sandbox attempt reported unavailable; the approved local-process run passed.
- Independent **Sol 6.1** review reproduced and helped resolve reset/focus defects; its persisted deterministic regressions cover reset, editor isolation, deferred focus/selection and picker cancellation. Retest passed.
- `git diff --check` passed. Skipped installed-host/provider fixtures do not establish live provider or installed-app acceptance.

Native WebKit QA used only `/tmp/gigi-polish-030-synthetic`, with synthetic gigs, contacts, a generated checker PNG and a one-second synthetic WAV. Reviewed Today, Gigs/list/detail, People, Schedule, artwork dialogs and Music. Verified filtered list/detail/back focus, restart persistence, native picker cancellation/repetition, local WAV playback and Escape focus return, Clear filters, artwork reuse/save focus, Command-F and Command-Shift-F. Checked 1280px and approximately 880px windows after the font changes: long event title wraps clear of the time column; accented names and music emoji render; labels and metadata remain readable. Screenshots are captured in this task's computer-use outputs (Today, People, artwork detail, Music playback and narrow Schedule); the exposed screenshot API did not export standalone PNG files. Exact installed font-file names were not measured; the verified source stack and native rendering are the evidence.

The initial hand-made QA bundle under `/tmp` could not resolve its Tauri resource directory. Rebuilding and running the isolated bundle inside the authorized workspace resolved that QA-only issue; no product path fallback was introduced.

## Artifacts and release status

Artifacts are retained in the worktree's ignored `artifacts/` directory:

- `GiGi-0.2.10-arm64-local-candidate.dmg`: debug, ad-hoc signed, normal GiGi bundle identity, **not installed**.
- DMG SHA-256: `e2befcae4e6a6e1880f54380d08e643c900a39f84de525a42023897f99fdd411`.
- App executable SHA-256: `4905ca7578484292b1076d8c59cc936618f77071c1ccac9ec0c0790498a3d643`.
- `GiGiPolishQA.app` and `Launch-Synthetic-QA.command`: separately identified QA variant; the launcher selects the synthetic profile. Native checks used this variant, not the normal-identity distribution app.
- `candidate-manifest.json` records base SHA, dirty-build status and frontend file hashes. The bundle was built from the candidate before its local source checkpoint; it is not a clean release-provenance assertion.
- `test-logs/`, `dmg-app-match.json`, `dmg-verify.log`, `release-qualification.json` retain validation receipts.

App deep/strict ad-hoc signature verification and DMG integrity passed. Read-only mounted DMG app bytes/modes exactly match the staged app (bundle digest `96d83848558a7e36cbddbf2fdb80a7435da1435a86c4d601aa4787cd1fa812d3`); mounted signature verification passed and the image was detached. The standard Tauri DMG bundler failed under sandbox restrictions; a plain local DMG was created with approved disk-image access, without Finder automation.

**Distribution qualification is false**: the release verifier rejects this ad-hoc candidate with `app_identity`. Developer ID signing, notarization, clean release build/provenance, installed-artifact acceptance, physical phone acceptance, live source consent/import and provider publication remain separate gates. No real account or user record was used to claim those passes. The historical 0.2.9 signing/publication approval was not exercised here; its current status is unverified. No action in this candidate task remains approval-pending.
