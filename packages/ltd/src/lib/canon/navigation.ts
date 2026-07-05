/**
 * Canon Documentation Navigation Structure
 *
 * Defines the sidebar navigation for the Canon design system documentation.
 * Each section maps to a route group under /canon/.
 */

export interface NavItem {
	label: string;
	href: string;
	/** Child items for nested navigation */
	children?: NavItem[];
	/** Whether this is an external link */
	external?: boolean;
	/** Badge text (e.g., "New", "Beta") */
	badge?: string;
}

export interface NavSection {
	title: string;
	items: NavItem[];
}

export const canonNavigation: NavSection[] = [
	{
		title: 'Getting Started',
		items: [
			{ label: 'Introduction', href: '/canon' },
			{ label: 'Philosophy', href: '/canon/foundations/philosophy' },
			{ label: 'Quick Start', href: '/canon/resources/get-started' }
		]
	},
	{
		title: 'Concepts',
		items: [
			{ label: 'Overview', href: '/canon/concepts' },
			{ label: 'Weniger, aber besser', href: '/canon/concepts/weniger-aber-besser' },
			{ label: 'Zuhandenheit', href: '/canon/concepts/zuhandenheit' },
			{ label: 'Vorhandenheit', href: '/canon/concepts/vorhandenheit' },
			{ label: 'Gestell', href: '/canon/concepts/gestell' },
			{ label: 'Gelassenheit', href: '/canon/concepts/gelassenheit' },
			{ label: 'Complementarity', href: '/canon/concepts/complementarity' },
			{ label: 'Hermeneutic Circle', href: '/canon/concepts/hermeneutic-circle' }
		]
	},
	{
		title: 'Foundations',
		items: [
			{ label: 'Colors', href: '/canon/foundations/colors' },
			{ label: 'Typography', href: '/canon/foundations/typography' },
			{ label: 'Spacing', href: '/canon/foundations/spacing' },
			{ label: 'Elevation', href: '/canon/foundations/elevation' },
			{ label: 'Motion', href: '/canon/foundations/motion' },
			{ label: 'Layout', href: '/canon/foundations/layout' }
		]
	},
	{
		title: 'Components',
		items: [
			{ label: 'Overview', href: '/canon/components' },
			{ label: 'Atlas', href: '/canon/components/atlas' },
			{ label: 'Brand', href: '/canon/components/brand' },
			{ label: 'Button', href: '/canon/components/button' },
			{ label: 'Card', href: '/canon/components/card' },
			{ label: 'Clear Components', href: '/canon/components/clear' },
			{ label: 'Content', href: '/canon/components/content' },
			{ label: 'Conversion', href: '/canon/components/conversion' },
			{ label: 'Diagrams', href: '/canon/components/diagrams' },
			{ label: 'Feedback', href: '/canon/components/feedback' },
			{ label: 'Filtering', href: '/canon/components/filtering' },
			{ label: 'Form Controls', href: '/canon/components/form' },
			{ label: 'Forms', href: '/canon/components/forms' },
			{ label: 'Heading', href: '/canon/components/heading' },
			{ label: 'Icons', href: '/canon/components/icons' },
			{ label: 'Insights', href: '/canon/components/insights' },
			{ label: 'Interactive', href: '/canon/components/interactive' },
			{ label: 'Layout', href: '/canon/components/layout' },
			{ label: 'Navigation', href: '/canon/components/navigation' },
			{ label: 'Patterns', href: '/canon/components/patterns' },
			{ label: 'Skip To Content', href: '/canon/components/skip-to-content' },
			{ label: 'Typography', href: '/canon/components/typography' }
		]
	},
	{
		title: 'Patterns',
		items: [
			{ label: 'Overview', href: '/canon/patterns' },
			{ label: 'Forms', href: '/canon/patterns/forms' },
			{ label: 'Loading', href: '/canon/patterns/loading' }
		]
	},
	{
		title: 'Guidelines',
		items: [
			{ label: 'Accessibility', href: '/canon/guidelines/accessibility' },
			{ label: 'Content', href: '/canon/guidelines/content' },
			{ label: 'Images', href: '/canon/guidelines/images', badge: 'New' },
			{ label: 'Responsive', href: '/canon/guidelines/responsive' },
			{ label: 'Theming', href: '/canon/guidelines/theming' }
		]
	},
	{
		title: 'Resources',
		items: [
			{ label: 'Tokens', href: '/canon/resources/tokens' },
			{ label: 'Registry', href: '/canon/resources/registry' },
			{ label: 'Changelog', href: '/canon/resources/changelog' },
			{ label: 'Contributing', href: '/canon/resources/contributing' },
			{ label: 'Figma', href: '/canon/resources/figma' }
		]
	}
];

/**
 * Flatten navigation for search indexing
 */
export function flattenNavigation(sections: NavSection[]): NavItem[] {
	const items: NavItem[] = [];
	for (const section of sections) {
		for (const item of section.items) {
			items.push(item);
			if (item.children) {
				items.push(...item.children);
			}
		}
	}
	return items;
}

function pathMatchesNavigationHref(path: string, href: string): boolean {
	if (href === '/canon') {
		return path === href;
	}
	return path === href || path.startsWith(`${href}/`);
}

/**
 * Find the most specific navigation href for a route path.
 */
export function findActiveNavHref(path: string, sections: NavSection[]): string | null {
	const matchingItems = flattenNavigation(sections).filter((item) =>
		pathMatchesNavigationHref(path, item.href)
	);

	if (matchingItems.length === 0) {
		return null;
	}

	return matchingItems.sort((a, b) => b.href.length - a.href.length)[0].href;
}

/**
 * Find current section and item from path
 */
export function findCurrentNavItem(
	path: string,
	sections: NavSection[]
): { section: NavSection | null; item: NavItem | null } {
	const activeHref = findActiveNavHref(path, sections);
	if (!activeHref) {
		return { section: null, item: null };
	}

	for (const section of sections) {
		for (const item of section.items) {
			if (item.href === activeHref) {
				return { section, item };
			}
			if (item.children) {
				for (const child of item.children) {
					if (child.href === activeHref) {
						return { section, item: child };
					}
				}
			}
		}
	}
	return { section: null, item: null };
}
