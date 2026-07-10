import traceControlPlane from './trace-wake-natural.webp';
import traceControlPlaneMobile from './trace-wake-natural-mobile.webp';

import type { PerformanceMediaStudy } from './types';

export const traceControlPlaneMedia = {
  src: traceControlPlane,
  mobileSrc: traceControlPlaneMobile,
  alt: 'A survey craft leaving a directional wake across dark water'
} as const satisfies PerformanceMediaStudy;
