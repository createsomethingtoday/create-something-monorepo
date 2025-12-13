/**
 * Site Configuration - Architecture Studio
 *
 * Design Philosophy: Images command, text supports, space breathes.
 * Voice: Clarity over cleverness. Specificity over generality.
 *
 * Content follows Fibonacci: 5 projects, 3 services, 8 principles.
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
		pinterest: 'https://pinterest.com/studioname',
		archdaily: ''
	},

	// SEO
	url: 'https://example.com',
	locale: 'en_US',

	// Hero - Full-bleed image with minimal text overlay
	hero: {
		image: '/projects/hero-forest-cabin.jpg',
		alt: 'Modern cedar cabin with floor-to-ceiling windows in pine forest',
		caption: 'Forest Cabin, 2024'
	},

	// Projects: 5 (Fibonacci)
	// Specificity: square footage, completion dates, measurable outcomes
	projects: [
		{
			slug: 'forest-cabin',
			title: 'Forest Cabin',
			location: 'Whidbey Island, WA',
			year: '2024',
			category: 'Residential',
			heroImage: '/projects/hero-forest-cabin.jpg',
			description: '1,200 sf. Western red cedar, steel frame, triple-glazed.',
			longDescription:
				'A weekend retreat designed around existing Douglas firs. The structure touches ground at only four points, preserving root systems. South-facing clerestory provides passive solar gain; cross-ventilation eliminates mechanical cooling.',
			specs: {
				area: '1,200 sf',
				bedrooms: 2,
				completion: 'March 2024',
				contractor: 'Schuchart/Dow',
				photographer: 'Andrew Pogue'
			},
			images: [
				'/projects/forest-cabin-01.jpg',
				'/projects/forest-cabin-02.jpg',
				'/projects/forest-cabin-03.jpg'
			],
			awards: ['AIA Seattle Merit Award 2024']
		},
		{
			slug: 'hillside-residence',
			title: 'Hillside Residence',
			location: 'Portland, OR',
			year: '2024',
			category: 'Residential',
			heroImage: '/projects/exterior-hillside.jpg',
			description: '2,800 sf. Cedar cladding, cantilevered volumes, forest integration.',
			longDescription:
				'Sited on a 40% slope, the house steps down the hillside in three volumes. Each level opens to grade on the downhill side, blurring interior and exterior. Rainwater collection irrigates native plantings.',
			specs: {
				area: '2,800 sf',
				bedrooms: 3,
				completion: 'January 2024',
				contractor: 'Hammer & Hand',
				photographer: 'Jeremy Bittermann'
			},
			images: ['/projects/hillside-01.jpg', '/projects/hillside-02.jpg'],
			awards: []
		},
		{
			slug: 'coastal-retreat',
			title: 'Coastal Retreat',
			location: 'Sea Ranch, CA',
			year: '2023',
			category: 'Residential',
			heroImage: '/projects/exterior-coastal.jpg',
			description: '2,400 sf. Cedar, ipe decking, passive solar design.',
			longDescription:
				'A meditation on the original Sea Ranch vision. Shed roofs follow the prevailing wind; natural wood weathers to match the headlands. Zero lot-line landscaping maintains view corridors for neighbors.',
			specs: {
				area: '2,400 sf',
				bedrooms: 3,
				completion: 'September 2023',
				contractor: 'Sea Ranch Construction',
				photographer: 'Joe Fletcher'
			},
			images: ['/projects/coastal-01.jpg', '/projects/coastal-02.jpg'],
			awards: ['Design Review Board Commendation']
		},
		{
			slug: 'meadow-studio',
			title: 'Meadow Studio',
			location: 'Hudson Valley, NY',
			year: '2023',
			category: 'Residential',
			heroImage: '/projects/exterior-meadow.jpg',
			description: '800 sf. Live-work studio. Prefabricated cedar modules.',
			longDescription:
				'A writer\'s studio that doubles as guest quarters. Prefabricated in Portland, shipped flat-pack, assembled in four days. The "kit of parts" approach reduced construction waste by 60%.',
			specs: {
				area: '800 sf',
				bedrooms: 1,
				completion: 'June 2023',
				contractor: 'Self-built',
				photographer: 'Matthew Williams'
			},
			images: ['/projects/meadow-01.jpg', '/projects/meadow-02.jpg'],
			awards: ['Prefab Innovation Award 2023']
		},
		{
			slug: 'woodland-house',
			title: 'Woodland House',
			location: 'Bainbridge Island, WA',
			year: '2022',
			category: 'Residential',
			heroImage: '/projects/exterior-woodland.jpg',
			description: '3,200 sf. Multi-volume plan, native landscaping, rainwater harvest.',
			longDescription:
				'A family home organized as a village of pavilions. Living, sleeping, and working volumes are connected by covered walkways, each opening to a different garden room. Net-zero energy with rooftop solar.',
			specs: {
				area: '3,200 sf',
				bedrooms: 4,
				completion: 'November 2022',
				contractor: 'Dovetail',
				photographer: 'Andrew Pogue'
			},
			images: ['/projects/woodland-01.jpg', '/projects/woodland-02.jpg', '/projects/woodland-03.jpg'],
			awards: ['LEED Platinum', 'AIA Housing Award 2023']
		}
	],

	// Studio - About section
	studio: {
		headline: 'Studio',
		philosophy:
			'Architecture that recedes into landscape. Each project begins with forest, watershed, and light—not style. 32 completed projects since 2018. 8 currently in progress.',
		approach: [
			'Forest dictates footprint',
			'Cedar weathers with place',
			'Windows frame the land',
			'Craft honors material'
		],
		process: [
			{
				phase: 'Listen',
				description: 'Site visit. Soil, trees, water, sun. What does the land want?'
			},
			{
				phase: 'Sketch',
				description: 'Hand drawings before computers. Form follows site, not software.'
			},
			{
				phase: 'Refine',
				description: 'Every element tested: Does this serve the whole?'
			},
			{
				phase: 'Build',
				description: 'Weekly site visits. Craft requires presence.'
			}
		],
		team: [
			{
				name: 'Principal Name',
				role: 'Founding Principal, AIA',
				bio: 'M.Arch University of Washington 2010. Previously at Olson Kundig, 2010–2018.',
				image: '/team/principal.jpg'
			}
		]
	},

	// Services
	services: [
		{
			name: 'Architecture',
			description: 'Full-service residential design from concept through construction administration.'
		},
		{
			name: 'Interiors',
			description: 'Material selection, custom millwork, furniture specification.'
		},
		{
			name: 'Furniture',
			description: 'Site-specific pieces designed and fabricated with local craftspeople.'
		}
	],

	// Recognition
	recognition: [
		{ publication: 'Dwell', year: '2024', link: '' },
		{ publication: 'Dezeen', year: '2023', link: '' },
		{ publication: 'Architectural Digest', year: '2023', link: '' }
	],

	// Inquiry types for contact form
	inquiryTypes: [
		'New Project',
		'Press Inquiry',
		'Speaking Engagement',
		'Employment',
		'General'
	]
} as const;

export type SiteConfig = typeof siteConfig;
export type Project = (typeof siteConfig.projects)[number];
