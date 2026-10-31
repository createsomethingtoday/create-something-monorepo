---
paths:
  - "**/*.svelte"
  - "**/*.css"
  - "**/tailwind.config.*"
---

## CSS Architecture

**Tailwind for structure, Canon for aesthetics.** When doing UI/design work, use the `css-canon` skill for full token reference, Glass Design System details, and animation patterns.

**Key Principle**: Use Tailwind for layout/structure (`flex`, `grid`, `gap-*`, `p-*`). Use Canon tokens for aesthetics (colors, typography, borders, shadows, motion).

**Glass Design System**: CREATE SOMETHING and WORKWAY share a unified Glass Design System. Glass conveys "The Automation Layer"—the transparent interface between user and outcome. Use `.glass-*` classes for navigation, modals, and workflow cards. Invoke `css-canon` skill for full reference when needed.

### WORKWAY Alignment (v1.1.0)

**WORKWAY is the reference implementation.** The WORKWAY platform (`workway-platform/apps/web/src/styles.css`) has advanced the shared Canon system with:

- **Tailwind v4** with `@theme` CSS-first configuration
- **shadcn/ui components** (Button, Card with variant system via class-variance-authority)
- **MagicUI animations** (border-beam, marquee, animated-shiny-text)
- **Infrastructure grid backgrounds** (`.bg-grid`, `.bg-grid-fade`)
- **Automotive motion framework** (GPU-accelerated, scroll reveal, interactive states)

**Current status by property:**
| Property | Status | Notes |
|----------|--------|-------|
| WORKWAY | ✅ Reference | Tailwind v4, shadcn, MagicUI |
| .agency | ✅ Aligned | WORKWAY utilities added (Feb 2026) |
| .io | 🔄 Pending | Needs migration |
| .space | 🔄 Pending | Needs migration |
| .ltd | 🔄 Pending | Needs migration |

**Migration Strategy**: New code follows Canon + WORKWAY patterns. Existing code migrates incrementally when touched. Priority: `packages/components/` first, then individual properties.

**Spacing Guidance**: The golden ratio scale produces impractical values at the upper end (`--space-2xl` = 110px, `--space-3xl` = 177px). Use Tailwind for layout spacing:
- **Page padding**: Tailwind utilities (`py-16`, `py-24`, `px-6`)
- **Section gaps**: Tailwind utilities (`gap-8`, `space-y-12`)
- **Nav offset**: Use `calc(var(--header-height) + var(--space-md))` for fixed nav padding
- **Component internals**: Canon tokens are acceptable (`--space-xs` through `--space-xl`)
- **Avoid for page layout**: `--space-2xl` and `--space-3xl` are too large for most padding use cases
