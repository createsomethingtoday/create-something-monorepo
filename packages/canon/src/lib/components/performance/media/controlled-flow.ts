import controlledFlow from './controlled-flow-natural.webp';
import controlledFlowMobile from './controlled-flow-natural-mobile.webp';

import type { PerformanceMediaStudy } from './types';

export const controlledFlowMedia = {
  src: controlledFlow,
  mobileSrc: controlledFlowMobile,
  alt: 'Water routed through a concrete sluice in an engineered control facility'
} as const satisfies PerformanceMediaStudy;
