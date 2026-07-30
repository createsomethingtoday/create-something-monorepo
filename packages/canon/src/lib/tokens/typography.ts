/**
 * Typography System - Fluid & Canonical
 *
 * Typography follows a mathematical scale using CSS clamp()
 * for fluid responsiveness without breakpoint jumps.
 *
 * "Typography is the craft of endowing human language with a durable visual form" - Robert Bringhurst
 *
 * @see /STANDARDS.md - Section 1.1 Typography
 */

export const typography = {
	// Font families
	family: {
		sans:
			'Arial, "Helvetica Neue", Helvetica, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
		display: 'var(--font-performance-sans)',
		mono:
			'"IBM Plex Mono", "SFMono-Regular", "SF Mono", Menlo, Monaco, Consolas, monospace',
		serif: 'Georgia, "Times New Roman", serif',
		interface: 'var(--font-performance-sans)',
		prose: 'var(--font-performance-sans)',
		record: 'var(--font-performance-mono)',
		'topology-label': 'var(--font-performance-mono)',
		code: 'var(--font-performance-mono)'
	},

	// Font weights
	weight: {
		regular: '400',
		medium: '500',
		semibold: '600',
		bold: '700'
	},

	// Line heights
	leading: {
		tight: '1.25',
		snug: '1.375',
		normal: '1.5',
		relaxed: '1.625',
		loose: '1.75'
	},

	// Letter spacing
	tracking: {
		tighter: '-0.025em',
		tight: '-0.015em',
		normal: '0',
		wide: '0.025em',
		wider: '0.05em',
		widest: '0.1em'
	},

	// Fluid type scale (min → max via clamp)
	// Based on: clamp(min, preferred, max)
	// Preferred uses viewport width for smooth scaling
	scale: {
		// Display sizes
		'display-xl': 'clamp(4.236rem, 6vw + 2rem, 6.854rem)', // φ⁴ max
		display: 'clamp(2.618rem, 4vw + 1.5rem, 4.236rem)', // φ³ max

		// Headings
		h1: 'clamp(1.618rem, 3vw + 1rem, 2.618rem)', // φ² max
		h2: 'clamp(1.2rem, 2vw + 0.5rem, 1.618rem)', // φ¹ max
		h3: 'clamp(1.02rem, 1vw + 0.5rem, 1.2rem)', // 1.2¹ max
		h4: 'clamp(0.931rem, 0.5vw + 0.5rem, 1.095rem)', // √1.2 max
		h5: '1rem', // base
		h6: '0.913rem', // 1/√1.2

		// Body sizes
		'body-lg': '1.095rem', // √1.2
		body: '1rem', // base
		'body-sm': '0.913rem', // 1/√1.2

		// Utility sizes
		caption: '0.833rem', // 1/1.2
		overline: '0.618rem', // 1/φ

		// Role sizes
		record: 'var(--text-performance-body-sm)',
		'record-meta': 'var(--text-performance-caption)',
		'operator-label': '0.72rem',
		'topology-label': '0.72rem'
	}
} as const;

export type FontFamily = keyof typeof typography.family;
export type FontWeight = keyof typeof typography.weight;
export type LineHeight = keyof typeof typography.leading;
export type LetterSpacing = keyof typeof typography.tracking;
export type TypeScale = keyof typeof typography.scale;

/**
 * CSS custom property names for typography
 */
export const typographyVars = {
	// Families
	'--font-performance-sans': typography.family.sans,
	'--font-performance-display': typography.family.display,
	'--font-performance-mono': typography.family.mono,
	'--font-performance-serif': typography.family.serif,
	'--font-performance-interface': typography.family.interface,
	'--font-performance-prose': typography.family.prose,
	'--font-performance-record': typography.family.record,
	'--font-performance-topology-label': typography.family['topology-label'],
	'--font-performance-code': typography.family.code,

	// Weights
	'--font-performance-regular': typography.weight.regular,
	'--font-performance-medium': typography.weight.medium,
	'--font-performance-semibold': typography.weight.semibold,
	'--font-performance-bold': typography.weight.bold,

	// Line heights
	'--leading-performance-tight': typography.leading.tight,
	'--leading-performance-snug': typography.leading.snug,
	'--leading-performance-normal': typography.leading.normal,
	'--leading-performance-relaxed': typography.leading.relaxed,
	'--leading-performance-loose': typography.leading.loose,

	// Letter spacing
	'--tracking-performance-tighter': typography.tracking.tighter,
	'--tracking-performance-tight': typography.tracking.tight,
	'--tracking-performance-normal': typography.tracking.normal,
	'--tracking-performance-wide': typography.tracking.wide,
	'--tracking-performance-wider': typography.tracking.wider,
	'--tracking-performance-widest': typography.tracking.widest,
	'--tracking-performance-record': typography.tracking.normal,
	'--tracking-performance-operator-label': typography.tracking.normal,
	'--tracking-performance-topology-label': typography.tracking.normal,

	// Type scale
	'--text-performance-display-xl': typography.scale['display-xl'],
	'--text-performance-display': typography.scale.display,
	'--text-performance-h1': typography.scale.h1,
	'--text-performance-h2': typography.scale.h2,
	'--text-performance-h3': typography.scale.h3,
	'--text-performance-h4': typography.scale.h4,
	'--text-performance-h5': typography.scale.h5,
	'--text-performance-h6': typography.scale.h6,
	'--text-performance-body-lg': typography.scale['body-lg'],
	'--text-performance-body': typography.scale.body,
	'--text-performance-body-sm': typography.scale['body-sm'],
	'--text-performance-caption': typography.scale.caption,
	'--text-performance-overline': typography.scale.overline,
	'--text-performance-record': typography.scale.record,
	'--text-performance-record-meta': typography.scale['record-meta'],
	'--text-performance-operator-label': typography.scale['operator-label'],
	'--text-performance-topology-label': typography.scale['topology-label'],

	// Role line heights
	'--leading-performance-record': '1.35',
	'--leading-performance-topology-label': '1.2'
} as const;

/**
 * Generate CSS custom properties string
 */
export function generateTypographyCSS(): string {
	return Object.entries(typographyVars)
		.map(([key, value]) => `  ${key}: ${value};`)
		.join('\n');
}

/**
 * Get heading styles (font-size + letter-spacing + line-height)
 */
export function getHeadingStyles(level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'): {
	fontSize: string;
	letterSpacing: string;
	lineHeight: string;
	fontWeight: string;
} {
	const letterSpacingMap = {
		h1: typography.tracking.tighter,
		h2: typography.tracking.tighter,
		h3: typography.tracking.tight,
		h4: typography.tracking.tight,
		h5: typography.tracking.normal,
		h6: typography.tracking.normal
	};

	return {
		fontSize: typography.scale[level],
		letterSpacing: letterSpacingMap[level],
		lineHeight: typography.leading.tight,
		fontWeight: typography.weight.semibold
	};
}
