# Grid Logo Experiment

## Overview

Create an interactive grid-based logo experiment on createsomething.io exploring the geometric foundation of the CREATE SOMETHING identity.

**Philosophy**: This experiment embodies Aletheia (unconcealment). The logo does not get added to a grid—it emerges from it. The construction IS the meaning. Users interact with the grid to reveal the underlying geometric logic, experiencing how form arises from structure.

**Current State**: The existing isometric cube logo is a finished artifact. Its construction geometry is invisible. No interactive exploration of logo construction exists in the codebase.

**Approach**: Build two logo concepts from the same 12x12 isometric grid:
1. **Grid-Reveal Cube**: The existing isometric cube with construction lines made visible
2. **CS Lettermark**: A new "CS" monogram using Morphic-inspired grid geometry (30° isometric angles)

Three interaction modes let users discover the logos:
- **Click-to-Reveal**: Click cells to illuminate construction lines (Zuhandenheit)
- **Drag-Paint**: Mouse/finger brush across grid (Gelassenheit)
- **Timeline-Scrub**: Slider controls 0-100% reveal progress (Vorhandenheit)

**Canon Token Reference**:
- Background: `--color-bg-pure`, `--color-bg-surface`
- Grid lines: `--color-border-default`, `--color-border-emphasis`
- Logo paths: `--color-fg-primary`
- Reveal glow: `--color-fg-tertiary`
- Timing: `--duration-micro` (200ms), `--duration-standard` (300ms), `--duration-complex` (500ms)
- Easing: `--ease-standard`

**Critical Files**:
- `packages/components/src/lib/visual/isometric.ts` - Reuse `toIsometric()`, `isometricBoxPath()`
- `packages/io/src/lib/config/fileBasedExperiments.ts` - Metadata registry
- `packages/io/src/routes/experiments/text-revelation/+page.svelte` - Page structure pattern

## Features

### Create TypeScript interfaces for grid state
Create `packages/io/src/routes/experiments/grid-logo/types.ts` with grid interfaces.
- Define `CellState` type: 'hidden' | 'anticipating' | 'revealing' | 'revealed' | 'logo-path'
- Define `GridCell` interface with row, col, state, isLogoPart boolean
- Define `GridState` interface with cells Map, revealProgress number, logoVisible boolean
- Define `InteractionMode` type: 'click' | 'drag' | 'timeline'
- Define `LogoType` type: 'cube' | 'cs-lettermark'
- Export all types for use by components

### Create grid geometry utilities
Create `packages/io/src/routes/experiments/grid-logo/gridGeometry.ts` with math functions.
- Import `toIsometric` from `@create-something/components` visual utilities
- Define `GRID_SIZE = 12` constant
- Create `generateGridLines()` function returning isometric line coordinates
- Create `getCellKey(row, col)` helper returning string key
- Create `getAdjacentCells(row, col)` returning neighbor coordinates
- Create `getCubeLogoCells()` returning cells that form the cube logo
- Create `getCSLettermarkCells()` returning cells that form CS lettermark
- Create `calculateRevealProgress(cells, logoType)` computing 0-1 progress
- Use 30-degree isometric angles (ISO_ANGLE from isometric.ts)

### Create GridCanvas SVG component
Create `packages/io/src/routes/experiments/grid-logo/GridCanvas.svelte` as the core interactive surface.
- Accept props: `logoType`, `interactionMode`, `onProgress` callback
- Render 400x400 SVG with viewBox preserving aspect ratio
- Layer 1: Background grid lines at opacity 0.1 using `--color-border-default`
- Layer 2: Construction lines that animate opacity on reveal
- Layer 3: Logo paths that fade in at 70% reveal threshold
- Each grid cell is a clickable/hoverable region
- Track cell states in reactive Map using $state rune
- Handle mouse/touch events for all three interaction modes
- Apply Canon tokens for all colors and timing
- Include `aria-label` for accessibility

### Create CubeReveal component
Create `packages/io/src/routes/experiments/grid-logo/CubeReveal.svelte` wrapping GridCanvas for cube mode.
- Import `isometricBoxPath` from components visual utilities
- Pass `logoType="cube"` to GridCanvas
- Define cube face paths using existing isometric math
- Cube sits in center 6x6 region of 12x12 grid
- Three visible faces: top, left, right with distinct construction lines
- Construction lines show the 30-degree angles and center vertex
- Logo fades in when 70% of cube-relevant cells are revealed
- Include brief description text explaining the cube's grid foundation

### Create CSLettermark component
Create `packages/io/src/routes/experiments/grid-logo/CSLettermark.svelte` wrapping GridCanvas for CS mode.
- Pass `logoType="cs-lettermark"` to GridCanvas
- Design "C" using left-facing 30-degree arc (like cube's left face, opened)
- Design "S" using alternating 30-degree diagonals creating serpentine
- Both letters share vertical height and grid module
- Stroke-based paths (fill="none", stroke-width="2")
- Construction shows how both emerge from same grid geometry
- Include brief description comparing to Morphic's approach

### Create InteractionController component
Create `packages/io/src/routes/experiments/grid-logo/InteractionController.svelte` for mode switching.
- Three tab buttons: Click, Drag, Timeline
- Timeline mode shows range input (0-100%)
- Display current reveal progress as percentage
- Reset button to clear all revealed cells
- Bind selected mode to parent via props
- Style tabs using Canon tokens (bg-surface, border-default)
- Highlight active tab with border-emphasis

### Create main experiment page
Create `packages/io/src/routes/experiments/grid-logo/+page.svelte` as the experiment wrapper.
- Import all components (GridCanvas, CubeReveal, CSLettermark, InteractionController)
- Header section with title, category badge, reading time
- Abstract section explaining Aletheia and grid-based design
- Side-by-side layout: Cube on left, CS Lettermark on right
- Shared InteractionController above both canvases
- Progress indicators for each logo independently
- Philosophy section explaining Subtractive Triad application
- Implementation notes section with technical details
- Tags and principles list at bottom
- Full Canon compliance (no hardcoded colors)
- Responsive: stack vertically on mobile (< 768px)

### Add fileBasedExperiments metadata entry
Update `packages/io/src/lib/config/fileBasedExperiments.ts` with grid-logo entry.
- id: 'file-grid-logo'
- slug: 'grid-logo'
- title: 'Grid as Revelation: When Structure Becomes Logo'
- description explaining Aletheia and interactive grid exploration
- category: 'research'
- tags: ['Logo Design', 'Isometric', 'Grid Systems', 'Aletheia', 'Interactive', 'SVG']
- reading_time_minutes: 10
- difficulty: 'intermediate'
- is_file_based: true
- tests_principles: ['heidegger-aletheia', 'heidegger-zuhandenheit', 'rams-principle-10', 'subtractive-triad']
- ASCII art showing grid pattern

### Implement touch support for mobile
Enhance GridCanvas.svelte with proper touch event handling.
- Add touchstart, touchmove, touchend event listeners
- Prevent default scroll behavior during drag interaction
- Map touch coordinates to grid cells using getBoundingClientRect
- Consider 8x8 grid density on viewports < 480px for larger touch targets
- Test on iOS Safari and Android Chrome touch behaviors

### Add keyboard navigation for accessibility
Enhance GridCanvas.svelte with keyboard support.
- Make SVG focusable with tabindex="0"
- Arrow keys move focus between grid cells
- Space/Enter reveals focused cell
- Escape resets to hidden state
- Announce state changes via aria-live region
- Visible focus indicator using `--color-focus` token

### Build verification and Canon audit
Verify the experiment builds and passes Canon compliance.
- Run `pnpm --filter=io build` and fix any TypeScript errors
- Test at viewport widths: 375px, 768px, 1024px, 1440px
- Verify all three interaction modes work correctly
- Confirm logo fade-in at 70% threshold
- Run `/audit-canon packages/io/src/routes/experiments/grid-logo`
- No hardcoded colors (hex, rgb, rgba)
- All timing uses Canon duration tokens
- All easing uses `--ease-standard`
- Grep for any Tailwind design utilities that should be Canon tokens
