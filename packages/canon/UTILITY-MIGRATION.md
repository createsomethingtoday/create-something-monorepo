# Canon utility and account adoption

These changes are local to the redesign worktree. They update stable shared components; no consumer CSS repair, new public prop, Identity endpoint, consent rule, or release is required or changed.

The fixture at `/next/utility` renders the actual error page, article actions/Markdown modal, account form modes/UserMenu and advanced fields. Its auth callbacks refuse submission locally, its user/avatar are fictional and local, and its file list uses a synthetic text sample. External chat and real account operations must not be exercised during this review.

## Contracts

- Error recovery follows the owning black or explicit light palette, including a nested dark scope. Each error heading has its own accessible ID.
- Article actions and account menus use solid surfaces, keyboard menu movement and Escape focus return. Preview hands focus back to the persistent article launcher before the existing modal trap captures it; dismissing the modal returns there.
- Auth actions retain their callbacks, validation and loading behavior. Actions use soft-square corners and mode/recovery controls have a 44px minimum hit area.
- Combobox clear, date navigation and local file removal have 44px targets while icons stay compact. The combobox can shrink inside narrow columns. DatePicker retains its dialog semantics with the existing shared focus trap; its narrow layout keeps the seven-day grid operable at 320px. Existing date constraints and file validation callbacks remain intact.

## Evidence and limits

Before changes, the actual local fixture rendered dark error ink as `rgb(242,242,242)` over a gradient ending at `rgb(251,251,251)`. The article launcher measured 32×32px, forgot-password/sign-up mode controls were 18.5/16.5px high and sample-file removal measured 28×28px. See `evidence/utility/before-dark.png` (viewed). The first two regression tests failed before changes: the menu did not focus its first item, and the preview callback did not inherit a persistent focus target.

Focused command from this package: `node node_modules/vitest/vitest.mjs run src/lib/components/utility-interactions.test.ts`. Four interaction tests pass, covering menu keyboard/Escape, preview handoff focus, UserMenu without logout and file rejection/removal. These are offline DOM tests, not live authentication or upload evidence. All modified Svelte components and the fixture parse without compiler warnings.

Actual Ego review covered 320, 390, 768, 1024, 1025 and 1440px in black and explicit light, with no horizontal overflow in the recorded DOM measurements. The three account modes were exercised locally in both palettes at all six widths (36 states), with no form overflow and minimum action heights of 44px. Screenshots were directly viewed for the six-width top layouts, 320px recovery/modal/calendar, 390px signup/magic/account menu and no-JavaScript fallback. Screenshot names ending in `recovery` from the broad batch are supplemental attempts: scrolling did not consistently settle there; the later 320 recovery and nested-dark captures are the focused visual evidence.

Actual local interactions verified article menu arrow navigation, Escape and Tab exit; preview modal Tab wrapping and focus return to its persistent launcher; date month navigation, Tab wrapping and focus return; account-menu keyboard dismissal without logout; Combobox clear and Canada selection; and removal of the synthetic file. No real auth form, email, external chat or upload was submitted. Reduced motion produced `animation-name: none` in the menu/calendar. No-JavaScript retained the explicit fixture limitation, labels and four recovery links without overflow. Interactive controls require hydration; no-JavaScript is not an authentication test.

The bounded rendered loop found and repaired input content-box overflow, nested recovery heading min-content overflow, a mobile modal close button outside its panel, browser-default outset borders and an overly large mobile recovery heading. The final focused command also includes `src/lib/tokens/performance-contract.test.ts`: nine tests across two files pass, including the legacy-token policy. Compiler parsing reports no warnings. All new uses follow canonical Performance tokens.

Functional correctness: passed for the offline component scope above; live Identity, file transfer and property routes are untested. Perceptual/product quality: passed for the viewed utility fixture and states, with no claim about character art or production consumers. Release readiness: untested; parent package/check/build, independent Sol review, Cook acceptance and shipping remain outstanding. No packaging, sync, deployment, external identity operation or publishing was performed by this owner.
