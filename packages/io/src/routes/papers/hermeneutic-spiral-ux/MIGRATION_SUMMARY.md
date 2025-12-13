# CSS Canon Migration Summary

## Task Complexity
This migration is more complex than anticipated. The file has 594 lines with numerous Tailwind design utilities throughout. A complete manual migration requires:

1. Finding ALL instances of:
   - `text-2xl`, `text-xl`, `text-lg`, `text-sm` → need semantic classes
   - `text-white/90`, `text-white/70`, `text-white/60`, `text-white/40` → need semantic classes
   - `border-white/10`, `border-white/20` → need semantic classes
   - Multiple subsection headings without consistent class names

2. Creating semantic classes for each context
3. Updating the style block accordingly

## Recommended Approach
Given the scope, I recommend:

1. **Create a shared paper component** in `packages/io/src/lib/components/Paper.svelte` with canonical styles
2. **Use that component** across all paper pages
3. This follows DRY and ensures consistency

## Alternative: Batch Script
Create a script to:
1. Parse all paper files
2. Extract common patterns
3. Generate semantic class replacements
4. Apply systematically

This is a larger refactoring that should be tracked as a separate task.
