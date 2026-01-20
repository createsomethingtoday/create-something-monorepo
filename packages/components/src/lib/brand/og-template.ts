/**
 * OG Image Template Generator
 *
 * Static SVG template for server-side Open Graph image rendering.
 * Generates 1200x630 SVG (standard OG dimensions) with CREATE SOMETHING branding.
 *
 * "Good design is as little design as possible" - Dieter Rams
 *
 * @packageDocumentation
 */

import { isometricBoxPath } from '../visual/isometric.js';
import { colors } from '../tokens/colors.js';
import { typography } from '../tokens/typography.js';
import { escapeXml } from '../utils/strings.js';
import type { Property } from '../analytics/types.js';
import type { OGImageProps } from './types.js';
import { CUBE_FACE_OPACITY } from './types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Standard OG image dimensions */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Cube dimensions for OG images (scaled for visibility) */
const CUBE_SIZE = 80;

/** Property display names */
const PROPERTY_NAMES: Record<Property, string> = {
	space: 'createsomething.space',
	io: 'createsomething.io',
	agency: 'createsomething.agency',
	ltd: 'createsomething.ltd',
	lms: 'learn.createsomething.space'
};

/** Property taglines */
const PROPERTY_TAGLINES: Record<Property, string> = {
	space: 'Practice',
	io: 'Research',
	agency: 'Services',
	ltd: 'Philosophy',
	lms: 'Learning'
};

// =============================================================================
// SVG GENERATION
// =============================================================================

/**
 * Generate isometric cube SVG markup
 */
function generateCubeSVG(cx: number, cy: number, size: number): string {
	const paths = isometricBoxPath(cx, cy, size, size, size);

	return `
    <g class="cube">
      <path d="${paths.top}" fill="${colors.foreground.primary}" fill-opacity="${CUBE_FACE_OPACITY.top}" />
      <path d="${paths.left}" fill="${colors.foreground.primary}" fill-opacity="${CUBE_FACE_OPACITY.left}" />
      <path d="${paths.right}" fill="${colors.foreground.primary}" fill-opacity="${CUBE_FACE_OPACITY.right}" />
    </g>
  `;
}

/**
 * Generate gradient background based on variant
 */
function generateBackground(variant: OGImageProps['variant']): string {
	switch (variant) {
		case 'gradient':
			return `
        <defs>
          <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colors.background.pure}" />
            <stop offset="100%" stop-color="${colors.background.subtle}" />
          </linearGradient>
        </defs>
        <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#bg-gradient)" />
      `;
		case 'dark':
			return `<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="${colors.background.surface}" />`;
		case 'default':
		default:
			return `<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="${colors.background.pure}" />`;
	}
}

// escapeXml imported from utils/strings.js

/**
 * Truncate text to fit within a maximum character limit
 */
function truncateText(text: string, maxChars: number): string {
	if (text.length <= maxChars) return text;
	return text.slice(0, maxChars - 1) + '…';
}

/**
 * Generate the complete OG image SVG string
 *
 * @param options - OG image configuration
 * @returns Complete SVG string ready for server-side rendering
 *
 * @example
 * ```typescript
 * const svg = generateOGSVG({
 *   title: 'Understanding the Hermeneutic Circle',
 *   subtitle: 'A philosophical exploration',
 *   property: 'io',
 *   variant: 'default'
 * });
 *
 * // Use with @resvg/resvg-js or similar for PNG conversion
 * ```
 */
export function generateOGSVG(options: OGImageProps): string {
	const { title, subtitle, property = 'io', variant = 'default' } = options;

	// Escape and truncate text for safe embedding
	const safeTitle = escapeXml(truncateText(title, 80));
	const safeSubtitle = subtitle ? escapeXml(truncateText(subtitle, 120)) : null;

	// Layout calculations
	const padding = 80;
	const cubeX = OG_WIDTH - padding - CUBE_SIZE;
	const cubeY = padding + CUBE_SIZE / 2;

	// Title sizing based on length
	const titleFontSize = title.length > 50 ? 48 : title.length > 30 ? 56 : 64;
	const titleY = OG_HEIGHT / 2 - (safeSubtitle ? 20 : 0);

	// Property branding
	const propertyName = PROPERTY_NAMES[property];
	const propertyTagline = PROPERTY_TAGLINES[property];

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}" width="${OG_WIDTH}" height="${OG_HEIGHT}">
  <!-- Background -->
  ${generateBackground(variant)}

  <!-- Subtle grid pattern (optional decorative element) -->
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${colors.foreground.subtle}" stroke-width="0.5" stroke-opacity="0.1" />
    </pattern>
  </defs>
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#grid)" />

  <!-- Isometric Cube Mark -->
  ${generateCubeSVG(cubeX, cubeY, CUBE_SIZE)}

  <!-- Property branding (top left) -->
  <text
    x="${padding}"
    y="${padding + 20}"
    font-family="${typography.family.mono}"
    font-size="14"
    font-weight="${typography.weight.medium}"
    fill="${colors.foreground.tertiary}"
    letter-spacing="${typography.tracking.wider}"
  >${propertyName}</text>
  <text
    x="${padding}"
    y="${padding + 44}"
    font-family="${typography.family.sans}"
    font-size="12"
    fill="${colors.foreground.muted}"
    text-transform="uppercase"
    letter-spacing="${typography.tracking.widest}"
  >${propertyTagline}</text>

  <!-- Title -->
  <text
    x="${padding}"
    y="${titleY}"
    font-family="${typography.family.sans}"
    font-size="${titleFontSize}"
    font-weight="${typography.weight.bold}"
    fill="${colors.foreground.primary}"
    letter-spacing="${typography.tracking.tight}"
  >${safeTitle}</text>

  ${
		safeSubtitle
			? `
  <!-- Subtitle -->
  <text
    x="${padding}"
    y="${titleY + 50}"
    font-family="${typography.family.sans}"
    font-size="24"
    font-weight="${typography.weight.regular}"
    fill="${colors.foreground.secondary}"
  >${safeSubtitle}</text>
  `
			: ''
	}

  <!-- Bottom border accent -->
  <rect
    x="0"
    y="${OG_HEIGHT - 4}"
    width="${OG_WIDTH}"
    height="4"
    fill="${colors.foreground.primary}"
    fill-opacity="0.1"
  />

  <!-- CREATE SOMETHING wordmark (bottom right) -->
  <text
    x="${OG_WIDTH - padding}"
    y="${OG_HEIGHT - padding}"
    font-family="${typography.family.mono}"
    font-size="14"
    font-weight="${typography.weight.medium}"
    fill="${colors.foreground.muted}"
    text-anchor="end"
    letter-spacing="${typography.tracking.wide}"
  >CREATE SOMETHING</text>
</svg>`;
}

/**
 * Generate a minimal OG image SVG (cube + title only)
 *
 * @param title - Page title
 * @param property - Property for styling
 * @returns Minimal SVG string
 */
export function generateMinimalOGSVG(title: string, property: Property = 'io'): string {
	return generateOGSVG({
		title,
		property,
		variant: 'default'
	});
}

/**
 * Get the SVG as a data URI for direct use in img src
 *
 * @param options - OG image configuration
 * @returns Base64-encoded data URI
 */
export function generateOGDataURI(options: OGImageProps): string {
	const svg = generateOGSVG(options);
	const encoded = Buffer.from(svg).toString('base64');
	return `data:image/svg+xml;base64,${encoded}`;
}
