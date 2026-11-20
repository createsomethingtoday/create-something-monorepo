# Independent control chrome R14 retest

Reviewer: fresh Sol 6.1 independent pass. Source: authorized dirty worktree at HEAD `5f9bfab3f6a9069332d650f42a09f5bd18d806a7`. No application source edits or external actions. Ego space 42 was created independently and closed; parent/user spaces untouched.

## Functional correctness — passed within bounded scope

- Pinned `npx --yes pnpm@9.15.4 exec vitest run TimelineEditor.test.ts filter-flow-r10.test.ts`: 2 files / 6 tests pass. Includes meaningful embedded-form zoom regression. This is offline DOM evidence, not production runtime.
- `npx --yes pnpm@9.15.4 test`: 98 files / 818 tests pass.
- `npx --yes pnpm@9.15.4 check`: exit 0; includes package generation/publint, Svelte diagnostics and repository Canon gates. Build/package validation therefore ran inside check; no redundant separate build.
- Actual local Ego runtime: pointer checkbox and Space on second checkbox plus minimum price 700 produced 3 callbacks and material/price state; collapse removed controls; expand restored them. Clear activated by keyboard produced callback 2 and `{}` in a fresh session. Pointer clear automation had a viewport-action timeout; keyboard activation independently succeeded.
- Keyboard focus on checkbox showed a 2px solid focus outline. Timeline ArrowRight advanced frame 12 to 13 and callback reported 13; zoom changed outer editor from 100% to 125% while nested remained 100%.
- Both canvas buffers were populated. Initial light/dark pixels were white/17; after reversing palettes and explicitly waiting for the canvas repaint they converged to 17/white.
- JavaScript-disabled reload retained explicit fallback explanation, named Materials choices and Capture notes integration step.

## Perceptual/product quality — passed within bounded scope

Viewed actual captured phone filter and desktop timeline images directly. Solid panel chrome, restrained grayscale hierarchy, readable labels and distinct nested palettes remain coherent; no native outset appearance observed. Matrix covers 320, 390, 768, 1024, 1025, 1440 for both fixture palettes and both routes: 24 rows, no document overflow, all measured owner buttons Geist, solid border and at least 44px square. Two animation frames awaited after each resize. Screenshots at 390 and 1440 for both palettes are retained; filter screenshots retain scroll position and are viewport captures, not whole-page proof. `matrix.json` contains measurements.

Explicit light-palette convergence returned background rgb(247,248,246), link and owner foreground both rgb(41,43,40); no purple browser link. The first convergence predicate used a mistaken expected blue channel (245), timed out, was corrected to observed canonical 246, and passed. Palette canvas repaint is asynchronous and was awaited separately.

## Release readiness — untested for promotion

Local Canon check/package and scoped fixture verification passed. No merge, push, deploy, external mutation or production acceptance was requested or performed. Four consumer builds were not repeated, per parent scope. This report does not establish broader redesign acceptance or release permission.

Ego reported an available update; no upgrade performed.
