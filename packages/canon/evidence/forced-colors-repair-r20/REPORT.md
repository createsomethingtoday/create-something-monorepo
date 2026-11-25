# Forced-colors repair R20

Local implementation ready for independent review. Source scope: only
`src/lib/components/form/{Checkbox,Radio,Switch}.svelte`. No fixtures changed.
No package/check/build/sync, Git, external writes, deployment or publication.
Parent owns package validation and final fresh Sol review.

## Acceptance and implementation

In forced-colors mode, retain visible unchecked/checked/indeterminate checkbox,
selected radio, switch positions, keyboard focus and disabled states using the
user's system palette. Preserve normal appearance, 44px targets, semantics,
keyboard behavior and callback contracts.

The repair uses only a scoped `@media (forced-colors: active)` override with
Canvas, CanvasText, ButtonText, GrayText and Highlight. Checkbox marks use
CanvasText on Canvas. Radio dots use solid system-color borders because forced
background replacement erased their fills. Switch thumbs use system-color
borders while retaining left/right positions. Disabled boundaries use GrayText
at full opacity. No `forced-color-adjust` opt-out and no fixed black/white colors.
The component scripts and markup/event paths are unchanged.

## Regression and route evidence

The before-source-edit `before-dark-390.json` records forced-colors=true and
dark=true, with checkbox stroke black on black, radio fill black on black and
switch fill black on black. `before-dark-390.png` was directly inspected and
confirms the missing indicators. Existing audit R20 separately covers all four
light/dark 390/1440 before states.

`regression.mjs` checks actual computed foreground/background and border paint,
geometry and overflow in the running app. `regression-current.json` and
`regression-after.log`: four combinations passed, light/dark × 390/1440. Repaired
indicator pairs resolve to 21:1 in Chromium's emulated palette. All four
`forced-{theme}-{width}.png` screenshots were directly viewed; marks are visible.
Additional light checkbox/radio and dark switch focus screenshots were viewed.

Actual route `http://localhost:5191/next/components`:
- Checkbox click and Space toggle; disabled checkbox pointer leaves state alone.
- Radio click and ArrowLeft change native group selection.
- Switch click, Space and Enter toggle once per action.
- `interactions.json` records all observed states.
- `baseline-normal.json` versus `normal-current.json`: exact geometry agreement
  at 320/390/768/1024/1025/1440 in both owning palettes; 44px targets and no
  horizontal overflow.
- All 12 post-fix normal screenshots were directly viewed: familiar normal
  appearance/readability retained. Before baselines are retained alongside.
- Settled normal contrast pairs in `normal-color-pairs.json`: label/check/radio
  18.76:1 dark and 13.41:1 light; off-switch thumb/track 7.49:1 dark and 4.95:1
  light. These are representative component pairs, not a whole-page WCAG audit.

Each browser invocation reapplied viewport and media emulation; capture scripts
wait for actual media/theme conditions, finite transitions and two animation
frames. An initial stale-document wait timed out; reload picked up source edits.
The 5191 runtime reflected source without a package build.

## Diagnostic mount evidence

The existing route lacks indeterminate checkboxes and disabled selected
radio/switch states. `diagnostic-states.mjs` mounts the actual Vite-served Svelte
component modules into an ephemeral panel in this agent's tab. This is separate
from route/consumer evidence and does not modify source fixtures.

`diagnostic-dark.png` and `diagnostic-light.png` were directly viewed: mixed,
disabled checked/mixed, disabled selected radio, small/large selected radio and
disabled on/off switches have visible system-palette indicators. Disabled marks
resolve to Chromium's GrayText mapping (green in dark, maroon in light).
`diagnostic-states.json` confirms actual indeterminate property + rendered line
and callback sequence checkbox=true, switch=true/false/true, once per action in
both palettes. Native group behavior is covered by the actual route instead.

## Gates and limits

- Functional correctness: passed for the bounded local Chromium behavior and
  computed/paint checks above. Package tests/check/build remain parent-owned.
- Perceptual/product quality: passed for directly viewed local normal/forced
  outputs and diagnostic states. No external user acceptance is implied.
- Release readiness: untested; no shipping destination is authorized by this
  subtask, and final independent review/package validation are pending.

This is Chromium forced-colors emulation, not Windows OS high-contrast or screen
reader qualification. The reusable scripts refer to the original space49;
reviewers should substitute their own existing space rather than reopening or
creating a recovery space. Space49 was closed after validation, preserving other
agents' spaces. Ego Lite reported an available update; no upgrade was performed.

Rollback: remove the three newly added forced-colors media blocks. All source
work remains local in the parent-preserved worktree.
