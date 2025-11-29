/**
 * Navigation Patterns
 *
 * Principles for navigation that recedes—Zuhandenheit applied to wayfinding.
 *
 * @principle Navigation should disappear when working, appear when needed.
 */

/**
 * Header Navigation Pattern
 *
 * The canonical header:
 * - Fixed position (sticky on scroll)
 * - Transparent until scroll, then solid background
 * - Logo left, nav center or right, CTA far right
 * - Mobile: hamburger menu, full-screen overlay
 *
 * @example
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │ [Logo]          Nav · Nav · Nav          [CTA Button]  │
 * └─────────────────────────────────────────────────────────┘
 * ```
 */
export const headerPattern = {
	name: 'Header Navigation',
	principles: [
		'Fixed position for persistent access',
		'Transparent background until scroll (context-aware)',
		'Minimal items—5 max in primary nav',
		'Single CTA, high contrast',
		'Mobile-first: hamburger at 768px breakpoint'
	],
	structure: {
		logo: 'Left-aligned, links to home',
		primaryNav: 'Center or right, horizontal on desktop',
		cta: 'Far right, primary button style',
		mobileMenu: 'Full-screen overlay, large touch targets (44px min)'
	},
	states: {
		default: 'Transparent background, visible on light/dark',
		scrolled: 'Solid background, subtle shadow',
		mobileOpen: 'Full-screen overlay, body scroll locked'
	},
	accessibility: [
		'Skip-to-content link as first focusable element',
		'ARIA labels on hamburger button',
		'Focus trap in mobile menu when open',
		'Escape key closes mobile menu'
	]
} as const;

/**
 * Footer Navigation Pattern
 *
 * The canonical footer:
 * - Multi-column on desktop, stacked on mobile
 * - Newsletter signup if applicable
 * - Social links with accessible icons
 * - Copyright and legal links bottom
 *
 * @example
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │ [Brand]     Column 1    Column 2    [Newsletter]       │
 * │             Link        Link                           │
 * │             Link        Link                           │
 * ├─────────────────────────────────────────────────────────┤
 * │ © 2025 Brand    Privacy · Terms    [Social Icons]      │
 * └─────────────────────────────────────────────────────────┘
 * ```
 */
export const footerPattern = {
	name: 'Footer Navigation',
	principles: [
		'Comprehensive but organized—group by category',
		'Newsletter signup prominent if used',
		'Social links as icons, not text',
		'Legal links de-emphasized but accessible'
	],
	structure: {
		brand: 'Logo or wordmark, optional tagline',
		columns: '2-4 link groups by category',
		newsletter: 'Email input + submit, minimal fields',
		social: 'Icon buttons, consistent sizing',
		legal: 'Copyright, Privacy Policy, Terms'
	},
	accessibility: [
		'Semantic <footer> element',
		'Heading hierarchy within columns',
		'Social icons have aria-labels'
	]
} as const;

/**
 * Breadcrumb Pattern
 *
 * Show hierarchy without clutter.
 */
export const breadcrumbPattern = {
	name: 'Breadcrumb Navigation',
	principles: [
		'Show path, not sitemap',
		'Current page not linked',
		'Truncate middle items on long paths',
		'Separator is decorative (aria-hidden)'
	],
	structure: {
		separator: "'/' or '›' or custom icon",
		items: 'Home → Parent → Current',
		truncation: 'Home → ... → Parent → Current'
	},
	accessibility: [
		'Wrap in <nav aria-label="Breadcrumb">',
		'Use <ol> for ordered list semantics',
		'aria-current="page" on current item'
	]
} as const;

/**
 * Mobile Menu Pattern
 *
 * Full-screen overlay for focus.
 */
export const mobileMenuPattern = {
	name: 'Mobile Menu Overlay',
	principles: [
		'Full viewport height',
		'Large touch targets (44px minimum)',
		'Close button obvious and accessible',
		'Body scroll locked when open'
	],
	animation: {
		enter: 'Slide from right or fade in, 300ms ease',
		exit: 'Slide to right or fade out, 200ms ease'
	},
	accessibility: [
		'Focus trapped within menu',
		'Escape key closes',
		'Return focus to trigger on close',
		'aria-expanded on trigger button'
	]
} as const;

export const navigationPatterns = {
	header: headerPattern,
	footer: footerPattern,
	breadcrumb: breadcrumbPattern,
	mobileMenu: mobileMenuPattern
} as const;
