# GiGi 0.2.18 daily-use polish — CRE-2306

0.2.18 supersedes the unpromoted immutable 0.2.17 candidate. The PR review identified a focused success message that never expired after focus left. Parent preserved a failing actual-app regression, rescheduled expiry while focused and verified the passing regression. Independent Sol repeated the desktop suite and fresh app/CSS matrix and independently checked real Tab-away expiry, repeated focused retention, draft preservation, newer-message identity and newer-error protection.

Functional correctness: PASSED within local/synthetic scope. 326 desktop tests passed independently and again against the exact signed 0.2.18 MCP, zero skips. Prior unchanged Rust/domain and integration checks: 173 and 298 passed respectively, one optional CTX skip. 0.2.17 signed bundled companion/real CTX acceptance passed; no backend/companion source changes beyond version. Net Cargo.lock delta is solely gigi_desktop version; third-party versions are preserved.

Perceptual/product quality: PASSED within scope. Independent fresh Studio/Paper/Midnight app/CSS checks across 880/1280 and both densities; reviewer directly viewed fresh Paper and Midnight error/editor output. Previous exact 0.2.17 native task focus/draft protection/save/readback preserved with no layout changes; parent viewed signed 0.2.18 rendering read-only. Native 880 resizing, native persistent-error behavior, screen-reader speech, fresh Mac setup, live Google/provider, physical phone and OS notification-click acceptance remain unverified.

Production source: 47e4bf72b2a86c19b2f3ad09514ee1e39cf39cb5, sourceDirty=false, verified in active release build output and embedded executable. Signing uses Developer ID Create Something LLC (PRP5VQQPPB). Exact qualification and live verification receipts are recorded beside this file and in Linear CRE-2306.

Rollback remains the immutable 0.2.16 installer. Revert the Agency release pin and rebuild/deploy if needed; keep a workspace backup before changing local installations. No production records, grants, sources or approvals were changed. Installed /Applications/GiGi.app remains untouched.

Worktree disposition: preserved at /Users/createsomething/.t3/worktrees/create-something-monorepo/t3-50058674 (t3/gigi-daily-polish) for release/rollback evidence. Parent root checkout and unrelated edits preserved.

Release readiness: PASSED exact artifact qualification. App/DMG Developer ID signatures, Apple Accepted notarization/staples, Gatekeeper, DMG integrity and matching mounted-app bundle hashes. Installer 84,806,372 bytes; SHA-256 50727f67ff0e75b3defda8dfe6b2a60d4dbc59737781bd2a731470bcb7fc58f6. Immutable URL https://media.createsomething.io/releases/gigi/0.2.18/GiGi-0.2.18-arm64-private-beta.dmg. Publication and canonical page readback will be recorded in Linear.
