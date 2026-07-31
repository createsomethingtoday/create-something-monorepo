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

/**
 * Route assignment is a policy artifact: each study names an actual operating
 * condition and may serve no more than two public surface families.
 */
export const performanceWaterRouteAssignments = {
  '/map': 'clarityInspectionMedia',
  '/products': 'clarityInspectionMedia',
  '/services': 'turbulenceExceptionMedia',
  '/control': 'turbulenceExceptionMedia',
  '/delivery': 'settlementResolvedMedia',
  '/proof/marketplace-workflow': 'traceDyeInjectionMedia',
  '/products/loom': 'traceDyeInjectionMedia'
} as const;
