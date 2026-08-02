import controlledFlow from './controlled-flow-natural.webp';
import controlledFlowMobile from './controlled-flow-natural-mobile.webp';
import controlledFlowMotionMp4 from './controlled-flow-motion.mp4';
import controlledFlowMotionPoster from './controlled-flow-motion-poster.webp';
import controlledFlowMotionWebm from './controlled-flow-motion.webm';

import type { PerformanceMediaStudy } from './types';

export const controlledFlowMedia = {
  src: controlledFlow,
  mobileSrc: controlledFlowMobile,
  alt: 'Aerated water moving over a sculptural concrete performance boundary',
  condition: 'flow',
  material: 'water',
  video: {
    mp4: controlledFlowMotionMp4,
    webm: controlledFlowMotionWebm,
    poster: controlledFlowMotionPoster
  }
} as const satisfies PerformanceMediaStudy;
