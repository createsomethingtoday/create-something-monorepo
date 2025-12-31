# CREATE SOMETHING Pattern Extraction

Research document for building a 90+/100 pattern library that exceeds Maverick X baseline.

## Research Sources

### Component Libraries (Primitives)
- [shadcn-svelte](https://shadcn-svelte.com) - 60+ components, Radix primitives for Svelte
- [Melt UI](https://melt-ui.com) - Headless builder pattern, WAI-ARIA compliant
- [Skeleton UI](https://skeleton.dev) - Built on Zag.js, cross-framework patterns

### Template References
- [Lexington Themes](https://lexingtonthemes.com) - Dark-first Astro templates (Navy, Carbon, Kotei)
- [Awwwards Scroll Animations](https://www.awwwards.com/inspiration/scroll-animations)
- [Awwwards GSAP Sites](https://www.awwwards.com/websites/gsap/)

---

## Pattern Extraction by Category

### 1. Motion Patterns

| Pattern | Source | Canon Compatibility | Priority |
|---------|--------|---------------------|----------|
| **ScrollReveal** | GSAP ScrollTrigger | IntersectionObserver + Canon tokens | Done |
| **StaggerContainer** | Framer Motion | Staggered child animations | Done |
| **CountUp** | Maverick X | IntersectionObserver trigger | Done |
| **FadeIn** | Universal | `opacity` + `translateY(20px)` | Done |
| **ParallaxSection** | Lenis/Locomotive | CSS `translateY` with scroll progress | P2 |
| **SmoothScroll** | Lenis | Consider Lenis integration | P3 |

**Implemented in `@create-something/components/motion`**:
- `ScrollReveal` - IntersectionObserver-based reveal with Canon timing
- `StaggerContainer` + `StaggerItem` - Staggered child animations
- `CountUp` - Animated number counter with easing
- `FadeIn` - Simple entrance animation wrapper

**2025 Motion Insight**: Lightweight, targeted animations over complex sequences. Focus on scroll-triggered reveals, not decorative motion.

**Canon Integration**:
```css
/* All motion uses Canon tokens */
transition: all var(--duration-standard) var(--ease-standard);
animation-duration: var(--duration-complex);
```

### 2. Interactive Patterns

| Pattern | Source | Canon Compatibility | Priority |
|---------|--------|---------------------|----------|
| **GlassCard** | Universal | `backdrop-filter: blur()` | Done |
| **HoverCard** | shadcn-svelte | Preview on link hover | P2 |

**Implemented in `@create-something/components/interactive`**:
- `GlassCard` - Frosted glass effect with Canon tokens

**Removed patterns** (don't fit Canon ethos):
- ~~ShimmerButton~~ - Gradient sweep too flashy, prefer subtle state changes
- ~~MagneticHover~~ - Spring physics feels gimmicky, not functional
- ~~CustomCursor~~ - Decorative, not purposeful
- ~~GlowEffect~~ - Trendy, not timeless

**Canon principle**: Interactions should communicate state, not demand attention. Hover effects are subtle border/background shifts, not animations.

### 3. Navigation Patterns

| Pattern | Source | Canon Compatibility | Priority |
|---------|--------|---------------------|----------|
| **StickyHeader** | Universal | Scroll-triggered frosted glass | Done |
| **MobileDrawer** | shadcn-svelte Drawer | Side/bottom sheet variants | Done |
| **CommandPalette** | cmdk-sv | `⌘K` / `Ctrl+K` trigger | Done |
| **MenuButton** | Universal | Animated hamburger → X | Done |
| **MegaMenu** | shadcn-svelte Navigation Menu | Dropdown with sections | P2 |
| **Breadcrumbs** | shadcn-svelte | Already in components | Done |
| **Tabs** | Melt UI | Accessible tab interface | P2 |

**Implemented in `@create-something/components/navigation`**:
- `StickyHeader` - Fixed header with scroll-triggered backdrop blur
- `MobileDrawer` - Slide-out drawer (left/right/bottom variants)
- `CommandPalette` - ⌘K triggered fuzzy search with keyboard navigation
- `MenuButton` - Animated hamburger toggle (44px touch target)

### 4. Form Patterns

| Pattern | Source | Canon Compatibility | Priority |
|---------|--------|---------------------|----------|
| **ProgressiveForm** | Maverick X/Templates | Multi-step disclosure | Done |
| **InlineValidation** | Superforms | Real-time feedback | P1 |
| **FileUpload** | Maverick X | Drag-drop with preview | P2 |
| **OTPInput** | shadcn-svelte | PIN entry pattern | P3 |
| **Combobox** | shadcn-svelte | Searchable select | P1 |
| **DatePicker** | Melt UI | Calendar with dropdowns | P2 |

### 5. Conversion Patterns

| Pattern | Source | Canon Compatibility | Priority |
|---------|--------|---------------------|----------|
| **TrustSignals** | Templates | Logo wall with grayscale hover | Done |
| **StickyCTA** | Templates | Journey-aware floating CTA | Done |
| **ProcessSteps** | Templates | Numbered step timeline | Done |
| **MetricCounters** | Templates | Animated counter statistics | Done |
| **ExitIntent** | SaaS patterns | Mouse-leave detection | P2 |

**Implemented in `@create-something/components/conversion`**:
- `TrustSignals` - Logo wall with variants (clients/certifications/associations)
- `StickyCTA` - Contextual CTA that evolves based on scroll depth (early/mid/late journey)
- `ProcessSteps` - Numbered process timeline with connector lines
- `MetricCounters` - Animated statistics with staggered reveal

### 6. Layout Patterns

| Pattern | Source | Canon Compatibility | Priority |
|---------|--------|---------------------|----------|
| **Section** | Templates | Consistent section wrapper | Done |
| **SplitSection** | Lexington | Two-column with variants | Done |
| **BentoGrid** | Maverick X | Asymmetric grid system | Done |
| **SectionHeader** | Templates | Title/subtitle pattern | Done |
| **StickySection** | Awwwards | Scroll-locked content | P2 |

**Implemented in `@create-something/components/layout`**:
- `Section` - Consistent section wrapper with Canon spacing variants
- `SplitSection` - Two-column layout with flexible ratios (50-50, 60-40, etc.)
- `BentoGrid` + `BentoItem` - Asymmetric grid system
- `SectionHeader` - Standardized title/subtitle pattern

### 7. Content Patterns

| Pattern | Source | Canon Compatibility | Priority |
|---------|--------|---------------------|----------|
| **VideoLightbox** | Maverick X | Modal video player | Done |
| **Carousel** | shadcn-svelte | Generic carousel | Done |
| **Accordion** | Melt UI/shadcn | Collapsible sections | Done |
| **ProcessTimeline** | Templates | Step-by-step visual | Done |
| **TestimonialCarousel** | Templates | Rotating quotes | Done |

**Implemented in `@create-something/components/content`**:
- `VideoLightbox` - Modal video player with YouTube/Vimeo support
- `Carousel` - Generic carousel with auto-play, navigation, and dots
- `TestimonialCarousel` - Rotating testimonials with ratings and author info

---

## Priority Implementation Order

### Phase 1: Core Sophistication (Week 1-2)
Must-have patterns that elevate every template:

1. **ScrollReveal** - Scroll-triggered entrance animations
2. **StaggerContainer** - Staggered child animations
3. **FadeIn** - Simple entrance wrapper
4. **MagneticHover** - Spring-based magnetic effect
5. **ShimmerButton** - Premium button hover
6. **CommandPalette** - Power-user search (⌘K)
7. **MobileDrawer** - Bottom sheet navigation
8. **Combobox** - Searchable select

### Phase 2: Polish (Week 3-4)
Patterns that add premium feel:

1. **ParallaxSection** - Multi-layer depth
2. **CountUp** - Animated statistics
3. **GlassCard** - Frosted glass effect
4. **HoverCard** - Link preview
5. **VideoLightbox** - Modal video
6. **StickyFooterCTA** - Conversion bar
7. **InlineValidation** - Form feedback

### Phase 3: Advanced (Week 5+)
Patterns for specific use cases:

1. **GlowEffect** - 2025 trend lighting
2. **CustomCursor** - Branded cursor
3. **SmoothScroll** - Lenis integration
4. **MegaMenu** - Complex navigation
5. **DatePicker** - Calendar selection
6. **FileUpload** - Drag-drop

---

## Canon Compliance Requirements

Every pattern MUST:

```svelte
<script>
  import { browser } from '$app/environment';

  // Respect reduced motion
  const prefersReducedMotion = browser
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
</script>

<style>
  .pattern {
    /* Colors */
    color: var(--color-fg-primary);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);

    /* Typography */
    font-size: var(--text-body);

    /* Spacing */
    padding: var(--space-md);
    gap: var(--space-sm);

    /* Motion */
    transition: all var(--duration-micro) var(--ease-standard);
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .pattern {
      transition: none;
      animation: none;
    }
  }

  /* High contrast */
  @media (prefers-contrast: more) {
    .pattern {
      border-color: var(--color-border-strong);
    }
  }
</style>
```

---

## Maverick X Patterns to Port

Direct ports from React to Svelte (reference: `/Users/micahjohnson/Documents/Github/Create Something/Maverick X/React`):

| Component | Location | Port Priority |
|-----------|----------|---------------|
| `ScrollReveal` | `components/ScrollReveal.tsx` | P1 |
| `CustomCursor` | `components/CustomCursor.tsx` | P3 |
| `Button` (shine) | `components/Button.tsx` | P1 |
| `GlassCard` | `components/GlassCard.tsx` | P2 |
| `ParallaxSection` | `components/ParallaxSection.tsx` | P1 |
| `CountUp` | `components/CountUp.tsx` | P2 |
| `ContactModal` | `components/ContactModal.tsx` | P2 |
| `VideoLightbox` | `components/VideoLightbox.tsx` | P1 |

---

## Mix-and-Match Recipes

### Premium Landing Page
- Hero: FullBleedHero + ParallaxSection + FadeIn
- Navigation: StickyHeader + CommandPalette + MobileDrawer
- Content: BentoGrid + StaggerContainer + GlassCard
- Conversion: MetricCounters + TrustSignals + StickyFooterCTA

### Professional Services
- Hero: SplitSection + ScrollReveal
- Navigation: StickyHeader + Breadcrumbs
- Content: ProcessTimeline + TestimonialCarousel
- Conversion: ProgressiveForm + VideoLightbox

### SaaS Product
- Hero: FullBleedHero + ShimmerButton + CountUp
- Navigation: StickyHeader + CommandPalette
- Content: BentoGrid + VideoLightbox + Accordion
- Conversion: StickyFooterCTA + ExitIntent

---

## Implementation Status

### Completed Pattern Libraries

| Package | Patterns | Import Path |
|---------|----------|-------------|
| **motion** | ScrollReveal, StaggerContainer, StaggerItem, CountUp, FadeIn | `@create-something/components/motion` |
| **interactive** | GlassCard | `@create-something/components/interactive` |
| **layout** | Section, SplitSection, BentoGrid, BentoItem, SectionHeader | `@create-something/components/layout` |
| **conversion** | TrustSignals, StickyCTA, ProcessSteps, MetricCounters | `@create-something/components/conversion` |
| **navigation** | StickyHeader, MobileDrawer, CommandPalette, MenuButton | `@create-something/components/navigation` |
| **content** | VideoLightbox, Carousel, TestimonialCarousel | `@create-something/components/content` |

### Remaining Work

**Form Patterns** (P2):
- InlineValidation - Real-time feedback
- Combobox - Searchable select
- DatePicker - Calendar selection
