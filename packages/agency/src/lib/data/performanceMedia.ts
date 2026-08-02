import type { PerformanceMediaStudy } from '@create-something/canon';

export const traceDyeInjectionMedia = {
  src: '/images/performance-lab/trace-dye-injection.webp',
  mobileSrc: '/images/performance-lab/trace-dye-injection-mobile.webp',
  alt: 'A cobalt tracer filament persisting downstream from an injection port in a measured glass water channel',
  condition: 'provenance'
} as const satisfies PerformanceMediaStudy;

export const turbulenceExceptionMedia = {
  src: '/images/performance-lab/turbulence-exception.webp',
  mobileSrc: '/images/performance-lab/turbulence-exception-mobile.webp',
  alt: 'A bounded laboratory vortex held beside a gauge rod and steel baffle for exception inspection',
  condition: 'exception'
} as const satisfies PerformanceMediaStudy;

export const clarityInspectionMedia = {
  src: '/images/performance-lab/clarity-inspection.webp',
  mobileSrc: '/images/performance-lab/clarity-inspection-mobile.webp',
  alt: 'A calibration scale and datum line remaining legible through still water in a glass inspection rig',
  condition: 'inspection'
} as const satisfies PerformanceMediaStudy;

export const settlementResolvedMedia = {
  src: '/images/performance-lab/settlement-resolved.webp',
  mobileSrc: '/images/performance-lab/settlement-resolved-mobile.webp',
  alt: 'Still water settled at a datum line with a residue mark recording the basin’s earlier level',
  condition: 'resolved'
} as const satisfies PerformanceMediaStudy;

export const paperFoldedHandoffMedia = {
  src: '/images/performance-lab/paper-folded-handoff.webp',
  mobileSrc: '/images/performance-lab/paper-folded-handoff-mobile.webp',
  alt: 'A porcelain paper route crossing two hard folds and a black transfer bridge before settling at a cobalt handoff tab',
  condition: 'sequence',
  material: 'paper',
  width: 1536,
  height: 1024,
  objectPosition: 'center',
  colorMode: 'natural'
} as const satisfies PerformanceMediaStudy;

export const paperClampedDecisionMedia = {
  src: '/images/performance-lab/paper-clamped-decision.webp',
  mobileSrc: '/images/performance-lab/paper-clamped-decision-mobile.webp',
  alt: 'A porcelain paper edge held upright by a black decision rail with one gold authority tab at the stop boundary',
  condition: 'pressure',
  material: 'paper',
  width: 1536,
  height: 1024,
  objectPosition: 'center',
  colorMode: 'natural'
} as const satisfies PerformanceMediaStudy;

export const paperAttachedReceiptMedia = {
  src: '/images/performance-lab/paper-attached-receipt.webp',
  mobileSrc: '/images/performance-lab/paper-attached-receipt-mobile.webp',
  alt: 'A blank perforated paper receipt physically stitched to its folded source sheet beside a small green proof tab',
  condition: 'stamp',
  material: 'paper',
  width: 1536,
  height: 1024,
  objectPosition: 'center',
  colorMode: 'natural'
} as const satisfies PerformanceMediaStudy;

export const paperProductSystemMedia = {
  src: '/images/performance-lab/paper-product-system.webp',
  mobileSrc: '/images/performance-lab/paper-product-system-mobile.webp',
  alt: 'Three porcelain paper modules registered to one black system spine with blue source, gold connection, and green operation markers',
  condition: 'sequence',
  material: 'paper',
  width: 1536,
  height: 1024,
  objectPosition: 'center',
  colorMode: 'natural'
} as const satisfies PerformanceMediaStudy;

export const performancePaperRouteAssignments = {
  '/': 'paperFoldedHandoffMedia',
  '/services': 'paperClampedDecisionMedia',
  '/products': 'paperProductSystemMedia',
  '/field-reports': 'paperAttachedReceiptMedia'
} as const;

/**
 * Route assignment is a policy artifact: each study names an actual operating
 * condition and may serve no more than two public surface families.
 */
export const performanceWaterRouteAssignments = {
  '/map': 'clarityInspectionMedia',
  '/control': 'turbulenceExceptionMedia',
  '/delivery': 'settlementResolvedMedia',
  '/proof/marketplace-workflow': 'traceDyeInjectionMedia',
  '/products/loom': 'traceDyeInjectionMedia'
} as const;
