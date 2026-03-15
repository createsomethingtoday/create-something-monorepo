/**
 * Vox-Style Motion Primitives
 * 
 * Animated building blocks for explainer videos.
 * Each primitive embodies "purposeful motion" - animation that serves the explanation.
 */

export { KineticText } from './KineticText';
export { AnimatedChart } from './AnimatedChart';
export { AnnotatedImage } from './AnnotatedImage';
export { LayeredReveal } from './LayeredReveal';
export { FilmGrain, Scanlines, Vignette } from './FilmGrain';
export { SplitReveal } from './SplitReveal';

// Utility components
export { FadeIn } from './FadeIn';
export { ScaleIn } from './ScaleIn';
export { SlideIn } from './SlideIn';

// Re-export types
export type {
  TextRevealStyle,
  ChartBuildStyle,
  AnnotationConfig,
  ParallaxLayer,
} from '../types';
