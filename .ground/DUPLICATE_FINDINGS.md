# Ground Duplicate Detection Findings

**Generated**: 2026-01-24  
**Status**: Known technical debt for future consolidation

## Summary

Ground duplicate detection found 4 clusters of similar code that could be consolidated.

## Cluster 1: Content Loaders

**Files**:
- `packages/ltd/src/lib/content-loader.ts` - `loadPatternBySlug()`, `getPatternSlugs()`
- `packages/agency/src/lib/content-loader.ts` - `loadWorkBySlug()`, `getWorkSlugs()`
- `packages/io/src/lib/content-loader.ts` - `loadPaperBySlug()`, `getPaperSlugs()`

**Pattern**: Each property has a content loader that loads MDsveX content by slug.

**Recommendation**: Create a generic content loader factory in Canon:

```typescript
// @create-something/canon/utils/content-loader.ts
export function createContentLoader<T>(globPattern: string) {
  return {
    async loadBySlug(slug: string): Promise<T | null> { ... },
    async getSlugs(): Promise<string[]> { ... }
  };
}

// Usage in property
import { createContentLoader } from '@create-something/canon/utils';
const { loadBySlug, getSlugs } = createContentLoader<Pattern>('./patterns/*.md');
```

**Priority**: Medium - reduces 100+ lines of duplicate code

---

## Cluster 2: ID Generators

**Files**:
- `packages/agency/src/lib/proposals/generator.ts` - `generateId()`
- `packages/agency/src/lib/social/strategy.ts` - `generatePostId()`, `generateThreadId()`

**Pattern**: Simple ID generation using timestamps and random strings.

**Recommendation**: Add to Canon utils:

```typescript
// @create-something/canon/utils/id.ts
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}
```

**Priority**: Low - simple functions, low maintenance burden

---

## Cluster 3: Tool Executors

**Files**:
- `packages/io/src/lib/agents/pm-agent/gmail-tools.ts` - `executeGmailTool()`
- `packages/io/src/lib/agents/pm-agent/tools.ts` - `executeTool()`

**Pattern**: Similar tool execution patterns for agent operations.

**Recommendation**: This is domain-specific to the PM agent. Consider a shared tool executor base class if more agent types are added.

**Priority**: Low - agent-specific, not widely reused

---

## Action Items

1. [ ] Create generic content loader factory (Cluster 1)
2. [ ] Add `generateId()` to Canon utils (Cluster 2)
3. [ ] Monitor agent patterns - consolidate if more agents added (Cluster 3)

## Notes

These duplicates were intentionally left in place during the Canon consolidation because:
- They work correctly as-is
- Consolidation requires careful API design
- Each property has slightly different content types

The Ground duplicate detection will continue to flag these until consolidated.
