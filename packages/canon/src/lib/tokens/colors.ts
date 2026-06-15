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
		muted: 'rgba(255, 255, 255, 0.4)',
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

	// Clear communication pilot - light, operational, proof-first surfaces
	clear: {
		porcelain: '#f9f9f9',
		porcelainSoft: '#f2f2f2',
		panel: '#ffffff',
		onyx: '#0a0e19',
		grey: '#636363',
		greyQuiet: '#818181',
		border: '#e1e1e1',
		borderStrong: '#cecece',
		moss: '#1e3c2c',
		ocean: '#0048ff',
		stop: '#c41e3a'
	},

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

	// Clear communication
	'--color-clear-porcelain': colors.clear.porcelain,
	'--color-clear-porcelain-soft': colors.clear.porcelainSoft,
	'--color-clear-panel': colors.clear.panel,
	'--color-clear-onyx': colors.clear.onyx,
	'--color-clear-grey': colors.clear.grey,
	'--color-clear-grey-quiet': colors.clear.greyQuiet,
	'--color-clear-border': colors.clear.border,
	'--color-clear-border-strong': colors.clear.borderStrong,
	'--color-clear-moss': colors.clear.moss,
	'--color-clear-ocean': colors.clear.ocean,
	'--color-clear-stop': colors.clear.stop,

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
