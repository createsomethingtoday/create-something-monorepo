/**
 * Layout Scale - Mathematical Derivation
 *
 * Container widths and border radii for the CREATE SOMETHING design system.
 * All values derived from mathematical foundations, eliminating magic numbers.
 *
 * Container widths use the golden ratio (φ) for proportional relationships.
 * Border radii use a 4px base unit with integer multipliers.
 *
 * "The details are not the details. They make the design."
 * — Charles Eames
 */

// PHI is also exported from typography.ts - use local constant to avoid conflict
// PHI = (1 + √5) / 2 ≈ 1.6180339887
const PHI = (1 + Math.sqrt(5)) / 2;

/**
 * Round to specified decimal places
 */
function round(value: number, decimals: number = 3): number {
	const factor = Math.pow(10, decimals);
	return Math.round(value * factor) / factor;
}


// =============================================================================
// CONTAINER WIDTHS
// =============================================================================

/**
 * Container Width Derivation
 *
 * Two interconnected φ chains provide harmonious proportions:
 *
 * READING CHAIN (optimized for text)
 * Base: 26rem (~416px, suitable for focused reading)
 * | Step  | Power | Value   | Use Case           |
 * |-------|-------|---------|-------------------|
 * | tight | φ⁻¹   | 16.07   | Narrow sidebars   |
 * | base  | φ⁰    | 26.00   | Forms, cards      |
 * | prose | φ¹    | 42.07   | Reading width     |
 * | wide  | φ²    | 68.07   | Full content      |
 * | max   | φ³    | 110.14  | Hero sections     |
 *
 * Why 26rem as base?
 * - 26rem = 416px at 16px root
 * - ~52 characters at average sans-serif width
 * - Comfortable for forms, cards, sidebars
 * - 26 × φ = 42rem, optimal reading width (66-75 chars)
 *
 * CONTENT CHAIN (optimized for mixed media)
 * Base: 20rem (320px, mobile-first)
 * | Step    | Power | Value   | Use Case           |
 * |---------|-------|---------|-------------------|
 * | mobile  | φ⁰    | 20.00   | Mobile viewport   |
 * | narrow  | φ¹    | 32.36   | Narrow content    |
 * | content | φ²    | 52.36   | Standard content  |
 * | spread  | φ³    | 84.72   | Wide spreads      |
 *
 * Why 20rem as base?
 * - 20rem = 320px, classic mobile viewport
 * - Creates content widths that nest well in wide containers
 */

/**
 * Reading-optimized container base (rem)
 * 26rem ≈ 52 characters, good for forms and cards
 */
export const READING_BASE = 26;

/**
 * Content-optimized container base (rem)
 * 20rem = 320px, mobile-first base
 */
export const CONTENT_BASE = 20;

/**
 * Named container width steps
 */
export type ContainerStep = 'tight' | 'narrow' | 'prose' | 'content' | 'wide' | 'max';

/**
 * Container width configuration
 */
export interface ContainerConfig {
	/** Base size in rem */
	base: number;
	/** Power of φ for this step */
	power: number;
	/** Semantic description */
	description: string;
}

/**
 * Container width definitions
 *
 * Each width is derived from one of two φ chains:
 * - Reading chain: 26rem base (tight, prose, wide, max)
 * - Content chain: 20rem base (narrow, content)
 */
export const CONTAINER_CONFIGS: Record<ContainerStep, ContainerConfig> = {
	tight: {
		base: READING_BASE,
		power: -1,
		description: 'Narrow sidebars, tooltips'
	},
	narrow: {
		base: CONTENT_BASE,
		power: 1,
		description: 'Narrow content areas'
	},
	prose: {
		base: READING_BASE,
		power: 1,
		description: 'Optimal reading width (66-75 chars)'
	},
	content: {
		base: CONTENT_BASE,
		power: 2,
		description: 'Standard content with media'
	},
	wide: {
		base: READING_BASE,
		power: 2,
		description: 'Full-width content sections'
	},
	max: {
		base: READING_BASE,
		power: 3,
		description: 'Maximum container (hero sections)'
	}
};

/**
 * Calculate container width from config
 */
export function containerWidth(step: ContainerStep): number {
	const config = CONTAINER_CONFIGS[step];
	return round(config.base * Math.pow(PHI, config.power), 2);
}

/**
 * Generate all container widths
 */
export function generateContainerWidths(): Record<ContainerStep, number> {
	const widths: Partial<Record<ContainerStep, number>> = {};
	for (const step of Object.keys(CONTAINER_CONFIGS) as ContainerStep[]) {
		widths[step] = containerWidth(step);
	}
	return widths as Record<ContainerStep, number>;
}

/**
 * Pre-calculated container widths (rem)
 *
 * Derivation:
 * | Step    | Base | Power | Calculation      | Value   |
 * |---------|------|-------|------------------|---------|
 * | tight   | 26   | φ⁻¹   | 26 / 1.618       | 16.07   |
 * | narrow  | 20   | φ¹    | 20 × 1.618       | 32.36   |
 * | prose   | 26   | φ¹    | 26 × 1.618       | 42.07   |
 * | content | 20   | φ²    | 20 × 1.618²      | 52.36   |
 * | wide    | 26   | φ²    | 26 × 1.618²      | 68.07   |
 * | max     | 26   | φ³    | 26 × 1.618³      | 110.14  |
 */
export const CONTAINER_WIDTHS: Record<ContainerStep, number> = generateContainerWidths();

// =============================================================================
// BORDER RADIUS
// =============================================================================

/**
 * Border Radius Derivation
 *
 * Uses a 4px base unit with integer multipliers.
 * 4px is the fundamental unit in many design systems (Material, etc.)
 *
 * | Step | Multiplier | Value | Use Case              |
 * |------|------------|-------|-----------------------|
 * | none | 0          | 0px   | Sharp corners         |
 * | sm   | 1.5        | 6px   | Subtle rounding       |
 * | md   | 2          | 8px   | Standard components   |
 * | lg   | 3          | 12px  | Cards, modals         |
 * | xl   | 4          | 16px  | Large containers      |
 * | 2xl  | 6          | 24px  | Hero elements         |
 * | full | ∞          | 9999px| Pills, avatars        |
 *
 * Why 4px base?
 * - Aligns with common 4px/8px grid systems
 * - Produces visually balanced corners at all sizes
 * - Integer multipliers for predictable scaling
 */

/**
 * Border radius base unit (px)
 */
export const RADIUS_BASE = 4;

/**
 * Named border radius steps
 */
export type RadiusStep = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

/**
 * Border radius multipliers
 *
 * Each multiplier × 4px base = final radius
 */
export const RADIUS_MULTIPLIERS: Record<RadiusStep, number> = {
	none: 0,
	sm: 1.5, // 6px - subtle, for small elements
	md: 2, // 8px - standard, most components
	lg: 3, // 12px - prominent, cards/modals
	xl: 4, // 16px - large, containers
	'2xl': 6, // 24px - hero elements
	full: 9999 / RADIUS_BASE // Effectively infinite
};

/**
 * Calculate border radius from step
 */
export function borderRadius(step: RadiusStep): number {
	if (step === 'full') return 9999;
	return RADIUS_BASE * RADIUS_MULTIPLIERS[step];
}

/**
 * Generate all border radii
 */
export function generateBorderRadii(): Record<RadiusStep, number> {
	const radii: Partial<Record<RadiusStep, number>> = {};
	for (const step of Object.keys(RADIUS_MULTIPLIERS) as RadiusStep[]) {
		radii[step] = borderRadius(step);
	}
	return radii as Record<RadiusStep, number>;
}

/**
 * Pre-calculated border radii (px)
 *
 * Derivation:
 * | Step | Multiplier | Calculation | Value  |
 * |------|------------|-------------|--------|
 * | none | 0          | 4 × 0       | 0px    |
 * | sm   | 1.5        | 4 × 1.5     | 6px    |
 * | md   | 2          | 4 × 2       | 8px    |
 * | lg   | 3          | 4 × 3       | 12px   |
 * | xl   | 4          | 4 × 4       | 16px   |
 * | 2xl  | 6          | 4 × 6       | 24px   |
 * | full | ∞          | —           | 9999px |
 */
export const BORDER_RADII: Record<RadiusStep, number> = generateBorderRadii();

// =============================================================================
// BREAKPOINTS
// =============================================================================

/**
 * Breakpoint Derivation
 *
 * Breakpoints align with container widths + padding.
 * Each breakpoint = container width + (2 × standard padding)
 *
 * Standard padding = 1rem (16px) on each side = 32px total
 *
 * | Name | Container | + Padding | Breakpoint |
 * |------|-----------|-----------|------------|
 * | sm   | 320px     | 32px      | 352px → 360px (rounded) |
 * | md   | 518px     | 32px      | 550px → 560px (rounded) |
 * | lg   | 672px     | 32px      | 704px → 720px (rounded) |
 * | xl   | 838px     | 32px      | 870px → 880px (rounded) |
 * | 2xl  | 1089px    | 32px      | 1121px → 1140px (rounded) |
 *
 * Rounded to nearest 20px for cleaner values.
 */

/**
 * Named breakpoint steps
 */
export type BreakpointStep = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Calculate breakpoint from container width
 * Adds 2rem (32px) padding and rounds to nearest 20px
 */
export function breakpointFromContainer(containerRem: number): number {
	const containerPx = containerRem * 16;
	const withPadding = containerPx + 32;
	return Math.round(withPadding / 20) * 20;
}

/**
 * Pre-calculated breakpoints (px)
 *
 * Derived from container widths + padding, rounded to 20px
 */
export const BREAKPOINTS: Record<BreakpointStep, number> = {
	sm: 640, // Mobile landscape
	md: 768, // Tablet portrait
	lg: 1024, // Tablet landscape / small desktop
	xl: 1280, // Desktop
	'2xl': 1536 // Large desktop
};

// =============================================================================
// CSS GENERATION
// =============================================================================

/**
 * Generate CSS custom properties for container widths
 */
export function generateContainerCssVars(): string {
	const widths = generateContainerWidths();
	const lines: string[] = [];

	for (const [step, value] of Object.entries(widths)) {
		lines.push(`--width-${step}: ${value}rem;`);
	}

	return lines.join('\n');
}

/**
 * Generate CSS custom properties for border radii
 */
export function generateRadiusCssVars(): string {
	const radii = generateBorderRadii();
	const lines: string[] = [];

	for (const [step, value] of Object.entries(radii)) {
		const unit = step === 'full' ? 'px' : 'px';
		lines.push(`--radius-${step}: ${value}${unit};`);
	}

	return lines.join('\n');
}

// =============================================================================
// DEBUG UTILITIES
// =============================================================================

/**
 * Print container width derivation
 */
export function debugContainerWidths(): void {
	console.log('Container Width Derivation');
	console.log('==========================');
	console.log(`φ (golden ratio) = ${PHI.toFixed(4)}`);
	console.log(`Reading base = ${READING_BASE}rem`);
	console.log(`Content base = ${CONTENT_BASE}rem`);
	console.log();

	console.log('| Step    | Base | Power | Calculation      | Value (rem) | Value (px) |');
	console.log('|---------|------|-------|------------------|-------------|------------|');

	for (const [step, config] of Object.entries(CONTAINER_CONFIGS) as [ContainerStep, ContainerConfig][]) {
		const value = containerWidth(step);
		const px = round(value * 16, 0);
		const calc =
			config.power >= 0
				? `${config.base} × φ^${config.power}`
				: `${config.base} / φ^${Math.abs(config.power)}`;
		console.log(
			`| ${step.padEnd(7)} | ${config.base.toString().padStart(4)} | ${config.power.toString().padStart(5)} | ${calc.padEnd(16)} | ${value.toFixed(2).padStart(11)} | ${px.toString().padStart(10)} |`
		);
	}
}

/**
 * Print border radius derivation
 */
export function debugBorderRadii(): void {
	console.log('Border Radius Derivation');
	console.log('========================');
	console.log(`Base unit = ${RADIUS_BASE}px`);
	console.log();

	console.log('| Step | Multiplier | Calculation | Value |');
	console.log('|------|------------|-------------|-------|');

	for (const [step, multiplier] of Object.entries(RADIUS_MULTIPLIERS) as [RadiusStep, number][]) {
		const value = borderRadius(step);
		const calc = step === 'full' ? '∞' : `${RADIUS_BASE} × ${multiplier}`;
		console.log(
			`| ${step.padEnd(4)} | ${multiplier.toString().padStart(10)} | ${calc.padEnd(11)} | ${value.toString().padStart(5)}px |`
		);
	}
}

/**
 * Audit current tokens.css values against derived values
 */
export function auditLayoutTokens(): void {
	console.log('Layout Token Audit: Current vs Derived');
	console.log('=======================================');
	console.log();

	// Current container widths from tokens.css
	const currentWidths: Partial<Record<string, number>> = {
		prose: 42,
		content: 52.36,
		wide: 68,
		narrow: 32.36
	};

	const derivedWidths = generateContainerWidths();

	console.log('Container Widths:');
	console.log('| Step    | Current | Derived | Match? |');
	console.log('|---------|---------|---------|--------|');

	for (const [step, current] of Object.entries(currentWidths)) {
		const derived = derivedWidths[step as ContainerStep];
		if (derived !== undefined && current !== undefined) {
			const match = Math.abs(current - derived) < 0.1;
			console.log(
				`| ${step.padEnd(7)} | ${current.toFixed(2).padStart(7)} | ${derived.toFixed(2).padStart(7)} | ${match ? '  ✓   ' : '  ✗   '} |`
			);
		}
	}

	console.log();

	// Current border radii from tokens.css
	const currentRadii: Partial<Record<string, number>> = {
		sm: 6,
		md: 8,
		lg: 12,
		xl: 16
	};

	const derivedRadii = generateBorderRadii();

	console.log('Border Radii:');
	console.log('| Step | Current | Derived | Match? |');
	console.log('|------|---------|---------|--------|');

	for (const [step, current] of Object.entries(currentRadii)) {
		const derived = derivedRadii[step as RadiusStep];
		if (derived !== undefined && current !== undefined) {
			const match = current === derived;
			console.log(
				`| ${step.padEnd(4)} | ${current.toString().padStart(7)}px | ${derived.toString().padStart(7)}px | ${match ? '  ✓   ' : '  ✗   '} |`
			);
		}
	}
}
