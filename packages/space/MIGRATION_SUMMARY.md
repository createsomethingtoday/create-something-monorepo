# CSS Canon Migration Summary - packages/space/src/routes

## Completed Migrations

### 1. +layout.svelte
**Status**: ✅ Completed
**Changes**:
- Replaced `bg-black` with `var(--color-bg-pure)` in `.layout` class
- Moved design properties to `<style>` block
- Kept Tailwind layout utilities (min-h-screen, pt-[72px])

### 2. about/+page.svelte
**Status**: ✅ Completed
**Changes**:
- Created semantic classes: `.hero-title`, `.core-identity`, `.lead-text`, `.link`, `.philosophy-card`, `.card-title`, `.card-text`, `.background-section`, `.mission-section`, `.topics-section`, `.section-title`, `.section-text`, `.topic-card`, `.topic-title`, `.topic-description`
- Replaced:
  - `text-4xl md:text-6xl font-bold text-white` → `.hero-title` with Canon tokens
  - `text-xl text-white/90 font-medium` → `.lead-text` with `var(--color-fg-secondary)`
  - `text-white/70` → `var(--color-fg-tertiary)`
  - `text-white/60` → `var(--color-fg-muted)`
  - `bg-white/5 border border-white/10 rounded-lg` → `.philosophy-card` with Canon tokens
  - All border colors to `var(--color-border-default)`
  - All border-radius to `var(--radius-lg)`
  - All spacing to Canon golden ratio tokens

## Remaining Files (To Be Migrated)

### High Priority (Most Violations)

#### 3. methodology/+page.svelte
**Violations**: ~50+ Tailwind design utilities
- Many `text-white/*` variations
- Multiple `bg-white/*` variations
- Border utilities (`border-white/*`)
- Rounded utilities (`rounded-lg`, `rounded-full`)
- Text size utilities (`text-xl`, `text-lg`, `text-sm`, `text-xs`)
- Shadow utilities would apply if present

**Required Classes**: `.hero`, `.process-visual`, `.pipeline-card`, `.tracking-mode-card`, `.comparison-section`, `.metrics-grid`, `.stat-card`, `.cta-button`, etc.

#### 4. experiments/+page.svelte
**Violations**: ~30+ design utilities
- Search input styling (`bg-white/5`, `border-white/10`, `text-white`, `placeholder-white/40`)
- Filter chips (`bg-white`, `text-black`, `bg-white/5`, `text-white/60`, `border-white/10`)
- Sort buttons (`bg-white`, `text-black`, `text-white/70`)
- Rounded utilities (`rounded-lg`, `rounded-full`, `rounded-md`)

**Required Classes**: `.search-input`, `.filter-chip`, `.filter-chip-active`, `.sort-control`, `.sort-button`, `.sort-button-active`

#### 5. experiments/motion-ontology/+page.svelte
**Violations**: ~40+ design utilities
- Form inputs (`bg-black/50`, `border-white/10`, `text-white`, `placeholder-white/30`, `rounded-lg`)
- Buttons (`bg-white`, `text-black`, `rounded-lg`)
- Result cards (`bg-white/5`, `border-white/10`, `rounded-xl`, `rounded-lg`)
- Status badges (color combinations)
- Text colors throughout

**Required Classes**: `.form-input`, `.form-select`, `.primary-button`, `.result-card`, `.status-badge`, `.status-badge-*`, etc.

### Medium Priority

#### 6. contact/+page.svelte
**Violations**: ~20 design utilities
- Card backgrounds and borders
- Text colors
- SVG icon colors
- Hover states

#### 7. experiments/minimal-capture/+page.svelte
**Violations**: ~25 design utilities
- ASCII art container
- Card backgrounds
- Text colors
- Code blocks

#### 8. categories/+page.svelte
**Violations**: ~15 design utilities
- Card backgrounds and hover states
- Gradient overlays
- Text colors

### Low Priority (Minor Violations or Already Mostly Compliant)

#### 9. terms/+page.svelte & privacy/+page.svelte
**Violations**: ~10 each (similar patterns)
- Mostly text colors (`text-white`, `text-white/70`, `text-white/60`)
- List styling
- Link colors

#### 10. praxis/+page.svelte
**Status**: Already uses Canon tokens extensively
**Action**: Verify completeness, ensure no Tailwind design utilities remain

#### 11. category/[slug]/+page.svelte
**Violations**: Minimal (~5-10)
- Some text colors
- Card styling

## Migration Pattern

For each file:
1. Identify all Tailwind design utilities in template
2. Create semantic class names based on component purpose
3. Move design properties to `<style>` block with Canon tokens
4. Keep all Tailwind layout utilities (flex, grid, p-*, m-*, gap-*, etc.)
5. Test that visual appearance matches original

## Canon Token Reference

### Colors
- `--color-fg-primary` → white text
- `--color-fg-secondary` → 80% opacity white
- `--color-fg-tertiary` → 60% opacity white
- `--color-fg-muted` → 40% opacity white
- `--color-bg-pure` → black (#000)
- `--color-bg-surface` → subtle surface (#111)
- `--color-border-default` → 10% opacity white
- `--color-border-emphasis` → 20% opacity white

### Spacing (Golden Ratio)
- `--space-xs` → 0.5rem
- `--space-sm` → 1rem
- `--space-md` → 1.618rem
- `--space-lg` → 2.618rem
- `--space-xl` → 4.236rem

### Border Radius
- `--radius-sm` → 6px
- `--radius-md` → 8px
- `--radius-lg` → 12px
- `--radius-xl` → 16px

### Typography
- `--text-body` → 1rem
- `--text-body-sm` → 0.875rem
- `--text-body-lg` → 1.125rem
- `--text-h1`, `--text-h2`, `--text-h3` → responsive clamp() values
- `--text-caption` → 0.75rem

## Estimated Effort
- High priority files: ~2-3 hours total
- Medium priority files: ~1-2 hours total
- Low priority files: ~30-60 minutes total
- Total: ~4-6 hours for complete migration
