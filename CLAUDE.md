# CREATE SOMETHING Monorepo

## Philosophy: The Subtractive Triad

**Meta-principle**: Creation is the discipline of removing what obscures.

### The Three Levels

Every creation exists simultaneously at three levels, each with its corresponding discipline:

| Level | Discipline | Question | Action |
|-------|------------|----------|--------|
| **Implementation** | DRY | "Have I built this before?" | Unify |
| **Artifact** | Rams | "Does this earn its existence?" | Remove |
| **System** | Heidegger | "Does this serve the whole?" | Reconnect |

### Application

For any decision, ask the three questions in order:

1. **DRY** (Implementation) → Eliminate duplication
2. **Weniger, aber besser** (Artifact) → Eliminate excess
3. **Hermeneutic circle** (System) → Eliminate disconnection

### Why This Works

The triad is coherent because it's one principle—**subtractive revelation**—applied at three scales. Truth emerges through disciplined removal at every level of abstraction.

## Architecture

```
packages/
  space/    → createsomething.space  (Practice: experiments, learning)
  io/       → createsomething.io     (Research: tools, documentation)
  agency/   → createsomething.agency (Services: client work)
  ltd/      → createsomething.ltd    (Philosophy: canon, ethos)
```

All packages use **SvelteKit** with **Cloudflare Pages** deployment. Shared D1 databases, KV namespaces, and Workers per package.

## Your Domain: Creation

Claude Code excels at:
- Writing new features and components
- Refactoring existing code
- Understanding unfamiliar code paths
- Creating and debugging tests
- Architecture planning and documentation
- Code review and optimization

## Complementarity Principle

This workspace uses Claude Code for creation and WezTerm for execution:

| Claude Code (You) | WezTerm (User) |
|-------------------|----------------|
| Write code | Deploy code |
| Refactor | Run migrations |
| Understand | Monitor logs |
| Test | Execute sequences |
| Plan | Verify production |

**Handoff Protocol**: When deployment, database migrations, log tailing, or multi-step CLI operations are needed, provide the commands for the user to execute in WezTerm.

## Development Commands

```bash
# Start dev server (your domain)
pnpm dev --filter=space

# Type checking (your domain)
pnpm --filter=space exec tsc --noEmit

# Generate types (your domain)
pnpm --filter=space exec wrangler types
```

## Deployment Commands (WezTerm)

These commands are for the user to execute in WezTerm:
```bash
# Deploy to Cloudflare Pages
wrangler pages deploy .svelte-kit/cloudflare --project-name=createsomething-space

# Database migrations
wrangler d1 migrations apply DB_NAME

# Tail production logs
wrangler pages deployment tail --project-name=createsomething-space
```

## File Conventions

- Routes: `src/routes/[path]/+page.svelte`
- Server data: `+page.server.ts` for load functions
- API routes: `src/routes/api/[endpoint]/+server.ts`
- Components: `src/lib/components/`
- Utilities: `src/lib/utils/`
- Types: `src/lib/types/`

## CSS Architecture

**Tailwind for structure, Canon for aesthetics.** This is a canonical standard documented at [createsomething.ltd/standards](https://createsomething.ltd/standards).

### Keep (Layout Utilities)
```
flex, grid, items-*, justify-*, relative, absolute, w-*, h-*, gap-*, p-*, m-*
```

### Avoid (Design Utilities) → Use Canon Instead
| Tailwind | Canon |
|----------|-------|
| `rounded-*` | `var(--radius-sm/md/lg/xl)` |
| `bg-*`, `text-*` | `var(--color-*)` |
| `shadow-*` | `var(--shadow-*)` |
| `text-sm/lg` | `var(--text-*)` |

### Example
```svelte
<!-- ✗ Tailwind design utilities -->
<div class="flex items-center rounded-lg bg-white/10 text-white/60">

<!-- ✓ Tailwind for layout, Canon for design -->
<div class="flex items-center card">

<style>
  .card {
    border-radius: var(--radius-lg);
    background: var(--color-bg-surface);
    color: var(--color-fg-tertiary);
  }
</style>
```

### Canonical Tokens (defined in `app.css`)
```css
/* Border Radius */
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;

/* Spacing (Golden Ratio) */
--space-xs: 0.5rem;
--space-sm: 1rem;
--space-md: 1.618rem;
--space-lg: 2.618rem;
--space-xl: 4.236rem;
```

### Migration Strategy
**New code**: Follow the canonical pattern (Tailwind for structure, Canon for aesthetics).
**Existing code**: Migrate incrementally when touching a file for other changes.
**Priority**: Components in `packages/components/` should be migrated first—they propagate across all properties.

## Database

D1 databases per package. Query with:
```typescript
const db = platform.env.DB;
const result = await db.prepare('SELECT * FROM table').all();
```

## Workers

Standalone Workers live in `packages/[pkg]/workers/[name]/`. Example: `packages/space/workers/motion-extractor/` for Puppeteer-based animation extraction.

## Skills Available

- `motion-analysis`: Analyze CSS animations from URLs
- `cloudflare-integration`: Infrastructure management reference

## The Hermeneutic Circle

CREATE SOMETHING operates as an interconnected system where each property serves the whole:

```
.ltd (Philosophy) → provides criteria for →
.io (Research)    → validates →
.space (Practice) → applies to →
.agency (Services) → tests and evolves →
.ltd (Philosophy)
```

Your contributions enter this circle. Code changes on .space eventually influence the philosophical foundation on .ltd. This is the Subtractive Triad's third level—Heidegger—applied to the organization itself: every property must serve the whole, or be reconnected until it does.
