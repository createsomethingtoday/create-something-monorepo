import pressureBoundary from './pressure-boundary-natural.webp';
import pressureBoundaryMobile from './pressure-boundary-natural-mobile.webp';

import type { PerformanceMediaStudy } from './types';

export const pressureBoundaryMedia = {
  src: pressureBoundary,
  mobileSrc: pressureBoundaryMobile,
  alt: 'Water striking a concrete boundary during a high-pressure wave impact'
} as const satisfies PerformanceMediaStudy;
