/**
 * Site Configuration - Restaurant (Bold Flavors)
 *
 * Voice: Bold, avant-garde, sensory-rich
 * Structure: Immersive experience, menu highlights, easy reservations
 * Design: Dark theme with teal primary and gold accent
 */

export interface MenuItem {
	name: string;
	description: string;
	price: number;
	image?: string;
	badge?: string;
}

export interface AmbientFeature {
	icon: string;
	text: string;
}

export interface SocialLink {
	name: string;
	url: string;
}

export interface HoursEntry {
	days: string;
	hours: string;
}

export interface PrivateSpace {
	name: string;
	capacity: number;
	description: string;
	features: string[];
}

export interface RestaurantConfig {
	// Identity
	name: string;
	tagline: string;
	description: string;
	location: string;

	// Hero
	hero: {
		image: string;
		alt: string;
		badge: string;
		headline: string[];
		subtext: string;
	};

	// Contact
	email: string;
	phone: string;
	address: {
		street: string;
		district: string;
		city: string;
	};

	// Hours
	hours: HoursEntry[];

	// Social
	social: SocialLink[];

	// SEO
	url: string;
	locale: string;

	// Menu
	chefChoice: MenuItem[];
	menuCategories: {
		slug: string;
		title: string;
	}[];

	// Ambiance
	ambiance: {
		headline: string;
		description: string;
		features: AmbientFeature[];
		images: {
			src: string;
			alt: string;
		}[];
	};

	// Reservations
	reservations: {
		headline: string;
		subtext: string;
		phone: string;
		url?: string;
	};

	// Private Events
	privateEvents: {
		enabled: boolean;
		email: string;
		spaces: PrivateSpace[];
	};

	// Footer
	footer: {
		copyright: string;
		links: { label: string; href: string }[];
	};
}

/**
 * Demo Configuration: Bold Flavors
 * An avant-garde gastronomy experience in London
 */
export const siteConfig: RestaurantConfig = {
	// Identity
	name: 'Bold Flavors',
	tagline: 'Bold Flavors, Bold Moments',
	description:
		'An immersive culinary journey crafted for the discerning palate in the vibrant heart of the city center.',
	location: 'The Avant-Garde Kitchen',

	// Hero
	hero: {
		image: '/hero-interior.jpg',
		alt: 'Modern minimalist restaurant interior with dark lighting',
		badge: 'The Avant-Garde Kitchen',
		headline: ['BOLD FLAVORS,', 'BOLD MOMENTS.'],
		subtext:
			'An immersive culinary journey crafted for the discerning palate in the vibrant heart of the city center.'
	},

	// Contact
	email: 'reservations@boldflavors.example',
	phone: '+44 20 7123 4567',
	address: {
		street: '42 Avant',
		district: 'District',
		city: 'London'
	},

	// Hours
	hours: [
		{ days: 'Mon - Thu', hours: '17:00 - 23:00' },
		{ days: 'Fri - Sat', hours: '12:00 - 01:00' },
		{ days: 'Sunday', hours: '12:00 - 22:00' }
	],

	// Social
	social: [
		{ name: 'Instagram', url: 'https://instagram.com/boldflavors' },
		{ name: 'Twitter (X)', url: 'https://twitter.com/boldflavors' },
		{ name: 'Facebook', url: 'https://facebook.com/boldflavors' },
		{ name: 'Vimeo', url: 'https://vimeo.com/boldflavors' }
	],

	// SEO
	url: 'https://boldflavors.example',
	locale: 'en_GB',

	// Chef's Choice Menu
	chefChoice: [
		{
			name: 'Aged Ribeye',
			description:
				'45-day dry-aged beef, smoked sea salt, infused rosemary butter, bone marrow reduction.',
			price: 58,
			image: '/menu/ribeye.jpg',
			badge: 'Signature'
		},
		{
			name: 'Truffle Risotto',
			description:
				'Carnaroli rice, wild forest mushrooms, 24-month aged parmesan, fresh winter truffle shavings.',
			price: 34,
			image: '/menu/tasting-menu.jpg'
		},
		{
			name: 'Seared Scallops',
			description:
				'U10 Hokkaido scallops, caramelized cauliflower silk, lemon-infused olive oil, crispy pancetta.',
			price: 42,
			image: '/menu/halibut.jpg'
		}
	],

	// Menu Categories
	menuCategories: [
		{ slug: 'starters', title: 'Starters' },
		{ slug: 'mains', title: 'Main Courses' },
		{ slug: 'desserts', title: 'Desserts' },
		{ slug: 'drinks', title: 'Beverages' }
	],

	// Ambiance Section
	ambiance: {
		headline: 'THE ART OF AMBIANCE',
		description:
			'Beyond the plate, we believe in the alchemy of atmosphere. From the curated acoustics to the bespoke leather booths, every element is designed to heighten your senses and create a sanctuary of modern luxury.',
		features: [
			{ icon: 'meeting_room', text: 'Three Exclusive Private Dining Suites' },
			{ icon: 'wine_bar', text: 'Sommelier-Led Rare Vintage Cellar' },
			{ icon: 'equalizer', text: 'Acoustically Perfected Sound Design' }
		],
		images: [
			{ src: '/menu/duck-confit.jpg', alt: 'Private dining booth at night' },
			{ src: '/menu/oysters.jpg', alt: 'Close up of a wine glass and decanter' },
			{ src: '/menu/chocolate-torte.jpg', alt: 'Ambient restaurant lighting with warm tones' }
		]
	},

	// Reservations
	reservations: {
		headline: 'Your table awaits.',
		subtext:
			'Secure your place at the forefront of modern gastronomy. Reservations are highly recommended.',
		phone: '+44 20 7123 4567',
		url: 'https://opentable.com/boldflavors'
	},

	// Private Events
	privateEvents: {
		enabled: true,
		email: 'events@boldflavors.example',
		spaces: [
			{
				name: "Chef's Table",
				capacity: 8,
				description: 'Intimate dining experience in the kitchen',
				features: ['Custom menu', 'Wine pairing', 'Chef interaction']
			},
			{
				name: 'The Vault',
				capacity: 24,
				description: 'Underground wine cellar transformed into private dining',
				features: ['Sommelier service', 'Tasting menus', 'Climate controlled']
			},
			{
				name: 'Full Buyout',
				capacity: 120,
				description: 'Exclusive use of entire restaurant',
				features: ['Customized menu', 'Full bar service', 'Event coordination']
			}
		]
	},

	// Footer
	footer: {
		copyright: 'Bold Flavors Gastronomy Group',
		links: [
			{ label: 'Privacy', href: '/privacy' },
			{ label: 'Terms', href: '/terms' },
			{ label: 'Accessibility', href: '/accessibility' }
		]
	}
};

export type SiteConfig = typeof siteConfig;
