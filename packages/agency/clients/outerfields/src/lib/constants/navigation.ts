/**
 * OUTERFIELDS Navigation Constants
 *
 * Centralized navigation data for DRY compliance
 */

export interface NavLink {
	label: string;
	href: string;
	isAnchor?: boolean;
}

export interface FooterLink {
	label: string;
	href: string;
	external?: boolean;
}

// Main navigation links
export const NAV_LINKS: NavLink[] = [
	{ label: 'Home', href: '/' },
	{ label: 'Features', href: '/#features', isAnchor: true },
	{ label: 'Pricing', href: '/#pricing', isAnchor: true },
	{ label: 'Demo', href: '/demo' }
];

// Footer links
export const FOOTER_LINKS: FooterLink[] = [
	{ label: 'Privacy', href: '/privacy' },
	{ label: 'Terms', href: '/terms' },
	{ label: 'Contact', href: '/contact' }
];

// Demo accounts for login page
export const DEMO_ACCOUNTS = [
	{
		label: 'User Demo',
		email: 'demo@outerfields.com',
		password: 'demo123',
		role: 'user' as const
	},
	{
		label: 'Admin Demo',
		email: 'admin@outerfields.com',
		password: 'demo123',
		role: 'admin' as const
	}
];

// SEO defaults
export const SEO_DEFAULTS = {
	siteName: 'OUTERFIELDS',
	twitterHandle: '@outerfields',
	locale: 'en_US',
	baseUrl: 'https://outerfields.createsomething.agency'
};
