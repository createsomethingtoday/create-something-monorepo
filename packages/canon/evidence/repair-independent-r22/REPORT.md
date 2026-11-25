# Independent R22 repair re-test

Changes required. Fresh independent review confirmed an out-of-range keyframe-add callback at 80% zoom. Review stopped on this concrete failure as instructed; remaining browser acceptance was not performed.

Exact intentionally dirty worktree: `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190`, branch `t3/canon-design-system-redesign`, HEAD `5f9bfab3f6a9069332d650f42a09f5bd18d806a7`. No app source edits, Git changes, external writes, server restarts or publication.

## Confirmed failure

A browser-only diagnostic mounted the actual Vite-served `TimelineEditor.svelte` using Svelte `mount` in this reviewer's own tab. Props: one position track, existing keyframe at30, totalFrames60, currentFrame60. At390px viewport the diagnostic owner/canvas measured300px. A real click on Zoom out set80%; a real double-click 4px inside the canvas's right edge and within its track emitted `onKeyframeAdd('t',73)`. Frame73 exceeds declared totalFrames60. The callback was captured directly in `keyframes.json`; this is not a source-derived hypothesis. `keyframes.mjs` reproduces it in the reviewer's existing space. `keyframes.png` was directly viewed: the end playhead60 is visibly left of the clicked blank area at80%.

The diagnostic is clearly separate from the owning-palette route fixture and has no source fixture changes. Its temporary overlay composition is not an aesthetic baseline. The failure concerns actual public component behavior. The current click-add path calls `xToFrame(x)` without bounding it; the new canvas geometry leaves blank trailing track surface at zoom below100%. Ruler and drag paths do bound frames. Repair should make add semantics coherent at/after the declared end and preserve scrolled hit/move/delete behavior; verify with an actual callback regression.

## Commands and source integrity

All six requested sequential commands passed through pinned `npx --yes pnpm@9.15.4`: focused TimelineEditor/family-accessibility/performance contract tests (4files,27tests); full Canon test (98files,818tests); full Canon check with chained gates; Canon build; LTD check; LTD build. Full command arguments, UTC start/end and exits are in `results.json`, with separate logs. No warnings suppressed or checks weakened.

`source-before.json` and `source-after-commands.json` match over1,981 scoped files, SHA256 `06884994b931c0c540e2f2195b570b09ac31957e0745e195cda06d30783703a3`. HEAD alone does not identify this intentionally dirty artifact. Source-after-browser is recorded separately. Agency/IO/Space check/build were not repeated because the exact R19 integrated checkpoint already passed them and no new consumer source risk was identified before this stop.

## Quality gates and remaining scope

- Functional correctness: **failed**. All requested offline tests/checks/builds passed, but actual local component callback emits73 for totalFrames60 at80%. No production runtime claim.
- Perceptual/product quality: **untested for final repair acceptance**. The failure diagnostic screenshot was directly viewed; it establishes visible trailing canvas beyond end60. Required fresh forced-colors390/1440 light/dark states, ordinary320/390/1440 comparison/44px targets, four LTD guide wrapping and docs keyboard navigation, and full timeline normal/stress palette/pointer/keyboard/mutation matrix remain untested by this reviewer because review stopped at the concrete functional failure. Builder reports are not substituted for independent acceptance.
- Release readiness: **failed / unapproved**. Local package artifacts build, but a confirmed functional finding remains and independent browser acceptance is incomplete. No shipping destination authorized by this subtask.

Limits: Chromium local dev runtime with browser-only diagnostic mount. No Windows forced-colors OS proof, native browser zoom, screen-reader or full WCAG claim. Ego Lite advertised an available update; no upgrade attempted. Protected user spaces0–3 and parent12 were not touched. Own space52 closed after reporting. Parent owns further integration/repair and fresh bounded re-review.

Worktree disposition: preserved at the exact worktree/branch above. SOURCE and BROWSER ownership released after final snapshot and space closure.
