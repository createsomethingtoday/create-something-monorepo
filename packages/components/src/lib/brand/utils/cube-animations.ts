/**
 * Cube Animation Primitives
 *
 * Animation utilities specifically for the CREATE SOMETHING cube mark.
 * Built on the base animation primitives from visual/animations.ts,
 * specialized for isometric cube geometry.
 *
 * Three core animations aligned with brand philosophy:
 * - reveal: Faces fade in sequentially (DRY - unified from hidden)
 * - assemble: Faces slide into position (Heidegger - parts become whole)
 * - pulse: Subtle breathing effect (Rams - functional vitality)
 *
 * "Animation should reveal truth, not decorate surface."
 */

import { CUBE_FACE_OPACITY, type CubeFace } from '../types.js';
import {
	calculateFaceOffset,
	DERIVED_FACE_OFFSETS,
	CUBE_FACE_NORMALS,
	debugFaceOffsets
} from '../../visual/isometric.js';

// Re-export for convenience
export { calculateFaceOffset, CUBE_FACE_NORMALS, debugFaceOffsets };

// =============================================================================
// CONSTANTS - Aligned with Canon motion tokens
// =============================================================================

/**
 * Easing functions from Canon
 */
export const cubeEasing = {
	/** Standard Material Design easing */
	standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
	/** Emphasized entry for dramatic effect */
	emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
	/** SVG spline format for SMIL animations */
	splineStandard: '0.4 0 0.2 1',
	splineEmphasized: '0.2 0 0 1'
} as const;

/**
 * Duration scale in milliseconds - matches CSS Canon tokens
 */
export const cubeDuration = {
	/** Micro-interactions (hover states) */
	micro: 200,
	/** Standard transitions */
	standard: 300,
	/** Complex/multi-part animations */
	complex: 500,
	/** Dramatic reveal sequences */
	dramatic: 800
} as const;

/**
 * Default stagger delays between cube faces (ms)
 */
export const cubeStagger = {
	/** Quick sequential reveal */
	fast: 50,
	/** Standard reveal timing */
	standard: 100,
	/** Dramatic assembly timing */
	slow: 150
} as const;

/**
 * Isometric offset vectors for assembly animations
 *
 * DERIVED FROM PROJECTION MATH - not magic numbers.
 *
 * Each face slides in perpendicular to its surface, which means:
 * 1. Get the face's 3D normal vector
 * 2. Project through isometric transform: toIsometric(nx, ny, nz)
 * 3. Normalize and scale to desired distance
 *
 * Mathematical derivation (distance = 10):
 * - Top (normal 0,1,0):   projects to (0, -1)     → offset (0, -10)
 * - Left (normal 0,0,1):  projects to (-0.866, 0.5) → offset (-8.66, 5)
 * - Right (normal 1,0,0): projects to (0.866, 0.5)  → offset (8.66, 5)
 *
 * See isometric.ts:calculateFaceOffset() for the full derivation.
 *
 * @see {@link calculateFaceOffset} for dynamic distance calculation
 */
export const cubeFaceOffsets: Record<CubeFace, { x: number; y: number }> = DERIVED_FACE_OFFSETS;

/**
 * Face render order (back to front for proper layering)
 */
export const cubeFaceOrder: CubeFace[] = ['top', 'left', 'right'] as const;

// =============================================================================
// SVG ANIMATION GENERATORS
// =============================================================================

export interface CubeAnimationOptions {
	/** Base duration in ms (default: 500) */
	duration?: number;
	/** Stagger delay between faces in ms (default: 100) */
	stagger?: number;
	/** Starting delay before animation begins in ms (default: 0) */
	delay?: number;
}

/**
 * Generate SVG animate element for cube face reveal
 * Fades a face from transparent to its Canon opacity
 */
export function cubeRevealAnimation(
	face: CubeFace,
	faceIndex: number,
	opts: CubeAnimationOptions = {}
): string {
	const { duration = cubeDuration.complex, stagger = cubeStagger.standard, delay = 0 } = opts;
	const targetOpacity = CUBE_FACE_OPACITY[face];
	const begin = delay + faceIndex * stagger;

	return `<animate
		attributeName="opacity"
		from="0"
		to="${targetOpacity}"
		dur="${duration}ms"
		begin="${begin}ms"
		fill="freeze"
		calcMode="spline"
		keySplines="${cubeEasing.splineStandard}"
	/>`;
}

/**
 * Generate SVG animate elements for cube face assembly
 * Face slides in from offset position while fading in
 */
export function cubeAssembleAnimation(
	face: CubeFace,
	faceIndex: number,
	opts: CubeAnimationOptions = {}
): string {
	const { duration = cubeDuration.complex, stagger = cubeStagger.slow, delay = 0 } = opts;
	const targetOpacity = CUBE_FACE_OPACITY[face];
	const offset = cubeFaceOffsets[face];
	const begin = delay + faceIndex * stagger;

	return `<animate
		attributeName="opacity"
		values="0;${targetOpacity};${targetOpacity}"
		keyTimes="0;0.5;1"
		dur="${duration}ms"
		begin="${begin}ms"
		fill="freeze"
		calcMode="spline"
		keySplines="${cubeEasing.splineStandard};${cubeEasing.splineStandard}"
	/>
	<animateTransform
		attributeName="transform"
		type="translate"
		from="${offset.x} ${offset.y}"
		to="0 0"
		dur="${duration}ms"
		begin="${begin}ms"
		fill="freeze"
		calcMode="spline"
		keySplines="${cubeEasing.splineEmphasized}"
	/>`;
}

/**
 * Generate SVG animate element for cube pulse
 * Subtle breathing effect for loading/activity states
 */
export function cubePulseAnimation(opts: {
	duration?: number;
	minOpacity?: number;
	maxOpacity?: number;
} = {}): string {
	const { duration = 2000, minOpacity = 0.6, maxOpacity = 1 } = opts;

	return `<animate
		attributeName="opacity"
		values="${maxOpacity};${minOpacity};${maxOpacity}"
		dur="${duration}ms"
		repeatCount="indefinite"
		calcMode="spline"
		keySplines="${cubeEasing.splineStandard};${cubeEasing.splineStandard}"
	/>`;
}

/**
 * Generate complete SMIL animation group for a cube face
 * Combines opacity and transform animations based on type
 */
export function cubeFaceAnimationSMIL(
	face: CubeFace,
	animationType: 'reveal' | 'pulse' | 'assemble',
	opts: CubeAnimationOptions = {}
): string {
	const faceIndex = cubeFaceOrder.indexOf(face);

	switch (animationType) {
		case 'reveal':
			return cubeRevealAnimation(face, faceIndex, opts);
		case 'assemble':
			return cubeAssembleAnimation(face, faceIndex, opts);
		case 'pulse':
			return cubePulseAnimation({
				duration: opts.duration ?? 2000,
				minOpacity: 0.6 * CUBE_FACE_OPACITY[face],
				maxOpacity: CUBE_FACE_OPACITY[face]
			});
		default:
			return '';
	}
}

// =============================================================================
// CSS KEYFRAMES GENERATORS
// =============================================================================

/**
 * Generate CSS keyframes for cube reveal animation
 */
export function cubeRevealKeyframes(name: string = 'cube-reveal'): string {
	return `@keyframes ${name} {
	from {
		opacity: 0;
	}
	to {
		opacity: var(--face-opacity, 1);
	}
}`;
}

/**
 * Generate CSS keyframes for cube assembly animation
 */
export function cubeAssembleKeyframes(
	name: string,
	face: CubeFace
): string {
	const offset = cubeFaceOffsets[face];
	const targetOpacity = CUBE_FACE_OPACITY[face];

	return `@keyframes ${name} {
	0% {
		opacity: 0;
		transform: translate(${offset.x}px, ${offset.y}px);
	}
	60% {
		opacity: ${targetOpacity};
	}
	100% {
		opacity: ${targetOpacity};
		transform: translate(0, 0);
	}
}`;
}

/**
 * Generate CSS keyframes for cube pulse animation
 */
export function cubePulseKeyframes(
	name: string = 'cube-pulse',
	min: number = 0.6,
	max: number = 1
): string {
	return `@keyframes ${name} {
	0%, 100% {
		opacity: ${max};
		transform: scale(1);
	}
	50% {
		opacity: ${min};
		transform: scale(0.97);
	}
}`;
}

/**
 * Generate complete CSS for all cube animation variants
 */
export function generateCubeAnimationCSS(): string {
	return `/* Cube Mark Animation Keyframes */

${cubeRevealKeyframes('cube-face-reveal')}

${cubeAssembleKeyframes('cube-assemble-top', 'top')}
${cubeAssembleKeyframes('cube-assemble-left', 'left')}
${cubeAssembleKeyframes('cube-assemble-right', 'right')}

${cubePulseKeyframes('cube-pulse')}

/* Cube Animation Classes */
.cube-reveal .face-top,
.cube-reveal .face-left,
.cube-reveal .face-right {
	animation: cube-face-reveal var(--duration-complex, 500ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)) forwards;
}

.cube-reveal .face-top { animation-delay: 0ms; }
.cube-reveal .face-left { animation-delay: 100ms; }
.cube-reveal .face-right { animation-delay: 200ms; }

.cube-assemble .face-top {
	animation: cube-assemble-top var(--duration-complex, 500ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)) forwards;
}

.cube-assemble .face-left {
	animation: cube-assemble-left var(--duration-complex, 500ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)) forwards;
	animation-delay: 150ms;
}

.cube-assemble .face-right {
	animation: cube-assemble-right var(--duration-complex, 500ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)) forwards;
	animation-delay: 300ms;
}

.cube-pulse {
	animation: cube-pulse var(--duration-complex, 500ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)) infinite alternate;
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
	.cube-reveal .face-top,
	.cube-reveal .face-left,
	.cube-reveal .face-right,
	.cube-assemble .face-top,
	.cube-assemble .face-left,
	.cube-assemble .face-right,
	.cube-pulse {
		animation: none !important;
	}
}`;
}

// =============================================================================
// STYLE UTILITIES
// =============================================================================

/**
 * Calculate stagger delay for a face based on position
 */
export function cubeStaggerDelay(
	face: CubeFace,
	baseDelay: number = cubeStagger.standard
): number {
	return cubeFaceOrder.indexOf(face) * baseDelay;
}

/**
 * Generate inline style for animated face
 */
export function cubeFaceAnimationStyle(
	face: CubeFace,
	animationType: 'reveal' | 'pulse' | 'assemble',
	opts: CubeAnimationOptions = {}
): string {
	const { duration = cubeDuration.complex, stagger = cubeStagger.standard } = opts;
	const delay = cubeStaggerDelay(face, stagger);
	const easing = cubeEasing.standard;

	switch (animationType) {
		case 'reveal':
			return `animation: cube-face-reveal ${duration}ms ${easing} ${delay}ms both`;
		case 'assemble':
			return `animation: cube-assemble-${face} ${duration}ms ${easing} ${delay}ms both`;
		case 'pulse':
			return `animation: cube-pulse ${duration * 2}ms ${easing} infinite alternate`;
		default:
			return '';
	}
}

/**
 * Get CSS custom property values for cube animation
 */
export function getCubeAnimationVars(opts: CubeAnimationOptions = {}): Record<string, string> {
	const { duration = cubeDuration.complex, stagger = cubeStagger.standard, delay = 0 } = opts;

	return {
		'--cube-duration': `${duration}ms`,
		'--cube-stagger': `${stagger}ms`,
		'--cube-delay': `${delay}ms`,
		'--cube-easing': cubeEasing.standard
	};
}

// =============================================================================
// SVELTE ACTION (optional programmatic control)
// =============================================================================

export interface CubeAnimationAction {
	/** Trigger the animation */
	play: () => void;
	/** Reset to initial state */
	reset: () => void;
	/** Pause the animation */
	pause: () => void;
}

/**
 * Create animation controller for programmatic control
 * Used with Svelte's use: directive for advanced scenarios
 *
 * @example
 * const controller = createCubeAnimationController(cubeElement);
 * controller.play();  // Resume animations
 * controller.pause(); // Pause animations
 * controller.reset(); // Restart animations from beginning
 */
export function createCubeAnimationController(
	element: SVGElement
): CubeAnimationAction {
	const faces = element.querySelectorAll('.face-top, .face-left, .face-right');

	return {
		play() {
			faces.forEach((face) => {
				const el = face as SVGElement;
				el.style.animationPlayState = 'running';
			});
		},
		reset() {
			faces.forEach((face) => {
				const el = face as SVGElement;
				el.style.animation = 'none';
				// Force reflow by reading computed style
				getComputedStyle(el).animation;
				el.style.animation = '';
			});
		},
		pause() {
			faces.forEach((face) => {
				const el = face as SVGElement;
				el.style.animationPlayState = 'paused';
			});
		}
	};
}
