# CRE-2493 Cook ledger

Started: 2026-11-17 21:14 UTC. Initial pass hard cap90min; no floor.
Bar: layout, contrast/color, typography/components, information clarity, interaction/accessibility each9/10. Critic judgments, not measured similarity. Calibration:none. Usage:not readable.
Gate: user still approval pending. No costly export requested.

## Decisions
- Preserve unrelated tracked GiGi Cook state. This task lives in cook/cre-2493/; original cook files restored from HEAD after identifying their ownership. No unrelated work removed.
- Persist recovery and run it through the existing Healthcare Worker scheduled handler calling an authenticated Agency endpoint with existing service credential. No new credentials or provider dispatch paths.
- Use4explicit provider rows; keep returned evidence, result blockers and billing distinct. No external reference media committed.

## User feedback
- "Clay/PDL/Exa/Skip Trace should all be used on enrichment approval: complete fix: use $cook" Open until functional and rendered verification.
- Latest: "Use three providers; mark Clay unavailable". New approved requests must use PDL, Exa and Skip Trace; preserve original Clay receipts.

## Round1 in progress
- Existing MCP baseline89/89passed, includes independent4provider attempts even after PDLfailure and unknown prices.
- Scheduler regression failed with missing trigger implementation then3/3passed after bounded authenticated fixed-destination POST, no redirect/retry, no sensitive response logging. Logs /tmp/cre-2493-trigger-{red,green}.log.
- UI first direct1440x900 inspection found summary above latest-scroll viewport and oversized repetitive evidence actions. Returned to UI builder for fix; not accepted, no critic score claimed.
- Backend integration review found due-time override affecting nondue jobs and insufficient runtime tests; repair and regression requested.
- Color/interaction scores not yet measured; fresh critics not yet run.

## Round 1 close / Round 2
- Round1 critics: desktop medians layout7.25/color6.5/type7.5/info6.5/visibleinteraction6.75; mobile6.75/8.25/8/7.5/7.25. Capture harness ran before hydration/transition settled, producing falsely faded desktop and clipped billing. Fixed harness to wait for mounted surface and settle800ms; no altered colors to compensate for a capture defect.
- Round2: compact enrichment header, explicit outcome labels, stronger buttons, distinct billing, safe readable evidence. Static independent Sol6.1 acceptance passedS01-S04 desktop/mobile; this is separate from strict Cook bar.
- Round2 two fresh critics: S01desktop medians8.65/9.1/9/9/8.9; S01mobile7.75/9.1/9/8.1/8.4. S02desktop8.8/9.1/9/9.1/8.75; S02mobile9/9.1/9/9.1/8.75. S03desktop8.8/9.1/9/7.85/8.6; S03mobile9/9.1/9/7.85/8.6. S04desktop8.7/9.1/8.7/9/9; S04mobile8.5/9.1/8.9/8.3/8.65. All numbers critic judgments; no calibration offset. Bar not met.
- Next repairs: explicit operational completion separate from contact verification; clean pending result anchor, scope before financial details on approval, stronger identity-review action; evidence opening must bring readable details into view and closing restore focus.
- Parent keyboard: Enter opens PDL evidence, aria-expanded true,2px visibleoutline, human-readable contact/profile/source projection. Focus/scroll refinement requested because detail was below4rows. Responsive actual widths320,390,768,1025,1440 showed no horizontaloverflow,4rows,44px buttons.1024 resize returned stale768 and must be rechecked; not claimed passed. No new animation and runtime0 activeanimations; OSreducedmotion preference false, emulation untested.
- Backend independent findings fixed red-to-green: Clay cache_hit accounting and stale uncertain_dispatch after exact receipt resolution. Backend85/85, affected independent27/27, MCP92/92 and Worker typecheck pass; full Agency build passes. Ground advisory partial:3analyzable files0findings; Agency duplicateanalysisincomplete,22exclusions. Not a clean full-source Ground result.
- Live Clay audit:4jobs with0callbackresults; original setup release said sandbox/unrun. Current vendor config unverified. T3 and Ego sessions show login; Ego taskspace31 handed to user, sign-in requested asynchronously. No new paid calls. This is an access dependency, not proof that auto-run is currently disabled.

## Round 3 and resumed scope correction
- Two independent fresh-context critics inspected eight r03 stills. Desktop result/approval states generally reached 9, but pending desktop layout was 8.5. Mobile layout medians were 7.65 for result states and 8 for approval; billing was cut at the composer boundary. Strict 9-per-dimension bar failed. Independent Sol functional acceptance passed 29 focused checks; that is not visual bar acceptance.
- User completed sign-in. Live Clay account showed Free, and the HTTP/webhook automation required by this integration appeared in Growth. Existing research and callback cells were unrun; callback body was empty. No plan or workbook settings were changed, and no paid operation ran.
- User chose three active providers with Clay unavailable. Resumed at approximately 23:52 UTC; current clock 23:57 UTC. Initial 90-minute cap elapsed across the authentication gap; no claim of continuous work or time-floor completion.
- Round 4 focus: explicit provider availability, preserved legacy receipts, three-provider exact scope, compact mobile composer and fully readable billing. Regression checks, two fresh critics and independent final retest remain required. Human still acceptance remains pending; no long costly export is requested.

## Rounds 4–6: final three-provider scope
- Round4 critics and independent Sol found two concrete issues: pending mobile billing still clipped; approval rendered provider identifiers under “Provider maximums.” Corrected formatting and reduced idle composer to120px.
- Latest operator direction: “Let's completely remove Clay” and “And make sure PDL, Exa, Skip Trace are working.” Removed Clay from active tools, readiness, dispatch, result rows and recovery; historical audit receipts remain intact. Former HTTP endpoints authenticate then return410.
- Round5: two fresh critics passed all result stills. Approval medians remained below9 (mobile layout8.9/clarity8.85) due repeated scope and fragmented cost context. No pass claimed.
- Round6: reduced approval repetition; original metadata stays in a disclosure; decision controls explicitly separate unknown price from prior receipts. Eight fixed stills inspected by two fresh critics. All per-dimension medians are at least9; minimum9.0. These are subjective visual scores, not measured accessibility ratios. S01–S03 are unchanged from r05; S04 newly captured with provenance. User still acceptance remains pending; no costly export requested or run.
- Independent final Sol re-test:128Agency checks and91MCP checks passed. Directly viewed all8r06stills; prior product findings resolved. No production claim from those fixtures.
- Parent live existing-receipt verification: PDL matched a professional profile; Exa returned sourced unverified email/phone candidates; Skip Trace exact existing run retained identity review while billing reconciled atUSD0.007. No new run or paid dispatch. Current readiness reports all3available but is not evidence of future vendor success.
- Parent fullAgencybuild passes; fullSveltecheck0errors0warnings; Worker typecheck and deploydryrun pass. Ground final advisory partial:8analyzable/45changed,0findings,37exclusions; duplicateanalysisfailed. Not fullsource clean evidence.
- Parent complete browser regression:44/44passed against final exact bundle, including responsive states, provider evidence keyboard focus/restore, reload persistence, approval rejection, reduced motion and no-JavaScript fallback. Test harness was repaired to consume its one-time fixture-reset parameter before reload, wait for the mounted app when a restored review has no composer, and use current estimate/spend semantics. Astryx source/build doctor:0failures,2warnings (existing style/purity inventory); no blanket purity claim.

## PR review corrections
- Confirmed both P2 findings on PR2338: the summary missed PDL's actual personal-contact fields, and two cron selections could reuse stale recovery state while a pending human review retained its version.
- Regression first: four expected failures (PDL shape/count checks plus two deterministic stale-review races). Fixes count unique nonempty PDL personal/recommended/work emails and phone/mobile values, and compare the selected state JSON when acquiring the recovery lease. The races cover pending backoff and terminal receipt completion; approval version and pending action remain unchanged.
- Independent Sol6.1 re-test:34/34 focused checks passed, with additional malformed/duplicate contact and unchanged Exa/Skip assertions. Parent full NPG suite:129 analyst checks plus10 spend/retired-provider checks passed. These are local synthetic/Miniflare evidence, not new paid lookups.
- Rebuilt client `main-PxY9OjLO.js`: direct mobile390 and desktop1440 inspection showed the correct PDL count and readable three-provider rows. Targeted browser evidence-open/keyboard/focus-return regression passed. NPG typecheck and full Svelte check passed; Astryx doctor0failures,2existing warnings. This correction changes counts, not layout; no new visual score or human still acceptance is claimed.
- Release remains pending the updated PR checks/review and authorized production promotion. Worktree retained for that checkpoint; no new provider dispatch or production data changes in this correction.
