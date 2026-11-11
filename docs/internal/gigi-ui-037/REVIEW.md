# GiGi 0.3.7 — CRE-2406

Social draft search used SQLite `lower()`, which misses non-ASCII case matches. A saved `ÉTÉ` title returned no result for `été`; the same problem affected Cyrillic captions. The corrective 0.3.7 build applies GiGi’s existing Unicode search normalization to both query and searchable text before counting and pagination. It also carries the reviewed Danny UI refinements, Money segments, Social search and explicit saved-place Maps functionality documented in `../gigi-ui-036/REVIEW.md`.

## Authority and acceptance

The user requested completion of the reviewed source handoff and explicitly approved the three Money/Social/Maps additions. The user selected this Mac as installation target. Other API/data work, Grant’s separate remote-support acceptance and messages to others are outside this release scope.

Acceptance requires Unicode native/MCP search with complete-workspace totals and non-overlapping pages, workspace isolation and no provider/write effects; preservation of approval, memory and import-recovery contracts; relevant regression and renderer checks; direct output inspection; clean-source signing/notarization provenance and exact app/DMG verification; independent final Sol 6.1 re-test; normal PR review/CI; immutable publication and full downloaded verification; local installation with data preserved; and deployed-page readback.

## Correction and source

GitHub review: https://github.com/createsomethingtoday/create-something-monorepo/pull/2243#discussion_r4533558226 . The parent added a native/MCP 55-draft regression. It failed with 0 instead of 55 matches for `été` before the correction, then passed accented, decomposed-accent, Cyrillic and Nordic cases, page boundaries, foreign-workspace exclusion and unchanged history. The full native suite passed 202 tests. Source response and review-thread resolution are recorded in GitHub.

The exact clean compiled runtime is `2c43119370898042816182522537698a2c279ca0`. Main and MCP compiler markers record that SHA and dirty=false. Raw marker copies, original executable inventory, independent signature-only comparison and CTX preservation evidence are under `release/`. Later page/docs/test metadata changes leave this runtime byte-identical.

The installer remains version 0.3.7 because the earlier 0.3.6 candidate already has an immutable URL. That object is preserved; canonical pages were never promoted to it. This correction introduces no schema or publishing-approval change.

## Exact artifact

`GiGi-0.3.7-arm64-private-beta.dmg` is **105,457,594 bytes**, SHA-256 `a3d811b479fb36edbc2f0ed307a53d549cb45273334aca138b6f66a254c56bc4`.

Planned immutable URL: https://media.createsomething.io/releases/gigi/0.3.7/GiGi-0.3.7-arm64-private-beta.dmg . At this checkpoint it is a qualified local artifact; upload, downloaded verification and canonical-page promotion wait for final GitHub review/CI.

The app and DMG were separately Developer ID signed, notarized and stapled. The production verifier passed with mounted-app equality. The independent app bundle SHA-256 is `fad79a04f4f4efb9f5b1a5007a048fd23dbcfbe809b43e165a526da35fdde70d`. The untouched original compiled app is retained outside Git. All seven changed Mach-O payloads normalize equal apart from signing, all eight original inventory hashes and both clean compiler markers match, and CTX remains byte-identical.

## Validation and limits

- Parent native suite: 202 passed. JavaScript suite: 427 passed, two installed-artifact skips.
- Parent directly exercised the signed native WebKit app: `été` finds `ÉTÉ`; `привет` finds a `Привет` caption. Typed MCP reads through that app’s actual companion also passed accented/decomposed/Cyrillic/Nordic queries in a new disposable profile.
- Independent final review used the actual signed companion with 60 drafts and another workspace. Seven Unicode queries each returned 55 matches in non-overlapping 50+5 pages; default/empty reads returned 60, and literal/no-match, length/type/offset/workspace rejection and publication guards passed. All 24 logical tables remained unchanged and no broker session was created.
- Independent renderer: 15 checks passed, including Money retention/retry; verifier unit suite: 19 passed. The real signed Maps helper returned a 640×320 preview for a fixed public query with only PATH in its environment. Full app/DMG verification and provenance passed.
- Independent perceptual assessment directly viewed native Unicode captures and fresh 880×620 Studio/Paper/Midnight output. Parent viewed the release-note output. Both generated pages passed no-JavaScript overflow/download checks at 320, 390, 768, 1024, 1025 and 1440. All 28 release-page tests and the Agency production build passed.
- Ground advisory ran but provided no analyzable-file coverage: all 87 files were excluded, duplicate analysis failed and orphan coverage was partial. Its zero findings is not checked-clean evidence; preserve the coverage receipt.

| Gate | Status at this checkpoint | Limits |
| --- | --- | --- |
| Functional correctness | Passed locally | Real signed native/MCP plus fixtures and verifier evidence; no live Google or Instagram publication acceptance |
| Perceptual/product quality | Passed for viewed output | Native Unicode and fresh Chromium states; no VoiceOver, older macOS or audible-quality claim |
| Release readiness | Untested for external promotion | Local artifact independently cleared; final GitHub review/CI, upload/download, installation and deployed-page checks remain |

See `release/INDEPENDENT_FINAL.md` for independent evidence and its precise limits. Browser destination after Open in Maps, fresh OS-user/platform-floor, VoiceOver and live provider workflows remain unverified.

## Promotion, rollback and ownership

After the final GitHub gate, verify the new R2 key is absent, upload once, read back metadata, fully download through the canonical anonymous URL, compare size/hash and rerun the production verifier. Then install that downloaded app on this Mac, preserving the previous app and private workspace backup. Close out only after normal merge, successful Agency deployment, repeated canonical `/gigi` and `/gigi/beta` readback and installation/data readback. Keep provider acknowledgment, deployment and human acceptance distinct.

Rollback is the prior qualified public 0.3.5 metadata/installer or the preserved original installed 0.3.4 app. Preserve all immutable objects and workspace data. Do not restore an older database solely to roll back UI, because forgotten context could reappear.

Full local receipts: `/Users/createsomething/Documents/GiGi 0.3.7/2026-11-10/final`. Private workspace backups are never committed or uploaded. Worktree disposition: retained at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-11220a1a-8ae08ba6a397f4f6`, branch `t3/gigi-ui-036`, until verified production closeout and operator archival.
