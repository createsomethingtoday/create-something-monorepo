# Ground MCP Cleanup Postmortem

**Date:** 2026-01-20  
**Incident:** Ground MCP false positives led to deletion of 21 actively used files  
**Impact:** Multiple packages broken (clearway, space, io)  
**Resolution Time:** ~2 hours to identify and restore all files

---

## What Happened

Ground MCP's orphan detection flagged 21 files as "unused" and recommended deletion. After deletion and commit (`cc6c8962`), we discovered that **13 of these files were actually in active use**, breaking multiple packages.

---

## Root Cause Analysis

Ground MCP's import resolution has **four critical blind spots** in framework-specific codebases:

### 1. Static Assets Referenced in HTML Templates
**What Ground MCP Missed:**
```html
<!-- packages/clearway/src/app.html -->
<link rel="icon" href="%sveltekit.assets%/favicon.svg" />
<link rel="manifest" href="%sveltekit.assets%/manifest.json" />
<meta property="og:image" content="https://clearway.pages.dev/og-image.svg" />
```

**Files Incorrectly Deleted:**
- `packages/clearway/static/favicon.svg`
- `packages/clearway/static/manifest.json`
- `packages/clearway/static/og-image.svg`
- `packages/clearway/static/robots.txt`
- `packages/clearway/static/sitemap.xml`
- `packages/clearway/static/ASSET_GENERATION.md`
- `packages/clearway/static/verify-seo.sh`

**Why It Failed:** Ground MCP doesn't parse HTML templates to detect asset references via `%sveltekit.assets%` or hardcoded URLs.

---

### 2. Co-Located Experiment Data (Relative Imports)
**What Ground MCP Missed:**
```typescript
// packages/io/src/routes/experiments/render-studio/+page.svelte
import { applySvgOperation } from './svg-operations';

// packages/io/src/routes/experiments/living-arena/+page.svelte
import { ARENA_ZONES } from './arenaData';
```

**Files Incorrectly Deleted:**
- `packages/io/src/routes/experiments/render-studio/svg-operations.ts`
- `packages/io/src/routes/experiments/living-arena/arenaData.ts`

**Why It Failed:** Ground MCP's import resolver doesn't properly trace relative imports (`./file`) within nested SvelteKit route directories.

---

### 3. Package-Specific Implementations with Extra Functionality
**What Ground MCP Missed:**

The `space` package had its own `completion.ts` with an **additional function** not present in the shared `@create-something/components` version:

```typescript
// packages/space/src/lib/utils/completion.ts (DELETED)
export function trackExperimentStart(slug: string): void { ... }
```

This function was used by `packages/space/src/routes/experiments/[slug]/+page.svelte`.

**Files Incorrectly Deleted:**
- `packages/space/src/lib/utils/completion.ts` (had `trackExperimentStart`)
- `packages/space/src/lib/utils/progress.ts` (space-specific utilities)
- `packages/space/src/lib/types/architecture.ts` (used by threshold-dwelling experiment)

**Why It Failed:** Ground MCP saw the shared `@create-something/components/utils` export and assumed the local version was redundant, without checking for **additional exports**.

---

### 4. Framework-Specific Patterns (SvelteKit `$lib` Aliases)
**What Ground MCP Missed:**

SvelteKit's `$lib` alias resolution:
```typescript
import { something } from '$lib/utils/completion';
```

Ground MCP doesn't fully understand SvelteKit's module resolution, leading to false positives for files imported via `$lib/*`.

---

## Files Correctly Deleted (No Issues)

These files were genuinely unused:
- `packages/webflow-automation/shared/*` (5 files) - Entire directory unused
- `packages/harness/src/test-patterns.ts` - Dead code
- `packages/io/src/lib/server/cache-invalidation.ts` - Dead code
- `packages/io/src/lib/types/paper.ts` - Dead code (Paper type moved to parent `types/`)

**Total:** 8 files correctly identified and removed.

---

## Successfully Completed Cleanup

### ✅ Duplicates Eliminated
- Extracted `getNextPaper` to `@create-something/components/utils`
- Deleted duplicate `recommendations.ts` from `io` and `space` packages
- **Similarity:** 98%

### ✅ Dead Code Removed
- 8 confirmed orphaned files deleted
- No false negatives detected

---

## Lessons Learned

### For Ground MCP Tool Authors
1. **Parse HTML templates** for asset references (`<link>`, `<meta>`, `<script>`)
2. **Improve relative import resolution** in nested directories
3. **Check for additional exports** before recommending deletion of "duplicate" files
4. **Add SvelteKit-specific resolution** for `$lib`, `$app`, `$env` aliases
5. **Warn about static assets** that might be referenced by URL rather than import

### For Agents Using Ground MCP
1. **Always verify builds** before committing deletions
2. **Review static asset directories** manually (Ground can't detect HTML/URL references)
3. **Check for package-specific implementations** that extend shared utilities
4. **Use `.ground.yml` aggressively** to document framework patterns
5. **Test incrementally** - delete a few files at a time, not 21 at once

---

## Updated `.ground.yml` Configuration

To prevent future false positives:

```yaml
ignore:
  paths:
    # SvelteKit architectural entry points
    - "**/hooks.server.ts"
    - "**/hooks.client.ts"
    - "**/hooks.ts"
    
    # Side-effect-only imports
    - "**/webflow/globals.ts"
    
    # Co-located experiment data (relative imports)
    - "**/experiments/*/arenaData.ts"
    - "**/experiments/*/svg-operations.ts"

monorepo:
  enabled: true
  entry_points:
    - "**/src/routes/+layout.server.ts"
    - "**/src/routes/+page.server.ts"
    - "**/src/app.html"
    - "**/wrangler.toml"
    - "**/package.json"
```

---

## Final Stats

| Metric | Count |
|--------|-------|
| **Files Flagged by Ground MCP** | 21 |
| **False Positives (Restored)** | 13 |
| **True Positives (Correctly Deleted)** | 8 |
| **False Positive Rate** | 62% |
| **Packages Broken** | 3 (clearway, space, io) |
| **Build Failures** | 3 |
| **Time to Detect & Fix** | ~2 hours |

---

## Conclusion

Ground MCP is a **powerful tool** for detecting dead code and duplicates, but it has **significant blind spots** in framework-specific codebases. The 62% false positive rate in this cleanup demonstrates the critical need for:

1. **Manual verification** of all deletions
2. **Incremental testing** (build after each deletion)
3. **Framework-aware configuration** (`.ground.yml`)
4. **Static asset awareness** (HTML templates, public directories)

**Recommendation:** Use Ground MCP as a **discovery tool**, not an automated cleanup tool. Always verify builds and manually review flagged files before deletion.

---

## Related Issues

- See `GROUND_MCP_ANALYSIS_2026_01_20.md` for the initial analysis
- See `GROUND_MCP_REANALYSIS_2026_01_20.md` for the post-configuration re-analysis
- Beads issue `csm-1vupj` tracks the successful duplicate extraction (recommendations.ts)
