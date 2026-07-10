import controlledFlow from './controlled-flow.webp';
import controlledFlowMobile from './controlled-flow-mobile.webp';

import type { PerformanceMediaStudy } from './types';

export const controlledFlowMedia = {
  src: controlledFlow,
  mobileSrc: controlledFlowMobile,
  alt: 'Water accelerating through a controlled bifurcation in a transparent test channel'
} as const satisfies PerformanceMediaStudy;
