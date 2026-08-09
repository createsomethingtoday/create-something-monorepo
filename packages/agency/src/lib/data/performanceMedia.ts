import type { PerformanceMediaStudy } from '@create-something/canon';

export const paperOperatingRouteMedia = {
  src: '/images/performance-lab/paper-operating-route.webp',
  mobileSrc: '/images/performance-lab/paper-operating-route-mobile.webp',
  alt: 'A blank porcelain source sheet crosses scored folds and a black control bridge before ending at one cobalt operating-route tab',
  condition: 'sequence',
  material: 'paper',
  width: 1536,
  height: 1024,
  objectPosition: 'center',
  colorMode: 'natural'
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
  '/delivery': 'paperAttachedReceiptMedia',
  '/proof/marketplace-workflow': 'paperAttachedReceiptMedia',
  '/field-reports/template-review': 'paperAttachedReceiptMedia',
  '/products/loom': 'paperAttachedReceiptMedia'
} as const;
