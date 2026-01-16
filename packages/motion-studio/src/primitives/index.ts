/**
 * Vox-Style Motion Primitives
 * 
 * Animated building blocks for explainer videos.
 * Each primitive embodies "purposeful motion" - animation that serves the explanation.
 */

export { KineticText } from './KineticText.js';
export { AnimatedChart } from './AnimatedChart.js';
export { AnnotatedImage } from './AnnotatedImage.js';
export { LayeredReveal } from './LayeredReveal.js';
export { FilmGrain } from './FilmGrain.js';
export { SplitReveal } from './SplitReveal.js';

// Utility components
export { FadeIn } from './FadeIn.js';
export { ScaleIn } from './ScaleIn.js';
export { SlideIn } from './SlideIn.js';

// Re-export types
export type {
  TextRevealStyle,
  ChartBuildStyle,
  AnnotationConfig,
  ParallaxLayer,
} from '../types.js';
