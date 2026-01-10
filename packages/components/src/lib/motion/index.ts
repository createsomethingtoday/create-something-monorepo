/**
 * Motion Pattern Library
 *
 * Canon-compliant animation components that exceed Maverick X baseline.
 * All patterns use Canon tokens and respect reduced motion preferences.
 *
 * @example
 * import { ScrollReveal, StaggerContainer, StaggerItem, CountUp, FadeIn, ParallaxSection, SmoothScroll } from '@create-something/components/motion';
 */

export { default as ScrollReveal } from './ScrollReveal.svelte';
export { default as ScrollRevealStagger } from './ScrollRevealStagger.svelte';
export { default as StaggerContainer } from './StaggerContainer.svelte';
export { default as StaggerItem } from './StaggerItem.svelte';
export { default as CountUp } from './CountUp.svelte';
export { default as FadeIn } from './FadeIn.svelte';
export { default as ParallaxSection } from './ParallaxSection.svelte';
export { default as HeroParallax } from './HeroParallax.svelte';
export { default as SmoothScroll } from './SmoothScroll.svelte';
export { SMOOTH_SCROLL_KEY, createScrollState, type ScrollState } from './smooth-scroll';
