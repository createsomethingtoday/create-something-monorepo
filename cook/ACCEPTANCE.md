# GiGi recovery audit implementation checkpoint

Baseline: origin/main `3be4a7bb1ee2427320fb6156174c4ca16a939788` (app0.3.7). Isolated branch `t3/gigi-recovery-audit`, CRE-2474. Root user checkout never edited. Database/Automation/Judgment scope recorded in BRIEF.

| Acceptance | Local implementation/evidence | Live limit |
|---|---|---|
| Calendar window reaches provider | runner→broker→worker propagates validated from/to; every page timeMin/timeMax | Worker not deployed; real Google untested |
| Scope-bound paging | account/window/calendar-bound opaque provider continuation; native opaque cursor also scope-bound | Existing saved old tokens require fresh preview |
| Date-only/timezone semantics | inherited authoritative primary-calendar zone; local midnight resolution, exclusive end; no-zone remains unknown | Real provider/all-day DST cases untested |
| Honest coverage | unknown dates prevent native complete claim; bounded vs uncertain; primary only/manual sync explicit | No multi-calendar or continuous sync claim |
| Interrupted Ask GiGi | request UUID persisted, exact accepted turn receipt clears matching send uncertainty; empty transcript alone never proves failure; mutation outcome fence preserved; explicit new-chat inspection guidance | Original live cause unproven; original task never replayed |
| Music reference audit | metadata mismatch says reference check, moved/offline/inaccessible distinguished; zero-byte recorded size explicit; native unchanged reconnect+restart+preview-read fixture | Migration/content-change cause and cloud placeholders not adjudicated; valid WAV native bytes and Chromium decoding/playback passed; native WebKit playback untested |
| Money preview | retain omitted source details as previous evidence; empty excerpt explains missing retained content; source reference/fetch/coverage visible | Actual legacy statement not verified |
| Money semantics/provenance | explicit Payment/Transfer/Refund retained metadata only, otherwise Unknown; no title/sign/direction guesses or record rewrites | Legacy classifications remain Unknown until source/human evidence |
| Onboarding | connection, import receipt, reviewed useful results and checkpoint separately labeled | Human onboarding untested |
| Upcoming Gigs | saved performance classification separated from other commitments; existing source+typed-link dedup retained; superseded excluded | Real Grant event taxonomy unverified |
| Today | weekly/undated/waiting task context and pinned professional notes; original urgent window remains | Native synthetic evidence, not Grant acceptance |
| Freshness | native fetchedAt vs import finishedAt vs existing last local-read timestamp; unknown timestamps honest | Historical jobs lack new timestamps |
| Gmail lifecycle | DRAFT/SENT from fetched labels; unsupported/scheduled states Unknown; friendly provenance | Actual Gmail account untested |
| Notes dates | typed Notes.Schedule and Schedule.Notes catalog; native create/link/read roundtrip | Real records untouched |

Functional gate: passed locally at source `e06d18fa7a086e572cfa91d0fc52c29e7c1e4cf6`. Independent affected final Sol retest:65 chat tests, receipt browser regression and polish browser checks pass. Prior independent470aa source checks43 web,55 Calendar/worker/adapter,196 Codex,21 source jobs,8 Today,1 unchanged Music reconnect/restart/read pass; four browser scripts pass. Earlier full web437 pass/2 skip, integration349 pass/1 skip, typecheck/build and20 route/24 appearance checks passed. All are synthetic/local; real Google/Gmail and original interruption remain unverified.

Perceptual/product gate: round4 all non-Ask surfaces reached9 across layout/clarity/typography/density from two independent critics. Ask receipt visibility fixed after two critics rejected round4; round5 empty-message copy corrected after fresh review. Round7 two fresh image-only critics independently scored every Ask state at all three widths9/9/9/9, meeting the target; other surfaces remain unchanged from round4 acceptance. Independent final Sol directly viewed round7 and reran both affected browser scripts and passed bounded interaction9 with executed recovery checks. Human still approval pending. Native WebKit and sound output untested.

Release gate: untested. Diagnostic ad-hoc app builds succeeded at470aa/0856, final e06d18fa7 diagnostic build succeeded. Bundled MCP smoke44 tools/6 calls passed; Worker dry-run passed. Diagnostic builds are not signed/notarized release qualification. Isolated native QA copy used unique bundle ID and explicit GIGI_DATA_DIR inside cook/native/profile. It launched and created only that synthetic database, but CUA repeatedly returned `Computer Use server error -10005: cgWindowNotFound`; native window and playback unverified. Owned QA process terminated. No original installed GiGi/user data opened. No push/PR/merge/deploy/Slack or Grant record mutation.

Evidence: cook/stills/r07 (fixed390x840,880x620,1280x840); comparisons cook/compare/r05 (baseline versus candidate) and cook/compare/r07 (round4 versus corrected Ask at all three widths); original baseline cook/stills/r00-expanded. Round5 measured luminance/saturation recorded in cook/evidence/r05-color.json and r07-color.json; not a perceptual acceptance score. New red→green checks: source identity/omission/null retention, preview retry clearing, responsive agenda disclosure, receipt geometry, empty-message recovery copy. Screenshots/logs ignored by Git but preserved locally. Diagnostic source commits remain on isolated branch; no final costly export initiated.

Rollback: revert isolated scoped commits before integration; no provider deployment or live-record rollback needed. Any later release must qualify the exact app and promote the Calendar worker through its own deployment workflow. Do not represent local provider fixtures as live acceptance.

Worktree disposition: preserved at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-0cecb8e9-770e2a3a3a0992e5` / `t3/gigi-recovery-audit`, retained until parent integration.
