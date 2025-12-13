/**
 * Site Configuration - Creative Agency
 *
 * Voice: Confident, direct, results-focused.
 * Design: Dark theme, bold typography, case studies with metrics.
 */

export const siteConfig = {
	// Agency Identity
	name: 'Agency Name',
	tagline: 'Brand Strategy & Digital Design',
	description:
		'We help ambitious brands stand out. Strategy, identity, and digital experiences that drive results.',

	// Contact
	email: 'hello@agency.com',
	phone: '+1 (555) 234-5678',
	address: {
		street: '100 Design District',
		city: 'Los Angeles',
		state: 'CA',
		zip: '90015',
		country: 'US'
	},

	// Social
	social: {
		instagram: 'https://instagram.com/agencyname',
		linkedin: 'https://linkedin.com/company/agencyname',
		dribbble: 'https://dribbble.com/agencyname'
	},

	// SEO
	url: 'https://agency.com',
	locale: 'en_US',

	// Hero
	hero: {
		headline: 'Brands that move people',
		subheadline:
			'Strategy, identity, and digital experiences for companies ready to lead their category.',
		cta: 'Start a Project'
	},

	// Case Studies - Results-focused
	work: [
		{
			slug: 'fintech-rebrand',
			client: 'Vesta Financial',
			title: 'Rebranding a $2B fintech',
			category: 'Brand Identity',
			year: '2024',
			heroImage: '/work/vesta-hero.jpg',
			description:
				'Complete brand overhaul including strategy, identity system, and digital experience.',
			challenge:
				'Vesta had grown from startup to industry leader, but their brand still looked like day one. They needed an identity that matched their ambition.',
			solution:
				'We developed a strategic positioning around "Financial Clarity" and created an identity system that scales from app icons to Times Square billboards.',
			results: [
				{ metric: '340%', label: 'Brand awareness increase' },
				{ metric: '2.1M', label: 'App downloads in 3 months' },
				{ metric: '#1', label: 'Most downloaded finance app' }
			],
			services: ['Brand Strategy', 'Visual Identity', 'Digital Design', 'Motion'],
			images: ['/work/vesta-01.jpg', '/work/vesta-02.jpg', '/work/vesta-03.jpg'],
			testimonial: {
				quote:
					'They didn\'t just give us a new logo. They gave us a brand that our team is proud to represent.',
				author: 'Sarah Chen',
				role: 'CEO, Vesta Financial'
			}
		},
		{
			slug: 'saas-launch',
			client: 'Nimbus',
			title: 'Launching a developer tool',
			category: 'Digital Product',
			year: '2024',
			heroImage: '/work/nimbus-hero.jpg',
			description:
				'Brand identity, website, and launch campaign for a new cloud infrastructure platform.',
			challenge:
				'Nimbus was entering a crowded market dominated by AWS and Google. They needed to carve out a distinct position.',
			solution:
				'We positioned Nimbus as "The Developer-First Cloud" and created a bold, technical aesthetic that resonates with engineers.',
			results: [
				{ metric: '50K', label: 'Signups in first month' },
				{ metric: '$12M', label: 'Series A raised' },
				{ metric: '4.9★', label: 'Product Hunt rating' }
			],
			services: ['Positioning', 'Brand Identity', 'Web Design', 'Launch Strategy'],
			images: ['/work/nimbus-01.jpg', '/work/nimbus-02.jpg'],
			testimonial: {
				quote: 'The brand they created helped us punch way above our weight in fundraising.',
				author: 'Marcus Webb',
				role: 'Founder, Nimbus'
			}
		},
		{
			slug: 'ecommerce-redesign',
			client: 'Heirloom',
			title: 'Elevating a heritage brand',
			category: 'E-commerce',
			year: '2023',
			heroImage: '/work/heirloom-hero.jpg',
			description:
				'Digital transformation for a 50-year-old furniture company entering direct-to-consumer.',
			challenge:
				'Heirloom had loyal wholesale customers but zero digital presence. They needed to build DTC without alienating existing partners.',
			solution:
				'We created a digital experience that honors their craftsmanship heritage while meeting modern e-commerce expectations.',
			results: [
				{ metric: '180%', label: 'Online revenue increase' },
				{ metric: '3.2x', label: 'Average order value' },
				{ metric: '45%', label: 'Repeat customer rate' }
			],
			services: ['E-commerce Strategy', 'UX Design', 'Development', 'Content'],
			images: ['/work/heirloom-01.jpg', '/work/heirloom-02.jpg'],
			testimonial: {
				quote:
					'They understood our brand\'s soul and translated it beautifully to digital.',
				author: 'James Mitchell',
				role: 'CEO, Heirloom'
			}
		}
	],

	// Services
	services: [
		{
			name: 'Brand Strategy',
			description:
				'Positioning, messaging, and brand architecture that gives you an unfair advantage.',
			includes: ['Market Research', 'Competitive Analysis', 'Positioning', 'Messaging']
		},
		{
			name: 'Visual Identity',
			description:
				'Logo, color, type, and design systems that scale from business card to billboard.',
			includes: ['Logo Design', 'Design System', 'Guidelines', 'Templates']
		},
		{
			name: 'Digital Experience',
			description:
				'Websites and products that convert visitors into customers and customers into advocates.',
			includes: ['UX Strategy', 'Web Design', 'Development', 'Optimization']
		}
	],

	// Stats for credibility
	stats: [
		{ number: '50+', label: 'Brands launched' },
		{ number: '8', label: 'Years in business' },
		{ number: '$2B+', label: 'Client valuations' }
	],

	// Clients (logos)
	clients: ['Vesta', 'Nimbus', 'Heirloom', 'Cortex', 'Meridian', 'Apex'],

	// Team
	team: [
		{
			name: 'Alex Rivera',
			role: 'Founder & Creative Director',
			bio: 'Previously Design Director at Pentagram. 15 years building brands that last.',
			image: '/team/alex.jpg'
		},
		{
			name: 'Jordan Park',
			role: 'Strategy Director',
			bio: 'Ex-McKinsey. Brings analytical rigor to creative problems.',
			image: '/team/jordan.jpg'
		}
	]
} as const;

export type SiteConfig = typeof siteConfig;
export type CaseStudy = (typeof siteConfig.work)[number];
