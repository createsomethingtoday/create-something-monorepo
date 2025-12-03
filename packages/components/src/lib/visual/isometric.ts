/**
 * Isometric Projection Utilities
 *
 * Mathematical foundations for the CREATE SOMETHING visual canon.
 * Isometric projection reveals hidden relationships - the visual
 * manifestation of the hermeneutic circle.
 *
 * "We understand parts through the whole, and the whole through its parts."
 */

/**
 * Isometric transformation matrix
 * Standard isometric: 30° rotation on both axes
 */
export const ISOMETRIC_ANGLE = 30;
export const ISO_COS = Math.cos((ISOMETRIC_ANGLE * Math.PI) / 180);
export const ISO_SIN = Math.sin((ISOMETRIC_ANGLE * Math.PI) / 180);

/**
 * Convert 3D coordinates to 2D isometric projection
 */
export function toIsometric(x: number, y: number, z: number): { x: number; y: number } {
	return {
		x: (x - z) * ISO_COS,
		y: (x + z) * ISO_SIN - y
	};
}

/**
 * Generate isometric box vertices
 */
export function isometricBox(
	origin: { x: number; y: number; z: number },
	size: { width: number; height: number; depth: number }
): { x: number; y: number }[] {
	const { x, y, z } = origin;
	const { width: w, height: h, depth: d } = size;

	// 8 vertices of the box
	const vertices3D = [
		{ x, y, z }, // 0: front-bottom-left
		{ x: x + w, y, z }, // 1: front-bottom-right
		{ x: x + w, y: y + h, z }, // 2: front-top-right
		{ x, y: y + h, z }, // 3: front-top-left
		{ x, y, z: z + d }, // 4: back-bottom-left
		{ x: x + w, y, z: z + d }, // 5: back-bottom-right
		{ x: x + w, y: y + h, z: z + d }, // 6: back-top-right
		{ x, y: y + h, z: z + d } // 7: back-top-left
	];

	return vertices3D.map((v) => toIsometric(v.x, v.y, v.z));
}

/**
 * Generate SVG path for isometric box (visible faces only)
 */
export function isometricBoxPath(
	cx: number,
	cy: number,
	width: number,
	height: number,
	depth: number
): { top: string; left: string; right: string } {
	const vertices = isometricBox({ x: 0, y: 0, z: 0 }, { width, height, depth });

	// Offset to center
	const offset = vertices.map((v) => ({
		x: v.x + cx,
		y: v.y + cy
	}));

	// Top face: 3-2-6-7
	const top = `M ${offset[3].x} ${offset[3].y} L ${offset[2].x} ${offset[2].y} L ${offset[6].x} ${offset[6].y} L ${offset[7].x} ${offset[7].y} Z`;

	// Left face: 0-3-7-4
	const left = `M ${offset[0].x} ${offset[0].y} L ${offset[3].x} ${offset[3].y} L ${offset[7].x} ${offset[7].y} L ${offset[4].x} ${offset[4].y} Z`;

	// Right face: 1-5-6-2
	const right = `M ${offset[1].x} ${offset[1].y} L ${offset[5].x} ${offset[5].y} L ${offset[6].x} ${offset[6].y} L ${offset[2].x} ${offset[2].y} Z`;

	return { top, left, right };
}

/**
 * Stripe pattern generator for isometric faces
 * Creates the characteristic hatching effect
 */
export function stripePattern(id: string, angle: number = 45, spacing: number = 4): string {
	return `
    <pattern id="${id}" patternUnits="userSpaceOnUse" width="${spacing}" height="${spacing}" patternTransform="rotate(${angle})">
      <line x1="0" y1="0" x2="0" y2="${spacing}" stroke="currentColor" stroke-width="0.5" stroke-opacity="0.3"/>
    </pattern>
  `;
}

/**
 * Animation keyframe generator for assembly sequences
 */
export function assemblyKeyframes(
	steps: number,
	property: 'opacity' | 'transform' = 'opacity'
): string {
	const keyframes: string[] = [];
	for (let i = 0; i <= steps; i++) {
		const percent = (i / steps) * 100;
		if (property === 'opacity') {
			keyframes.push(`${percent}% { opacity: ${i === steps ? 1 : 0}; }`);
		}
	}
	return keyframes.join('\n');
}

export type IsometricPoint = { x: number; y: number };
export type IsometricBox3D = {
	origin: { x: number; y: number; z: number };
	size: { width: number; height: number; depth: number };
};
