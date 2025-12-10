/**
 * Site Configuration - Architecture/Design Studio
 *
 * Voice: Clarity over cleverness. Specificity over generality.
 * Structure: Images command, text supports, space breathes.
 *
 * Content follows Fibonacci: 5 projects, 3 services, 4 principles.
 * Each word earns its place or gets removed.
 */

export const siteConfig = {
	// Studio Identity
	name: 'Studio Name',
	tagline: 'Architecture & Design',
	description:
		'Timber-frame architecture in dialogue with landscape. Residential projects in the Pacific Northwest since 2018.',

	// Contact
	email: 'studio@example.com',
	phone: '+1 (555) 123-4567',
	address: {
		street: '412 Pioneer Square',
		city: 'Seattle',
		state: 'WA',
		zip: '98104',
		country: 'US'
	},

	// Social
	social: {
		instagram: 'https://instagram.com/studioname',
		pinterest: 'https://pinterest.com/studioname'
	},

	// SEO
	url: 'https://example.com',
	locale: 'en_US',

	// Hero - AI-generated for visual cohesion
	// All images: Imagen 4, consistent cedar/Scandinavian aesthetic
	hero: {
		image: '/projects/hero-forest-cabin.jpg',
		alt: 'Modern cedar cabin with floor-to-ceiling windows in pine forest',
		caption: 'Forest Cabin, 2024'
	},

	// Projects: 5 (Fibonacci)
	// Specificity: square footage, completion dates, measurable outcomes
	// Images: AI-generated (Imagen 4) for consistent aesthetic
	projects: [
		{
			slug: 'forest-cabin',
			title: 'Forest Cabin',
			location: 'Whidbey Island, WA',
			year: '2024',
			category: 'Residential',
			heroImage: '/projects/hero-forest-cabin.jpg',
			description: '1,200 sf. Western red cedar, steel frame, triple-glazed.',
			images: [
				'/projects/interior-chair.jpg',
				'/projects/interior-desk.jpg',
				'/projects/interior-shelf.jpg'
			]
		},
		{
			slug: 'hillside-residence',
			title: 'Hillside Residence',
			location: 'Portland, OR',
			year: '2024',
			category: 'Residential',
			heroImage: '/projects/exterior-hillside.jpg',
			description: '2,800 sf. Cedar cladding, cantilevered volumes, forest integration.',
			images: [
				'/projects/interior-kitchen.jpg',
				'/projects/interior-bedroom.jpg'
			]
		},
		{
			slug: 'coastal-retreat',
			title: 'Coastal Retreat',
			location: 'Sea Ranch, CA',
			year: '2023',
			category: 'Residential',
			heroImage: '/projects/exterior-coastal.jpg',
			description: '2,400 sf. Cedar, ipe decking, passive solar design.',
			images: [
				'/projects/interior-chair.jpg',
				'/projects/interior-shelf.jpg'
			]
		},
		{
			slug: 'meadow-studio',
			title: 'Meadow Studio',
			location: 'Hudson Valley, NY',
			year: '2023',
			category: 'Residential',
			heroImage: '/projects/exterior-meadow.jpg',
			description: '800 sf. Live-work studio. Prefabricated cedar modules.',
			images: [
				'/projects/interior-desk.jpg',
				'/projects/interior-kitchen.jpg'
			]
		},
		{
			slug: 'woodland-house',
			title: 'Woodland House',
			location: 'Bainbridge Island, WA',
			year: '2022',
			category: 'Residential',
			heroImage: '/projects/exterior-hillside.jpg',
			description: '3,200 sf. Multi-volume plan, native landscaping, rainwater harvest.',
			images: [
				'/projects/interior-bedroom.jpg',
				'/projects/interior-kitchen.jpg',
				'/projects/interior-chair.jpg'
			]
		}
	],

	// Studio - About section
	// Voice: declarative sentences, em-dashes for emphasis, no marketing language
	studio: {
		headline: 'Studio',
		philosophy: 'Architecture that recedes into landscape. Each project begins with forest, watershed, and light—not style. 32 completed projects since 2018. 8 currently in progress.',
		approach: [
			'Forest dictates footprint',
			'Cedar weathers with place',
			'Windows frame the land',
			'Craft honors material'
		],
		founders: [
			{
				name: 'Principal Name',
				role: 'Founding Principal, AIA',
				bio: 'M.Arch University of Washington 2010. Previously at Olson Kundig, 2010–2018.',
				image: '/headshot-architect.jpg'
			}
		]
	},

	// Services (minimal)
	services: [
		'Architecture',
		'Interiors',
		'Furniture'
	],

	// Recognition (optional)
	recognition: [
		{ publication: 'Dwell', year: '2024' },
		{ publication: 'Dezeen', year: '2023' },
		{ publication: 'Architectural Digest', year: '2023' }
	]
} as const;

export type SiteConfig = typeof siteConfig;
