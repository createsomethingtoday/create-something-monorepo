/**
 * Typography Scale - Mathematical Derivation
 *
 * The CREATE SOMETHING type scale is built on the golden ratio (φ = 1.618).
 * This module derives all typography values mathematically, eliminating
 * magic numbers and providing auditable foundations.
 *
 * Two scale systems are provided:
 * 1. STRICT_PHI: Pure golden ratio (φⁿ for all sizes)
 * 2. PRAGMATIC: φ for headings, minor third (1.2) for body text
 *
 * The pragmatic approach is the Canon default because pure φ produces
 * sizes below 1rem that are too aggressive for body text readability.
 *
 * Mathematical derivation:
 * - φ (phi) = (1 + √5) / 2 ≈ 1.6180339887...
 * - φⁿ gives aesthetically pleasing proportions
 * - 1/φ = φ - 1 ≈ 0.618 (reciprocal property)
 *
 * "Typography is the craft of endowing human language with visual form."
 * — Robert Bringhurst
 */

// =============================================================================
// CONSTANTS - Mathematical Foundations
// =============================================================================

/**
 * The golden ratio (φ)
 *
 * Derived from: (1 + √5) / 2
 *
 * Properties:
 * - φ² = φ + 1
 * - 1/φ = φ - 1
 * - φ appears in nature, art, and architecture as aesthetically optimal
 */
export const PHI = (1 + Math.sqrt(5)) / 2; // 1.6180339887...

/**
 * Common type scale ratios with musical/geometric origins
 */
export const SCALE_RATIOS = {
	/** φ = 1.618 - Golden ratio, strong contrast */
	goldenRatio: PHI,
	/** Perfect fifth in music (3:2) */
	perfectFifth: 1.5,
	/** Augmented fourth / diminished fifth */
	augmentedFourth: 1.414,
	/** Perfect fourth in music (4:3) */
	perfectFourth: 1.333,
	/** Major third in music (5:4) */
	majorThird: 1.25,
	/** Minor third in music (6:5) */
	minorThird: 1.2,
	/** Major second in music (9:8) */
	majorSecond: 1.125
} as const;

/**
 * Base size in rem (browser default: 1rem = 16px)
 */
export const BASE_SIZE = 1;

// =============================================================================
// SCALE GENERATORS
// =============================================================================

/**
 * Calculate a power of φ
 *
 * @param n - The exponent (can be negative for sizes < 1)
 * @returns φⁿ
 *
 * @example
 * phiPower(2)  // 2.618 (φ²)
 * phiPower(0)  // 1.000 (base)
 * phiPower(-1) // 0.618 (1/φ)
 */
export function phiPower(n: number): number {
	return Math.pow(PHI, n);
}

/**
 * Calculate a value on any ratio-based scale
 *
 * @param step - Steps from base (negative = smaller)
 * @param ratio - The scale ratio (default: φ)
 * @param base - Base size in rem (default: 1)
 * @returns Size in rem
 */
export function scaleStep(step: number, ratio: number = PHI, base: number = BASE_SIZE): number {
	return base * Math.pow(ratio, step);
}

/**
 * Round to specified decimal places
 */
export function round(value: number, decimals: number = 3): number {
	const factor = Math.pow(10, decimals);
	return Math.round(value * factor) / factor;
}

// =============================================================================
// TYPE SCALE DEFINITIONS
// =============================================================================

/**
 * Named steps in the type scale
 */
export type TypeScaleStep =
	| 'display-xl'
	| 'display'
	| 'h1'
	| 'h2'
	| 'h3'
	| 'h4'
	| 'h5'
	| 'h6'
	| 'body-lg'
	| 'body'
	| 'body-sm'
	| 'caption'
	| 'overline';

/**
 * Type scale configuration
 */
export interface TypeScaleConfig {
	/** The ratio between steps (e.g., φ = 1.618) */
	ratio: number;
	/** Base size in rem */
	base: number;
	/** Step mapping: which ratio power for each named size */
	steps: Record<TypeScaleStep, number>;
}

/**
 * STRICT_PHI: Pure golden ratio scale
 *
 * Every size is φⁿ from base. Produces dramatic contrast
 * but small sizes (caption, overline) may be too small for body text.
 *
 * Step mapping:
 * | Name       | Power | Value   |
 * |------------|-------|---------|
 * | display-xl | 4     | 6.854   |
 * | display    | 3     | 4.236   |
 * | h1         | 2     | 2.618   |
 * | h2         | 1     | 1.618   |
 * | h3         | 0.5   | 1.272   |
 * | h4         | 0.25  | 1.132   |
 * | h5         | 0     | 1.000   |
 * | h6         | -0.25 | 0.883   |
 * | body-lg    | 0.25  | 1.132   |
 * | body       | 0     | 1.000   |
 * | body-sm    | -0.25 | 0.883   |
 * | caption    | -0.5  | 0.786   |
 * | overline   | -1    | 0.618   |
 */
export const STRICT_PHI: TypeScaleConfig = {
	ratio: PHI,
	base: BASE_SIZE,
	steps: {
		'display-xl': 4,
		display: 3,
		h1: 2,
		h2: 1,
		h3: 0.5,
		h4: 0.25,
		h5: 0,
		h6: -0.25,
		'body-lg': 0.25,
		body: 0,
		'body-sm': -0.25,
		caption: -0.5,
		overline: -1
	}
};

/**
 * PRAGMATIC: Golden ratio for headings, minor third for body
 *
 * This is the Canon default. Uses φ for display/headings where
 * dramatic contrast is desirable, but switches to minor third (1.2)
 * for body text where readability is paramount.
 *
 * Mathematical justification:
 * - Display sizes need to command attention (φ provides this)
 * - Body sizes need to flow for reading (1.2 ratio is gentler)
 * - The transition at h3/h4 is where reading begins
 *
 * Step mapping:
 * | Name       | Ratio | Power | Value   |
 * |------------|-------|-------|---------|
 * | display-xl | φ     | 4     | 6.854   |
 * | display    | φ     | 3     | 4.236   |
 * | h1         | φ     | 2     | 2.618   |
 * | h2         | φ     | 1     | 1.618   |
 * | h3         | 1.2   | 1     | 1.200   |
 * | h4         | 1.2   | 0.5   | 1.095   |
 * | h5         | —     | 0     | 1.000   |
 * | h6         | 1.2   | -0.5  | 0.913   |
 * | body-lg    | 1.2   | 0.5   | 1.095   |
 * | body       | —     | 0     | 1.000   |
 * | body-sm    | 1.2   | -0.5  | 0.913   |
 * | caption    | 1.2   | -1    | 0.833   |
 * | overline   | φ     | -1    | 0.618   |
 */
export const PRAGMATIC: TypeScaleConfig = {
	ratio: PHI, // Primary ratio for headings
	base: BASE_SIZE,
	steps: {
		// φ-based (dramatic)
		'display-xl': 4,
		display: 3,
		h1: 2,
		h2: 1,
		// Minor third based (readable) - these use a different calculation
		h3: 0, // Will be overridden
		h4: 0,
		h5: 0,
		h6: 0,
		'body-lg': 0,
		body: 0,
		'body-sm': 0,
		caption: 0,
		overline: -1 // Back to φ for this display element
	}
};

// =============================================================================
// SCALE CALCULATION
// =============================================================================

/**
 * Calculated type scale values (rem)
 *
 * Note: Named DerivedTypeScale to avoid conflict with TypeScale
 * from tokens/typography.ts which is a keyof union type.
 */
export interface DerivedTypeScale {
	'display-xl': number;
	display: number;
	h1: number;
	h2: number;
	h3: number;
	h4: number;
	h5: number;
	h6: number;
	'body-lg': number;
	body: number;
	'body-sm': number;
	caption: number;
	overline: number;
}

/**
 * Generate the strict φ type scale
 *
 * All values derived from φⁿ
 */
export function generateStrictPhiScale(): DerivedTypeScale {
	const scale: Partial<DerivedTypeScale> = {};
	for (const [name, power] of Object.entries(STRICT_PHI.steps)) {
		scale[name as TypeScaleStep] = round(scaleStep(power, PHI));
	}
	return scale as DerivedTypeScale;
}

/**
 * Generate the pragmatic type scale (Canon default)
 *
 * φ for display/headings, minor third (1.2) for body
 */
export function generatePragmaticScale(): DerivedTypeScale {
	const minorThird = SCALE_RATIOS.minorThird;

	return {
		// Golden ratio derived (display hierarchy)
		'display-xl': round(phiPower(4)), // 6.854
		display: round(phiPower(3)), // 4.236
		h1: round(phiPower(2)), // 2.618
		h2: round(phiPower(1)), // 1.618

		// Minor third derived (reading hierarchy)
		h3: round(scaleStep(1, minorThird)), // 1.2
		h4: round(scaleStep(0.5, minorThird)), // 1.095
		h5: BASE_SIZE, // 1
		h6: round(scaleStep(-0.5, minorThird)), // 0.913

		// Body text (minor third from base)
		'body-lg': round(scaleStep(0.5, minorThird)), // 1.095
		body: BASE_SIZE, // 1
		'body-sm': round(scaleStep(-0.5, minorThird)), // 0.913
		caption: round(scaleStep(-1, minorThird)), // 0.833

		// Display element (back to φ)
		overline: round(phiPower(-1)) // 0.618
	};
}

/**
 * Generate a custom type scale from any ratio
 *
 * @param ratio - The scale ratio
 * @param steps - Number of steps above and below base
 */
export function generateCustomScale(
	ratio: number,
	steps: { above: number; below: number } = { above: 4, below: 2 }
): number[] {
	const scale: number[] = [];

	for (let i = -steps.below; i <= steps.above; i++) {
		scale.push(round(scaleStep(i, ratio)));
	}

	return scale;
}

// =============================================================================
// SPACING SCALE
// =============================================================================

/**
 * Named spacing steps
 */
export type SpacingStep = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

/**
 * Spacing scale derived from φ
 *
 * Base: 1rem (sm)
 * Each step is φ larger than the previous
 *
 * | Name | Power | Value   | Purpose           |
 * |------|-------|---------|-------------------|
 * | xs   | -1    | 0.618   | Tight spacing     |
 * | sm   | 0     | 1.000   | Base unit         |
 * | md   | 1     | 1.618   | Standard spacing  |
 * | lg   | 2     | 2.618   | Section breaks    |
 * | xl   | 3     | 4.236   | Major sections    |
 * | 2xl  | 4     | 6.854   | Page divisions    |
 * | 3xl  | 5     | 11.089  | Hero spacing      |
 */
export function generateSpacingScale(): Record<SpacingStep, number> {
	return {
		xs: round(phiPower(-1)), // 0.618
		sm: BASE_SIZE, // 1.000
		md: round(phiPower(1)), // 1.618
		lg: round(phiPower(2)), // 2.618
		xl: round(phiPower(3)), // 4.236
		'2xl': round(phiPower(4)), // 6.854
		'3xl': round(phiPower(5)) // 11.089
	};
}

// =============================================================================
// FLUID TYPOGRAPHY
// =============================================================================

/**
 * Viewport-based fluid typography configuration
 */
export interface FluidConfig {
	/** Minimum viewport width (px) */
	minViewport: number;
	/** Maximum viewport width (px) */
	maxViewport: number;
	/** Minimum size (rem) */
	minSize: number;
	/** Maximum size (rem) */
	maxSize: number;
}

/**
 * Generate CSS clamp() for fluid typography
 *
 * Uses the formula: clamp(min, preferred, max)
 * where preferred = vw + rem offset
 *
 * Mathematical derivation:
 * slope = (maxSize - minSize) / (maxViewport - minViewport)
 * intercept = minSize - (slope × minViewport)
 *
 * @param config - Fluid typography configuration
 * @returns CSS clamp() string
 *
 * @example
 * fluidClamp({ minViewport: 320, maxViewport: 1200, minSize: 1, maxSize: 2 })
 * // "clamp(1rem, 0.636rem + 1.136vw, 2rem)"
 */
export function fluidClamp(config: FluidConfig): string {
	const { minViewport, maxViewport, minSize, maxSize } = config;

	// Calculate slope (change in size per viewport pixel)
	const slope = (maxSize - minSize) / (maxViewport - minViewport);

	// Convert to vw (1vw = 1% of viewport)
	const vw = round(slope * 100, 3);

	// Calculate rem offset (intercept)
	// At minViewport, size should be minSize
	// minSize = (vw × minViewport / 100) + offset
	// offset = minSize - (vw × minViewport / 100)
	const remOffset = round(minSize - (slope * minViewport), 3);

	// Build preferred value string
	const preferred =
		remOffset >= 0 ? `${remOffset}rem + ${vw}vw` : `${Math.abs(remOffset)}rem - ${Math.abs(vw)}vw`;

	return `clamp(${minSize}rem, ${preferred}, ${maxSize}rem)`;
}

/**
 * Default viewport range for fluid typography
 */
export const DEFAULT_FLUID_VIEWPORTS = {
	min: 320, // Mobile
	max: 1200 // Desktop
};

/**
 * Generate fluid type scale with clamp() values
 *
 * For each size, generates a clamp() that scales between
 * 80% at minViewport and 100% at maxViewport.
 *
 * @param scale - Type scale values
 * @param viewports - Min/max viewport widths
 */
export function generateFluidTypeScale(
	scale: DerivedTypeScale = generatePragmaticScale(),
	viewports: { min: number; max: number } = DEFAULT_FLUID_VIEWPORTS
): Record<TypeScaleStep, string> {
	const result: Partial<Record<TypeScaleStep, string>> = {};

	for (const [name, size] of Object.entries(scale) as [TypeScaleStep, number][]) {
		// Scale factor: how much to reduce at minimum viewport
		// Larger sizes scale more aggressively
		const scaleFactor = size > 2 ? 0.6 : size > 1.5 ? 0.7 : 0.85;

		result[name] = fluidClamp({
			minViewport: viewports.min,
			maxViewport: viewports.max,
			minSize: round(size * scaleFactor),
			maxSize: size
		});
	}

	return result as Record<TypeScaleStep, string>;
}

// =============================================================================
// CSS GENERATION
// =============================================================================

/**
 * Generate CSS custom properties for type scale
 *
 * @param scale - Type scale values
 * @param prefix - CSS variable prefix (default: '--text')
 */
export function generateTypeCssVars(
	scale: DerivedTypeScale = generatePragmaticScale(),
	prefix: string = '--text'
): string {
	const lines: string[] = [];

	for (const [name, value] of Object.entries(scale)) {
		lines.push(`${prefix}-${name}: ${value}rem;`);
	}

	return lines.join('\n');
}

/**
 * Generate CSS custom properties for spacing scale
 *
 * @param prefix - CSS variable prefix (default: '--space')
 */
export function generateSpacingCssVars(prefix: string = '--space'): string {
	const scale = generateSpacingScale();
	const lines: string[] = [];

	for (const [name, value] of Object.entries(scale)) {
		lines.push(`${prefix}-${name}: ${value}rem;`);
	}

	return lines.join('\n');
}

/**
 * Generate CSS custom properties with fluid clamp() values
 */
export function generateFluidTypeCssVars(
	scale: DerivedTypeScale = generatePragmaticScale(),
	viewports: { min: number; max: number } = DEFAULT_FLUID_VIEWPORTS,
	prefix: string = '--text'
): string {
	const fluid = generateFluidTypeScale(scale, viewports);
	const lines: string[] = [];

	for (const [name, value] of Object.entries(fluid)) {
		lines.push(`${prefix}-${name}: ${value};`);
	}

	return lines.join('\n');
}

// =============================================================================
// DEBUG UTILITIES
// =============================================================================

/**
 * Print type scale derivation to console
 */
export function debugTypeScale(scale: DerivedTypeScale = generatePragmaticScale()): void {
	console.log('Typography Scale Derivation');
	console.log('===========================');
	console.log(`φ (golden ratio) = ${PHI.toFixed(6)}`);
	console.log(`Base size = ${BASE_SIZE}rem`);
	console.log();

	const pragmatic = generatePragmaticScale();
	const strict = generateStrictPhiScale();

	console.log('| Step       | Pragmatic | Strict φ | Difference |');
	console.log('|------------|-----------|----------|------------|');

	for (const name of Object.keys(scale) as TypeScaleStep[]) {
		const p = pragmatic[name];
		const s = strict[name];
		const diff = round(((p - s) / s) * 100, 1);
		const diffStr = diff >= 0 ? `+${diff}%` : `${diff}%`;
		console.log(
			`| ${name.padEnd(10)} | ${p.toFixed(3).padStart(9)} | ${s.toFixed(3).padStart(8)} | ${diffStr.padStart(10)} |`
		);
	}
}

/**
 * Print spacing scale derivation to console
 */
export function debugSpacingScale(): void {
	console.log('Spacing Scale Derivation');
	console.log('========================');
	console.log(`φ (golden ratio) = ${PHI.toFixed(6)}`);
	console.log(`Base size = ${BASE_SIZE}rem`);
	console.log();

	const scale = generateSpacingScale();

	console.log('| Step | Power | Value (rem) | Value (px @ 16px) |');
	console.log('|------|-------|-------------|-------------------|');

	const powers: Record<SpacingStep, number> = {
		xs: -1,
		sm: 0,
		md: 1,
		lg: 2,
		xl: 3,
		'2xl': 4,
		'3xl': 5
	};

	for (const [name, value] of Object.entries(scale) as [SpacingStep, number][]) {
		const px = round(value * 16, 1);
		console.log(
			`| ${name.padEnd(4)} | ${powers[name].toString().padStart(5)} | ${value.toFixed(3).padStart(11)} | ${px.toFixed(1).padStart(17)} |`
		);
	}
}

/**
 * Visualize the type scale as ASCII bars
 */
export function visualizeTypeScale(scale: DerivedTypeScale = generatePragmaticScale()): string {
	const lines: string[] = ['Type Scale Visualization', ''];
	const maxValue = Math.max(...Object.values(scale));
	const barWidth = 50;

	for (const [name, value] of Object.entries(scale) as [TypeScaleStep, number][]) {
		const barLength = Math.round((value / maxValue) * barWidth);
		const bar = '█'.repeat(barLength);
		lines.push(`${name.padEnd(12)} ${value.toFixed(3).padStart(6)} │ ${bar}`);
	}

	return lines.join('\n');
}

/**
 * Compare current tokens.css values with derived values
 */
export function auditCurrentTokens(): void {
	console.log('Token Audit: Current vs Derived');
	console.log('================================');
	console.log();

	// Current values from tokens.css (extracted from clamp max values)
	const current: Partial<DerivedTypeScale> = {
		'display-xl': 6.854,
		display: 4.236,
		h1: 2.618,
		h2: 1.618,
		h3: 1.25, // Not φ-based
		h4: 1.125, // Not φ-based
		h5: 1.0,
		h6: 0.875, // Not φ-based
		'body-lg': 1.125, // Same as h4
		body: 1.0,
		'body-sm': 0.875, // Same as h6
		caption: 0.75, // Not φ-based
		overline: 0.618 // φ-based
	};

	const derived = generatePragmaticScale();

	console.log('| Step       | Current | Derived | Match? |');
	console.log('|------------|---------|---------|--------|');

	for (const [name, curr] of Object.entries(current) as [TypeScaleStep, number][]) {
		const deriv = derived[name];
		const match = Math.abs(curr - deriv) < 0.01;
		console.log(
			`| ${name.padEnd(10)} | ${curr.toFixed(3).padStart(7)} | ${deriv.toFixed(3).padStart(7)} | ${match ? '  ✓   ' : '  ✗   '} |`
		);
	}
}
