/**
 * Content Pattern Library
 *
 * Components and utilities for displaying rich content with Canon tokens.
 * All patterns respect reduced motion preferences.
 *
 * @example
 * // Components
 * import { VideoLightbox, Carousel, TestimonialCarousel } from '@create-something/components/content';
 *
 * // Content loading utilities
 * import {
 *   loadMarkdownContent,
 *   loadContentBySlug,
 *   getContentSlugs,
 *   type BaseFrontmatter,
 *   type ContentItem,
 *   type GlobPattern
 * } from '@create-something/components/content';
 */

// Components
export { default as VideoLightbox } from './VideoLightbox.svelte';
export { default as Carousel } from './Carousel.svelte';
export { default as TestimonialCarousel } from './TestimonialCarousel.svelte';

// Content loading utilities
export {
	loadMarkdownContent,
	loadContentBySlug,
	getContentSlugs,
	type BaseFrontmatter,
	type ContentItem,
	type GlobPattern
} from './content-loader.js';
