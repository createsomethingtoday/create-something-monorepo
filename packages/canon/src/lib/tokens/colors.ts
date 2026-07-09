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
	paper: '#f3f3f0',
	court: '#e6e6e0',
	panel: '#ffffff',
	ink: '#090909',
	inkSoft: '#262626',
	muted: '#5e6268',
	line: '#d7d7d2',
	lineStrong: '#9c9c96',
	grid: 'rgb(9 9 9 / 0.055)',
	growth: '#007a4d',
	growthSoft: '#dcece5',
	signal: '#0057b8',
	signalSoft: '#dce8f5',
	pressure: '#e54800',
	pressureSoft: '#f7e2d7',
	risk: '#c62026',
	riskSoft: '#f3dadd',
	gold: '#8b6b00',
	goldSoft: '#eee6cc'
} as const;

export const colors = {
	// Backgrounds - Pure to near-black
	background: {
		pure: '#000000',
		elevated: '#0a0a0a',
		surface: '#111111',
		subtle: '#1a1a1a'
	},

	// Foreground - White with semantic opacity
	foreground: {
		primary: '#ffffff',
		secondary: 'rgba(255, 255, 255, 0.8)',
		tertiary: 'rgba(255, 255, 255, 0.6)',
		muted: 'rgba(255, 255, 255, 0.46)',
		subtle: 'rgba(255, 255, 255, 0.2)'
	},

	// Borders - Subtle separation
	border: {
		default: 'rgba(255, 255, 255, 0.1)',
		emphasis: 'rgba(255, 255, 255, 0.2)',
		strong: 'rgba(255, 255, 255, 0.3)'
	},

	// Functional accents - Muted, purposeful
	accent: {
		success: '#44aa44',
		successMuted: 'rgba(68, 170, 68, 0.2)',
		error: '#cc4444',
		errorMuted: 'rgba(204, 68, 68, 0.2)',
		warning: '#aa8844',
		warningMuted: 'rgba(170, 136, 68, 0.2)',
		info: '#4477aa',
		infoMuted: 'rgba(68, 119, 170, 0.2)'
	},

	performance: performanceColors,
	/** @deprecated Use colors.performance. */
	clear: performanceColors,

	// Interactive states
	interactive: {
		hover: 'rgba(255, 255, 255, 0.05)',
		active: 'rgba(255, 255, 255, 0.1)',
		focus: 'rgba(255, 255, 255, 0.2)'
	}
} as const;

export type ColorCategory = keyof typeof colors;

/**
 * CSS custom property names for colors
 */
export const colorVars = {
	// Backgrounds
	'--color-bg-pure': colors.background.pure,
	'--color-bg-elevated': colors.background.elevated,
	'--color-bg-surface': colors.background.surface,
	'--color-bg-subtle': colors.background.subtle,

	// Foreground
	'--color-fg-primary': colors.foreground.primary,
	'--color-fg-secondary': colors.foreground.secondary,
	'--color-fg-tertiary': colors.foreground.tertiary,
	'--color-fg-muted': colors.foreground.muted,
	'--color-fg-subtle': colors.foreground.subtle,

	// Borders
	'--color-border-default': colors.border.default,
	'--color-border-emphasis': colors.border.emphasis,
	'--color-border-strong': colors.border.strong,

	// Accents
	'--color-success': colors.accent.success,
	'--color-success-muted': colors.accent.successMuted,
	'--color-error': colors.accent.error,
	'--color-error-muted': colors.accent.errorMuted,
	'--color-warning': colors.accent.warning,
	'--color-warning-muted': colors.accent.warningMuted,
	'--color-info': colors.accent.info,
	'--color-info-muted': colors.accent.infoMuted,

	// Performance Lab
	'--color-performance-paper': colors.performance.paper,
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
	'--color-hover': colors.interactive.hover,
	'--color-active': colors.interactive.active,
	'--color-focus': colors.interactive.focus
} as const;

/**
 * Generate CSS custom properties string
 */
export function generateColorsCSS(): string {
	return Object.entries(colorVars)
		.map(([key, value]) => `  ${key}: ${value};`)
		.join('\n');
}
