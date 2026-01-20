/**
 * Shadow Scale - Mathematical Derivation
 *
 * Shadows in UI represent elevation - the vertical distance between
 * a surface and its background. This module derives shadow values
 * from physical principles of light and perception.
 *
 * Core principles:
 * 1. Y-offset = elevation (how high the element appears)
 * 2. Blur = softness from light diffusion (~1.5× elevation)
 * 3. Spread = containment (negative to prevent bleed, ~-20% of blur)
 * 4. Opacity = light falloff (decreases with elevation)
 *
 * "Shadows are the holes in the light." — Terri Guillemets
 */

import { round } from './utils.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Elevation scale using powers of 2
 *
 * Powers of 2 provide clear visual hierarchy and are common in design systems.
 * Each step doubles the perceived elevation.
 *
 * | Step | Power | Elevation | Perceived Height |
 * |------|-------|-----------|------------------|
 * | sm   | 2⁰    | 1px       | Subtle lift      |
 * | md   | 2²    | 4px       | Card elevation   |
 * | lg   | 2³    | 8px       | Modal elevation  |
 * | xl   | 2⁴    | 16px      | Drawer/dialog    |
 * | 2xl  | 2⁵    | 32px      | Full overlay     |
 */
export const ELEVATION_SCALE = {
	none: 0,
	sm: 1, // 2⁰
	md: 4, // 2²
	lg: 8, // 2³
	xl: 16, // 2⁴
	'2xl': 32 // 2⁵
} as const;

/**
 * Shadow physics constants
 *
 * These ratios are derived from observations of natural shadows:
 * - Blur increases with distance from surface (light diffusion)
 * - Spread is slightly negative to contain the shadow
 * - Opacity decreases as elevation increases (inverse square approximation)
 */
export const SHADOW_PHYSICS = {
	/** Blur = elevation × this factor (typical range: 1.5-2.0) */
	blurFactor: 1.5,

	/** Spread = blur × this factor (negative for containment) */
	spreadFactor: -0.2,

	/** Base opacity at elevation 1 */
	baseOpacity: 0.25,

	/** Opacity reduction per elevation step (simulates light falloff) */
	opacityDecay: 0.03
} as const;

/**
 * Glow shadow constants
 *
 * Glows use a different model - they represent light emission rather than obstruction.
 * Blur doubles per step, opacity increases linearly.
 */
export const GLOW_PHYSICS = {
	/** Base blur radius */
	baseBlur: 10,

	/** Blur multiplier per step */
	blurMultiplier: 2,

	/** Base opacity */
	baseOpacity: 0.05,

	/** Opacity increment per step */
	opacityIncrement: 0.05
} as const;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Named shadow elevation steps
 */
export type ShadowStep = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Named glow steps
 */
export type GlowStep = 'sm' | 'md' | 'lg';

/**
 * Shadow layer definition
 */
export interface ShadowLayer {
	/** X offset (typically 0 for drop shadows) */
	x: number;
	/** Y offset (elevation) */
	y: number;
	/** Blur radius */
	blur: number;
	/** Spread radius (negative for containment) */
	spread: number;
	/** Shadow color with opacity */
	color: string;
	/** Whether this is an inset shadow */
	inset?: boolean;
}

/**
 * Complete shadow definition (may have multiple layers)
 */
export interface Shadow {
	/** Primary shadow layer */
	primary: ShadowLayer;
	/** Optional ambient/secondary layer for softness */
	ambient?: ShadowLayer;
}

// =============================================================================
// SHADOW GENERATION
// =============================================================================

/**
 * Calculate shadow parameters from elevation
 *
 * Physical derivation:
 * 1. Y-offset = elevation directly
 * 2. Blur = elevation × 1.5 (light source diffusion)
 * 3. Spread = blur × -0.2 (containment)
 * 4. Opacity = 0.25 - (step × 0.03) (inverse square approximation)
 *
 * @param elevation - The elevation in pixels
 * @param stepIndex - The step index (0-4) for opacity calculation
 */
export function calculateShadow(elevation: number, stepIndex: number): Shadow {
	if (elevation === 0) {
		return {
			primary: { x: 0, y: 0, blur: 0, spread: 0, color: 'transparent' }
		};
	}

	const blur = round(elevation * SHADOW_PHYSICS.blurFactor);
	const spread = round(blur * SHADOW_PHYSICS.spreadFactor);
	const opacity = round(
		Math.max(0.1, SHADOW_PHYSICS.baseOpacity - stepIndex * SHADOW_PHYSICS.opacityDecay),
		2
	);

	// Primary shadow (main elevation)
	const primary: ShadowLayer = {
		x: 0,
		y: elevation,
		blur,
		spread,
		color: `rgba(0, 0, 0, ${opacity})`
	};

	// Ambient shadow (softer, wider, provides depth)
	// Only for elevations > 1px
	if (elevation > 1) {
		const ambientBlur = round(elevation * 0.5);
		const ambientOpacity = round(opacity * 0.4, 2);
		const ambient: ShadowLayer = {
			x: 0,
			y: round(elevation * 0.25),
			blur: ambientBlur,
			spread: round(ambientBlur * -0.5),
			color: `rgba(0, 0, 0, ${ambientOpacity})`
		};
		return { primary, ambient };
	}

	return { primary };
}

/**
 * Generate all elevation shadows
 */
export function generateShadows(): Record<ShadowStep, Shadow> {
	const steps: ShadowStep[] = ['none', 'sm', 'md', 'lg', 'xl', '2xl'];
	const shadows: Partial<Record<ShadowStep, Shadow>> = {};

	steps.forEach((step, index) => {
		const elevation = ELEVATION_SCALE[step];
		shadows[step] = calculateShadow(elevation, index);
	});

	return shadows as Record<ShadowStep, Shadow>;
}

/**
 * Pre-calculated shadows
 *
 * | Step | Elevation | Blur | Spread | Opacity |
 * |------|-----------|------|--------|---------|
 * | none | 0         | 0    | 0      | 0       |
 * | sm   | 1px       | 1.5px| -0.3px | 0.25    |
 * | md   | 4px       | 6px  | -1.2px | 0.22    |
 * | lg   | 8px       | 12px | -2.4px | 0.19    |
 * | xl   | 16px      | 24px | -4.8px | 0.16    |
 * | 2xl  | 32px      | 48px | -9.6px | 0.13    |
 */
export const DERIVED_SHADOWS = generateShadows();

// =============================================================================
// GLOW GENERATION
// =============================================================================

/**
 * Calculate glow shadow parameters
 *
 * Glows represent light emission, not obstruction.
 * - Blur doubles per step (exponential spread)
 * - Opacity increases linearly (brighter glow)
 *
 * @param stepIndex - 0 = sm, 1 = md, 2 = lg
 */
export function calculateGlow(stepIndex: number): ShadowLayer {
	const blur = GLOW_PHYSICS.baseBlur * Math.pow(GLOW_PHYSICS.blurMultiplier, stepIndex);
	const opacity = round(
		GLOW_PHYSICS.baseOpacity + stepIndex * GLOW_PHYSICS.opacityIncrement,
		2
	);

	return {
		x: 0,
		y: 0,
		blur,
		spread: 0,
		color: `rgba(255, 255, 255, ${opacity})`
	};
}

/**
 * Generate all glow shadows
 */
export function generateGlows(): Record<GlowStep, ShadowLayer> {
	return {
		sm: calculateGlow(0),
		md: calculateGlow(1),
		lg: calculateGlow(2)
	};
}

/**
 * Pre-calculated glows
 *
 * | Step | Blur | Opacity | Derivation         |
 * |------|------|---------|-------------------|
 * | sm   | 10px | 0.05    | 10 × 2⁰, base     |
 * | md   | 20px | 0.10    | 10 × 2¹, +0.05    |
 * | lg   | 40px | 0.15    | 10 × 2², +0.10    |
 */
export const DERIVED_GLOWS = generateGlows();

// =============================================================================
// INNER SHADOWS
// =============================================================================

/**
 * Calculate inner shadow parameters
 *
 * Inner shadows suggest depth into the surface.
 * Uses simpler scale: base and lg (2× base).
 */
export function calculateInnerShadow(elevation: number): ShadowLayer {
	return {
		x: 0,
		y: elevation,
		blur: elevation * 2,
		spread: 0,
		color: 'rgba(0, 0, 0, 0.5)',
		inset: true
	};
}

/**
 * Pre-calculated inner shadows
 *
 * | Step | Y-offset | Blur | Derivation |
 * |------|----------|------|------------|
 * | base | 2px      | 4px  | base       |
 * | lg   | 4px      | 8px  | 2× base    |
 */
export const DERIVED_INNER_SHADOWS = {
	base: calculateInnerShadow(2),
	lg: calculateInnerShadow(4)
};

// =============================================================================
// CSS GENERATION
// =============================================================================

/**
 * Convert shadow layer to CSS string
 */
export function shadowLayerToCss(layer: ShadowLayer): string {
	const inset = layer.inset ? 'inset ' : '';
	return `${inset}${layer.x}px ${layer.y}px ${layer.blur}px ${layer.spread}px ${layer.color}`;
}

/**
 * Convert complete shadow to CSS string
 */
export function shadowToCss(shadow: Shadow): string {
	const parts = [shadowLayerToCss(shadow.primary)];
	if (shadow.ambient) {
		parts.push(shadowLayerToCss(shadow.ambient));
	}
	return parts.join(', ');
}

/**
 * Generate CSS custom properties for shadows
 */
export function generateShadowCssVars(): string {
	const shadows = generateShadows();
	const glows = generateGlows();
	const inner = DERIVED_INNER_SHADOWS;

	const lines: string[] = [];

	// Drop shadows
	for (const [step, shadow] of Object.entries(shadows) as [ShadowStep, Shadow][]) {
		if (step === 'none') {
			lines.push('--shadow-none: none;');
		} else {
			lines.push(`--shadow-${step}: ${shadowToCss(shadow)};`);
		}
	}

	lines.push('');

	// Glow shadows
	for (const [step, glow] of Object.entries(glows) as [GlowStep, ShadowLayer][]) {
		lines.push(`--shadow-glow-${step}: ${shadowLayerToCss(glow)};`);
	}

	lines.push('');

	// Inner shadows
	lines.push(`--shadow-inner: ${shadowLayerToCss(inner.base)};`);
	lines.push(`--shadow-inner-lg: ${shadowLayerToCss(inner.lg)};`);

	return lines.join('\n');
}

// =============================================================================
// DEBUG UTILITIES
// =============================================================================

/**
 * Print shadow derivation to console
 */
export function debugShadows(): void {
	console.log('Shadow Scale Derivation');
	console.log('=======================');
	console.log();
	console.log('Physics constants:');
	console.log(`  Blur factor: ${SHADOW_PHYSICS.blurFactor}× elevation`);
	console.log(`  Spread factor: ${SHADOW_PHYSICS.spreadFactor}× blur`);
	console.log(`  Base opacity: ${SHADOW_PHYSICS.baseOpacity}`);
	console.log(`  Opacity decay: ${SHADOW_PHYSICS.opacityDecay} per step`);
	console.log();

	console.log('Elevation scale (powers of 2):');
	console.log('| Step | Power | Elevation |');
	console.log('|------|-------|-----------|');
	for (const [step, elev] of Object.entries(ELEVATION_SCALE)) {
		const power = elev === 0 ? '-' : `2^${Math.log2(elev)}`;
		console.log(`| ${step.padEnd(4)} | ${power.padStart(5)} | ${elev.toString().padStart(9)}px |`);
	}
	console.log();

	console.log('Derived shadows:');
	console.log('| Step | Y-off | Blur  | Spread | Opacity | Has ambient |');
	console.log('|------|-------|-------|--------|---------|-------------|');

	const shadows = generateShadows();
	for (const [step, shadow] of Object.entries(shadows) as [ShadowStep, Shadow][]) {
		const p = shadow.primary;
		const hasAmbient = shadow.ambient ? 'yes' : 'no';
		// Extract opacity from color string
		const opacityMatch = p.color.match(/[\d.]+\)$/);
		const opacity = opacityMatch ? opacityMatch[0].replace(')', '') : '-';
		console.log(
			`| ${step.padEnd(4)} | ${p.y.toString().padStart(5)}px | ${p.blur.toString().padStart(5)}px | ${p.spread.toString().padStart(6)}px | ${opacity.padStart(7)} | ${hasAmbient.padStart(11)} |`
		);
	}
}

/**
 * Print glow derivation to console
 */
export function debugGlows(): void {
	console.log('Glow Scale Derivation');
	console.log('=====================');
	console.log();
	console.log('Physics constants:');
	console.log(`  Base blur: ${GLOW_PHYSICS.baseBlur}px`);
	console.log(`  Blur multiplier: ${GLOW_PHYSICS.blurMultiplier}× per step`);
	console.log(`  Base opacity: ${GLOW_PHYSICS.baseOpacity}`);
	console.log(`  Opacity increment: ${GLOW_PHYSICS.opacityIncrement} per step`);
	console.log();

	console.log('Derived glows:');
	console.log('| Step | Blur  | Opacity | Derivation          |');
	console.log('|------|-------|---------|---------------------|');

	const glows = generateGlows();
	const steps: GlowStep[] = ['sm', 'md', 'lg'];
	steps.forEach((step, i) => {
		const g = glows[step];
		const derivation = `${GLOW_PHYSICS.baseBlur} × 2^${i}`;
		// Extract opacity from color string
		const opacityMatch = g.color.match(/[\d.]+\)$/);
		const opacity = opacityMatch ? opacityMatch[0].replace(')', '') : '-';
		console.log(
			`| ${step.padEnd(4)} | ${g.blur.toString().padStart(5)}px | ${opacity.padStart(7)} | ${derivation.padEnd(19)} |`
		);
	});
}

/**
 * Compare current tokens.css values with derived values
 */
export function auditShadows(): void {
	console.log('Shadow Audit: Current (Tailwind) vs Derived');
	console.log('============================================');
	console.log();
	console.log('Note: Current values are Tailwind defaults, not mathematically derived.');
	console.log('Derived values use power-of-2 elevation with physical shadow modeling.');
	console.log();

	// Current Tailwind values (primary layer only)
	const current: Record<string, { y: number; blur: number; spread: number }> = {
		sm: { y: 1, blur: 2, spread: 0 },
		md: { y: 4, blur: 6, spread: -1 },
		lg: { y: 10, blur: 15, spread: -3 },
		xl: { y: 20, blur: 25, spread: -5 },
		'2xl': { y: 25, blur: 50, spread: -12 }
	};

	const derived = generateShadows();

	console.log('| Step | Current Y | Derived Y | Current Blur | Derived Blur |');
	console.log('|------|-----------|-----------|--------------|--------------|');

	for (const step of ['sm', 'md', 'lg', 'xl', '2xl'] as ShadowStep[]) {
		const c = current[step];
		const d = derived[step].primary;
		console.log(
			`| ${step.padEnd(4)} | ${c.y.toString().padStart(9)}px | ${d.y.toString().padStart(9)}px | ${c.blur.toString().padStart(12)}px | ${d.blur.toString().padStart(12)}px |`
		);
	}

	console.log();
	console.log('Recommendation: Keep Tailwind values for ecosystem compatibility,');
	console.log('but document them as pragmatic choices rather than derived values.');
}
