---
category: "Canon"
section: "Resources"
title: "Token Reference"
description: "Entry point for the Canon token files and the formats they ship in today."
lead: "Canon tokens are the source material for color, spacing, typography, motion, and surface behavior. Start from the canonical files instead of hardcoding values."
publishedAt: "2026-04-14"
published: true
---

## Canonical Artifacts

- `@create-something/canon/styles/tokens.css`
- `@create-something/canon/styles/canon.css`
- `@create-something/canon/styles/tokens.scss`
- `@create-something/canon/styles/tokens.dtcg.json`
- `@create-something/canon/styles/tokens.figma.json`

In the monorepo, the source files live under `packages/canon/src/lib/styles/`.

## Recommended Imports

```css
@import '@create-something/canon/styles/tokens.css';
```

```css
@import '@create-something/canon/styles/canon.css';
```

## What The Token Files Cover

- core backgrounds, foregrounds, borders, and interactive states
- shell surfaces and product accent layers
- semantic status colors
- spacing, radius, shadows, z-index, and motion scales
- glass-named compatibility roles, which resolve to solid surfaces and zero blur by default

## Import responsibilities and scopes

Use `canon.css` for base styles, local Geist loading and shared foundation styles. `tokens.css` contains variables only; token-only consumers own resets and font loading. Do not import both merely to duplicate the foundation.

The default foundation is black. `data-theme="light"` explicitly rebinds semantic roles; nested `data-theme="dark"` restores black. The specialist operator palette remains opt-in and namespaced. Generated artifacts are portable snapshots of the canonical CSS source; do not treat a smaller TypeScript token subset as a full replacement for every mode.

Use semantic roles instead of copying values into route styles. Verify contrast on the actual surface and preserve textual state labels.

## Related

- [Get Started](/canon/resources/get-started)
- [Theming](/canon/guidelines/theming)
- [Figma](/canon/resources/figma)
