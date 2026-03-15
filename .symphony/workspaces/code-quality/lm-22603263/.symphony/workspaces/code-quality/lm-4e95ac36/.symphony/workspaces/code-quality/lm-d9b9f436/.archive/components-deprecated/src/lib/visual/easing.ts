/**
 * Easing Curve Mathematics
 *
 * Pure math implementation of cubic Bézier easing curves.
 * Every coefficient is derived and documented - no magic numbers.
 *
 * "Animation should reveal truth, not decorate surface."
 *
 * @see https://cubic-bezier.com/ - Interactive curve visualization
 * @see https://www.w3.org/TR/css-easing-1/ - CSS Easing specification
 */

// =============================================================================
// CUBIC BÉZIER FUNDAMENTALS
// =============================================================================

/**
 * A cubic Bézier curve is defined by 4 control points:
 *
 *   P0 -------- P1
 *                 \
 *                  \
 *                   P2 -------- P3
 *
 * For CSS easing:
 * - P0 = (0, 0) - always fixed (start)
 * - P1 = (x1, y1) - first control point (defines initial trajectory)
 * - P2 = (x2, y2) - second control point (defines final trajectory)
 * - P3 = (1, 1) - always fixed (end)
 *
 * The parametric form for t ∈ [0, 1]:
 *
 *   B(t) = (1-t)³·P0 + 3(1-t)²t·P1 + 3(1-t)t²·P2 + t³·P3
 *
 * Expanding with P0=(0,0) and P3=(1,1):
 *
 *   X(t) = 3(1-t)²t·x1 + 3(1-t)t²·x2 + t³
 *   Y(t) = 3(1-t)²t·y1 + 3(1-t)t²·y2 + t³
 *
 * For easing:
 * - X-axis = time (input: 0 to 1)
 * - Y-axis = progress (output: 0 to 1)
 *
 * The CSS syntax `cubic-bezier(x1, y1, x2, y2)` defines the two middle control points.
 */

/**
 * Control points for a cubic Bézier easing curve
 */
export interface BezierControlPoints {
	/** X coordinate of first control point (0-1, represents time) */
	x1: number;
	/** Y coordinate of first control point (can exceed 0-1 for overshoot) */
	y1: number;
	/** X coordinate of second control point (0-1, represents time) */
	x2: number;
	/** Y coordinate of second control point (can exceed 0-1 for overshoot) */
	y2: number;
}

/**
 * Evaluate the X component of the Bézier curve at parameter t
 *
 * X(t) = 3(1-t)²t·x1 + 3(1-t)t²·x2 + t³
 */
export function bezierX(t: number, x1: number, x2: number): number {
	const t2 = t * t;
	const t3 = t2 * t;
	const mt = 1 - t;
	const mt2 = mt * mt;

	return 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3;
}

/**
 * Evaluate the Y component of the Bézier curve at parameter t
 *
 * Y(t) = 3(1-t)²t·y1 + 3(1-t)t²·y2 + t³
 */
export function bezierY(t: number, y1: number, y2: number): number {
	const t2 = t * t;
	const t3 = t2 * t;
	const mt = 1 - t;
	const mt2 = mt * mt;

	return 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3;
}

/**
 * Derivative of X(t) with respect to t
 *
 * X'(t) = 3(1-t)²·x1 + 6(1-t)t·(x2-x1) + 3t²·(1-x2)
 *
 * Used for Newton-Raphson iteration to find t for a given x.
 */
export function bezierXDerivative(t: number, x1: number, x2: number): number {
	const mt = 1 - t;
	return 3 * mt * mt * x1 + 6 * mt * t * (x2 - x1) + 3 * t * t * (1 - x2);
}

/**
 * Derivative of Y(t) with respect to t
 *
 * Y'(t) = 3(1-t)²·y1 + 6(1-t)t·(y2-y1) + 3t²·(1-y2)
 *
 * Represents the "velocity" of the animation at parameter t.
 */
export function bezierYDerivative(t: number, y1: number, y2: number): number {
	const mt = 1 - t;
	return 3 * mt * mt * y1 + 6 * mt * t * (y2 - y1) + 3 * t * t * (1 - y2);
}

/**
 * Find parameter t for a given x value using Newton-Raphson iteration
 *
 * Since we want y = f(x), but the curve is parametric (x(t), y(t)),
 * we need to find t such that x(t) = targetX, then return y(t).
 *
 * Newton-Raphson: t_next = t - f(t) / f'(t)
 * where f(t) = x(t) - targetX
 */
export function findTForX(
	targetX: number,
	x1: number,
	x2: number,
	epsilon: number = 0.0001,
	maxIterations: number = 10
): number {
	// Edge cases
	if (targetX <= 0) return 0;
	if (targetX >= 1) return 1;

	// Initial guess: linear interpolation
	let t = targetX;

	// Newton-Raphson iteration
	for (let i = 0; i < maxIterations; i++) {
		const x = bezierX(t, x1, x2);
		const dx = bezierXDerivative(t, x1, x2);

		// Avoid division by zero
		if (Math.abs(dx) < 1e-10) break;

		const error = x - targetX;
		if (Math.abs(error) < epsilon) break;

		t -= error / dx;

		// Clamp to valid range
		t = Math.max(0, Math.min(1, t));
	}

	return t;
}

/**
 * Evaluate a cubic Bézier easing curve
 *
 * Given a time value (0-1), returns the eased progress (0-1).
 *
 * @param x - Input time (0-1)
 * @param x1 - First control point X
 * @param y1 - First control point Y
 * @param x2 - Second control point X
 * @param y2 - Second control point Y
 * @returns Eased progress value
 *
 * @example
 * // Standard Material Design easing
 * const progress = evaluateBezier(0.5, 0.4, 0, 0.2, 1);
 * // Returns ~0.8 (animation is 80% complete at 50% time)
 */
export function evaluateBezier(
	x: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number
): number {
	// Edge cases
	if (x <= 0) return 0;
	if (x >= 1) return 1;

	// Find t for this x value
	const t = findTForX(x, x1, x2);

	// Return y(t)
	return bezierY(t, y1, y2);
}

/**
 * Get the instantaneous velocity at a given time
 *
 * Velocity = dy/dx = (dy/dt) / (dx/dt)
 *
 * This represents how fast the animation is moving at a given moment.
 * - velocity > 1: faster than linear
 * - velocity = 1: same as linear
 * - velocity < 1: slower than linear
 */
export function getVelocity(
	x: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number
): number {
	const t = findTForX(x, x1, x2);
	const dxdt = bezierXDerivative(t, x1, x2);
	const dydt = bezierYDerivative(t, y1, y2);

	// Avoid division by zero
	if (Math.abs(dxdt) < 1e-10) return 0;

	return dydt / dxdt;
}

// =============================================================================
// MATERIAL DESIGN EASING CURVES
// =============================================================================

/**
 * Standard easing - the default for most animations
 *
 * cubic-bezier(0.4, 0, 0.2, 1)
 *
 * Characteristics:
 * - Slow start: x1=0.4 means the curve pulls toward the right initially
 * - y1=0 means no vertical movement early (starts from rest)
 * - Fast finish: x2=0.2 means the curve is mostly done by 20% remaining time
 * - y2=1 means it reaches full progress smoothly
 *
 * Use for: General UI transitions, moving elements, state changes
 */
export const STANDARD: BezierControlPoints = {
	x1: 0.4,
	y1: 0,
	x2: 0.2,
	y2: 1
};

/**
 * Decelerate easing - for entering elements
 *
 * cubic-bezier(0, 0, 0.2, 1)
 *
 * Characteristics:
 * - Fast start: x1=0, y1=0 means curve starts moving immediately
 * - Slow finish: x2=0.2, y2=1 means it decelerates into final position
 *
 * Physics analogy: Object entering view with momentum, then settling
 *
 * Use for: Elements appearing, dialogs opening, content fading in
 */
export const DECELERATE: BezierControlPoints = {
	x1: 0,
	y1: 0,
	x2: 0.2,
	y2: 1
};

/**
 * Accelerate easing - for exiting elements
 *
 * cubic-bezier(0.4, 0, 1, 1)
 *
 * Characteristics:
 * - Slow start: x1=0.4, y1=0 means curve hesitates before moving
 * - Fast finish: x2=1, y2=1 means it accelerates off screen
 *
 * Physics analogy: Object at rest, then accelerating away
 *
 * Use for: Elements disappearing, dialogs closing, content fading out
 */
export const ACCELERATE: BezierControlPoints = {
	x1: 0.4,
	y1: 0,
	x2: 1,
	y2: 1
};

/**
 * Emphasized easing - for dramatic/important animations
 *
 * cubic-bezier(0.2, 0, 0, 1)
 *
 * Characteristics:
 * - Very fast initial movement (x1=0.2 is close to linear start)
 * - Very slow final approach (x2=0 means curve is essentially at target early)
 *
 * Creates a sense of "snapping" into place.
 *
 * Use for: Hero animations, important state changes, attention-grabbing motion
 */
export const EMPHASIZED: BezierControlPoints = {
	x1: 0.2,
	y1: 0,
	x2: 0,
	y2: 1
};

/**
 * Linear easing - constant velocity (reference)
 *
 * cubic-bezier(0, 0, 1, 1) or simply "linear"
 *
 * This is NOT recommended for UI animations as it feels mechanical.
 * Included for mathematical completeness.
 */
export const LINEAR: BezierControlPoints = {
	x1: 0,
	y1: 0,
	x2: 1,
	y2: 1
};

// =============================================================================
// EASING CURVE ANALYSIS
// =============================================================================

/**
 * Analyze an easing curve's characteristics
 */
export interface CurveAnalysis {
	/** Name of the curve */
	name: string;
	/** CSS cubic-bezier string */
	css: string;
	/** SVG keySplines format */
	spline: string;
	/** Velocity at start (t=0.01) */
	startVelocity: number;
	/** Velocity at middle (t=0.5) */
	midVelocity: number;
	/** Velocity at end (t=0.99) */
	endVelocity: number;
	/** Progress at 25% time */
	progressAt25: number;
	/** Progress at 50% time */
	progressAt50: number;
	/** Progress at 75% time */
	progressAt75: number;
	/** Human-readable description */
	description: string;
}

/**
 * Generate analysis for an easing curve
 */
export function analyzeCurve(
	name: string,
	points: BezierControlPoints,
	description: string
): CurveAnalysis {
	const { x1, y1, x2, y2 } = points;

	return {
		name,
		css: `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`,
		spline: `${x1} ${y1} ${x2} ${y2}`,
		startVelocity: getVelocity(0.01, x1, y1, x2, y2),
		midVelocity: getVelocity(0.5, x1, y1, x2, y2),
		endVelocity: getVelocity(0.99, x1, y1, x2, y2),
		progressAt25: evaluateBezier(0.25, x1, y1, x2, y2),
		progressAt50: evaluateBezier(0.5, x1, y1, x2, y2),
		progressAt75: evaluateBezier(0.75, x1, y1, x2, y2),
		description
	};
}

/**
 * Pre-computed analysis for all standard curves
 */
export const CURVE_ANALYSIS: Record<string, CurveAnalysis> = {
	standard: analyzeCurve('standard', STANDARD, 'General UI transitions'),
	decelerate: analyzeCurve('decelerate', DECELERATE, 'Elements entering'),
	accelerate: analyzeCurve('accelerate', ACCELERATE, 'Elements exiting'),
	emphasized: analyzeCurve('emphasized', EMPHASIZED, 'Important/dramatic motion'),
	linear: analyzeCurve('linear', LINEAR, 'Constant velocity (mechanical)')
};

// =============================================================================
// CSS/SVG STRING GENERATION
// =============================================================================

/**
 * Convert control points to CSS cubic-bezier() string
 */
export function toCss(points: BezierControlPoints): string {
	return `cubic-bezier(${points.x1}, ${points.y1}, ${points.x2}, ${points.y2})`;
}

/**
 * Convert control points to SVG keySplines format
 */
export function toSpline(points: BezierControlPoints): string {
	return `${points.x1} ${points.y1} ${points.x2} ${points.y2}`;
}

/**
 * Parse CSS cubic-bezier() string to control points
 */
export function fromCss(css: string): BezierControlPoints {
	const match = css.match(/cubic-bezier\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/);
	if (!match) {
		throw new Error(`Invalid cubic-bezier string: ${css}`);
	}
	return {
		x1: parseFloat(match[1]),
		y1: parseFloat(match[2]),
		x2: parseFloat(match[3]),
		y2: parseFloat(match[4])
	};
}

// =============================================================================
// EASING FUNCTION FACTORY
// =============================================================================

/**
 * Create an easing function from control points
 *
 * @example
 * const ease = createEasingFunction(STANDARD);
 * const progress = ease(0.5); // Get progress at 50% time
 */
export function createEasingFunction(
	points: BezierControlPoints
): (t: number) => number {
	const { x1, y1, x2, y2 } = points;
	return (t: number) => evaluateBezier(t, x1, y1, x2, y2);
}

/**
 * Pre-built easing functions
 */
export const easingFunctions = {
	standard: createEasingFunction(STANDARD),
	decelerate: createEasingFunction(DECELERATE),
	accelerate: createEasingFunction(ACCELERATE),
	emphasized: createEasingFunction(EMPHASIZED),
	linear: createEasingFunction(LINEAR)
};

// =============================================================================
// DEBUG HELPERS
// =============================================================================

/**
 * Print curve analysis to console
 */
export function debugCurve(name: string, points: BezierControlPoints): void {
	const { x1, y1, x2, y2 } = points;

	console.log(`\n${name.toUpperCase()} CURVE`);
	console.log('='.repeat(40));
	console.log(`CSS:     cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`);
	console.log(`Spline:  ${x1} ${y1} ${x2} ${y2}`);
	console.log();
	console.log('Control Points:');
	console.log(`  P0 = (0, 0)        [fixed start]`);
	console.log(`  P1 = (${x1}, ${y1})       [initial trajectory]`);
	console.log(`  P2 = (${x2}, ${y2})       [final trajectory]`);
	console.log(`  P3 = (1, 1)        [fixed end]`);
	console.log();
	console.log('Velocity (dy/dx):');
	console.log(`  Start (1%):   ${getVelocity(0.01, x1, y1, x2, y2).toFixed(3)}`);
	console.log(`  Middle (50%): ${getVelocity(0.5, x1, y1, x2, y2).toFixed(3)}`);
	console.log(`  End (99%):    ${getVelocity(0.99, x1, y1, x2, y2).toFixed(3)}`);
	console.log();
	console.log('Progress at time:');
	console.log(`  25%: ${(evaluateBezier(0.25, x1, y1, x2, y2) * 100).toFixed(1)}%`);
	console.log(`  50%: ${(evaluateBezier(0.5, x1, y1, x2, y2) * 100).toFixed(1)}%`);
	console.log(`  75%: ${(evaluateBezier(0.75, x1, y1, x2, y2) * 100).toFixed(1)}%`);
}

/**
 * Print all standard curves
 */
export function debugAllCurves(): void {
	console.log('CUBIC BÉZIER EASING CURVES');
	console.log('==========================');
	console.log();
	console.log('Formula: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃');
	console.log('Where P₀=(0,0), P₃=(1,1), and P₁,P₂ are the control points.');
	console.log();

	debugCurve('standard', STANDARD);
	debugCurve('decelerate', DECELERATE);
	debugCurve('accelerate', ACCELERATE);
	debugCurve('emphasized', EMPHASIZED);
}

/**
 * Generate ASCII visualization of a curve (for debugging)
 */
export function visualizeCurve(
	points: BezierControlPoints,
	width: number = 40,
	height: number = 10
): string {
	const { x1, y1, x2, y2 } = points;
	const grid: string[][] = Array(height)
		.fill(null)
		.map(() => Array(width).fill(' '));

	// Draw axes
	for (let x = 0; x < width; x++) {
		grid[height - 1][x] = '─';
	}
	for (let y = 0; y < height; y++) {
		grid[y][0] = '│';
	}
	grid[height - 1][0] = '└';

	// Plot curve
	for (let i = 0; i <= width - 2; i++) {
		const t = i / (width - 2);
		const progress = evaluateBezier(t, x1, y1, x2, y2);
		const x = i + 1;
		const y = height - 2 - Math.round(progress * (height - 2));
		if (y >= 0 && y < height - 1 && x < width) {
			grid[y][x] = '●';
		}
	}

	return grid.map((row) => row.join('')).join('\n');
}
