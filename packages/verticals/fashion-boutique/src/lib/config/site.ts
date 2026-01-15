/**
 * Site Configuration - Fashion Boutique (The Collection)
 *
 * Voice: Editorial, minimalist, high-fashion
 * Structure: Asymmetric product grid, sidebar filters, quick-add
 * Design: Light theme with sage green primary (#495a4c)
 */

export interface Product {
	id: string;
	name: string;
	subtitle: string;
	price: number;
	image: string;
	category: string;
	isNew?: boolean;
}

export interface Category {
	slug: string;
	name: string;
	count: number;
}

export interface SocialLink {
	name: string;
	url: string;
}

export interface FooterLink {
	label: string;
	href: string;
}

export interface FashionConfig {
	// Identity
	name: string;
	tagline: string;
	description: string;
	icon: string;

	// Hero
	hero: {
		title: string[];
		accent: string;
	};

	// Navigation
	navLinks: { label: string; href: string }[];

	// Categories
	categories: Category[];

	// Products
	products: Product[];

	// Newsletter
	newsletter: {
		headline: string;
		description: string;
	};

	// Footer
	footer: {
		description: string;
		navigation: FooterLink[];
		assistance: FooterLink[];
		social: SocialLink[];
		copyright: string;
	};

	// SEO
	url: string;
	locale: string;
}

/**
 * Demo Configuration: The Collection Boutique
 * Editorial fashion with sage green accents
 */
export const siteConfig: FashionConfig = {
	// Identity
	name: 'Boutique',
	tagline: 'The New Collection',
	description:
		'Curating high-fashion essentials with a focus on longevity and artistic expression.',
	icon: 'filter_vintage',

	// Hero
	hero: {
		title: ['The', 'Collection'],
		accent: 'New'
	},

	// Navigation
	navLinks: [
		{ label: 'Shop', href: '/shop' },
		{ label: 'Editorial', href: '/editorial' },
		{ label: 'Sustainability', href: '/sustainability' },
		{ label: 'Archive', href: '/archive' }
	],

	// Categories
	categories: [
		{ slug: 'all', name: 'All Pieces', count: 48 },
		{ slug: 'new', name: 'New Arrivals', count: 0 },
		{ slug: 'outerwear', name: 'Outerwear', count: 12 },
		{ slug: 'knitwear', name: 'Knitwear', count: 8 },
		{ slug: 'essentials', name: 'Essentials', count: 15 },
		{ slug: 'archive', name: 'Archive', count: 22 }
	],

	// Products
	products: [
		{
			id: 'mantle-wool-coat',
			name: 'Mantle Wool Coat',
			subtitle: 'Slate Grey',
			price: 1250,
			image: '/images/product-wool-coat.png',
			category: 'outerwear',
			isNew: true
		},
		{
			id: 'essential-blazer',
			name: 'Essential Blazer',
			subtitle: 'Structured Wool',
			price: 850,
			image: '/images/iconic-blazer.png',
			category: 'essentials'
		},
		{
			id: 'archive-trousers',
			name: 'Archive Trousers',
			subtitle: 'Loose Fit Silk',
			price: 420,
			image: '/images/product-trousers.png',
			category: 'archive'
		},
		{
			id: 'silk-slip-dress',
			name: 'Silk Slip Dress',
			subtitle: 'Champagne Noir',
			price: 590,
			image: '/images/product-wrap-dress.png',
			category: 'essentials'
		},
		{
			id: 'structured-tote',
			name: 'Structured Tote',
			subtitle: 'Handcrafted Calfskin',
			price: 1100,
			image: '/images/iconic-leather-jacket.png',
			category: 'archive'
		},
		{
			id: 'ribbed-knitwear',
			name: 'Ribbed Knitwear',
			subtitle: 'Merino & Cashmere',
			price: 310,
			image: '/images/iconic-sweater.png',
			category: 'knitwear'
		}
	],

	// Newsletter
	newsletter: {
		headline: 'Newsletter',
		description: 'Join our mailing list for early access to the Archive.'
	},

	// Footer
	footer: {
		description:
			'Curating high-fashion essentials with a focus on longevity and artistic expression.',
		navigation: [
			{ label: 'Shop All', href: '/shop' },
			{ label: 'New Arrivals', href: '/shop?filter=new' },
			{ label: 'Sustainability', href: '/sustainability' },
			{ label: 'Our Archive', href: '/archive' }
		],
		assistance: [
			{ label: 'Shipping & Returns', href: '/shipping' },
			{ label: 'Size Guide', href: '/size-guide' },
			{ label: 'Contact Us', href: '/contact' },
			{ label: 'Privacy Policy', href: '/privacy' }
		],
		social: [
			{ name: 'Instagram', url: 'https://instagram.com/boutique' },
			{ name: 'Vimeo', url: 'https://vimeo.com/boutique' },
			{ name: 'Pinterest', url: 'https://pinterest.com/boutique' }
		],
		copyright: 'Boutique Editorial'
	},

	// SEO
	url: 'https://boutique.example',
	locale: 'en_US'
};

export type SiteConfig = typeof siteConfig;
