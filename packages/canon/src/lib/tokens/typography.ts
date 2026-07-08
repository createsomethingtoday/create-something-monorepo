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
		sans: '"ABC Diatype", "Stack Sans Notch", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		mono: '"ABC Diatype Mono", "JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
		serif: '"Martina Plantijn", Georgia, "Times New Roman", serif',
		interface: 'var(--font-sans)',
		prose: 'var(--font-sans)',
		record: 'var(--font-mono)',
		'topology-label': 'var(--font-mono)',
		code: 'var(--font-mono)'
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
		record: 'var(--text-body-sm)',
		'record-meta': 'var(--text-caption)',
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
	'--font-sans': typography.family.sans,
	'--font-mono': typography.family.mono,
	'--font-serif': typography.family.serif,
	'--font-interface': typography.family.interface,
	'--font-prose': typography.family.prose,
	'--font-record': typography.family.record,
	'--font-topology-label': typography.family['topology-label'],
	'--font-code': typography.family.code,

	// Weights
	'--font-regular': typography.weight.regular,
	'--font-medium': typography.weight.medium,
	'--font-semibold': typography.weight.semibold,
	'--font-bold': typography.weight.bold,

	// Line heights
	'--leading-tight': typography.leading.tight,
	'--leading-snug': typography.leading.snug,
	'--leading-normal': typography.leading.normal,
	'--leading-relaxed': typography.leading.relaxed,
	'--leading-loose': typography.leading.loose,

	// Letter spacing
	'--tracking-tighter': typography.tracking.tighter,
	'--tracking-tight': typography.tracking.tight,
	'--tracking-normal': typography.tracking.normal,
	'--tracking-wide': typography.tracking.wide,
	'--tracking-wider': typography.tracking.wider,
	'--tracking-widest': typography.tracking.widest,
	'--tracking-record': typography.tracking.normal,
	'--tracking-operator-label': typography.tracking.normal,
	'--tracking-topology-label': typography.tracking.normal,

	// Type scale
	'--text-display-xl': typography.scale['display-xl'],
	'--text-display': typography.scale.display,
	'--text-h1': typography.scale.h1,
	'--text-h2': typography.scale.h2,
	'--text-h3': typography.scale.h3,
	'--text-h4': typography.scale.h4,
	'--text-h5': typography.scale.h5,
	'--text-h6': typography.scale.h6,
	'--text-body-lg': typography.scale['body-lg'],
	'--text-body': typography.scale.body,
	'--text-body-sm': typography.scale['body-sm'],
	'--text-caption': typography.scale.caption,
	'--text-overline': typography.scale.overline,
	'--text-record': typography.scale.record,
	'--text-record-meta': typography.scale['record-meta'],
	'--text-operator-label': typography.scale['operator-label'],
	'--text-topology-label': typography.scale['topology-label'],

	// Role line heights
	'--leading-record': '1.35',
	'--leading-topology-label': '1.2'
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
