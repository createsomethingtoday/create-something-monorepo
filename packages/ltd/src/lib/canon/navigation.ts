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
			{ label: 'Quick Start', href: '/canon/resources/get-started', badge: 'Soon' }
		]
	},
	{
		title: 'Foundations',
		items: [
			{ label: 'Colors', href: '/canon/foundations/colors' },
			{ label: 'Typography', href: '/canon/foundations/typography', badge: 'Soon' },
			{ label: 'Spacing', href: '/canon/foundations/spacing', badge: 'Soon' },
			{ label: 'Elevation', href: '/canon/foundations/elevation', badge: 'Soon' },
			{ label: 'Motion', href: '/canon/foundations/motion', badge: 'Soon' },
			{ label: 'Layout', href: '/canon/foundations/layout', badge: 'Soon' }
		]
	},
	{
		title: 'Components',
		items: [
			{ label: 'Overview', href: '/canon/components' },
			{ label: 'Button', href: '/canon/components/button' },
			{ label: 'Card', href: '/canon/components/card' },
			{ label: 'Navigation', href: '/canon/components/navigation', badge: 'Soon' }
		]
	},
	{
		title: 'Patterns',
		items: [
			{ label: 'Overview', href: '/canon/patterns', badge: 'Soon' },
			{ label: 'Forms', href: '/canon/patterns/forms', badge: 'Soon' },
			{ label: 'Loading', href: '/canon/patterns/loading', badge: 'Soon' }
		]
	},
	{
		title: 'Guidelines',
		items: [
			{ label: 'Accessibility', href: '/canon/guidelines/accessibility', badge: 'Soon' },
			{ label: 'Content', href: '/canon/guidelines/content', badge: 'Soon' },
			{ label: 'Theming', href: '/canon/guidelines/theming', badge: 'Soon' }
		]
	},
	{
		title: 'Resources',
		items: [
			{ label: 'Tokens', href: '/canon/resources/tokens', badge: 'Soon' },
			{ label: 'Figma', href: '/canon/resources/figma', badge: 'Soon' },
			{ label: 'Contributing', href: '/canon/resources/contributing', badge: 'Soon' }
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

/**
 * Find current section and item from path
 */
export function findCurrentNavItem(
	path: string,
	sections: NavSection[]
): { section: NavSection | null; item: NavItem | null } {
	for (const section of sections) {
		for (const item of section.items) {
			if (item.href === path) {
				return { section, item };
			}
			if (item.children) {
				for (const child of item.children) {
					if (child.href === path) {
						return { section, item: child };
					}
				}
			}
		}
	}
	return { section: null, item: null };
}
