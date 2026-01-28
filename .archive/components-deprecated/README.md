# @create-something/components

> **DEPRECATED**: This package has been superseded by `@create-something/canon`.
> 
> Please migrate to:
> ```bash
> pnpm add @create-something/canon@workspace:*
> ```
> 
> Import paths remain similar:
> ```typescript
> // Old
> import { Button, Card } from '@create-something/components';
> 
> // New
> import { Button, Card } from '@create-something/canon';
> ```
> 
> See [packages/canon](../canon) for the new unified design system.

---

Shared component library for the Create Something ecosystem, embodying canonical design principles from Dieter Rams, Mies van der Rohe, and the Bauhaus movement.

## Philosophy

This library implements "Weniger, aber besser" (Less, but better) - every component serves a clear purpose with minimal complexity. Components are:

- **Minimal** - No decoration, only essential elements
- **Accessible** - Semantic HTML, ARIA compliance
- **Performant** - Optimized for Cloudflare Workers edge runtime
- **Consistent** - Unified design language across all properties

## Installation

```bash
# Within the monorepo (workspace reference)
pnpm add @create-something/components@workspace:*

# From npm (when published)
pnpm add @create-something/components
```

## Usage

```typescript
import { SEO, Navigation, Footer } from '@create-something/components';
import { PaperCard } from '@create-something/components/components';
import { completion } from '@create-something/components/utils';
import type { Paper } from '@create-something/components/types';
```

## Components

### Core Components
- **SEO** - Meta tags, Open Graph, Twitter Cards, Schema.org
- **Navigation** - Property-aware navigation with responsive design
- **Footer** - Ecosystem footer with cross-property links

### Content Components
- **PaperCard** - Paper/article card with metadata
- **ArticleHeader** - Article hero section
- **ArticleContent** - Markdown/HTML content renderer
- **PapersGrid** - Responsive grid layout
- **CategorySection** - Category filtering
- **RelatedArticles** - Context-aware recommendations

### Interactive Components
- **HeroSection** - Homepage hero
- **ShareButtons** - Social sharing
- **TrackedExperimentBadge** - Experiment completion tracking

## Utilities

- **completion** - Experiment completion tracking (localStorage + KV)

## Types

- **Paper** - Core paper/article interface (38 fields)
- **ExtendedPaper** - Extended for executable experiments

## Development

```bash
# Start component demo
pnpm dev

# Build library
pnpm package

# Type check
pnpm check

# Run tests
pnpm test
```

## Design Principles

All components follow **Dieter Rams' 10 Principles of Good Design**:

1. Good design is innovative
2. Good design makes a product useful
3. Good design is aesthetic
4. Good design makes a product understandable
5. Good design is unobtrusive
6. Good design is honest
7. Good design is long-lasting
8. Good design is thorough down to the last detail
9. Good design is environmentally friendly
10. **Good design is as little design as possible**

## License

MIT © Create Something
