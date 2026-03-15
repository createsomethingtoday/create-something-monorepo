# Experiments Content - Hybrid Architecture

## Pattern: Markdown Documentation + Interactive Components

Experiments use a **hybrid approach** that separates documentation from interactivity:

```
content/experiments/{slug}.md           ← Documentation, frontmatter, context
src/lib/experiments/{slug}.svelte       ← Interactive demo component
src/routes/experiments/[slug]/          ← Dynamic route (loads markdown)
```

## Why Hybrid?

Unlike papers (pure documentation), experiments include:
- Interactive visualizations
- Live data manipulation
- SVG/Canvas operations
- Scroll-driven animations

Markdown handles context; Svelte handles interaction.

## Frontmatter Schema

```yaml
---
title: "Experiment Title"
category: "research" | "tutorial"
abstract: "One-sentence description"
keywords: ["tag1", "tag2"]
publishedAt: "2025-01-08T00:00:00Z"
readingTime: 10
difficulty: "beginner" | "intermediate" | "advanced"
published: true
componentPath: "$lib/experiments/{slug}.svelte"  # Path to interactive component
---
```

## Component Import Pattern

In the markdown file:

```markdown
## Interactive Demo

<script>
  import DemoComponent from '$lib/experiments/component-name.svelte';
</script>

<DemoComponent />

## Analysis

...documentation continues...
```

MDsveX renders the imported component inline.

## Migration Status

- ✅ **text-revelation** - Proof of concept (hybrid pattern established)
- 🔄 **Remaining 14 experiments** - To be migrated iteratively

## When to Use Full Markdown

If an experiment becomes primarily documentation (interactivity removed or simplified), migrate to pure markdown like papers. The hybrid pattern allows gradual evolution.

## Directory Structure

```
content/experiments/
├── README.md                      ← This file
├── text-revelation.md             ← Hybrid (docs + component import)
└── [future experiments].md

src/lib/experiments/
├── text-revelation.svelte         ← Interactive component
└── [future components].svelte

src/routes/experiments/
├── [slug]/
│   ├── +page.server.ts           ← Loads from markdown OR database
│   └── +page.svelte              ← Renders markdown with components
└── {legacy-routes}/              ← To be migrated
```

## Next Steps

1. Move `text-revelation/+page.svelte` → `lib/experiments/text-revelation.svelte`
2. Update `[slug]` route to load from markdown content
3. Test MDsveX component import
4. Migrate remaining experiments iteratively as patterns emerge
