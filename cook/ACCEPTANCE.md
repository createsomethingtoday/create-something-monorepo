# GiGi recovery audit implementation checkpoint

Baseline: origin/main `3be4a7bb1ee2427320fb6156174c4ca16a939788` (app0.3.7). Isolated branch `t3/gigi-recovery-audit`, CRE-2474. Root user checkout never edited. Database/Automation/Judgment scope recorded in BRIEF.

| Acceptance | Local implementation/evidence | Live limit |
|---|---|---|
| Calendar window reaches provider | runner→broker→worker propagates validated from/to; every page timeMin/timeMax | Worker not deployed; real Google untested |
| Scope-bound paging | account/window/calendar-bound opaque provider continuation; native opaque cursor also scope-bound | Existing saved old tokens require fresh preview |
| Date-only/timezone semantics | inherited authoritative primary-calendar zone; local midnight resolution, exclusive end; no-zone remains unknown | Real provider/all-day DST cases untested |
| Honest coverage | unknown dates prevent native complete claim; bounded vs uncertain; primary only/manual sync explicit | No multi-calendar or continuous sync claim |
| Interrupted Ask GiGi | request UUID persisted, exact accepted turn receipt clears matching send uncertainty; empty transcript alone never proves failure; mutation outcome fence preserved; explicit new-chat inspection guidance | Original live cause unproven; original task never replayed |
| Music reference audit | metadata mismatch says reference check, moved/offline/inaccessible distinguished; zero-byte recorded size explicit; native unchanged reconnect+restart+preview-read fixture | Migration/content-change cause and cloud placeholders not adjudicated; decoded playback untested |
| Money preview | retain omitted source details as previous evidence; empty excerpt explains missing retained content; source reference/fetch/coverage visible | Actual legacy statement not verified |
| Money semantics/provenance | explicit Payment/Transfer/Refund retained metadata only, otherwise Unknown; no title/sign/direction guesses or record rewrites | Legacy classifications remain Unknown until source/human evidence |
| Onboarding | connection, import receipt, reviewed useful results and checkpoint separately labeled | Human onboarding untested |
| Upcoming Gigs | saved performance classification separated from other commitments; existing source+typed-link dedup retained; superseded excluded | Real Grant event taxonomy unverified |
| Today | weekly/undated/waiting task context and pinned professional notes; original urgent window remains | Native synthetic evidence, not Grant acceptance |
| Freshness | native fetchedAt vs import finishedAt vs existing last local-read timestamp; unknown timestamps honest | Historical jobs lack new timestamps |
| Gmail lifecycle | DRAFT/SENT from fetched labels; unsupported/scheduled states Unknown; friendly provenance | Actual Gmail account untested |
| Notes dates | typed Notes.Schedule and Schedule.Notes catalog; native create/link/read roundtrip | Real records untouched |

Functional gate: passed for local checked source and synthetic tests (web406, integrations349+1 skipped, native source jobs21, Today8, music reference1; typecheck/build/browser navigation regression). Native media playback and live provider gate remain untested.

Perceptual/product gate: actual primary React images directly viewed desktop390/1280; no horizontal document overflow in eight route/viewport captures. Fresh critic9/10 EACH and native WebKit/accessibility acceptance pending parent. Do not present fixture count or build as visual approval.

Release gate: untested. No merge/deploy/Slack/PR. No signed companion or packaged installer built; empty ignored resources directory is test-only. Parent retains final integration, independent Sol re-test, critics, promotion and human acceptance. No final costly export initiated.

Capture command: `node cook/capture.mjs apps/gigi-desktop cook/stills/r01`. Archived original UI snapshot renders through identical fixture-only inputs at `cook/stills/r00`. Stills/comparisons/logs ignored in Git but preserved locally. Side-by-side script from installed Cook used; references documented in SHOTS. See `cook/evidence/desktop-implementation.md` for desktop native/test commands.

Worktree disposition: preserved at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-0cecb8e9-770e2a3a3a0992e5` / `t3/gigi-recovery-audit`, retained until parent integration.
