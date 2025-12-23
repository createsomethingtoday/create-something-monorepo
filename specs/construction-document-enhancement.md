# Construction Document Enhancement

## Overview

Enhance threshold-dwelling SVG drawings to construction-document quality. The architectural visualization experiment already renders floor plans, sections, and elevations as SVG. This work adds the refinements that make drawings read as professional construction documents: line weight hierarchy, material hatching, proper dimension chains, and scale bars.

**Philosophy**: Tufte's data-ink ratio meets Mies's structural clarity. Every mark serves information—no decoration. Hatching appears only in fullscreen view (Rams: information on demand).

**Canon Compliance**: All colors via CSS tokens. No inline rgba values. Hatching uses `--arch-hatch-*` tokens already added to app.css.

**Files**:
- `packages/space/src/app.css` - Construction document tokens (already added)
- `packages/space/src/lib/components/ArchitecturalPatterns.svelte` - New: SVG pattern definitions
- `packages/space/src/lib/components/Section.svelte` - Hatching for cut elements
- `packages/space/src/lib/components/Elevation.svelte` - Ground hatching
- `packages/space/src/lib/components/FloorPlan.svelte` - Scale bar, title block

## Features

### Create ArchitecturalPatterns component with SVG pattern definitions
Create `packages/space/src/lib/components/ArchitecturalPatterns.svelte` containing reusable SVG `<defs>` for hatching patterns.
- Create `concrete-hatch` pattern: stipple dots for section cuts through concrete
- Create `earth-hatch` pattern: 45-degree diagonal lines for grade/ground fill
- Create `wood-hatch` pattern: grain lines for cedar millwork sections
- Create `insulation-hatch` pattern: wavy lines for wall cavity
- Export as component that renders `<defs>` inside parent SVG
- Use `--arch-hatch-color` and `--arch-hatch-opacity` tokens

### Enhance Section.svelte with hatching and improved dimensions
Update `packages/space/src/lib/components/Section.svelte` to use construction document patterns.
- Import ArchitecturalPatterns component
- Add `expanded` prop to control hatching visibility
- Apply `concrete-hatch` fill to elements where `filled: true`
- Apply `earth-hatch` to ground fill below grade line
- Replace inline `rgba(255,255,255,0.2)` with `var(--arch-dimension-color)`
- Add extension lines from elements to dimension marks
- Use `--arch-stroke-fine` for dimension lines

### Enhance Elevation.svelte with ground hatching and tokens
Update `packages/space/src/lib/components/Elevation.svelte` with Canon-compliant styling.
- Import ArchitecturalPatterns component
- Add `expanded` prop to control hatching visibility
- Apply `earth-hatch` to ground fill below grade
- Replace inline `rgba(255,255,255,0.2)` with `var(--arch-dimension-color)`
- Use line weight tokens for stroke widths

### Add scale bar component to FloorPlan
Update `packages/space/src/lib/components/FloorPlan.svelte` with scale bar and title block.
- Add graphic scale bar at bottom showing 0'-5'-10'-15'-20' intervals
- Add minimal title block: project name and scale notation
- Use `--arch-scale-color` and `--arch-title-*` tokens
- Apply line weight hierarchy tokens to existing strokes

### Verification
Confirm all changes render correctly and follow Canon.
- Run `pnpm --filter=space build` with zero errors
- Visual check: hatching only appears when drawing is expanded/fullscreen
- Grep check: `grep -r "rgba(255,255,255" packages/space/src/lib/components/Section.svelte` returns 0
- Grep check: `grep -r "rgba(255,255,255" packages/space/src/lib/components/Elevation.svelte` returns 0
