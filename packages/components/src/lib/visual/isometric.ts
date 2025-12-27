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

// =============================================================================
// ANIMATION OFFSET DERIVATION
// =============================================================================

/**
 * 3D normal vectors for each visible cube face
 *
 * In standard isometric view (camera from upper-front-right):
 * - Top face: Y+ surface, normal points up
 * - Left face: Z+ surface, normal points toward viewer (appears on left in 2D)
 * - Right face: X+ surface, normal points right (appears on right in 2D)
 */
export const CUBE_FACE_NORMALS: Record<'top' | 'left' | 'right', { x: number; y: number; z: number }> = {
	top: { x: 0, y: 1, z: 0 },
	left: { x: 0, y: 0, z: 1 },
	right: { x: 1, y: 0, z: 0 }
};

/**
 * Calculate 2D animation offset for a cube face
 *
 * The offset direction is the face's 3D normal projected to 2D isometric space.
 * This ensures faces "fly in" perpendicular to their surface.
 *
 * Mathematical derivation:
 * 1. Each face has a 3D unit normal vector
 * 2. Project normal through isometric transform: toIsometric(nx, ny, nz)
 * 3. Normalize result and scale by desired distance
 *
 * @param face - Which cube face ('top', 'left', 'right')
 * @param distance - How far the face travels during animation (default: 10)
 * @returns 2D offset { x, y } in screen coordinates
 *
 * @example
 * // Get animation offset for left face
 * const offset = calculateFaceOffset('left', 10);
 * // Returns { x: -8.66, y: 5 } - mathematically derived, not magic numbers
 */
export function calculateFaceOffset(
	face: 'top' | 'left' | 'right',
	distance: number = 10
): { x: number; y: number } {
	const normal = CUBE_FACE_NORMALS[face];

	// Project 3D normal to 2D using isometric transform
	// x_2d = (nx - nz) * cos(30°)
	// y_2d = (nx + nz) * sin(30°) - ny
	const projected = toIsometric(normal.x, normal.y, normal.z);

	// Calculate magnitude of projected vector
	const magnitude = Math.sqrt(projected.x * projected.x + projected.y * projected.y);

	// Handle degenerate case (shouldn't happen with our normals)
	if (magnitude === 0) {
		return { x: 0, y: 0 };
	}

	// Scale to desired distance
	return {
		x: (projected.x / magnitude) * distance,
		y: (projected.y / magnitude) * distance
	};
}

/**
 * Pre-calculated animation offsets for standard distance
 *
 * These are derived from calculateFaceOffset() - not magic numbers.
 *
 * Derivation for distance = 10:
 * - Top (0,1,0):   x = 0,     y = -1    → (0, -10)      exact
 * - Left (0,0,1):  x = -0.866, y = 0.5  → (-8.66, 5)    from projection
 * - Right (1,0,0): x = 0.866,  y = 0.5  → (8.66, 5)     from projection
 *
 * Note: cos(30°) ≈ 0.866, sin(30°) = 0.5
 */
export const DERIVED_FACE_OFFSETS: Record<'top' | 'left' | 'right', { x: number; y: number }> = {
	top: calculateFaceOffset('top', 10),
	left: calculateFaceOffset('left', 10),
	right: calculateFaceOffset('right', 10)
};

/**
 * Debug helper: print offset derivation
 */
export function debugFaceOffsets(distance: number = 10): void {
	console.log('Cube Face Animation Offset Derivation');
	console.log('=====================================');
	console.log(`Distance: ${distance}`);
	console.log(`ISO_COS (cos 30°): ${ISO_COS.toFixed(4)}`);
	console.log(`ISO_SIN (sin 30°): ${ISO_SIN.toFixed(4)}`);
	console.log();

	for (const face of ['top', 'left', 'right'] as const) {
		const normal = CUBE_FACE_NORMALS[face];
		const projected = toIsometric(normal.x, normal.y, normal.z);
		const offset = calculateFaceOffset(face, distance);

		console.log(`${face.toUpperCase()}:`);
		console.log(`  3D Normal:     (${normal.x}, ${normal.y}, ${normal.z})`);
		console.log(`  2D Projected:  (${projected.x.toFixed(3)}, ${projected.y.toFixed(3)})`);
		console.log(`  Final Offset:  (${offset.x.toFixed(2)}, ${offset.y.toFixed(2)})`);
		console.log();
	}
}
