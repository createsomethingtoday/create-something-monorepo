---
title: "Test Markdown Paper"
subtitle: "Validating the markdown infrastructure"
authors: ["Micah Johnson"]
category: "Infrastructure"
abstract: "This is a test paper to validate the markdown + MDsveX infrastructure works correctly with PageActions."
keywords: ["infrastructure", "markdown", "mdsvex"]
publishedAt: "2026-01-07"
readingTime: 2
difficulty: "beginner"
published: true
---

## Introduction

This is a test paper written in **markdown** with full support for:

- Svelte component embedding (MDsveX)
- PageActions integration
- Canon-compliant styling
- Type-safe frontmatter

## Features

The infrastructure provides:

1. **Version-controlled content** - Markdown files in git
2. **Full Svelte capabilities** - Can embed components via MDsveX
3. **Automatic PageActions** - Every paper gets export functionality
4. **Type safety** - Frontmatter validated at build time

## Code Example

```typescript
import { loadContentBySlug } from '@create-something/components/utils';

const paper = await loadContentBySlug<PaperFrontmatter>(
  '../content/papers/*.md',
  'test-markdown-paper'
);
```

## Table Example

| Feature | Status |
|---------|--------|
| Markdown | ✅ |
| MDsveX | ✅ |
| PageActions | ✅ |
| TypeScript | ✅ |

## Conclusion

The markdown infrastructure preserves all richness while eliminating duplication.
