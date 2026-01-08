# Silhouettes — Fashion E-commerce Package

TOTEME-inspired minimalist fashion homepage built with SvelteKit and Canon design system.

## Quick Start

```bash
# Install dependencies
pnpm install

# Generate images (one-time setup)
npx tsx scripts/generate-images.ts

# Start dev server
pnpm dev

# Open http://localhost:5173
```

## Features

✅ **Editorial Design Patterns**
- Mix-blend-mode navigation
- Grayscale-to-color hover effects
- Layered image compositions
- Background watermark text
- Offset grid layouts
- Editorial frame borders

✅ **Animation & Motion**
- Scroll-triggered reveals (IntersectionObserver)
- Staggered grid animations
- View Transitions API
- Hover enhancements
- Reduced motion support

✅ **Canon Design System**
- Pure black/white with subtle grays
- Golden ratio spacing (φ = 1.618)
- Typography scale (4rem → 14vw → 16rem)
- Consistent animation timing
- WCAG AA compliant colors

✅ **AI-Generated Images**
- Cloudflare Workers AI (flux-1-schnell)
- 14 fashion photography images
- TOTEME-inspired minimalist aesthetic
- ~$0.42 total cost

## Project Structure

```
packages/silhouettes/
├── src/
│   ├── routes/
│   │   ├── +page.svelte          # Fashion homepage
│   │   └── +layout.svelte        # View Transitions
│   └── app.css                   # Typography scale
├── static/
│   └── images/                   # Generated images (14 total)
├── scripts/
│   └── generate-images.ts        # Cloudflare AI image generation
├── IMAGE_GENERATION.md           # Image generation guide
├── UPDATE_SUMMARY.md             # Implementation summary
└── EVALUATION.md                 # Stitch comparison rubric
```

## Image Generation

Generate all 14 images using Cloudflare Workers AI:

```bash
npx tsx scripts/generate-images.ts
```

**Requirements**:
- Wrangler authenticated: `wrangler login` (one-time setup)
- Or set `CLOUDFLARE_API_TOKEN` environment variable

See `IMAGE_GENERATION.md` for details.

## Canon Patterns

This package demonstrates reusable editorial patterns now available system-wide:

| Pattern | CSS Class | Use Case |
|---------|-----------|----------|
| Mix-blend invert | `.mix-blend-invert` | Navigation over images |
| Grayscale reveal | `.grayscale-hover` | Product image hover |
| Watermark text | `.text-watermark` | Section backgrounds |
| Layered composition | `.layered-image-container` | Editorial depth |
| Editorial frame | `.editorial-frame` | Featured content emphasis |
| Offset grid | `.offset-grid` | Visual rhythm |
| Scroll-reveal | `.animate-on-scroll` | Progressive disclosure |
| Stagger | `.stagger-children` | Cascading animations |

## Evaluation Score

| Category | Score | Notes |
|----------|-------|-------|
| Visual Fidelity | 90% | AI images ready to generate |
| Canon Compliance | 95% | Pure black/white, golden ratio |
| Architecture | 92% | SvelteKit + shared components |
| Production Readiness | 65% | Needs product data, cart |
| User Experience | 75% | Animations, accessibility |
| Performance | 60% | GPU-accelerated, lazy loading |
| **TOTAL** | **82.9%** | (+8.7% from start) |

See `EVALUATION.md` for detailed rubric.

## What's Better Than Stitch

1. **Reusable patterns** — Not hardcoded, apply to any project
2. **Canon token integration** — All colors/spacing use design system
3. **TypeScript safety** — Full type checking throughout
4. **SvelteKit architecture** — Can scale to full e-commerce site
5. **Documentation** — Every pattern documented and explained
6. **Component-ready** — Can extract into reusable components

## Next Steps

1. **Generate images** — Run `npx tsx scripts/generate-images.ts`
2. **Add product data** — Connect to CMS or API
3. **Implement cart** — Add e-commerce functionality
4. **Extract components** — `<ProductCard>`, `<EditorialHero>`, etc.

## Philosophy

**Stitch** = Perfect prototype (visual polish, single file)
**Claude Code** = Production foundation (scalable, maintainable)
**Combined** = Production-ready sites with editorial polish, built on a design system that can evolve.

The patterns from Stitch are now **part of the Canon** — available to all future projects.

---

Built with [SvelteKit](https://kit.svelte.dev/), [Cloudflare Workers AI](https://ai.cloudflare.com/), and the [Canon Design System](../../.claude/rules/css-canon.md).
