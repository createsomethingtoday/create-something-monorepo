/**
 * Site Configuration - Automotive EV Template
 *
 * Voice: Premium, technology-forward, aspirational
 * Structure: Full-bleed hero, specs grids, model showcase
 * Design: Dark theme with electric blue accent (#3B82F6)
 */

// ═══════════════════════════════════════════════════════════════════════════
// VEHICLE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ModelLine = 'sedan' | 'suv' | 'coupe' | 'truck' | 'sports';

export interface VehicleSpecs {
	rangeKm: number;
	topSpeedKmh: number;
	acceleration0100: number; // seconds
	batteryKwh: number;
}

export interface Vehicle {
	slug: string;
	name: string;
	modelLine: ModelLine;
	tagline: string;
	description: string;
	heroImage: string;
	galleryImages: string[];
	specs: VehicleSpecs;
	price: {
		startingFrom: number;
		currency: string;
	};
	features: string[];
	isNew?: boolean;
	isFeatured?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// BRAND VALUE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface BrandValue {
	number: string;
	title: string;
	description: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE SHOWCASE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface FeatureShowcase {
	title: string;
	subtitle: string;
	description: string;
	image: string;
	link?: {
		text: string;
		href: string;
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface NavLink {
	label: string;
	href: string;
}

export interface SocialLink {
	name: string;
	url: string;
	icon: 'facebook' | 'twitter' | 'instagram' | 'youtube' | 'linkedin';
}

export interface FooterSection {
	title: string;
	links: NavLink[];
}

// ═══════════════════════════════════════════════════════════════════════════
// SITE CONFIGURATION TYPE
// ═══════════════════════════════════════════════════════════════════════════

export interface AutomotiveConfig {
	// Brand Identity
	brand: {
		name: string;
		tagline: string;
		description: string;
		logo?: string;
	};

	// Hero Section
	hero: {
		headline: string;
		subheadline: string;
		ctaText: string;
		ctaHref: string;
		backgroundImage: string;
	};

	// Navigation
	navLinks: NavLink[];

	// Vehicles
	vehicles: Vehicle[];
	modelLineLabels: Record<ModelLine, string>;

	// Product Showcase (featured on homepage)
	productShowcase: {
		headline: string;
		subheadline: string;
		featuredVehicle: string; // slug reference
	};

	// AI/Smart Features Section
	smartFeatures: {
		badge: string;
		headline: string;
		mainFeature: FeatureShowcase;
		subFeatures: FeatureShowcase[];
		description: {
			title: string;
			content: string;
			link?: { text: string; href: string };
		};
	};

	// Brand Values
	values: {
		headline: string;
		items: BrandValue[];
	};

	// Community/CTA Section
	community: {
		headline: string;
		description: string;
		ctaText: string;
		ctaHref: string;
	};

	// Footer
	footer: {
		sections: FooterSection[];
		social: SocialLink[];
		copyright: string;
		watermark: string;
	};

	// SEO
	seo: {
		url: string;
		locale: string;
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION (NIO-INSPIRED DEMO DATA)
// ═══════════════════════════════════════════════════════════════════════════

export const siteConfig: AutomotiveConfig = {
	// Brand Identity
	brand: {
		name: 'NIO',
		tagline: 'Blue Sky Coming',
		description:
			'NIO is a pioneer and leading company in the premium smart electric vehicle market. We design, develop, manufacture, and sell premium smart electric vehicles.'
	},

	// Hero Section
	hero: {
		headline: 'Ready when you are.',
		subheadline:
			'Discover intuitive luxury designed to anticipate your needs before you even realize them.',
		ctaText: 'Discover More',
		ctaHref: '#product-showcase',
		backgroundImage:
			'https://lh3.googleusercontent.com/aida-public/AB6AXuBduQNelYeBqSTvrJHmevgxAeX5fUQFU8eF7VlipOYKkFv421H9cbvflGI7SxhO6ld28mt41u2-Giqwymrxacc0fH9qGGfYqNeAPjqT21k6YkfV_e06bxyICXmmzIDEj2zALLvBpocrGtRpWszw-gigYugfSyLjeEMnWmTp_px6RsZQqwKD8Q5lE0DF56cjP_btLtqpV3XD_awXFMDOUSDTE8sgCWZcbC_eCTcu5NQ5wNRmwDelHOzugV5alVda_VOPy5C3pJbIBEg'
	},

	// Navigation
	navLinks: [
		{ label: 'About', href: '/about' },
		{ label: 'Our Power', href: '/power' },
		{ label: 'Models', href: '/models' },
		{ label: 'Contact', href: '/contact' }
	],

	// Model Line Labels
	modelLineLabels: {
		sedan: 'Sedan',
		suv: 'SUV',
		coupe: 'Coupe',
		truck: 'Truck',
		sports: 'Sports'
	},

	// Vehicles
	vehicles: [
		{
			slug: 'et7',
			name: 'ET7',
			modelLine: 'sedan',
			tagline: 'The Art of Intelligence',
			description:
				'The ET7 is our flagship sedan, combining breakthrough performance with intuitive technology. Every detail has been crafted to anticipate your needs.',
			heroImage:
				'https://lh3.googleusercontent.com/aida-public/AB6AXuBi3ktuz9oMZthTmuHWkl90Ioek7IxpFqAvOzee09YZ_5iB8boDX9hmoBzRDL95UvAqToR-MgbuhsIW8PeAYVndDrGgbX5eXhrDF0rRVBaz4dcQ_f3_1zMRhL14y0vouB7dTJfyNgqIthnKfZHJ87KQO67HFPLX0sjDEYrQo3YznwRuw8g9y4ksny9AyxqF8r0YUIv4MKNjRvT0Atb9Xi3hKOuw6c9JBeIeI6bubtJB0L4B8szcLYtDxEcU1Ug3X897CPBP7IUrb_Y',
			galleryImages: [],
			specs: {
				rangeKm: 610,
				topSpeedKmh: 200,
				acceleration0100: 3.8,
				batteryKwh: 100
			},
			price: {
				startingFrom: 69900,
				currency: 'USD'
			},
			features: [
				'AQUILA Super Sensing',
				'ADAM Super Computing',
				'150kW Battery Swap',
				'Nomi AI Assistant'
			],
			isFeatured: true,
			isNew: true
		},
		{
			slug: 'es8',
			name: 'ES8',
			modelLine: 'suv',
			tagline: 'Flagship SUV',
			description:
				'The ES8 is our flagship six-seater SUV, offering uncompromising space, comfort, and performance for the modern family.',
			heroImage:
				'https://lh3.googleusercontent.com/aida-public/AB6AXuByyhwbQxV8Ht_xXL7AsyN2LjF1VU9_x5FHTjlD2vkLHJ70Ra4hY5IuiRchlemoDMm02N5-3oXvUxDjwrtJjchu2gdNDIP_lKW5G8eWoG9y440ZK3S3G49LywQHnqvg6YlJ4vU1z0a2V-bAww3uKk5a7A38xYrb4mkhAEDR-SzvkFoouM8XpU9RG5QO8ZwGc_bOCB0phxldGQGT2Z2NwGA_oI5lGXIly6SNbdXkZRP0nLzJKrdMd2iqyrJ3aZFOnBYHAgi6epswTMM',
			galleryImages: [],
			specs: {
				rangeKm: 580,
				topSpeedKmh: 200,
				acceleration0100: 4.1,
				batteryKwh: 100
			},
			price: {
				startingFrom: 74900,
				currency: 'USD'
			},
			features: [
				'6-Seat Configuration',
				'Executive Second Row',
				'Air Suspension',
				'Panoramic Roof'
			],
			isFeatured: true
		},
		{
			slug: 'ec6',
			name: 'EC6',
			modelLine: 'coupe',
			tagline: 'Intelligent Coupe SUV',
			description:
				'The EC6 combines the practicality of an SUV with the sporty elegance of a coupe, creating a new category of intelligent electric vehicles.',
			heroImage:
				'https://lh3.googleusercontent.com/aida-public/AB6AXuCRy4kiRtRb2DiZzpX8KGreFEdWLtsAsrDXuX0QbS0fnWO_hsAr10vT2vI4qOxGSrxYL8XqTQBw5KI0ctEXwsu2sIZAO1zcgXih5lfNrCDEmlQeBaQxe4YPOfdU1SDihKQwBCRxQk5ItrHqH6xoyM3Zlffd1nUw_Rf_WtcD295AvcfckgIxQpV5KXEjZ6KilqYhtmba65hNY487AVGeruHYIyvZ3azR5O40q2pVLoLbyjJg3dS0IUyVbvNBm-JIuuQrM1LosRd5tl8',
			galleryImages: [],
			specs: {
				rangeKm: 615,
				topSpeedKmh: 195,
				acceleration0100: 4.5,
				batteryKwh: 100
			},
			price: {
				startingFrom: 62900,
				currency: 'USD'
			},
			features: ['Coupe Roofline', 'Sport Suspension', 'Performance Mode', '21" Wheels'],
			isNew: true
		},
		{
			slug: 'et5',
			name: 'ET5',
			modelLine: 'sedan',
			tagline: 'Mid-Size Luxury',
			description:
				'The ET5 brings premium electric performance to the mid-size sedan segment, without compromising on technology or luxury.',
			heroImage:
				'https://lh3.googleusercontent.com/aida-public/AB6AXuAACc4cJCnANeM0BunTRuQXUuZGC2PL55XzW-f2ALyslP9iDfsgKfDuz3X5hIkXr2cEKmV_UnIWDGc0Q6XFxolOdogL6UHEUvvCrbR2nPEkOQNrvrbOsTX5SYKDYOJxdIU4yWshMyooPhtprPMvnOrzKFo0VhiETtGD5wL7cec2Zf_7ljLUn8RS1Tkw-5jbQxcXRDFSNQyy89ZrAovjcPNw3HjVCQIM77asj7pyLR1Z_slWPpL2Z5kv-reBSfJyt-7rX-Qbu3QtR-E',
			galleryImages: [],
			specs: {
				rangeKm: 550,
				topSpeedKmh: 200,
				acceleration0100: 4.3,
				batteryKwh: 75
			},
			price: {
				startingFrom: 52900,
				currency: 'USD'
			},
			features: ['Ambient Lighting', 'Premium Audio', 'ADAS Suite', 'Fast Charging']
		},
		{
			slug: 'es6',
			name: 'ES6',
			modelLine: 'suv',
			tagline: 'Smart SUV',
			description:
				'The ES6 is our high-performance smart electric SUV, delivering exceptional range and acceleration in a stylish package.',
			heroImage:
				'https://lh3.googleusercontent.com/aida-public/AB6AXuBduQNelYeBqSTvrJHmevgxAeX5fUQFU8eF7VlipOYKkFv421H9cbvflGI7SxhO6ld28mt41u2-Giqwymrxacc0fH9qGGfYqNeAPjqT21k6YkfV_e06bxyICXmmzIDEj2zALLvBpocrGtRpWszw-gigYugfSyLjeEMnWmTp_px6RsZQqwKD8Q5lE0DF56cjP_btLtqpV3XD_awXFMDOUSDTE8sgCWZcbC_eCTcu5NQ5wNRmwDelHOzugV5alVda_VOPy5C3pJbIBEg',
			galleryImages: [],
			specs: {
				rangeKm: 510,
				topSpeedKmh: 200,
				acceleration0100: 4.7,
				batteryKwh: 75
			},
			price: {
				startingFrom: 58900,
				currency: 'USD'
			},
			features: ['All-Wheel Drive', 'Adaptive Air Suspension', 'Highway Pilot', 'V2L Capability']
		}
	],

	// Product Showcase
	productShowcase: {
		headline: 'The future of luxury is human.',
		subheadline: 'Engineered for performance, designed for life.',
		featuredVehicle: 'et7'
	},

	// Smart Features Section
	smartFeatures: {
		badge: 'Smart Cockpit',
		headline: 'A car that gets to know you.',
		mainFeature: {
			title: 'Augmented Reality HUD',
			subtitle: 'Navigation overlay directly on your line of sight.',
			description: '',
			image:
				'https://lh3.googleusercontent.com/aida-public/AB6AXuByyhwbQxV8Ht_xXL7AsyN2LjF1VU9_x5FHTjlD2vkLHJ70Ra4hY5IuiRchlemoDMm02N5-3oXvUxDjwrtJjchu2gdNDIP_lKW5G8eWoG9y440ZK3S3G49LywQHnqvg6YlJ4vU1z0a2V-bAww3uKk5a7A38xYrb4mkhAEDR-SzvkFoouM8XpU9RG5QO8ZwGc_bOCB0phxldGQGT2Z2NwGA_oI5lGXIly6SNbdXkZRP0nLzJKrdMd2iqyrJ3aZFOnBYHAgi6epswTMM'
		},
		subFeatures: [
			{
				title: 'Premium Interior',
				subtitle: 'Luxurious beige leather seats',
				description: '',
				image:
					'https://lh3.googleusercontent.com/aida-public/AB6AXuCRy4kiRtRb2DiZzpX8KGreFEdWLtsAsrDXuX0QbS0fnWO_hsAr10vT2vI4qOxGSrxYL8XqTQBw5KI0ctEXwsu2sIZAO1zcgXih5lfNrCDEmlQeBaQxe4YPOfdU1SDihKQwBCRxQk5ItrHqH6xoyM3Zlffd1nUw_Rf_WtcD295AvcfckgIxQpV5KXEjZ6KilqYhtmba65hNY487AVGeruHYIyvZ3azR5O40q2pVLoLbyjJg3dS0IUyVbvNBm-JIuuQrM1LosRd5tl8'
			},
			{
				title: 'Infotainment',
				subtitle: 'Integrated navigation system',
				description: '',
				image:
					'https://lh3.googleusercontent.com/aida-public/AB6AXuAACc4cJCnANeM0BunTRuQXUuZGC2PL55XzW-f2ALyslP9iDfsgKfDuz3X5hIkXr2cEKmV_UnIWDGc0Q6XFxolOdogL6UHEUvvCrbR2nPEkOQNrvrbOsTX5SYKDYOJxdIU4yWshMyooPhtprPMvnOrzKFo0VhiETtGD5wL7cec2Zf_7ljLUn8RS1Tkw-5jbQxcXRDFSNQyy89ZrAovjcPNw3HjVCQIM77asj7pyLR1Z_slWPpL2Z5kv-reBSfJyt-7rX-Qbu3QtR-E'
			}
		],
		description: {
			title: 'Where Comfort Meets Innovation',
			content:
				"Inside the cabin, physical controls make way for digital intuition. Our Nomi assistant learns your preferences, adjusting ambient lighting, seat temperature, and suspension settings automatically. The minimalist design ensures distractions are minimized, while connectivity is maximized.",
			link: {
				text: 'Explore Intelligent Cabin',
				href: '/features'
			}
		}
	},

	// Brand Values
	values: {
		headline: 'Beyond Electric — Driving the Future Forward',
		items: [
			{
				number: '01',
				title: 'Cutting-Edge Tech',
				description:
					'Leveraging the latest in battery chemistry and autonomous driving hardware.'
			},
			{
				number: '02',
				title: 'Nomi Assistant',
				description:
					'The world\'s first in-vehicle artificial intelligence that communicates with emotion.'
			},
			{
				number: '03',
				title: 'Sustainable',
				description:
					'Committed to Blue Sky Coming. Our materials are ethically sourced and recyclable.'
			},
			{
				number: '04',
				title: 'Ownership',
				description:
					'Worry-free service packages, battery swapping stations, and 24/7 support.'
			}
		]
	},

	// Community Section
	community: {
		headline: 'Be Part of the Community',
		description:
			'Join thousands of owners shaping the future of mobility. Download the app to schedule your test drive.',
		ctaText: 'Download App',
		ctaHref: '/app'
	},

	// Footer
	footer: {
		sections: [
			{
				title: 'Company',
				links: [
					{ label: 'About Us', href: '/about' },
					{ label: 'Careers', href: '/careers' },
					{ label: 'Investors', href: '/investors' }
				]
			},
			{
				title: 'Products',
				links: [
					{ label: 'Models', href: '/models' },
					{ label: 'Lifestyle', href: '/lifestyle' },
					{ label: 'Service', href: '/service' }
				]
			},
			{
				title: 'Legal',
				links: [
					{ label: 'Privacy Policy', href: '/privacy' },
					{ label: 'Terms of Use', href: '/terms' },
					{ label: 'Cookie Settings', href: '/cookies' }
				]
			}
		],
		social: [
			{ name: 'Facebook', url: 'https://facebook.com/nio', icon: 'facebook' },
			{ name: 'Twitter', url: 'https://twitter.com/nio', icon: 'twitter' },
			{ name: 'Instagram', url: 'https://instagram.com/nio', icon: 'instagram' }
		],
		copyright: '© 2024 NIO Inc. All rights reserved.',
		watermark: 'EMPOWER'
	},

	// SEO
	seo: {
		url: 'https://automotive-demo.createsomething.space',
		locale: 'en_US'
	}
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export function getVehicleBySlug(slug: string): Vehicle | undefined {
	return siteConfig.vehicles.find((v) => v.slug === slug);
}

export function getFeaturedVehicles(): Vehicle[] {
	return siteConfig.vehicles.filter((v) => v.isFeatured);
}

export function getNewVehicles(): Vehicle[] {
	return siteConfig.vehicles.filter((v) => v.isNew);
}

export function getVehiclesByModelLine(modelLine: ModelLine): Vehicle[] {
	return siteConfig.vehicles.filter((v) => v.modelLine === modelLine);
}

export function formatPrice(price: number, currency: string = 'USD'): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(price);
}

export type SiteConfig = typeof siteConfig;
export const siteDefaults = siteConfig;
