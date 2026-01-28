# Editorial Design Patterns

Reusable patterns for high-fashion editorial layouts, inspired by Stitch and luxury brand sites.

## Philosophy

These patterns are **purposeful, not decorative**. Each effect serves a functional goal:

| Pattern | Purpose | Canon Principle |
|---------|---------|-----------------|
| Mix-blend navigation | Visibility over varied backgrounds | Functional |
| Grayscale hover | Editorial polish, reveal on engagement | Rewards interaction |
| Watermark text | Layered depth without clutter | Hierarchy through scale |
| Layered composition | Visual interest through position | Spatial relationships |

---

## 1. Mix-Blend Navigation

**Use case**: Navigation that needs to remain visible over hero images or varied backgrounds.

```svelte
<nav class="mix-blend-invert">
  <a href="/shop">SHOP</a>
  <a href="/about">ABOUT</a>
</nav>
```

**Available modes**:
- `.mix-blend-invert` — White text on any background (most common)
- `.mix-blend-overlay` — Soft blend with underlying content
- `.mix-blend-multiply` — Darkens intersection

**Example**: Stitch uses `mix-blend-mode: difference` for navigation that stays legible whether the hero image is light or dark.

---

## 2. Grayscale-to-Color Hover

**Use case**: Editorial image galleries, product grids where you want subtle polish.

```svelte
<div class="product-card">
  <img src="..." alt="..." class="grayscale-hover" />
</div>
```

**Variants**:
- `.grayscale-hover` — Grayscale → full color on hover
- `.scale-hover` — Subtle zoom (scale 1.05)
- `.grayscale-scale-hover` — Both effects combined

**Why it works**: Monochrome creates visual calm. Color reveal on hover rewards engagement without overwhelming the layout.

---

## 3. Background Watermark Text

**Use case**: Section dividers, layered typography, editorial depth.

```svelte
<section class="categories">
  <span class="text-watermark" style="top: 50%; left: 50%; transform: translate(-50%, -50%);">
    COLLECTION
  </span>
  <div class="categories-grid">
    <!-- Content appears above watermark -->
  </div>
</section>
```

**Sizes**:
- `.text-watermark` — Default (8rem → 25vw → 25rem)
- `.text-watermark-lg` — Larger (10rem → 30vw → 30rem)
- `.text-watermark-md` — Medium (6rem → 20vw → 20rem)
- `.text-watermark-sm` — Smaller (4rem → 15vw → 15rem)

**Positioning**: Requires `position: relative` on parent. Use inline styles for exact placement.

**Example**: Stitch uses 25vw background text reading "COLLECTION" behind category links.

---

## 4. Layered Image Composition

**Use case**: Design statement sections, overlapping editorial layouts.

```svelte
<div class="layered-image-container" style="height: 800px;">
  <div class="layered-image-back">
    <img src="back.jpg" alt="..." />
  </div>
  <div class="layered-image-front">
    <img src="front.jpg" alt="..." />
  </div>
</div>
```

**Default layout**:
- Back image: 75% width/height, top-right
- Front image: 60% width/height, bottom-left, elevated with shadow

**Customization**: Override positioning with inline styles for different compositions.

**Example**: Stitch overlaps two fashion images at different sizes and positions to create depth.

---

## 5. Editorial Frame

**Use case**: Highlight key images or content with thick borders.

```svelte
<div class="editorial-frame">
  <img src="hero.jpg" alt="..." />
</div>
```

**Variants**:
- `.editorial-frame` — 16px border
- `.editorial-frame-thin` — 8px border

**Philosophy**: Rams principle "as little design as possible" — the frame is functional emphasis, not decoration.

---

## 6. Offset Grid

**Use case**: Product grids with staggered vertical alignment for visual rhythm.

```svelte
<div class="offset-grid">
  <div class="product-card">...</div>
  <div class="product-card">...</div>
  <div class="product-card">...</div>
  <div class="product-card">...</div>
</div>
```

**Pattern**:
- 1st child: +48px vertical offset
- 3rd child: -16px vertical offset
- 4th child: +8px vertical offset
- 2nd child: no offset

**Responsive**: Offsets are removed on mobile (<768px) for clarity.

---

## 7. Section Header with Border

**Use case**: Section titles with visual separation.

```svelte
<div class="section-header">
  <h2>NEW IN</h2>
  <p class="subtitle">Discover the latest collection...</p>
</div>
```

**Layout**: Flexbox with space-between, bottom border, responsive column layout on mobile.

---

## Complete Example: Fashion Homepage

```svelte
<script>
  const products = [
    { name: 'WOOL COAT', price: 895 },
    { name: 'SILK DRESS', price: 695 },
  ];
</script>

<!-- Hero with mix-blend navigation -->
<nav class="mix-blend-invert">
  <a href="/shop">SHOP</a>
</nav>

<section class="hero">
  <h1 class="mix-blend-overlay">SILHOUETTES</h1>
</section>

<!-- Categories with watermark -->
<section class="categories">
  <span class="text-watermark" style="top: 50%; left: 50%; transform: translate(-50%, -50%);">
    COLLECTION
  </span>
  <div class="categories-grid">
    <a href="/jewelry">JEWELRY</a>
    <a href="/shoes">SHOES</a>
  </div>
</section>

<!-- Products with grayscale hover -->
<section class="products">
  <div class="section-header">
    <h2>NEW IN</h2>
    <p>Discover ready to wear from Pre Spring 26.</p>
  </div>
  <div class="offset-grid">
    {#each products as product}
      <div class="product-card">
        <div class="grayscale-scale-hover">
          <img src={product.image} alt={product.name} />
        </div>
        <span>{product.name}</span>
        <span>${product.price}</span>
      </div>
    {/each}
  </div>
</section>

<!-- Icons with editorial frame -->
<section class="icons">
  <h2>ICONS OF THE WARDROBE</h2>
  <div class="editorial-frame">
    <img src="iconic.jpg" alt="..." />
  </div>
</section>
```

---

## Implementation Notes

### Canon Integration

All patterns use Canon tokens:
- `--color-fg-subtle` for watermark text
- `--duration-standard` and `--ease-standard` for transitions
- `--space-*` for offsets and spacing
- `--shadow-lg` for elevation

### Accessibility

- Watermark text uses `pointer-events: none` and `user-select: none`
- Mix-blend modes preserve WCAG contrast (test with real content)
- Grayscale hover doesn't rely on color alone (shape/position convey meaning)
- Offset grid resets to default layout on mobile for clarity

### Performance

- Transitions use `transform` and `filter` (GPU-accelerated)
- No JavaScript required for any pattern
- Watermark text is pure CSS (no canvas or SVG)

### Browser Support

| Pattern | Support | Fallback |
|---------|---------|----------|
| Mix-blend | Chrome 41+, Safari 8+ | Solid color nav |
| Grayscale filter | Chrome 18+, Safari 6+ | Normal images |
| CSS transforms | Universal | No offset |

All patterns gracefully degrade.

---

## Stitch vs Claude Code

**What Stitch does better**:
- Real images with proper layering
- Aggressive typography scale (14vw, 25vw)
- Clever mix-blend navigation
- Grayscale → color is brilliant

**What Claude Code adds**:
- Reusable utility classes
- Canon token integration
- SvelteKit component structure
- Documentation

**Best of both**: Use these patterns in SvelteKit projects with Canon tokens for maintainable, scalable editorial designs.

---

## Related Documentation

- [CSS Canon](../../.claude/rules/css-canon.md) — Full design token reference
- [Taste Reference](../../.claude/rules/taste-reference.md) — Visual inspiration sources
- [Evaluation](../../packages/silhouettes/EVALUATION.md) — Stitch vs Claude Code comparison
