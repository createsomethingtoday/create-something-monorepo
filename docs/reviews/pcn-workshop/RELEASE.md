# PCN workshop — educational MVP release

Placement: `packages/lms`, `/workshop`, existing `createsomething-lms` Cloudflare Pages project. Database / Automation / Judgment are represented by local request/receipt state, a pure reducer, and exact approval/validation policy. No server state, new provider grants, real secret collection, or account creation.

## Implemented scope

Three request missions: gather missing fields; reject invalid/unauthorized input; reconcile an unknown timeout across reload without another controlled record. Foundational dummy vault practice requires allowed scope, denied scope, rotation, previous-generation denial, and revocation denial. Graduation requires request/security observations and distinguishes simulation completion from manual setup self-report. Provider verification is unavailable.

Original approved Canon sprite is a billboard in a minimal neutral isometric Three.js cutaway workshop. The six stations have distinct functional geometry, an etched workflow route, numbered labels, and a desktop side-by-side room/task layout. Visible station labels and large semantic station controls share the same reducer. Reduced motion makes travel immediate. List-only mode removes the renderer. The renderer caps pixel ratio at 1.5 and motion rendering at 30 fps, stops rendering when settled/paused or hidden, and disposes resources on teardown. No polished 3D character redesign is included.

The seven-file static starter ZIP includes the workflow contract, tests, decision template, README, educational health worker, package manifest, and Wrangler config. No browser progress, real keys, provider credentials, or private monorepo content are exported. Its deployed worker only emits an educational health response; real service operations require a server-owned authorization and durable receipt design.

## Validation receipts

- Independent design/accessibility and state/security source reviews identified and informed fixes to graduation bypass, discarded history, stale denial feedback, autotravel pause, and rotation prerequisites. Final source reviews found no remaining release blockers; state reviewer independently passed all 8 workshop groups.
- `pnpm --filter @create-something/lms check`: 12 foundation tests + 8 workshop test groups pass; Svelte diagnostics: zero errors and warnings.
- `pnpm --filter @create-something/lms build`: successful Cloudflare adapter build.
- `pnpm --filter @create-something/lms exec tsx --test starter/pcn-workshop/workflow.test.ts`: 7 exported contract test groups pass.
- Local browser journey: missing fields → exact approved proposal → one receipt after repeated submission; mission 2 unauthorized/invalid rejection → repair; mission 3 unknown → repeated submission → reload → receipt reconciliation; dummy vault allowed/denied/rotate/old-denied/revoke-denied → truthful handoff.
- Phone-sized 390×844 viewport: fresh list-only path completed all three missions and the vault lesson, including keyboard-button cancellation/reapproval, repeat-submit, reload/reconciliation, and truthful graduation; document width equals viewport width (390px). This is emulation, not physical phone acceptance.
- Workshop analytics component is omitted; no new telemetry is introduced.

## Release boundary and limitations

Normal PR/CI/review/merge precedes the existing manual `Property Pages Deploy` workflow with `property=lms`. The workflow records exact source commit and prior deployment identities for rollback. It builds the existing auth-platform dependency before Canon, required for clean checkout runtime resolution. No global security settings or hooks are bypassed.

No claims of a connected full stack, physical iPhone acceptance, screen-reader device acceptance, production provider execution, universal exactly-once delivery, multiplayer, or a validated 15–20 minute completion time. Local browser storage and Web Locks bound simulation concurrency; clearing site data loses local progress. Account-backed deployment remains provider-owned, explicitly manual and unverified. The small station prototype needs pilot usability research before claiming onboarding efficacy; outreach is outside this release.

Rollback: use the prior production Pages deployment identity captured in the release workflow, through the existing Cloudflare Pages rollback path. This release adds no database schema or secret changes. Reverting the PR and deploying that reviewed revert is the repository-level alternative.

Worktree disposition: retained at `/Users/micahjohnson/Documents/Codex/2026-10-05/task/pcn-workshop`, branch `codex/pcn-workshop-game`, until verified production closeout. Unrelated dirty checkout and worktrees preserved. Linear auth stalled; local receipts are used per coordinator instruction.

Disk checkpoint before final release: host available space dropped to 3.4GiB during concurrent work. Local builds/installs paused; no unrelated cleanup performed. Existing checks/build and current isometric source checks passed. Remote CI remains the production gate.
