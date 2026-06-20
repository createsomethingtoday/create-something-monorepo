# Paper Migration Guide

## Overview

This guide documents how to migrate papers from static Svelte routes to the markdown content system.

## Infrastructure (Completed)

- `src/routes/papers/[slug]/+page.server.ts` - Dynamic route that serves file-based papers
- `src/routes/papers/[slug]/+page.svelte` - Template for rendering file-based papers
- `src/lib/config/fileBasedPapers.ts` - Configuration for file-based papers
- `src/lib/config/paperCatalog.ts` - Shared archive, manifest, and sitemap catalog
- `scripts/check-paper-catalog.mjs` - Drift guard for paper routes and sitemap ownership

## Migration Steps

### 1. Add Paper to Configuration

Edit `src/lib/config/fileBasedPapers.ts`:

```typescript
{
  id: 'paper-my-paper',
  slug: 'my-paper',
  title: 'My Paper Title',
  description: 'Short description',
  excerpt_short: 'One line summary',
  excerpt_long: 'Longer summary paragraph',
  category: 'Case Study', // or 'Research', 'Tutorial', etc.
  tags: ['Tag1', 'Tag2'],
  created_at: '2026-01-30T00:00:00Z',
  updated_at: '2026-01-30T00:00:00Z',
  reading_time_minutes: 15,
  difficulty: 'intermediate', // beginner, intermediate, advanced
  is_file_based: true,
  tests_principles: ['rams-principle-2', 'subtractive-triad'],
  ascii_art: `ASCII art here`
}
```

### 2. Create Markdown Content

Create `content/papers/{slug}.md` with frontmatter:

```markdown
---
title: "Paper Title"
subtitle: "Optional subtitle"
authors: ["Author Name"]
category: "Case Study"
abstract: "Paper abstract..."
keywords: ["keyword1", "keyword2"]
publishedAt: "2026-01-30"
readingTime: 15
difficulty: "intermediate"
published: true
---

## Section 1

Content here...
```

### 3. Delete Static Route

Remove the static route directory:

```bash
rm -rf src/routes/papers/{slug}/
```

### 4. Verify

1. Check: `pnpm --filter @create-something/io check`
2. Build: `pnpm --filter @create-something/io build`
3. Test: Visit `/papers/{slug}`, `/api/manifest`, and `/sitemap.xml`
4. Check: PageActions, ShareButtons, SEO, manifest output, and sitemap output

## Papers to Migrate

### High Priority (frequently updated)
- [ ] webflow-dashboard-refactor
- [ ] autonomous-harness-architecture
- [ ] spec-driven-development

### Standard Priority
- [ ] norvig-partnership
- [ ] code-mode-hermeneutic-analysis
- [ ] cumulative-state-antipattern
- [ ] ethos-transfer-agentic-engineering
- [ ] haiku-optimization
- [ ] harness-agent-sdk-migration
- [ ] hermeneutic-debugging
- [ ] hermeneutic-spiral-ux
- [ ] hermeneutic-triad-review
- [ ] intellectual-genealogy
- [ ] kickstand-triad-audit
- [ ] subtractive-form-design
- [ ] subtractive-studio
- [ ] understanding-graphs

### Already Using Dynamic Route
- [x] ground-case-study (created 2026-01-30)

## Content Extraction Tips

The static Svelte files contain:
1. **SEO component** - Extract title, description, keywords
2. **Paper header** - Extract title, subtitle, category, reading time
3. **Sections** - Convert to markdown headings
4. **Code blocks** - Keep as fenced code blocks
5. **Tables** - Convert to markdown tables
6. **Comparison cards** - Convert to styled blockquotes or tables
7. **Custom styles** - May need to create Canon equivalents

### Example Conversion

**Svelte:**
```svelte
<section class="space-y-6">
  <h2 class="section-heading">I. Introduction</h2>
  <p class="body-text">Content here...</p>
</section>
```

**Markdown:**
```markdown
## I. Introduction

Content here...
```

## Notes

- Static routes take precedence over dynamic routes
- Papers with interactive components should stay as static routes
- The ArticleContent component renders markdown via html_content field
