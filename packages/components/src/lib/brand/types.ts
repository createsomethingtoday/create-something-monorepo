// Brand module types
// Shared interfaces for CREATE SOMETHING brand components

// Import Property from analytics (single source of truth)
import type { Property } from '../analytics/types.js';

// Re-export for consumers of this module
export type { Property };

/**
 * Standard size scale for brand components
 */
export type BrandSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Size mapping in pixels
 */
export const BRAND_SIZE_MAP: Record<BrandSize, number> = {
	xs: 16,
	sm: 24,
	md: 32,
	lg: 48,
	xl: 64
};

/**
 * Animation variant for brand marks
 */
export type AnimationType = 'none' | 'reveal' | 'pulse' | 'assemble';

/**
 * Common props for brand mark components
 */
export interface BrandMarkProps {
	/** Size of the mark */
	size?: BrandSize | number;
	/** Whether to animate on mount */
	animate?: boolean;
	/** Animation type */
	animationType?: AnimationType;
	/** Additional CSS classes */
	class?: string;
}

/**
 * Props for property-specific marks
 */
export interface PropertyMarkProps extends BrandMarkProps {
	/** Which property to display */
	property: Property;
	/** Display variant */
	variant?: 'full' | 'abbreviated' | 'icon';
	/** Whether to include the cube mark */
	showCube?: boolean;
}

/**
 * Props for loading states
 */
export interface LoaderProps {
	/** Size of the loader */
	size?: BrandSize | number;
	/** Loading animation variant */
	variant?: 'spin' | 'pulse' | 'assemble';
	/** Optional loading message */
	message?: string;
}

/**
 * Props for skeleton placeholders
 */
export interface SkeletonProps {
	/** Number of text lines */
	lines?: number;
	/** Whether to show a header skeleton */
	showHeader?: boolean;
	/** Whether to show an image skeleton */
	showImage?: boolean;
}

/**
 * Props for OG image generation
 */
export interface OGImageProps {
	/** Page title */
	title: string;
	/** Optional subtitle */
	subtitle?: string;
	/** Property for styling */
	property?: Property;
	/** Background variant */
	variant?: 'default' | 'dark' | 'gradient';
}

/**
 * Isometric cube face identifiers
 * Following the existing visual/isometric.ts conventions
 */
export type CubeFace = 'top' | 'left' | 'right';

/**
 * Cube face opacity values per Canon
 * Top: 1.0 (brightest), Left: 0.6, Right: 0.3 (darkest)
 */
export const CUBE_FACE_OPACITY: Record<CubeFace, number> = {
	top: 1.0,
	left: 0.6,
	right: 0.3
};
