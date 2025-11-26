# Understanding: @create-something/components

> **Shared component library embodying canonical design principles—the Vorverständnis (pre-understanding) that informs all properties.**

## Ontological Position

**Mode of Being**: Foundation (Vorverständnis)

This package is the *pre-understanding* that all properties bring to their interpretation. It doesn't belong to a single mode—it enables all modes. When `.ltd` renders a principle or `.space` displays a lesson, they share this common visual language. The components embody Dieter Rams' principles in code.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| `svelte ^5.0` | Runes and snippets enable composable, reactive components |
| `@sveltejs/kit ^2.0` | SvelteKit conventions for routing and SSR |

*No internal dependencies—this is the foundation.*

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| `@create-something/ltd` | How canonical design manifests in UI |
| `@create-something/io` | How research papers are displayed |
| `@create-something/space` | How lessons and experiments appear |
| `@create-something/agency` | How services are presented |
| All properties | Shared visual language and interaction patterns |

## Internal Structure

```
src/lib/
├── components/    → UI components (Navigation, Footer, Cards, etc.)
├── tokens/        → Design tokens (spacing, animation, z-index)
├── types/         → TypeScript types shared across ecosystem
└── utils/         → Utility functions (completion tracking, etc.)
```

## To Understand This Package, Read

1. **`src/lib/components/index.ts`** — Export manifest showing all available components
2. **`src/lib/tokens/spacing.ts`** — Golden ratio spacing system (φ-based)
3. **`src/lib/components/Navigation.svelte`** — Canonical navigation pattern
4. **`src/lib/types/paper.ts`** — Paper/experiment data model used across .io and .space

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| Design Tokens | Atomic design values (spacing, animation curves) | `src/lib/tokens/` |
| Paper Type | Data structure for research papers/experiments | `src/lib/types/paper.ts` |
| Canonical Navigation | Cross-property navigation component | `src/lib/components/Navigation.svelte` |

## This Package Helps You Understand

- **"Less, but better" in practice**: Each component does one thing well
- **Shared visual language**: How four properties maintain consistency
- **Design tokens**: Golden ratio spacing, easing curves, z-index layers
- **Type safety**: Shared TypeScript interfaces prevent property drift

## Common Tasks

| Task | Start Here |
|------|------------|
| Add a new component | `src/lib/components/` then export in `index.ts` |
| Modify spacing scale | `src/lib/tokens/spacing.ts` |
| Add a shared type | `src/lib/types/` then export in `index.ts` |
| Use in a property | `import { Component } from '@create-something/components'` |

## Exports

```typescript
// Components
export { Navigation, Footer, SEO, Analytics } from './components';
export { Card, Button, Heading, QuoteBlock } from './components';
export { PaperCard, PapersGrid, CategorySection, ShareButtons } from './components';

// Types
export type { Paper, Category, PaperMeta } from './types';

// Utilities
export { completion } from './utils';
```

---

*Last validated: 2024-11-25*
