# Independent final signed GiGi 0.3.5 acceptance

Sol 6.1 independent review, 2026-11-09 America/Chicago. No blocking finding in tested final artifact. No source edits, agents, publication, installed-app replacement, policy changes or external messages.

## Exact identity

Frozen runtime: `df51d22a257a1e053cb8d6a37acd3ba5c25908fd`. Desktop/integrations subtrees independently compare unchanged against frozen commit; metadata HEAD is not used as compile provenance. Only `.cache/gigi-release-035-final/GiGi.app` and its DMG were qualified; superseded directories were not used.

DMG `GiGi-0.3.5-arm64-private-beta.dmg`: **129864987 bytes**, independently hashed before and after runtime review: `8350e78b0a896ad0d98a508a3c8328a132f328ac090e0b2ccc6d8f8a93c28d77`.
Signed main: `3bca1d9dc9b031d6d87e8d7f5405e2fb5c7f59c34b1187e4423b3657124e8120`.

Independently reran full verify-release.mjs: **qualified=true**. Team PRP5VQQPPB; signatures, hardened runtime, Gatekeeper, app/DMG staples, DMG integrity and mounted bytes/modes pass. App and mounted bundle digest both `e6766bf51ee303f7db57b3155462572790b0d595e55b16db14c50bf8b91036b0`.

Read build-source and both compiler manifests: exact frozen SHA, dirty=false; main embeds SHA. Re-ran signature-only equivalence: 7 Mach-O files, 15 non-Mach-O files; signing changes only permitted envelopes/ticket. Bundled skill/plugin match committed frozen source; pinned CTX hash matches. Both signed MCP locations passed real stdio checks: pending-only staging, no approval tool, request reuse, Unicode citation and scoped get. That protocol check uses a native domain fixture for approval, separate from actual GUI/provider evidence.

## Actual DMG native app

Separately owned read-only DMG mount, exact candidate path and per-process synthetic HOME/GIGI_DATA_DIR/CODEX_HOME verified. PIDs: 55680 native, 60801 restart, 60945 provider. An initial direct-executable launch failed Tauri resource resolution (`unknown path`); normal LaunchServices launch resolved it. CUA automatically relaunched the failed app without environment isolation; it was stopped before test writes, and those observations are excluded. No installed public/DEV or other review app was quit/replaced.

- Directly viewed normal 1280×840 and OS minimum-clamped approximately 880×620. Minimum capture is 1762×1242 at 2x including border. Window / Move & Resize / Top Left clamps to app minimum; no bundle/config edits.
- Create saved Élodie morning preference, inferred/source/revision 1. Correct retained id, changed afternoon/revision 2. Replace created evening/new id/revision 1; native confidence selector set Confirmed. Original excluded. Native uppercase ÉLODIE and live provider search matched replacement.
- Repeated Platform → Memory then draft → Today blocked navigation and retained draft. Keyboard Tab produced visible save focus. Provenance, confidence explanation, scope, dates and citations readable.
- Real native SQLite contention at minimum: all five editor controls and save/cancel/refresh disabled, exact submitted text/source visible. Releasing synthetic exclusive lock completed save/readback. Exact snapshot and replacement survived actual quit/relaunch.
- Longer real SQLite lock caused actual staging failure and recovery fence: all five fields remained disabled, exact draft retained, Check memory receipt reachable. After releasing lock, receipt reported no staged proposal and restored unchanged editable draft without replay. Cancel then explicit Refresh restored reads. Final DB contains no failed-stage proposal/memory. Lost-response-after-commit and invalidation were not injected into signed app; existing controller/real-SQLite browser evidence covers those branches.
- Forget displayed conversation/backup limitation, removed evening entry, lowercase élodie search returned zero. Independent SQLite readback confirms forgotten live payload cleared to `{}`.
- Work/Admin/Network/Platform directly viewed open at minimum; Admin/Platform also at normal. No observed header/neighbor shift; centered chevrons agree with frozen SVG source. Four minimum screenshots retained. Dark/green Danny/Astryx baseline legible, vertical scrolling reaches editor/provenance/actions, no observed horizontal clipping.

## Live embedded provider

Only opaque existing login copied to isolated CODEX_HOME; no host configs/memories read/copied. Existing Codex 0.167.0 executable supplied explicitly because synthetic HOME/PATH omits host install discovery. Actual final signed gigi-codex and gigi-mcp resources executed.

Three actual calls in embedded-provider-tools.json: ÉLODIE search/limit 5; request lesson; get approved lesson. Before approval, independent SQLite snapshot proves no saved lesson and a pending request. Native UI presents exact lesson/inferred/source and Approve/Reject. Explicit native approval alone saved it. Subsequent provider get returned correct id/text/source/inferred confidence and revision 1 citation. Temporary auth deleted after candidate shutdown. No installed host policy/config changes.

Nonblocking presentation limit: chat displays gigi-memory citation as literal Markdown, with correct readable/copyable URI, rather than an interactive link.

## Three gates

| Gate | Status | Evidence and limits |
| --- | --- | --- |
| Functional correctness | **passed** within tested final-artifact scope | Native lifecycle, Unicode, repeated-nav guard, restart, real busy/recovery, both signed stdio payloads, live embedded search/request/native approval/get, independent SQLite readback. Synthetic records only; no private-code injection. |
| Perceptual/product quality | **passed** within directly viewed scope | Native WebKit normal/minimum, approved dark/green baseline, visible focus, source/confidence, recovery reachability, four aligned nav groups. Other native themes and VoiceOver not tested here. |
| Release readiness | **untested** for production promotion; local artifact qualification passed | Full signed/notarized final app+DMG verifier passes. Parent owns current CI/review, merge/upload/destination/no-overwrite checks, full remote redownload verification and live metadata. No publication claimed. |

macOS 13 floor, VoiceOver, Google/phone, separate fresh macOS user and human acceptance remain untested. Synthetic HOME is not a fresh OS user. Installed external host proposal remains policy-blocked in earlier evidence: “MCP tool call requires approval, but approval policy is never”. Not repeated/weakened here; this is not classified as app defect or automatic publishing ban. No fresh final source-CI result established in this artifact review.

## Evidence and cleanup

Screenshots/AX, provider tool calls, before/after synthetic database snapshots, independent provenance/full verifier and cleanup receipts are beside this report and in `.cache/gigi-release-035-final/independent/`. Screenshots were directly viewed.

Owned candidate/companions stopped; opaque auth deleted; owned mount detached. Other applications untouched. Artifact resources/signatures/DMG unchanged; source status clean. Worktree disposition: preserved at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-0597f042`, branch `t3/gigi-workspace-agent-memory`, for parent integration/promotion. Rollback: retain verified 0.3.4 per RELEASE-035; do not restore old DB backup solely for UI rollback.
