/**
 * Canon Experiments
 * 
 * Complete system components that are used within a single experiment.
 * 
 * ## The Graduation Pattern
 * 
 * Components start here when they're:
 * - Part of a complete system experiment
 * - Used only once (1 of 1)
 * 
 * When a component is used in 2+ experiments, it graduates to:
 * - `@create-something/canon/components` (shared UI)
 * - `@create-something/canon/domains/{property}` (domain-specific)
 * 
 * ## Usage
 * 
 * ```typescript
 * // Import complete system
 * import { FloorPlan, Elevation } from '@create-something/canon/experiments/threshold-dwelling';
 * import { FluidAssembly } from '@create-something/canon/experiments/kinetic-typography';
 * import { crowdSimulation } from '@create-something/canon/experiments/living-arena-gpu';
 * ```
 * 
 * ## Available Systems
 * 
 * - `threshold-dwelling` — Architectural visualization (11 components)
 * - `kinetic-typography` — Text animation (1 component)
 * - `living-arena` — SVG arena simulation (3 modules)
 * - `living-arena-gpu` — WebGPU crowd simulation (6 modules + 6 shaders)
 * - `render-preview` — Preview canvas (1 component)
 * - `render-studio` — SVG rendering workflow (2 components + 1 module)
 * 
 * ## Moved to property packages (depend on $lib)
 * 
 * - `nba-live` — Moved to packages/space/src/lib/experiments/nba-live (depends on $lib/nba)
 */

// Re-export all experiments for convenience
// (nba-live moved to packages/space due to $lib/nba dependency)
export * as thresholdDwelling from './threshold-dwelling/index.js';
export * as kineticTypography from './kinetic-typography/index.js';
export * as livingArena from './living-arena/index.js';
export * as livingArenaGpu from './living-arena-gpu/index.js';
export * as renderPreview from './render-preview/index.js';
export * as renderStudio from './render-studio/index.js';
