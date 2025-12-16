# CSS Migration to Canon Tokens - Status Report

**Task**: `lmy` - Migrate .io Papers to Canon CSS Tokens
**Status**: Pattern Established, Partial Implementation Complete

## Summary

Successfully completed the cross-property learning events implementation (`zf1`) and established the CSS migration pattern for papers. The task scope was large (5,731 lines across 6-7 papers), so I focused on:

1. ✅ Establishing the migration pattern
2. ✅ Partially migrating `understanding-graphs` paper as reference
3. ✅ Documenting the approach for completing remaining papers

## Completed Work

### Task 1: Cross-Property Learning Events (`zf1`) ✅

**Files Created:**
- `packages/lms/migrations/0003_learning_events.sql` - Database schema
- `packages/lms/src/routes/api/events/+server.ts` - Events API (POST/GET)
- `packages/components/src/lib/utils/learning.ts` - Shared tracking library
- `packages/io/src/lib/components/TrackedPaper.svelte` - Auto-tracking paper wrapper
- `packages/space/src/lib/utils/completion.ts` - Integrated event tracking
- `packages/ltd/src/lib/utils/tracking.ts` - Canon review tracking
- `packages/ltd/src/lib/components/TrackedPattern.svelte` - Pattern tracking wrapper
- `packages/components/src/lib/utils/LEARNING_TRACKING.md` - Complete documentation
- `LEARNING_EVENTS_IMPLEMENTATION.md` - Implementation summary

**Integration Points:**
- `.io`: Tracks paper_started, paper_completed, paper_reflected
- `.space`: Tracks experiment_started, experiment_completed (integrated with existing completion system)
- `.ltd`: Tracks canon_reviewed, principle_adopted
- `.agency`: API ready for methodology_applied, project_completed

**Deployment Ready:**
- Database migration ready to apply
- API endpoint functional
- Component library packaged and built
- Documentation complete

### Task 2: CSS Migration (`lmy`) - Partial ⚠️

**Pattern Established:**

Papers should follow this structure (reference: `code-mode-hermeneutic-analysis/+page.svelte`):

```svelte
<div class="min-h-screen p-6 paper-container">
  <div class="max-w-4xl mx-auto space-y-12">
    <!-- Header -->
    <div class="pb-8 paper-header">
      <div class="font-mono mb-4 paper-id">PAPER-ID</div>
      <h1 class="mb-3 paper-title">Title</h1>
      <p class="max-w-3xl paper-subtitle">Subtitle</p>
      <div class="flex gap-4 mt-4 paper-meta">...</div>
    </div>

    <!-- Abstract -->
    <section class="pl-6 space-y-4 abstract-section">
      <h2 class="section-heading">Abstract</h2>
      <p class="leading-relaxed body-text">...</p>
    </section>

    <!-- Content sections use semantic classes -->
    <h2 class="section-heading">Section</h2>
    <h3 class="subsection-heading">Subsection</h3>
    <div class="p-4 code-block">...</div>
    <div class="p-4 info-card">...</div>
  </div>
</div>

<style>
  /* Container */
  .paper-container {
    background: var(--color-bg-pure);
    color: var(--color-fg-primary);
  }

  /* Header */
  .paper-header {
    border-bottom: 1px solid var(--color-border-default);
  }

  .paper-id {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .paper-title {
    font-size: var(--text-h1);
  }

  .paper-subtitle {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-lg);
  }

  .paper-meta {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
  }

  /* Abstract */
  .abstract-section {
    border-left: 4px solid var(--color-border-emphasis);
  }

  /* Typography */
  .section-heading {
    font-size: var(--text-h2);
  }

  .subsection-heading {
    font-size: var(--text-h3);
    color: var(--color-fg-primary);
  }

  .body-text {
    color: var(--color-fg-secondary);
  }

  /* Code Blocks */
  .code-block {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    font-size: var(--text-body-sm);
  }

  .code-primary {
    color: var(--color-fg-primary);
  }

  .code-comment {
    color: var(--color-fg-muted);
  }

  /* Info Cards */
  .info-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .card-heading {
    font-weight: 600;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-lg);
  }

  .card-list {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
  }

  /* Callouts */
  .callout-box {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .callout-text {
    color: var(--color-fg-secondary);
  }

  /* Links */
  .text-link {
    text-decoration: underline;
    color: var(--color-fg-secondary);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .text-link:hover {
    color: var(--color-fg-primary);
  }

  /* Footer */
  .paper-footer {
    border-top: 1px solid var(--color-border-default);
  }

  .footer-text {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }
</style>
```

## Papers Status

| Paper | Lines | Status | Notes |
|-------|-------|--------|-------|
| `code-mode-hermeneutic-analysis` | 908 | ✅ Complete | Already using Canon tokens |
| `ethos-transfer-agentic-engineering` | 884 | ✅ Complete | Already using Canon tokens |
| `hermeneutic-spiral-ux` | 817 | ❌ Needs migration | Has hardcoded Tailwind |
| `kickstand-triad-audit` | 465 | ❌ Needs migration | Has hardcoded Tailwind |
| `understanding-graphs` | 496 | ⚠️ Partial | Header/Abstract/Impl sections migrated |
| `hermeneutic-debugging` | 640 | ✓ Likely complete | Need to verify |
| `subtractive-form-design` | 588 | ✓ Likely complete | Need to verify |
| `[slug]` (dynamic) | 449 | ✓ Check | Dynamic route |

## Migration Checklist

For each paper needing migration:

### 1. Replace Inline Tailwind with Semantic Classes

**Before:**
```svelte
<div class="bg-black text-white">
  <h1 class="text-4xl font-bold text-white">Title</h1>
  <p class="text-white/70 text-lg">Subtitle</p>
  <div class="bg-white/5 border border-white/10 rounded-lg p-4">
    <p class="text-sm text-white/60">Content</p>
  </div>
</div>
```

**After:**
```svelte
<div class="paper-container">
  <h1 class="paper-title">Title</h1>
  <p class="paper-subtitle">Subtitle</p>
  <div class="p-4 info-card">
    <p class="card-text">Content</p>
  </div>
</div>
```

### 2. Add Style Block

Copy the style block from `code-mode-hermeneutic-analysis/+page.svelte` and adapt as needed.

### 3. Keep Tailwind for Layout

These are fine to keep:
- `flex`, `grid`, `items-*`, `justify-*`
- `w-*`, `h-*`, `min-*`, `max-*`
- `p-*`, `m-*`, `gap-*`, `space-*`
- `relative`, `absolute`, `fixed`

### 4. Move to Canon Tokens

Replace these:
- `text-white*` → `var(--color-fg-*)`
- `bg-white*` / `bg-black` → `var(--color-bg-*)`
- `border-white*` → `var(--color-border-*)`
- `rounded-*` → `var(--radius-*)`
- `text-sm/lg/xl/2xl` → `var(--text-*)`
- `shadow-*` → `var(--shadow-*)`

## Remaining Work

### Immediate (to complete `lmy`)

1. **Finish `understanding-graphs` migration** (~200 lines remaining)
   - Migrate Results section (tables, validation cards)
   - Migrate Discussion section
   - Migrate Conclusion and References
   - Add complete style block

2. **Migrate `hermeneutic-spiral-ux`** (~817 lines)
   - Follow established pattern
   - Copy/adapt style block

3. **Migrate `kickstand-triad-audit`** (~465 lines)
   - Follow established pattern
   - Copy/adapt style block

4. **Verify remaining papers**
   - Check `hermeneutic-debugging`, `subtractive-form-design`, `[slug]`
   - Apply migrations if needed

### Estimated Time

- Finish `understanding-graphs`: ~30 min
- Migrate `hermeneutic-spiral-ux`: ~45 min
- Migrate `kickstand-triad-audit`: ~30 min
- Verify remaining: ~20 min
- **Total**: ~2 hours

## Next Steps

1. Continue CSS migration where left off
2. Apply database migration for learning events:
   ```bash
   cd packages/lms
   wrangler d1 migrations apply lms-db
   ```
3. Deploy updated properties:
   ```bash
   # LMS (new API)
   pnpm --filter=lms build
   wrangler pages deploy packages/lms/.svelte-kit/cloudflare --project-name=createsomething-lms

   # Components (new tracking utils)
   pnpm --filter=@create-something/components package

   # Properties (using new tracking)
   pnpm --filter=io build
   pnpm --filter=space build
   pnpm --filter=ltd build
   ```

## Canon Reflection

The learning events implementation embodies the Subtractive Triad:
- **DRY**: Unified API eliminates duplication across properties
- **Rams**: Minimal surface area, transparent integration
- **Heidegger**: Infrastructure disappears; only learning journey remains

The CSS migration continues this philosophy:
- **DRY**: Semantic classes eliminate inline duplication
- **Rams**: Canon tokens enforce "less, but better" design
- **Heidegger**: Design tokens serve the content, receding into use
