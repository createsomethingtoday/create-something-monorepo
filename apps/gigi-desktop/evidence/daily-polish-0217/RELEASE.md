# GiGi 0.2.17 release qualification — CRE-2306

Functional correctness: PASSED within local/synthetic scope. Builder: 326 desktop, 173 Rust, 298 integration tests (one optional CTX skip). Independent Sol reviewer: repeated 326 desktop tests, fresh three-theme/two-width/two-density actual-app fixtures, timer-race/escaping checks and native task/draft recovery. Final Developer ID signed app repeated 326 desktop tests with zero skips; real bundled-companion acceptance passed SQLite export, real CTX import/search, repeat sync and SQLite fact preservation.

Perceptual/product quality: PASSED within reviewed scope. Independent reviewer directly inspected fresh Studio/Paper/Midnight images and native candidate; parent inspected Studio 880 and native Paper plus signed native rendering and New task Title focus. Native minimum-window resizing and native error persistence remain untested; actual-app fixtures cover those checks. Screen-reader speech, real Google/provider, fresh Mac setup, physical phone and OS notification-click acceptance are not established.

Release readiness: exact app/DMG qualification PASSED. Developer ID Create Something LLC (PRP5VQQPPB), Apple notarization Accepted for app fae3cd61-df4a-46f3-a1f8-a515669172fb and DMG e0115715-cb0e-4ae5-8dfa-d38aa0076259, both stapled. Verifier checked signatures/Gatekeeper/disk image and identical mounted-app bundle hash. See release-qualification.json. Final source 4f4a02221492068346441daca7751eecbfc30640, sourceDirty=false verified from active build outputs and embedded executable SHA. Packaging changes no application source.

Exact release paths: /private/tmp/cre-2306-release/final-release/GiGi.app and GiGi-0.2.17-arm64-private-beta.dmg. DMG 85,308,956 bytes, SHA-256 be2047958a19cc69ab6b229ed34dd316513ea9253be79be3c6bd758afc512672. Immutable destination https://media.createsomething.io/releases/gigi/0.2.17/GiGi-0.2.17-arm64-private-beta.dmg.

Rollback: preserve 0.2.16 immutable installer. Revert the release pin in packages/agency/src/lib/data/gigiBeta.ts and rebuild/redeploy Agency if needed. Keep a workspace backup before changing local installations. Installed /Applications/GiGi.app is untouched; testing used disposable native profiles.

Production merge, publication readback and Agency deployment receipts will be recorded in Linear CRE-2306.

Worktree disposition: preserved at /Users/createsomething/.t3/worktrees/create-something-monorepo/t3-50058674, branch t3/gigi-daily-polish, for release/rollback evidence. Parent root checkout and unrelated edits preserved.
