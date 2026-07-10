import pressureBoundary from './pressure-boundary.webp';
import pressureBoundaryMobile from './pressure-boundary-mobile.webp';

import type { PerformanceMediaStudy } from './types';

export const pressureBoundaryMedia = {
  src: pressureBoundary,
  mobileSrc: pressureBoundaryMobile,
  alt: 'Water striking a transparent boundary in a controlled laboratory channel'
} as const satisfies PerformanceMediaStudy;
