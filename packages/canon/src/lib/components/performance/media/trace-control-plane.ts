import traceControlPlane from './trace-control-plane.webp';
import traceControlPlaneMobile from './trace-control-plane-mobile.webp';

import type { PerformanceMediaStudy } from './types';

export const traceControlPlaneMedia = {
  src: traceControlPlane,
  mobileSrc: traceControlPlaneMobile,
  alt: 'Water moving through a mechanical gate and leaving a visible downstream trace'
} as const satisfies PerformanceMediaStudy;
