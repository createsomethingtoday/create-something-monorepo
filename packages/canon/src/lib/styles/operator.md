# Opt-in dark neutral palette

Canon owns this Database-tier palette contract. It adapts measured neutral and
work-status colors from Paperclip create-something CRE-108 / Linear CRE-2149;
it includes no Paperclip code, marks, assets, typography, or product behavior.
Version 1 is independent of the global Performance contract.

## Integration

```css
@import '@create-something/canon/styles/operator.css';

.operator-surface {
  color-scheme: dark;
  background: var(--color-operator-background);
  color: var(--color-operator-foreground);
}
.operator-surface :where(button, a, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--color-operator-focus-ring-accessible);
  outline-offset: 3px;
}
```

```html
<section class="operator-surface" data-canon-palette="operator">
  <!-- Consumer-owned content and layout -->
</section>
```

Importing the stylesheet alone changes no rendered styles. The attribute emits
only namespaced custom properties; consumers bind them to CSS properties.
It does not remap global `--color-*`, Performance modes, or `.cs-workspace` aliases.
For `.cs-workspace`, bind `--workspace-bg`, `--workspace-panel`,
`--workspace-raised`, `--workspace-hover`, `--workspace-line`, `--workspace-fg`,
`--workspace-muted`, and `--workspace-focus` explicitly in consumer CSS to the
corresponding roles below. Use `focus-ring-accessible` for `--workspace-focus`.
Existing workspace state names/aliases remain unchanged and require an explicit
consumer mapping to the new status roles.

Apply the attribute to portal roots too when dialogs render outside the owning
surface. Custom properties inherit: removing a nested attribute does not reset
an opted-in ancestor. Use separate surface roots for mixed palettes. Consumers
own forced-colors behavior, keyboard checks, and rendered accessibility testing;
do not disable forced-color adjustment. Keep visible focus in system colors
when forced-colors is active.

## Neutral roles

Every name below has prefix `--color-operator-`.

| Role | Value | Usage |
| --- | --- | --- |
| `background`, `panel` | `oklch(20.5% 0 0)` | Canvas and card; measured as the same color |
| `secondary` | `oklch(26.9% 0 0)` | Sidebar or secondary panel |
| `raised`, `hover` | `oklch(32% 0 0)` | Raised surfaces and hover fill |
| `foreground` | `oklch(98.5% 0 0)` | Primary text |
| `muted` | `oklch(70.8% 0 0)` | Secondary text, including small labels |
| `border` | `oklch(100% 0 0 / .1)` | Decorative dividers |
| `input-border` | `oklch(100% 0 0 / .15)` | Measured input chrome; not a sufficient sole control boundary |
| `focus-ring` | `oklch(55.6% 0 0)` | Reference measurement only; fails 3:1 against raised |
| `focus-ring-accessible` | `oklch(70.8% 0 0)` | Interactive focus; also use for essential control boundaries |

On the brightest neutral surface (`raised`/`hover`), foreground is 12.15:1,
muted text is 4.89:1, and accessible focus is 4.89:1. Ratios increase on the
darker surfaces. Reference focus is only 2.68:1 on raised. Translucent borders
are decorative: do not rely on them as the only indicator of an input, state,
or focus. Labels and sufficient-contrast essential outlines remain necessary.

## Work status

All status roles use `--color-operator-status-<state>` for the measured
fill/accent, `-text` for labels on neutral surfaces, and `-on` for text on an
opaque measured status fill. These roles describe execution state, not brand.

| State | Measured fill | Label (`-text`) | On-fill (`-on`) | Label on raised | On-fill contrast |
| --- | --- | --- | --- | --- | --- |
| running | `#2563eb` | `#93c5fd` | `#ffffff` | 7.04:1 | 5.17:1 |
| review | `#7c3aed` | `#c4b5fd` | `#ffffff` | 6.87:1 | 5.70:1 |
| done | `#22c55e` | `#86efac` | `#171717` | 9.03:1 | 7.87:1 |
| blocked | `#dc2626` | `#fca5a5` | `#ffffff` | 6.68:1 | 4.83:1 |
| paused | `#f59e0b` | `#fcd34d` | `#171717` | 8.80:1 | 8.35:1 |

Measured accents are not generally safe for small text or essential icons on
dark panels. Use `-text` for both; use the base only as an optional accent or
filled badge paired with `-on`. Never use color alone to convey state: provide a
visible label (for example, “Blocked”) and optionally a distinct icon. Announce
meaningful asynchronous changes with a consumer-owned polite live region;
do not make every static badge a live region. Preserve the label in grayscale
and forced-colors modes. These ratios assume opaque fills without opacity,
blending, images, or gradients; recheck any changed pairing.

```css
.status-blocked {
  background: var(--color-operator-status-blocked);
  color: var(--color-operator-status-blocked-on);
}
.status-blocked-label {
  color: var(--color-operator-status-blocked-text);
}
```

## Artifacts and validation

`operator.css` is the runtime source. The separate exported
`@create-something/canon/styles/operator.tokens.json` records the version,
selector and exact token values for tooling. This scoped artifact is deliberately
separate from the global `tokens.dtcg.json`, `tokens.figma.json`, `tokens.scss`,
and `canon.json` Performance projections; importing it does not opt in a surface.
When changing the palette, update both CSS and JSON and run:

```sh
node packages/canon/scripts/check-operator-palette.mjs
# Or from this package: pnpm tokens:operator:check
```

The dependency-free gate checks exact measured references, namespace/selector
containment, all 26 declarations, CSS/JSON parity, package export paths, no
automatic full-Canon import, and WCAG contrast for all documented text/focus
pairings. It does not replace a package build or browser testing in each
consumer. Rollback is removing the consumer bindings, attribute and import;
the original global tokens never change.
