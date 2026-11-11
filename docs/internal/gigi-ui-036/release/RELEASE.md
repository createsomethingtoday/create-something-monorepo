# GiGi 0.3.6 qualification and delivery — CRE-2406

**Superseded by the corrective 0.3.7 candidate.** GitHub review subsequently found non-ASCII Social search case matching failed. The parent reproduced and fixed it with a native/MCP regression. Existing 0.3.6 artifacts remain immutable; canonical pages were not promoted to this candidate. See `../../gigi-ui-037/REVIEW.md` for current qualification.

Authority: user requested completion of the reviewed handoff and explicitly allowed Money filtering, Social search API and native Maps for 0.3.6. The user subsequently selected this Mac as installation target. Other API/data work and messages to other people are outside scope.

The exact clean compiled runtime is `6c9fd1900464ab8dfa9a6436879f3a78f85b5add`. Both current compiler-marker files record dirty=false. The main app embeds the SHA; MCP provenance rests on current clean compiler output and the executable inventory. Subsequent release metadata, page documentation/tests and CI updates do not change the runtime.

The artifact is **105,472,346 bytes**, SHA-256 `5aa9873905fb76f72ca3c5d1c39de62b7f4fad36db3631b87fd5c00e71d17190`:
https://media.createsomething.io/releases/gigi/0.3.6/GiGi-0.3.6-arm64-private-beta.dmg

Original compiled bundle retained untouched. All first-party companions, including the new Maps helper, carry the owning Developer ID and hardened runtime; Bun retains its existing JIT entitlement. Upstream CTX bytes/signature remain unchanged. The app and newly created DMG are separately notarized and stapled. Independent signature-only provenance, real helper execution, exact app/DMG full verification and mounted bundle equality passed. See INDEPENDENT_FINAL.md and JSON receipts here. Parent native WebKit captures use synthetic records and a fixed public Maps query, never current location.

The first candidate from 41485b6e was superseded locally after independent review found Money pagination retention losing loaded rows. The public-renderer regression failed with20 !=25 before the fix, then passed with full retention. Independent final re-test additionally retained31 rows across a failed view change and correctly replaced them on retry. No superseded installer was published.

Storage promotion checked backend absence and a canonical anonymous404, then uploaded once to the empty immutable key. A stale cached preflight404 was purged for this exact URL only. Backend key/size/HTTP metadata readback and a complete anonymous200 download matched the qualified bytes/hash. The production verifier passed on the downloaded DMG, including first-party signatures/runtime, Gatekeeper, staples, integrity and mounted-app equality.

Page release metadata and guidance now name0.3.6, Settings/History/attention navigation, Money/Social/Maps semantics and privacy. The prior0.3.5 evidence remains explicitly historical.28 page tests and the Agency build pass; both generated pages passed no-JavaScript overflow/download checks at320,390,768,1024,1025,1440. Parent directly viewed rendered release-note output. Existing page composition and privacy headers are preserved. The refinement suite is now part of CI.

Three local gates: functional passed for recorded automated, real signed native and downloaded-artifact checks; perceptual passed for directly viewed synthetic Chromium plus signed native WebKit output; release readiness cleared for the artifact, with final PR/CI/merge/deployed-page readback and local installation tracked by the parent before closeout. Fresh OS-user/platform-floor/VoiceOver/liveGoogle/Instagram-publication/browser destination acceptance remain untested.

Rollback: retain the immutable0.3.5 installer at https://media.createsomething.io/releases/gigi/0.3.5/GiGi-0.3.5-arm64-private-beta.dmg (129864987 bytes, SHA2568350e78b0a896ad0d98a508a3c8328a132f328ac090e0b2ccc6d8f8a93c28d77). Revert only download metadata or app code through the normal release path. No schema migration is introduced. Local installation preserves the previous installed0.3.4 app and a private workspace backup outside Git; do not restore an old database solely to roll back the UI because forgotten context could reappear. Grant’s remote-support issue is not accepted on evidence from this Mac.

Full local receipt directory: `/Users/createsomething/Documents/GiGi 0.3.6/2026-11-10/final`. Private workspace backups are never committed or uploaded. Worktree disposition: retained at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-11220a1a-8ae08ba6a397f4f6`, branch `t3/gigi-ui-036`, until verified production closeout and operator archival.
