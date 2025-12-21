# CREATE SOMETHING Brand Module

## Overview

Create a systematic brand icon/mark module following "creation is removing what obscures" philosophy. Uses isometric cube geometry and SVG-native animations.

**Location**: `packages/components/src/lib/brand/`

## Features

### Create brand module directory structure
Set up the brand module folder hierarchy.
- Create `packages/components/src/lib/brand/` directory
- Create subdirectories: marks/, icons/, states/, social/, utils/
- Add index.ts exports for each subdirectory
- Add types.ts with shared interfaces

### Implement cube geometry utilities
Add cube-specific path generation.
- Create `utils/cube-geometry.ts`
- Implement `cubeMarkPath(size)` using isometric.ts
- Implement `faviconCubePath(viewBox)` for favicon
- Implement `cubeBounds(size)` for layout

### Implement cube animation utilities
Add animation primitives for cube marks.
- Create `utils/cube-animations.ts`
- Implement `cubeRevealAnimation(faceIndex, opts)`
- Implement `cubePulseAnimation(opts)`
- Follow existing animations.ts patterns

### Create CubeMark component
Build the core isometric cube logo mark.
- Create `marks/CubeMark.svelte`
- Implement size, animate, animationType, variant props
- Use cubeMarkPath() for geometry
- Add SVG animate elements for reveal/pulse/assemble
- Style with Canon tokens for face colors

### Create Wordmark component
Build the CREATE SOMETHING text mark.
- Create `marks/Wordmark.svelte`
- Implement size scale mapping to Canon typography
- Add reveal animation with word stagger
- Support tagline and split layout options

### Create PropertyMark component
Build property-specific marks.
- Create `marks/PropertyMark.svelte`
- Implement property prop (io/ltd/space/agency)
- Support full/abbreviated/icon-only variants
- Optionally include CubeMark

### Create CubeLoader component
Build cube-based loading spinner.
- Create `states/CubeLoader.svelte`
- Implement spin, pulse, assemble variants
- Include optional message prop
- Add aria-live and aria-busy for a11y

### Create CubeSkeleton component
Build skeleton placeholder with cube motif.
- Create `states/CubeSkeleton.svelte`
- Implement lines, showHeader, showImage props
- Add shimmer animation via CSS

### Create OGImage component
Build dynamic OG image generator.
- Create `social/OGImage.svelte`
- Implement 1200x630 layout
- Include CubeMark, title, subtitle, property

### Create og-template utility
Build static SVG template for server-side rendering.
- Create `social/og-template.ts`
- Export function generating SVG string
- Parameterize title, property, variant

### Create CSS-based cube icons
Build performant CSS icon definitions.
- Create `icons/cube-icons.css`
- Define .icon-cube class with mask-image
- Add size variants (sm, md, lg)

### Update canonical favicon
Create unified favicon for all properties.
- Create `packages/components/static/favicon.svg`
- Use isometric cube at 32x32 viewBox
- Apply Canon face opacity convention

### Update component package exports
Export brand module from main entry.
- Update `packages/components/src/lib/index.ts`
- Add brand module exports
- Verify TypeScript path resolution

### Clean up failed experiment
Remove or archive the subtractive-revelation experiment.
- Delete `packages/io/src/routes/experiments/subtractive-revelation/`
- Remove from fileBasedExperiments.ts
- Keep plan notes for reference

## Success Criteria

- [ ] CubeMark renders correctly at 16px, 32px, 48px, 64px
- [ ] All animations use SVG `<animate>` (no CSS/JS)
- [ ] Canon tokens used exclusively (no hardcoded values)
- [ ] Reduced motion respected
- [ ] Favicon consistent across all 4 properties
- [ ] Build passes: `pnpm --filter=components build`
