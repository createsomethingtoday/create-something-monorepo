/**
 * Content Patterns
 *
 * Content should breathe. Whitespace is not emptiness—it's clarity.
 *
 * @principle Typography and spacing do the work. Decoration is noise.
 */

/**
 * Article/Prose Pattern
 *
 * Long-form reading optimized for comprehension.
 */
export const articlePattern = {
	name: 'Article/Prose',
	principles: [
		'Max-width 65ch for optimal reading',
		'Generous line-height (1.6-1.75)',
		'Clear heading hierarchy',
		'Adequate spacing between paragraphs'
	],
	typography: {
		body: 'var(--text-body-lg) or 18px',
		lineHeight: 'var(--leading-relaxed) or 1.625',
		paragraphSpacing: 'var(--space-md)',
		headingSpacing: 'var(--space-lg) above, var(--space-sm) below'
	},
	structure: {
		title: 'H1, largest size',
		metadata: 'Date, author, reading time—muted',
		content: 'Paragraphs, headings, lists, quotes',
		footer: 'Share buttons, related content'
	},
	elements: {
		blockquote: 'Left border, italic, attribution below',
		code: 'Monospace, subtle background',
		codeBlock: 'Full width, syntax highlighting, copy button',
		image: 'Full width or contained, caption below',
		list: 'Adequate spacing between items'
	}
} as const;

/**
 * Card Pattern
 *
 * Self-contained content unit.
 */
export const cardPattern = {
	name: 'Card',
	principles: [
		'Clear boundary (border or elevation)',
		'Consistent internal padding',
		'Single primary action',
		'Optional image, always at top'
	],
	structure: {
		image: 'Top, aspect-ratio constrained',
		content: 'Padding all sides (var(--space-md))',
		title: 'H3 or H4, semibold',
		description: 'Body text, muted, 2-3 lines max',
		metadata: 'Date, category, etc.—smallest',
		action: 'Button or entire card clickable'
	},
	variants: {
		default: 'Border only',
		elevated: 'Shadow, no border',
		outlined: 'Border, transparent background',
		interactive: 'Hover state, cursor pointer'
	},
	hover: {
		transform: 'translateY(-2px) or subtle',
		shadow: 'Increase elevation',
		border: 'Slightly more prominent'
	}
} as const;

/**
 * Grid Pattern
 *
 * Responsive grid for card collections.
 */
export const gridPattern = {
	name: 'Content Grid',
	principles: [
		'CSS Grid for layout',
		'Responsive columns (auto-fit, minmax)',
		'Consistent gap spacing',
		'Items stretch to equal height'
	],
	responsive: {
		mobile: '1 column',
		tablet: '2 columns',
		desktop: '3-4 columns'
	},
	css: {
		display: 'grid',
		gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
		gap: 'var(--space-md)'
	}
} as const;

/**
 * Hero Pattern
 *
 * First impression—clear value proposition.
 */
export const heroPattern = {
	name: 'Hero Section',
	principles: [
		'Clear headline—what is this?',
		'Subheadline—why should I care?',
		'Single primary CTA',
		'Optional secondary CTA (muted)'
	],
	structure: {
		headline: 'H1, display size, impactful',
		subheadline: 'Body large, muted, 1-2 sentences',
		cta: 'Primary button, above the fold',
		visual: 'Optional image/video/illustration'
	},
	layout: {
		centered: 'Text center, CTA center',
		split: 'Text left, visual right (or vice versa)'
	},
	spacing: {
		vertical: 'var(--space-2xl) or more',
		betweenElements: 'var(--space-md)'
	}
} as const;

/**
 * Section Pattern
 *
 * Content grouping with clear separation.
 */
export const sectionPattern = {
	name: 'Content Section',
	principles: [
		'Clear top/bottom padding',
		'Optional background differentiation',
		'Heading introduces section',
		'Max-width container for content'
	],
	spacing: {
		padding: 'var(--space-xl) vertical',
		headingMargin: 'var(--space-lg) below heading'
	},
	variants: {
		default: 'No background',
		alternate: 'Subtle background (bg-elevated)',
		accent: 'Bordered top/bottom'
	}
} as const;

/**
 * Empty State Pattern
 *
 * When there's no content—be helpful, not blank.
 */
export const emptyStatePattern = {
	name: 'Empty State',
	principles: [
		'Explain why empty',
		'Suggest action to populate',
		'Optional illustration (subtle)',
		'Don\'t blame the user'
	],
	structure: {
		icon: 'Optional, relevant to context',
		title: 'Brief explanation',
		description: 'What can be done',
		action: 'Button to take action'
	},
	examples: {
		noResults: '"No results found. Try adjusting your search."',
		emptyList: '"No items yet. Create your first one."',
		noAccess: '"You don\'t have access. Request permission."'
	}
} as const;

export const contentPatterns = {
	article: articlePattern,
	card: cardPattern,
	grid: gridPattern,
	hero: heroPattern,
	section: sectionPattern,
	emptyState: emptyStatePattern
} as const;
