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
- glass and liquid-glass surface values

## Documentation Status

The full generated token tables are still being rebuilt. This page is live now so linked documentation resolves, and it points to the stable files that already exist in the package.

## Related

- [Get Started](/canon/resources/get-started)
- [Theming](/canon/guidelines/theming)
- [Figma](/canon/resources/figma)
