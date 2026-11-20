/**
 * Color System - Functional Minimalism
 *
 * Colors serve function, not decoration.
 * Black/white foundation with functional accents only.
 *
 * "Good design is as little design as possible" - Dieter Rams
 *
 * @remarks
 * All exports in this module are part of the public design system API.
 * They are intentionally exposed for external consumption even if not
 * used internally within this monorepo.
 *
 * @see /STANDARDS.md - Section 1.2 Color Palette
 * @packageDocumentation
 */

const performanceColors = {
	paper: '#000000',
	paperFiber: 'transparent',
	paperEdge: '#3b3b3b',
	paperFold: '#1a1a1a',
	paperShadow: 'rgb(0 0 0 / 0.18)',
	court: '#1a1a1a',
	panel: '#111111',
	ink: '#f2f2f2',
	inkSoft: '#c7c7c7',
	muted: '#aaaaaa',
	line: '#3b3b3b',
	lineStrong: '#777777',
	grid: 'rgb(255 255 255 / 0.06)',
	growth: '#9cdbb6',
	growthSoft: '#203b2b',
	signal: '#aad7f1',
	signalSoft: '#243a48',
	pressure: '#f6bb94',
	pressureSoft: '#452f23',
	risk: '#ffb3b8',
	riskSoft: '#49292c',
	gold: '#ebce86',
	goldSoft: '#3e3520'
} as const;

export const colors = {
	// Backgrounds - black website foundation; explicit light scopes remain available.
	background: {
		pure: '#000000',
		elevated: '#111111',
		surface: '#111111',
		subtle: '#1a1a1a'
	},

	// Foreground - readable neutral roles.
	foreground: {
		primary: '#f2f2f2',
		secondary: '#c7c7c7',
		tertiary: '#aaaaaa',
		muted: '#aaaaaa',
		subtle: '#777777'
	},

	// Borders - Subtle separation
	border: {
		default: '#3b3b3b',
		emphasis: '#777777',
		strong: '#aaaaaa'
	},

	// Functional accents - Muted, purposeful
	accent: {
		success: '#9cdbb6',
		successMuted: '#203b2b',
		error: '#ffb3b8',
		errorMuted: '#49292c',
		warning: '#ebce86',
		warningMuted: '#3e3520',
		info: '#aad7f1',
		infoMuted: '#243a48'
	},

	performance: performanceColors,
	/** @deprecated Use colors.performance. */
	clear: performanceColors,

	// Interactive states
	interactive: {
		hover: 'rgb(255 255 255 / 0.07)',
		active: 'rgb(255 255 255 / 0.12)',
		focus: '#e8e8e8'
	}
} as const;

export type ColorCategory = keyof typeof colors;

/**
 * CSS custom property names for colors
 */
export const colorVars = {
	// Backgrounds
	'--color-performance-bg-pure': colors.background.pure,
	'--color-performance-bg-elevated': colors.background.elevated,
	'--color-performance-bg-surface': colors.background.surface,
	'--color-performance-bg-subtle': colors.background.subtle,

	// Foreground
	'--color-performance-fg-primary': colors.foreground.primary,
	'--color-performance-fg-secondary': colors.foreground.secondary,
	'--color-performance-fg-tertiary': colors.foreground.tertiary,
	'--color-performance-fg-muted': colors.foreground.muted,
	'--color-performance-fg-subtle': colors.foreground.subtle,

	// Borders
	'--color-performance-border-default': colors.border.default,
	'--color-performance-border-emphasis': colors.border.emphasis,
	'--color-performance-border-strong': colors.border.strong,

	// Accents
	'--color-performance-success': colors.accent.success,
	'--color-performance-success-muted': colors.accent.successMuted,
	'--color-performance-error': colors.accent.error,
	'--color-performance-error-muted': colors.accent.errorMuted,
	'--color-performance-warning': colors.accent.warning,
	'--color-performance-warning-muted': colors.accent.warningMuted,
	'--color-performance-info': colors.accent.info,
	'--color-performance-info-muted': colors.accent.infoMuted,

	// Performance Lab
	'--color-performance-paper': colors.performance.paper,
	'--color-performance-paper-fiber': colors.performance.paperFiber,
	'--color-performance-paper-edge': colors.performance.paperEdge,
	'--color-performance-paper-fold': colors.performance.paperFold,
	'--color-performance-paper-shadow': colors.performance.paperShadow,
	'--color-performance-court': colors.performance.court,
	'--color-performance-panel': colors.performance.panel,
	'--color-performance-ink': colors.performance.ink,
	'--color-performance-ink-soft': colors.performance.inkSoft,
	'--color-performance-muted': colors.performance.muted,
	'--color-performance-line': colors.performance.line,
	'--color-performance-line-strong': colors.performance.lineStrong,
	'--color-performance-grid': colors.performance.grid,
	'--color-performance-growth': colors.performance.growth,
	'--color-performance-growth-soft': colors.performance.growthSoft,
	'--color-performance-signal': colors.performance.signal,
	'--color-performance-signal-soft': colors.performance.signalSoft,
	'--color-performance-pressure': colors.performance.pressure,
	'--color-performance-pressure-soft': colors.performance.pressureSoft,
	'--color-performance-risk': colors.performance.risk,
	'--color-performance-risk-soft': colors.performance.riskSoft,
	'--color-performance-gold': colors.performance.gold,
	'--color-performance-gold-soft': colors.performance.goldSoft,
	'--color-performance-controlled': colors.performance.signal,
	'--color-performance-controlled-soft': colors.performance.signalSoft,
	'--color-performance-ready': colors.performance.growth,
	'--color-performance-ready-soft': colors.performance.growthSoft,
	'--color-performance-review': colors.performance.gold,
	'--color-performance-review-soft': colors.performance.goldSoft,
	'--color-performance-stop': colors.performance.risk,
	'--color-performance-stop-soft': colors.performance.riskSoft,

	// Interactive
	'--color-performance-hover': colors.interactive.hover,
	'--color-performance-active': colors.interactive.active,
	'--color-performance-focus': colors.interactive.focus
} as const;

/**
 * Generate CSS custom properties string
 */
export function generateColorsCSS(): string {
	return Object.entries(colorVars)
		.map(([key, value]) => `  ${key}: ${value};`)
		.join('\n');
}
