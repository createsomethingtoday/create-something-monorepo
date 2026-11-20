# Canon system coverage audit R10

Read-only source audit, 2026-11-13. Checkout: preserved `t3/canon-design-system-redesign`, HEAD `5f9bfab3f6a9069332d650f42a09f5bd18d806a7`, with intentional concurrent changes. Only this report was written. No tests, package/sync/build commands, browser or external operations were run.

## Coverage established and limits

The shared system has been redesigned substantially; it is no longer merely a `/next` concept. Current root/component exports, package subpaths and the registry retain the existing public families. Foundation tokens and portable artifacts carry black defaults, explicit light work surfaces, Geist, soft controls and solid panels. FAMILY-MIGRATION records actual Button/Card, form, feedback and overlay/navigation fixtures; PATTERNS-MIGRATION records actual site chrome, search, table, decisions and representative Performance compositions. UTILITY-MIGRATION adds account/authoring/advanced-field fixtures; MAPS-MIGRATION adds actual Atlas/story/miniature/chart fixtures. BACKGROUND-COMPOSITION-MIGRATION documents all five hero/CTA APIs and now points to intrinsic CSS scene rows and independent R08 evidence. Lower editorial inline media is intentional. Character studies remain internal and provisional, with oval-eye 96px head support and smaller plain-text fallback; this is not final character approval.

These handoffs contain genuine recorded runtime evidence, but their old defaults, suite failures, counts and builder acceptance are historical checkpoints. In particular, FAMILY/PATTERNS references to pending navigation, utility/maps and old palette work must not be recycled as current omissions. Parent reports 806 passing tests, checks and four consumer builds at the current integration checkpoint; this audit did not rerun or independently verify those commands. Source inspection cannot renew their visual acceptance. Footer legacy framing and the utility fixture link target are already parent-owned and excluded here.

Three material exposed-family gaps remain. They are bounded extensions of the same adoption work, not a request to restyle every decorative export, old experiment, chart hue, external-service icon or headless utility.

## 1. Stable filtering still bypasses the migrated control contract

`src/lib/filtering/FilterTogglePanel.svelte:169-182` puts each material name in a sibling span outside the checkbox label; the label contains only an input and empty visual span. The checkbox therefore lacks its option's accessible name. Equivalent category/status rows need the same bounded inspection. At `:343-355`, its label is explicitly 28×14px and the input is zero-sized. The two price inputs are 20px high (`:420-448`) with 14px pointer-active thumbs (`:456-484`). This stable public family (`src/lib/registry/data.ts:2141-2164`, `./filtering` package export) does not inherit the repaired 44px Switch/Checkbox target merely because its palette uses tokens.

Acceptance: mount the actual FilterTogglePanel with fictional facets and price bounds in both owning palettes; every option has its visible name as its accessible name, every option/range action has a 44px usable target, and keyboard focus is visible. Toggle all facet types, adjust both bounds, collapse/expand and clear; callbacks retain the exact existing filter schema and state. View 320/390 and desktop, then complete the normal six-width no-overflow check. Keep track/thumb artwork compact if useful. No product request or analytics dispatch is required.

## 2. Stable TimelineEditor resolves the wrong palette and retains small controls

`src/lib/interactive/TimelineEditor.svelte:94` samples `document.documentElement`, rather than its own themed surface; `:126-129` samples only on mount. Its CSS shell inherits the owning nested palette, while the canvas can retain the root palette or stale colors after a theme change. This is a concrete integration mismatch with explicit light work surfaces. Zoom buttons remain 24×24px (`:525-527`). The application wrapper removes its outline (`:488`), then changes only border-color on focus (`:491-492`) without defining a border. Registry `component.interactive-timeline-editor` is stable (`src/lib/registry/data.ts:1201-1230`); it is an authoring surface, not an archived decorative experiment.

Acceptance: render the actual editor with a tiny fictional track inside explicit light on black and nested dark inside light; verify canvas pixels/text and shell agree with each owning palette, including a live palette reversal after mount. Exercise existing arrow-frame callbacks, scrubber and zoom; measure zoom targets at least 44px and directly inspect visible keyboard focus. View phone and desktop and verify six-width containment. Resolve actual canvas drawing colors, including CSS aliases, rather than only asserting source token names. No motion export or production authoring operation is needed.

## 3. Stable IntegrationFlow still defaults to the legacy glass composition

`src/lib/interactive/IntegrationFlow.svelte:67-87` defaults to LiquidGlass and LiquidGlassIcon. Its supposedly solid backing remains literal translucent black (`LiquidGlass.svelte:223-226`); default icon layers contain literal white translucent fills and blur (`LiquidGlassIcon.svelte:88-92,132-150`). Description and arrows use white alpha instead of owning semantic roles (`IntegrationFlow.svelte:187-194`). Thus the stable workflow composition (`src/lib/registry/data.ts:1172-1198`) does not follow the same solid, palette-aware contract as the migrated miniature workflow artifacts. Explicitly requested decorative glass exports can remain separate; the default stable workflow need not inherit them.

Acceptance: use the actual IntegrationFlow with three fictional services, plain labels, optional icons and connectors, on black and explicit light. Default panels/icons should be solid owning-palette surfaces; service names, order and description remain readable without relying on arrows. View 320/390 and desktop, verify six-width containment and missing-icon behavior, and directly inspect reduced-motion output for any enabled optional connector animation. Preserve existing props; treat changes to opt-in glass behavior as a separate compatibility decision. This is a bounded workflow specimen, not a redesign of all glass/3D art.

## Gates

- Functional correctness: **untested in this audit**. Current source exposes the three gaps above; existing reported package/runtime evidence covers the migrated fixtures, not these three families. No new failing/passing regression claim is made.
- Perceptual/product quality: **untested in this audit**. No screenshots/output were viewed; source observations are not perceptual acceptance. Existing actual-fixture handoffs remain scoped to their recorded revisions.
- Release readiness: **not applicable to publication in this audit**. Local review only; no shipping destination or publication permission. Whole-system acceptance should remain pending the bounded gaps, current independent actual-output retest and parent-owned character/art decision. No broad cleanup gate is proposed.

Worktree disposition: preserved at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190` / `t3/canon-design-system-redesign` for parent integration. This report does not change source behavior or external state.
