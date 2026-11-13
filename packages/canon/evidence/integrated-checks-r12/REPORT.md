# Integrated checks R12

Verification-only window on preserved worktree `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190`, branch `t3/canon-design-system-redesign`, HEAD `5f9bfab3f` (dirty working tree). This checkpoint covers the current uncommitted source, not only HEAD. No source edits, browser activity, install, commit, push, deployment, or Linear closeout were performed.

Acceptance criteria: sequential full Canon test; Canon check/build; Agency check/build; IO check/build; LTD check/build; Space check/build; preserve tracked package source and capture exact exit codes/timestamps. Executed each command through `npx --yes pnpm@9.15.4 --filter @create-something/<package> <action>`. `results.json` records full command strings. Test script includes IO and Agency SvelteKit sync; generated ignored artifacts are expected.

## Results

9 of 11 commands passed. Canon test and check failed; application source was not changed to repair them.

| Command | Start UTC | End UTC | Exit |
| --- | --- | --- | --- |
| canon test | 2026-11-13T19:36:04.642778+00:00 | 2026-11-13T19:36:25.302479+00:00 | 1 |
| canon check | 2026-11-13T19:36:25.302880+00:00 | 2026-11-13T19:37:08.339975+00:00 | 1 |
| canon build | 2026-11-13T19:37:08.340827+00:00 | 2026-11-13T19:37:33.100746+00:00 | 0 |
| agency check | 2026-11-13T19:37:33.101400+00:00 | 2026-11-13T19:38:57.144096+00:00 | 0 |
| agency build | 2026-11-13T19:38:57.144819+00:00 | 2026-11-13T19:39:47.426734+00:00 | 0 |
| io check | 2026-11-13T19:39:47.427169+00:00 | 2026-11-13T19:40:54.926570+00:00 | 0 |
| io build | 2026-11-13T19:40:54.926989+00:00 | 2026-11-13T19:41:45.242660+00:00 | 0 |
| ltd check | 2026-11-13T19:41:45.243039+00:00 | 2026-11-13T19:41:59.366219+00:00 | 0 |
| ltd build | 2026-11-13T19:41:59.366607+00:00 | 2026-11-13T19:42:25.116940+00:00 | 0 |
| space check | 2026-11-13T19:42:25.117355+00:00 | 2026-11-13T19:42:36.881490+00:00 | 0 |
| space build | 2026-11-13T19:42:36.882049+00:00 | 2026-11-13T19:43:05.658439+00:00 | 0 |

Canon full test: 96 test files passed, 2 failed; 815 tests passed, 2 failed (817 total).

- `src/lib/tokens/performance-contract.test.ts`: legacy tokens detected in `packages/canon/src/routes/next/timeline/+page.svelte`: `--color-bg-pure`, `--color-fg-primary`, `--color-focus`.
- `src/lib/stable-component-depth/stable-component-depth.test.ts`: `builds a per-stable-component evidence report for every required depth dimension` exceeded the 5000 ms test timeout (reported test elapsed 6115 ms). This run establishes a timeout failure, not whether an isolated retry would pass. No retry was performed during this window.

Canon check: Svelte check found 3 errors and 0 warnings in `src/routes/next/filters/+page.svelte:6`. The declaration `let state=$state<FilterState>({})` produces two `$state` used-before-declaration errors and an untyped-call type-argument error. A local variable named `state` conflicts with Svelte's `$state` rune/store interpretation. The check stopped there; later chained overlay/codification/library/depth checks did not run.

Agency, IO, LTD, and Space checks each reported 0 Svelte errors and 0 warnings. All five package builds exited 0. Space build retained the known Cloudflare `_routes.json` limitation warning: 94 exclude rules dropped, causing unnecessary function invocations. Build logs also include chunk-size guidance; successful exit does not erase warnings.

## Scope preservation

`before.diff` / `after.diff` capture the tracked HEAD diff, and `before.status` / `after.status` capture working-tree status. `before.hashes.json` / `after.hashes.json` hash every existing tracked package file. Comparing those package hashes found **zero changed tracked package files** during the verification window. The parent was permitted to edit root Cook/docs artifacts; whole-repository diffs should be interpreted accordingly.

The exclusive command window was released with `COMMANDS_DONE` before this report was written.

## Quality gates

- Functional correctness: **failed**. Full Canon test and Canon check have the concrete failures above. Other requested checks/builds passed. Evidence is local tests, static checks, and builds; no live-runtime acceptance was performed.
- Perceptual/product quality: **untested in this window**. No actual browser or listening review was allowed; build results do not establish visual quality. Independent browser evidence belongs to the parent’s separate review.
- Release readiness: **failed** for promotion at this checkpoint because Canon validation is failing. All requested build artifacts were produced locally, but shipping was not authorized and no deployed surface was tested.

Worktree disposition: preserved at the stated worktree and branch. Remaining work: source owner resolves Canon timeline legacy tokens and filters fixture naming, evaluates the report-test timeout, then reruns affected validation and integrates independent product review before any authorized promotion.
