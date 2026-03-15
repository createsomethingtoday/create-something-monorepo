/**
 * Cube Geometry Utilities
 *
 * Path generation for the CREATE SOMETHING cube mark.
 * Built on the isometric projection utilities from visual/isometric.ts,
 * specialized for the brand cube at various sizes and use cases.
 *
 * Three primary outputs:
 * - generateCubePaths: Raw SVG paths for component use
 * - generateFaviconCube: Complete SVG optimized for favicon (16x16, 32x32)
 * - generateLayoutCube: Complete SVG with proper viewBox for layout use
 *
 * "Good design is as little design as possible." - Dieter Rams
 */

import { toIsometric, isometricBox } from '../../visual/isometric.js';
import { CUBE_FACE_OPACITY, type CubeFace } from '../types.js';

// =============================================================================
// CUBE GEOMETRY CONSTANTS
// =============================================================================

/**
 * Standard cube dimensions for brand mark
 * Equal-sided cube for balanced visual weight
 */
export const CUBE_UNIT_SIZE = 12;

/**
 * Default viewBox dimensions
 */
export const CUBE_VIEWBOX = {
	/** Standard mark viewBox */
	standard: { width: 32, height: 32 },
	/** Favicon viewBox (pixel-perfect at 16x16 and 32x32) */
	favicon: { width: 16, height: 16 },
	/** Large display viewBox */
	display: { width: 64, height: 64 }
} as const;

/**
 * Center points for each viewBox size
 */
export const CUBE_CENTER = {
	standard: { x: 16, y: 16 },
	favicon: { x: 8, y: 8 },
	display: { x: 32, y: 32 }
} as const;

// =============================================================================
// PATH GENERATION
// =============================================================================

export interface CubePaths {
	/** Top face path (brightest - creation) */
	top: string;
	/** Left face path (medium - understanding) */
	left: string;
	/** Right face path (subtle - foundation) */
	right: string;
}

export interface CubePathOptions {
	/** Center X coordinate of the cube */
	cx?: number;
	/** Center Y coordinate of the cube */
	cy?: number;
	/** Size of each cube edge */
	size?: number;
	/** Precision for coordinate rounding (decimal places) */
	precision?: number;
}

/**
 * Generate isometric cube face paths
 *
 * Uses the isometric projection from visual/isometric.ts to create
 * mathematically correct paths. The cube is centered at (cx, cy) with
 * equal edge lengths for balanced visual weight.
 *
 * @example
 * const paths = generateCubePaths({ cx: 16, cy: 16, size: 12 });
 * // Returns { top: "M ...", left: "M ...", right: "M ..." }
 */
export function generateCubePaths(options: CubePathOptions = {}): CubePaths {
	const {
		cx = CUBE_CENTER.standard.x,
		cy = CUBE_CENTER.standard.y,
		size = CUBE_UNIT_SIZE,
		precision = 2
	} = options;

	// Generate all 8 vertices of the cube in 3D, then project to 2D
	const vertices = isometricBox(
		{ x: 0, y: 0, z: 0 },
		{ width: size, height: size, depth: size }
	);

	// Calculate the centroid of the projected cube for centering
	const centroidX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
	const centroidY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;

	// Offset vertices to center at (cx, cy)
	const offset = vertices.map((v) => ({
		x: round(v.x - centroidX + cx, precision),
		y: round(v.y - centroidY + cy, precision)
	}));

	// Vertex indices (from isometricBox):
	// 0: front-bottom-left, 1: front-bottom-right
	// 2: front-top-right, 3: front-top-left
	// 4: back-bottom-left, 5: back-bottom-right
	// 6: back-top-right, 7: back-top-left

	// Top face: 3-2-6-7 (the "lid" of the cube)
	const top = pathFromPoints([offset[3], offset[2], offset[6], offset[7]]);

	// Left face: 0-3-7-4 (visible left side)
	const left = pathFromPoints([offset[0], offset[3], offset[7], offset[4]]);

	// Right face: 1-5-6-2 (visible right side)
	const right = pathFromPoints([offset[1], offset[5], offset[6], offset[2]]);

	return { top, left, right };
}

/**
 * Generate a complete SVG string for favicon use
 *
 * Optimized for small sizes (16x16, 32x32) with:
 * - Minimal decimal precision for smaller file size
 * - Hardcoded fill colors (no CSS variables for favicon compatibility)
 * - No animations (static favicon)
 *
 * @example
 * const svg = generateFaviconCube({ size: 32 });
 * // Write to public/favicon.svg
 */
export function generateFaviconCube(options: {
	/** Output size in pixels (default: 32) */
	size?: number;
	/** Fill color (default: white for dark backgrounds) */
	fillColor?: string;
} = {}): string {
	const { size = 32, fillColor = '#ffffff' } = options;

	// Use smaller cube for favicon (scaled proportionally)
	const cubeSize = size === 16 ? 6 : size === 32 ? 10 : Math.round(size * 0.35);
	const center = size / 2;

	const paths = generateCubePaths({
		cx: center,
		cy: center,
		size: cubeSize,
		precision: size === 16 ? 1 : 2 // Less precision for 16x16
	});

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <path d="${paths.top}" fill="${fillColor}" opacity="${CUBE_FACE_OPACITY.top}"/>
  <path d="${paths.left}" fill="${fillColor}" opacity="${CUBE_FACE_OPACITY.left}"/>
  <path d="${paths.right}" fill="${fillColor}" opacity="${CUBE_FACE_OPACITY.right}"/>
</svg>`;
}

/**
 * Generate a complete SVG string for layout/component use
 *
 * Includes proper viewBox, CSS custom property support, and
 * accessibility attributes. Suitable for inline use in layouts.
 *
 * @example
 * const svg = generateLayoutCube({ width: 48, height: 48 });
 * // Use as component background or inline decoration
 */
export function generateLayoutCube(options: {
	/** Output width in pixels (default: 32) */
	width?: number;
	/** Output height in pixels (default: matches width) */
	height?: number;
	/** Use CSS custom properties for colors (default: true) */
	useCssVars?: boolean;
	/** Include aria-label (default: true) */
	accessible?: boolean;
	/** Additional CSS classes */
	className?: string;
} = {}): string {
	const {
		width = 32,
		height = width,
		useCssVars = true,
		accessible = true,
		className = ''
	} = options;

	// Use standard 32x32 viewBox for consistent proportions
	const paths = generateCubePaths({
		cx: 16,
		cy: 16,
		size: CUBE_UNIT_SIZE,
		precision: 2
	});

	const fillColor = useCssVars ? 'var(--color-fg-primary, #ffffff)' : '#ffffff';
	const ariaAttrs = accessible ? 'aria-label="CREATE SOMETHING" role="img"' : 'aria-hidden="true"';
	const classAttr = className ? `class="${className}"` : '';

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${width}" height="${height}" ${ariaAttrs} ${classAttr}>
  <path d="${paths.top}" fill="${fillColor}" opacity="${CUBE_FACE_OPACITY.top}"/>
  <path d="${paths.left}" fill="${fillColor}" opacity="${CUBE_FACE_OPACITY.left}"/>
  <path d="${paths.right}" fill="${fillColor}" opacity="${CUBE_FACE_OPACITY.right}"/>
</svg>`;
}

/**
 * Generate individual face path for targeted rendering
 *
 * Useful when you need only one face (e.g., for staggered animations
 * or individual face styling).
 */
export function generateCubeFacePath(
	face: CubeFace,
	options: CubePathOptions = {}
): string {
	const paths = generateCubePaths(options);
	return paths[face];
}

/**
 * Get the vertices of a cube face for custom rendering
 *
 * Returns the 4 corner points of the specified face,
 * useful for custom path manipulation or hit testing.
 */
export function getCubeFaceVertices(
	face: CubeFace,
	options: CubePathOptions = {}
): Array<{ x: number; y: number }> {
	const {
		cx = CUBE_CENTER.standard.x,
		cy = CUBE_CENTER.standard.y,
		size = CUBE_UNIT_SIZE
	} = options;

	const vertices = isometricBox(
		{ x: 0, y: 0, z: 0 },
		{ width: size, height: size, depth: size }
	);

	const centroidX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
	const centroidY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;

	const offset = vertices.map((v) => ({
		x: v.x - centroidX + cx,
		y: v.y - centroidY + cy
	}));

	// Return vertices for the requested face
	switch (face) {
		case 'top':
			return [offset[3], offset[2], offset[6], offset[7]];
		case 'left':
			return [offset[0], offset[3], offset[7], offset[4]];
		case 'right':
			return [offset[1], offset[5], offset[6], offset[2]];
	}
}

/**
 * Calculate the bounding box of the cube
 *
 * Useful for layout calculations and positioning.
 */
export function getCubeBoundingBox(options: CubePathOptions = {}): {
	x: number;
	y: number;
	width: number;
	height: number;
} {
	const {
		cx = CUBE_CENTER.standard.x,
		cy = CUBE_CENTER.standard.y,
		size = CUBE_UNIT_SIZE
	} = options;

	const vertices = isometricBox(
		{ x: 0, y: 0, z: 0 },
		{ width: size, height: size, depth: size }
	);

	const centroidX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
	const centroidY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;

	const offset = vertices.map((v) => ({
		x: v.x - centroidX + cx,
		y: v.y - centroidY + cy
	}));

	const xs = offset.map((v) => v.x);
	const ys = offset.map((v) => v.y);

	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);

	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY
	};
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Round a number to specified decimal places
 */
function round(value: number, precision: number): number {
	const factor = Math.pow(10, precision);
	return Math.round(value * factor) / factor;
}

/**
 * Generate SVG path string from array of points
 */
function pathFromPoints(points: Array<{ x: number; y: number }>): string {
	if (points.length === 0) return '';
	const [first, ...rest] = points;
	return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')} Z`;
}
