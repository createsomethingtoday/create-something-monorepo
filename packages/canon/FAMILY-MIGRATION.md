# Canon shared-family implementation round

This phase updates existing canonical components and adds `/next/components`, a local interactive review surface built from real Button/Card, all eight form controls, all six feedback components and all seven navigation controls. No parent vNext files, art, Navigation.svelte or property packages are edited in this phase. Public callbacks, snippets, native links, types and bindable state remain supported; additions are Button `loading` and Popover `label`.

## Changes by family

- Button: native links and disabled destinations retained; loading renders a disabled busy button so it cannot navigate or invoke actions. Own family/font/size/fullWidth styles work without consumer utility CSS.
- Card: existing link/action/container variants retained. Public padding sizes now have owned inline padding rather than depending on Tailwind utility classes. Solid canonical materials and radii continue through existing tokens.
- TextField/TextArea/Select: normal solid panel and visible outline; 44px compact input/select targets; clear focus outline even in error states; error/help arbitration references only rendered IDs. `$props.id()` replaces random fallback IDs for SSR/hydration and instance isolation.
- Checkbox/Radio: 44px native input targets with compact visible artwork; normal identifying outlines use emphasis contrast. RadioGroup now supplies controlled value/name/disabled/size to child Radio through an internal context, while explicitly supplied child props retain priority. Group/choice IDs use Svelte instance IDs.
- Switch: compact visual track inside an actual 44px button; accessible switch state, labels, callbacks and keyboard handling retained. Size variants preserve compact thumb artwork.
- Alert/Toast: textual/icon semantic states and 44px dismiss targets; Toast solid panel and responsive width. Timer now excludes paused time and also pauses for keyboard focus. Alert dismissal callback remains once-only.
- Progress: finite safe accessible range when max is zero/invalid and finite clamped values. Spinner/Skeleton keep their existing native status/decorative contracts and reduced-motion behavior; no unnecessary API changes.
- Breadcrumbs/Pagination/Tabs: 44px usable targets and responsive wrapping. Tabs use per-instance IDs, start at the first enabled tab, skip disabled choices and preserve callbacks/selection. Pagination keeps page/ellipsis callbacks and current-page semantics.
- Dialog/Drawer: solid owning-palette panels and 44px close targets, original local DOM placement and focusTrap action preserved. Dialog/Drawer were not portalled before this phase; no new portal relocation is introduced. Drawer restores the prior body overflow policy on close.
- Popover/Dropdown/Tooltip: solid panels, keyboard/focus relationships and descriptive IDs. Popover gains a default accessible name with optional `label`; original snippet API and outside/Escape policies remain. Dropdown restores its own trigger on keyboard dismissal or selection, skips disabled items and protects zero-enabled-item navigation. Tooltip announces its content through the focused trigger's `aria-describedby`, preserves other IDs, supports Escape and clears delayed work on destruction.
- Reduced motion: control family transitions are disabled at their source when requested; existing overlay animation fallbacks remain.

## Meaningful regression evidence

Before logs preserve actual failing assertions, not missing-module errors: text-entry controls referenced missing help IDs during errors; duplicate tab IDs collided across instances; menu Escape lost trigger focus; initial disabled tab was selected; loading links activated; max-zero progress produced NaN; tooltip had no description relationship/Escape dismissal; toast counted paused time; drawer discarded an existing overflow style; RadioGroup did not initialize/control child selection. Corresponding tests now pass. New checks also protect modal dismissal policies and focus restoration, native link/disabled semantics and existing data primitives.

## Review surface

`/next/components` offers a small local handoff form with genuine validation, project selection, grouped choices, switch, local save feedback, compact/readonly/disabled fields, semantic feedback and loading, repeated independent tab sets, pagination, menu/disclosures, dialog/drawer, and an inverse palette example. All operations are explicitly local. The route labels and content are human-facing rather than internal test terminology. With JavaScript off, controls and examples remain readable with a clear explanation; interactive local behavior requires JavaScript.

## Remaining boundaries

Shared Navigation/Footer/search and property-local overrides are not migrated by this phase. Navigation still has uppercase/mono labels and literal gradient/chrome bypasses previously recorded. Root dirty Navigation work remains parent-owned. Data primitives are regression-tested but no visual redesign was attempted here. Specialized Performance/Clear compositions, all consumer routes and standalone email/document literal palettes remain subsequent work. Source changes are not deployment evidence.

Popover retains its historical wrapper trigger contract; callers should supply noninteractive trigger content, as this review route does. Passing a native button inside that wrapper remains a composition caveat for the later API/depth pass. No global focusTrap utility or cross-overlay stack manager changed; concurrently stacked modals still need dedicated qualification.

Parent independent actual-output retest and final aesthetic/character acceptance remain. This phase does not satisfy the eight-hour Cook floor or authorize publication.

## Measured results and handoff

Focused family/native-button/data suite: **43 passed** in 3 files. Canon `check` and `build` pass packaging/publint; Svelte has 0 errors/0 warnings. Full suite: **757 passed, 10 failed** in 5 files. Eight failures match earlier registry/Agency rollout/consumer-token failures. **Two are additional foundation migration conflicts**, not baseline: `licensed-editorial-rollout.test.ts` requires old `#181312` editorial values, and `performance-composition-system.test.ts` requires old `--leading-performance-display: 0.94`. Parent must reconcile those policy assertions with the authorized new direction; they are not changed silently in this family phase.

Actual Ego space 8 exercised local form validation/project/radio/switch/save, independent tab sets, pagination, loading/disabled states, dialog Tab/Shift+Tab wrapping, Escape and focus return, drawer focus/scroll restoration, menu disabled-item skipping and selection, popover dismissal and tooltip description/Escape. A form-validation focus finding was reproduced (focus stayed on submit); the route now hands focus to its scoped invalid field. Static SSR and no-JS content remain readable with explicit local-example boundaries.

DOM measurements at 320/390/768/1024/1025/1440 found no horizontal overflow and no enabled button/input/select/Breadcrumb target below 44px. Actual normal control identification measurements: light outlines 3.20–3.40:1; dark 4.82–5.27:1. Selected Pagination shape 13.41/13.59:1, inactive page text 5.33/8.48:1. Focus role 5.33/9.38:1. Error field actual outline read back as 3px canonical focus color. Settled states were measured after two animation frames; initial immediate reads during theme transitions were rejected and replaced. Six-width evidence describes this representative route, not every conceivable consumer composition.

Images in `evidence/families` include viewport/full-page light/dark, saved form, validation focus, dialog, mobile dialog, popover and no-JS states. Early partially faded overlay captures were rejected; final overlay captures wait for opacity 1. Mobile inspection led to less cramped Dialog/Drawer internal spacing and stacked Dialog actions. Parent actual-output critique remains separate.

Boundaries needing next ownership: shared Navigation's literal gradient/dark chrome/uppercase labels; Footer/search; Performance/Clear compositions; consumer-local operator/editorial overrides and standalone documents. Foundation/TS comments still contain historical near-black or pure-black contrast descriptions; parent requested a documentation cleanup after this family phase. Consumer imports may still supply stronger style overrides than these components; no property migration or release claim is made.

Gates: **functional passed for this scoped family round**, with the exact full-suite failures above; **perceptual passed for bounded builder inspection**, independent final aesthetic acceptance pending; **release readiness failed/pending** on migration conflicts, remaining families/consumers, independent retest and promotion authorization. No commit/push/PR/deploy. Worktree preserved on `t3/canon-design-system-redesign`, HEAD `5f9bfab3f6a9069332d650f42a09f5bd18d806a7`, at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190`. Parent vNext/art/property work is preserved. Eight-hour Cook goal remains active.

The standalone route owns a zero body margin so its nested dark surface reaches the viewport edge without requiring Tailwind preflight. Common component padding/width/fonts are still owned by the actual Button/Card source. Canon full-base body margin/reset remains a foundation-consumer audit item; this phase does not change unrelated global styles.
