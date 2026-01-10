/**
 * Site Configuration - Philosophy Edition
 *
 * Voice: Clarity over cleverness. Specificity over generality.
 * Structure: Philosophy-first, dwelling-oriented narrative.
 * Principle: Tools recede. Partnership remains.
 *
 * Content demonstrates Canon principles through subtractive design.
 * Every claim is measurable. No marketing jargon.
 */

export const siteConfig = {
	// Practice Identity
	name: 'Philosophy Studio',
	tagline: 'AI-Native Development Practice',
	description:
		'Tools recede into transparent use. Claude Code generates components—you review and ship. 32 completed projects since 2018. Partnership, not replacement.',

	// Contact
	email: 'studio@example.com',
	phone: '+1 (555) 123-4567',
	address: {
		street: '123 Main Street',
		city: 'San Francisco',
		state: 'CA',
		zip: '94102',
		country: 'US'
	},

	// Social
	social: {
		linkedin: 'https://linkedin.com/company/example',
		github: 'https://github.com/example',
		instagram: undefined,
		pinterest: undefined
	},

	// Services (for StructuredData compatibility - derived from practice areas)
	services: [
		'AI-Native Development',
		'System Architecture',
		'Process Automation',
		'Technical Advisory'
	],

	// SEO
	url: 'https://example.com',
	locale: 'en_US',

	// Hero
	hero: {
		image: '/og-image.jpg',
		alt: 'Minimal workspace with natural light and thoughtful composition',
		caption: 'Philosophy-Driven Practice, 2025'
	},

	// Projects: 5 (Fibonacci)
	// Specificity: measurable outcomes, not vague claims
	projects: [
		{
			slug: 'authentication-system',
			title: 'Authentication System',
			outcome: 'Production in 6 hours',
			metric: '$50K under budget',
			context: 'SaaS platform authentication',
			year: '2024',
			category: 'AI-Native Development',
			heroImage: '/projects/casa-moderna.jpg',
			location: 'San Francisco, CA',
			description:
				'26 hours actual vs 120 estimated. Claude Code for component generation, human review for security architecture.',
			tech: ['Claude Code', 'SvelteKit', 'Cloudflare Workers', 'D1'],
			images: ['/projects/casa-moderna.jpg', '/gallery/interior.jpg']
		},
		{
			slug: 'workflow-automation',
			title: 'Workflow Automation',
			outcome: '155 scripts → 13',
			metric: 'Same functionality, 92% reduction',
			context: 'Build automation for agency client',
			year: '2024',
			category: 'System Architecture',
			heroImage: '/projects/horizon-tower.jpg',
			location: 'New York, NY',
			description:
				'WORKWAY SDK composable workflows. Bounded tasks with quality gates. Tools recede into transparent use.',
			tech: ['WORKWAY SDK', 'Cloudflare Workers', 'TypeScript'],
			images: ['/projects/horizon-tower.jpg', '/gallery/commercial.jpg']
		},
		{
			slug: 'multi-tenant-platform',
			title: 'Multi-Tenant Platform',
			outcome: '26 hours actual vs 120 estimated',
			metric: '78% time reduction',
			context: 'Template platform for vertical SaaS',
			year: '2024',
			category: 'AI-Native Development',
			heroImage: '/projects/urban-loft.jpg',
			location: 'Austin, TX',
			description:
				'Router worker + R2 assets + D1 tenants. Edge-first architecture. Partnership at every decision point.',
			tech: ['SvelteKit', 'Cloudflare Pages', 'D1', 'R2'],
			images: ['/projects/urban-loft.jpg', '/gallery/interior.jpg']
		},
		{
			slug: 'api-modernization',
			title: 'API Modernization',
			outcome: 'Production in 4 days',
			metric: '2-week estimate',
			context: 'REST → GraphQL migration',
			year: '2023',
			category: 'System Architecture',
			heroImage: '/projects/zen-retreat.jpg',
			location: 'Seattle, WA',
			description:
				'Incremental migration strategy. Zero downtime. Claude Code for resolver generation, human architectural oversight.',
			tech: ['GraphQL', 'TypeScript', 'PostgreSQL'],
			images: ['/projects/zen-retreat.jpg', '/gallery/landscape.jpg']
		},
		{
			slug: 'edge-compute-migration',
			title: 'Edge Compute Migration',
			outcome: 'p95 latency: 45ms → 12ms',
			metric: '73% improvement',
			context: 'Serverless to Cloudflare Workers',
			year: '2023',
			category: 'Technical Advisory',
			heroImage: '/gallery/residential.jpg',
			location: 'Los Angeles, CA',
			description:
				'Global distribution. Cold start elimination. Philosophy: serve users where they are.',
			tech: ['Cloudflare Workers', 'D1', 'KV'],
			images: ['/gallery/residential.jpg', '/gallery/commercial.jpg']
		}
	],

	// Philosophy Section (NEW - replaces office gallery)
	philosophy: {
		headline: 'Partnership',
		statement:
			'Tools recede into transparent use. Claude Code generates components—you review and ship. The infrastructure disappears; only outcomes remain.',
		principles: [
			'AI partnership, not replacement',
			'Human judgment on architectural decisions',
			'Tools serve dwelling, not enframing',
			'Outcomes over process theatrics'
		]
	},

	// Practice Areas (expandable)
	practiceAreas: [
		{
			title: 'AI-Native Development',
			summary: 'Claude Code for component generation. Human review for architecture.',
			details:
				'Bounded tasks. Quality gates. Partnership at every decision point. Tools recede; outcomes remain. Production in hours, not weeks.'
		},
		{
			title: 'System Architecture',
			summary: 'Domain-driven design. Event-sourced patterns. Edge-first thinking.',
			details:
				'Design for scale. Optimize for clarity. Build systems that serve dwelling, not enframing. Architecture emerges from domain understanding.'
		},
		{
			title: 'Process Automation',
			summary: 'Workflow orchestration. Integration patterns. Data pipelines.',
			details:
				'WORKWAY SDK for composable workflows. Cloudflare Workers for edge compute. Tools that recede into transparent use. 155 scripts → 13.'
		},
		{
			title: 'Technical Advisory',
			summary: 'Architecture review. Technology selection. Team capability building.',
			details:
				'Strategic guidance grounded in production experience. Philosophy-driven practice. Partnership, not delegation. 32 completed projects since 2018.'
		}
	],

	// Client Outcomes (not testimonials - metrics-driven)
	outcomes: [
		{
			result: 'Production in 6 hours',
			metric: '$50K under budget',
			context: 'Authentication system for SaaS platform',
			year: '2024'
		},
		{
			result: '155 scripts → 13',
			metric: 'Same functionality, 92% reduction',
			context: 'Build automation for agency client',
			year: '2024'
		},
		{
			result: '26 hours actual vs 120 estimated',
			metric: '78% time reduction',
			context: 'Multi-tenant template platform',
			year: '2024'
		},
		{
			result: 'Production in 4 days',
			metric: '2-week estimate',
			context: 'REST → GraphQL migration',
			year: '2023'
		},
		{
			result: 'p95 latency: 45ms → 12ms',
			metric: '73% improvement',
			context: 'Serverless to Cloudflare Workers',
			year: '2023'
		}
	],

	// Team (with philosophy statements, not just bios)
	team: [
		{
			name: 'Micah Johnson',
			role: 'Founding Partner',
			philosophy:
				"Partnership over automation. Claude Code serves judgment, doesn't replace it. Tools recede when chosen correctly.",
			image: '/headshot-architect.jpg',  // Updated from '/team/headshot-1.jpg'
			linkedin: 'https://linkedin.com/in/micahjohnson150'
		},
		{
			name: 'Technical Lead',
			role: 'Partner',
			philosophy:
				'Architecture emerges from domain understanding, not framework assumptions. Zero Framework Cognition in practice.',
			image: '/headshot-architect.jpg'  // Updated from '/team/headshot-2.jpg'
		},
		{
			name: 'Systems Architect',
			role: 'Partner',
			philosophy:
				'Dwelling over enframing. Build systems that serve human judgment, not replace it. The tool recedes; the work remains.',
			image: '/headshot-architect.jpg',  // Updated from '/team/headshot-3.jpg'
			linkedin: 'https://linkedin.com/in/example'
		}
	],

	// Recognition (optional - demonstrates credibility)
	recognition: [
		{ publication: 'CREATE SOMETHING Research', year: '2024', note: 'Norvig Partnership methodology' },
		{ publication: 'AI-Native Development Patterns', year: '2024', note: 'Open source contribution' }
	],

	// Studio (for /studio page compatibility)
	studio: {
		philosophy:
			'Tools recede into transparent use. Claude Code generates components—you review and ship. The infrastructure disappears; only outcomes remain. Partnership, not replacement.',
		approach: [
			'AI partnership, not replacement',
			'Human judgment on architectural decisions',
			'Tools serve dwelling, not enframing',
			'Outcomes over process theatrics'
		],
		founders: [
			{
				name: 'Micah Johnson',
				role: 'Founding Partner',
				bio: "Partnership over automation. Claude Code serves judgment, doesn't replace it. Tools recede when chosen correctly.",
				image: '/headshot-architect.jpg'  // Updated from '/team/headshot-1.jpg'
			}
		]
	}
} as const;

export type SiteConfig = typeof siteConfig;
