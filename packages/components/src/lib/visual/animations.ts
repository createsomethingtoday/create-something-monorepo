/**
 * Animation Primitives for Visual Canon
 *
 * Three core animation patterns that embody the Subtractive Triad:
 * - reveal: Making the hidden visible (DRY - what was duplicated becomes unified)
 * - assemble: Parts becoming whole (Heidegger - hermeneutic circle)
 * - pulse: System vitality (Rams - functional, not decorative)
 *
 * "Animation should reveal truth, not decorate surface."
 */

/**
 * Easing functions aligned with design tokens
 */
export const easing = {
	standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
	emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
	decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
	accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
	// Spline for SVG animations (values string)
	splineStandard: '0.4 0 0.2 1',
	splineEmphasized: '0.2 0 0 1'
} as const;

/**
 * Duration scale (ms) - matches design tokens
 */
export const duration = {
	micro: 200,
	standard: 300,
	complex: 500,
	dramatic: 800,
	sequence: 1200
} as const;

/**
 * Generate SVG animate element for reveal animation
 * Parts fade in sequentially, revealing structure
 */
export function revealAnimation(
	index: number,
	total: number,
	opts: {
		duration?: number;
		stagger?: number;
		property?: 'opacity' | 'stroke-dashoffset';
	} = {}
): string {
	const { duration: dur = 500, stagger = 100, property = 'opacity' } = opts;

	const begin = `${index * stagger}ms`;
	const end = property === 'opacity' ? '1' : '0';
	const from = property === 'opacity' ? '0' : '100';

	return `
    <animate
      attributeName="${property}"
      from="${from}"
      to="${end}"
      dur="${dur}ms"
      begin="${begin}"
      fill="freeze"
      calcMode="spline"
      keySplines="${easing.splineStandard}"
    />
  `;
}

/**
 * Generate SVG animateTransform for assembly animation
 * Elements move into position, becoming the whole
 */
export function assembleAnimation(
	index: number,
	from: { x: number; y: number },
	to: { x: number; y: number },
	opts: {
		duration?: number;
		stagger?: number;
	} = {}
): string {
	const { duration: dur = 600, stagger = 150 } = opts;
	const begin = `${index * stagger}ms`;

	return `
    <animateTransform
      attributeName="transform"
      type="translate"
      from="${from.x} ${from.y}"
      to="${to.x} ${to.y}"
      dur="${dur}ms"
      begin="${begin}"
      fill="freeze"
      calcMode="spline"
      keySplines="${easing.splineEmphasized}"
    />
    <animate
      attributeName="opacity"
      from="0"
      to="1"
      dur="${dur * 0.6}ms"
      begin="${begin}"
      fill="freeze"
    />
  `;
}

/**
 * Generate SVG animate for pulse animation
 * Subtle breathing effect indicating system vitality
 */
export function pulseAnimation(opts: { duration?: number; min?: number; max?: number } = {}): string {
	const { duration: dur = 2000, min = 0.6, max = 1 } = opts;

	return `
    <animate
      attributeName="opacity"
      values="${max};${min};${max}"
      dur="${dur}ms"
      repeatCount="indefinite"
      calcMode="spline"
      keySplines="${easing.splineStandard};${easing.splineStandard}"
    />
  `;
}

/**
 * Generate CSS keyframes for reveal animation
 */
export function revealKeyframes(name: string): string {
	return `
@keyframes ${name} {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
  `.trim();
}

/**
 * Generate CSS keyframes for assemble animation
 */
export function assembleKeyframes(name: string, from: { x: number; y: number }): string {
	return `
@keyframes ${name} {
  0% {
    opacity: 0;
    transform: translate(${from.x}px, ${from.y}px);
  }
  60% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    transform: translate(0, 0);
  }
}
  `.trim();
}

/**
 * Generate CSS keyframes for pulse animation
 */
export function pulseKeyframes(name: string, min = 0.6, max = 1): string {
	return `
@keyframes ${name} {
  0%, 100% {
    opacity: ${max};
  }
  50% {
    opacity: ${min};
  }
}
  `.trim();
}

/**
 * Stagger delay calculator for sequential animations
 */
export function staggerDelay(index: number, base: number = 100): string {
	return `${index * base}ms`;
}

/**
 * Create animation style object for Svelte
 */
export function animationStyle(
	name: string,
	duration: number,
	delay: number = 0,
	easing: string = 'cubic-bezier(0.4, 0, 0.2, 1)'
): string {
	return `animation: ${name} ${duration}ms ${easing} ${delay}ms both`;
}
