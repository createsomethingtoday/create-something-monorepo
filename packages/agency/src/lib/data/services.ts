// Service definitions shared across routes
// Phase 2: Accessible/Commercial tier system

/**
 * Tier Types
 *
 * accessible: For individuals, nonprofits, and those learning ($0-$5,000)
 * commercial: For SMB and enterprise partnerships ($5,000-$50,000+)
 *
 * Philosophy: Assessment fully routes to a single recommendation.
 * User never sees "tier" - only the appropriate offering.
 */
export type ServiceTier = 'accessible' | 'commercial';

export interface ServiceProof {
	caseStudy: string;
	name: string;
	headline: string;
	stats: string[];
}

export interface PricingTier {
	id: string;
	name: string;
	price: string;
	period?: string; // e.g., '/mo', '/year'
	features: string[];
	recommended?: boolean;
}

export interface Service {
	id: string;
	title: string;
	description: string;
	triadQuestion: string;
	triadAction: string;
	triadLevel: 'implementation' | 'artifact' | 'system';
	whenToUse: string[];
	whatThisRemoves: string[];
	howItWorks: string[];
	proof: ServiceProof;
	pricing: string;
	timeline: string;
	icon: string;
	// Phase 2 additions
	tier: ServiceTier;
	isProductized: boolean; // true = self-serve product, false = consulting
	// Optional pricing tiers for multi-tier products
	pricingTiers?: PricingTier[];
}

export const services: Service[] = [
	{
		id: 'web-development',
		title: 'Web Development',
		description:
			"Production-ready web platforms built on battle-tested patterns. We ship fast because we've solved these problems before—now we unify them into your codebase.",
		triadQuestion: '"Have I built this before?"',
		triadAction: 'Unify',
		triadLevel: 'implementation',

		whenToUse: [
			'You need a website or web app shipped in weeks, not months',
			'Your current site is slow, fragmented, or hard to maintain',
			'You want automation opportunities identified during development'
		],

		whatThisRemoves: [
			'Scattered website code across multiple platforms',
			'Manual deployment overhead and version conflicts',
			'Reinventing patterns that already exist'
		],

		howItWorks: [
			'CREATE SOMETHING component library (battle-tested)',
			'Type-safe TypeScript throughout',
			'Cloudflare Pages deployment (global edge)',
			'Automation opportunity assessment included'
		],

		proof: {
			caseStudy: '/work/maverick-x',
			name: 'Maverick X',
			headline: 'Full rebrand and platform in 3 weeks',
			stats: ['Sub-100ms response', 'Cloudflare edge', 'SEO optimized']
		},

		pricing: '$5,000+',
		timeline: '2-4 weeks',
		icon: 'globe',
		tier: 'commercial',
		isProductized: false
	},
	{
		id: 'automation',
		title: 'AI Automation Systems',
		description:
			'Intelligent systems that eliminate manual work. Not chatbots—actual automation that processes data, makes decisions, and integrates with your existing tools.',
		triadQuestion: '"Does this earn its existence?"',
		triadAction: 'Remove',
		triadLevel: 'artifact',

		whenToUse: [
			'Manual tasks consume more than 10 hours/week of skilled labor',
			'Data moves between systems via copy-paste or manual entry',
			'Repeatable decisions follow patterns a human could teach'
		],

		whatThisRemoves: [
			'Manual tasks consuming creative bandwidth',
			'Human bottlenecks in data transfer between systems',
			'Decision fatigue from context-switching between tools'
		],

		howItWorks: [
			'Claude Code for intelligent automation design',
			'Cloudflare Workers for serverless execution',
			'OAuth integrations for multi-user access',
			'Tracked metrics (time saved, cost, errors)'
		],

		proof: {
			caseStudy: '/work/viralytics',
			name: 'Viralytics',
			headline: '120 hours/week of research → automated daily',
			stats: ['4+ chart sources', 'Daily automation', '20 signal queries']
		},

		pricing: '$15,000+',
		timeline: '4-8 weeks',
		icon: 'automation',
		tier: 'commercial',
		isProductized: false
	},
	{
		id: 'agentic-systems',
		title: 'Agentic Systems Engineering',
		description:
			'Long-running AI workflows that coordinate across hours or days. The system handles complexity; you handle strategy.',
		triadQuestion: '"Does this serve the whole?"',
		triadAction: 'Reconnect',
		triadLevel: 'system',

		whenToUse: [
			'Workflows span hours or days, not seconds',
			'Multiple systems need to coordinate decisions autonomously',
			'Human bottlenecks slow down repeatable processes'
		],

		whatThisRemoves: [
			"Disconnected systems that don't talk to each other",
			'Decision paralysis from incomplete information',
			'Human coordination overhead across workflows'
		],

		howItWorks: [
			'Long-running workflows (hours to days)',
			'Cloudflare Workflows for durable execution',
			'Claude Code for intelligent decision-making',
			'Production monitoring and cost control'
		],

		proof: {
			caseStudy: '/work/kickstand',
			name: 'Kickstand',
			headline: '155 scripts → 13 (92% reduction)',
			stats: ['Health 6.2 → 9.2', '0 TypeScript errors', '92% cost reduction']
		},

		pricing: '$35,000+',
		timeline: '8-16 weeks',
		icon: 'robot',
		tier: 'commercial',
		isProductized: false
	},
	{
		id: 'partnership',
		title: 'Ongoing Systems Partnership',
		description:
			"Continuous evolution of your AI infrastructure. We maintain what we build, optimize what's running, and develop new automation monthly.",
		triadQuestion: '"Does this serve the whole?"',
		triadAction: 'Reconnect',
		triadLevel: 'system',

		whenToUse: [
			'You have production AI systems that need monitoring',
			'Technical debt accumulates faster than you can address it',
			'You want new automation features developed regularly'
		],

		whatThisRemoves: [
			'Accumulating technical debt in production systems',
			'Reactive firefighting instead of proactive optimization',
			'Missed opportunities for automation in daily operations'
		],

		howItWorks: [
			'System maintenance and monitoring',
			'Performance optimization (speed + cost)',
			'New automation development (2-4 features/month)',
			'Research collaboration (your systems → .io papers)'
		],

		proof: {
			caseStudy: '/work/kickstand',
			name: 'Kickstand',
			headline: 'Bugs become sustainability experiments',
			stats: ['Monthly reports', 'Quarterly experiments', '4-hour response']
		},

		pricing: '$5,000/month',
		timeline: 'Ongoing',
		icon: 'partnership',
		tier: 'commercial',
		isProductized: false
	},
	{
		id: 'transformation',
		title: 'AI-Native Transformation',
		description:
			'Teach your team to build what we build. Hands-on training, guided projects, and internal playbook development.',
		triadQuestion: '"Does this serve the whole?"',
		triadAction: 'Reconnect',
		triadLevel: 'system',

		whenToUse: [
			'Your team wants AI capability but lacks the starting point',
			"You're hiring AI talent but need to bridge the gap",
			'Vendor dependency feels risky for core operations'
		],

		whatThisRemoves: [
			'Organizational resistance to AI adoption',
			'Knowledge silos between teams',
			'Dependency on external vendors for AI capability'
		],

		howItWorks: [
			'Current state assessment and workflow audit',
			'Hands-on Claude Code training for your team',
			'Guided first automation project',
			'Internal playbook development'
		],

		proof: {
			caseStudy: '/work/kickstand',
			name: 'Kickstand',
			headline: 'Team capability → internal AI infrastructure',
			stats: ['90-day roadmap', 'Certified team', 'Internal playbook']
		},

		pricing: '$50,000+',
		timeline: '12-16 weeks',
		icon: 'academy',
		tier: 'commercial',
		isProductized: false
	},
	{
		id: 'advisory',
		title: 'Strategic Advisory',
		description:
			'Quarterly strategic planning and architecture review. Philosophy-driven guidance on AI infrastructure decisions.',
		triadQuestion: '"Does this serve the whole?"',
		triadAction: 'Reconnect',
		triadLevel: 'system',

		whenToUse: [
			'AI investments feel disconnected or uncertain',
			'You need external perspective on technical direction',
			'Decision paralysis slows your AI roadmap'
		],

		whatThisRemoves: [
			'Uncertainty about AI infrastructure direction',
			'Misaligned investments in disconnected tools',
			'Strategic blind spots in AI maturity'
		],

		howItWorks: [
			'Quarterly strategic planning sessions',
			'Architecture review of your systems',
			'Performance optimization guidance',
			'Pre-publication access to .io research'
		],

		proof: {
			caseStudy: '/work/kickstand',
			name: 'Kickstand',
			headline: 'Philosophy eliminates decision paralysis',
			stats: ['Quarterly reports', 'Monthly office hours', 'Priority support']
		},

		pricing: '$10,000/month',
		timeline: '6-month minimum',
		icon: 'advisor',
		tier: 'commercial',
		isProductized: false
	}
];

// ============================================================================
// Productized Offerings (Accessible Tier)
// ============================================================================
// Self-serve products that don't require consulting engagement.
// Assessment routes users here based on complexity/budget fit.

export const products: Service[] = [
	// Free Products
	{
		id: 'ai-readiness-assessment',
		title: 'AI Readiness Assessment',
		description:
			'Discover where AI can create the most impact in your workflow. Three questions that reveal your starting point on the Subtractive Triad.',
		triadQuestion: '"Have I built this before?"',
		triadAction: 'Unify',
		triadLevel: 'implementation',
		whenToUse: [
			"You're curious about AI but unsure where to start",
			'You want to understand your automation opportunities',
			'You need a framework for evaluating AI investments'
		],
		whatThisRemoves: [
			'Uncertainty about AI starting points',
			'Analysis paralysis when considering AI tools',
			'Wasted time exploring irrelevant AI solutions'
		],
		howItWorks: [
			'3-minute interactive assessment',
			'Maps your situation to the Subtractive Triad',
			'Personalized recommendation based on responses',
			'Optional consultation pathway if complexity warrants'
		],
		proof: {
			caseStudy: '/discover',
			name: 'Discovery Path',
			headline: 'Find your starting point in 3 minutes',
			stats: ['3 questions', 'Instant recommendation', 'No signup required']
		},
		pricing: 'Free',
		timeline: '3 minutes',
		icon: 'compass',
		tier: 'accessible',
		isProductized: true
	},
	{
		id: 'triad-audit-template',
		title: 'Triad Audit Template',
		description:
			'The same framework we use internally to evaluate automation opportunities. Apply DRY → Rams → Heidegger to your own systems.',
		triadQuestion: '"Does this earn its existence?"',
		triadAction: 'Remove',
		triadLevel: 'artifact',
		whenToUse: [
			'You want to evaluate your own systems for automation potential',
			'Your team needs a shared vocabulary for AI decisions',
			'You prefer DIY with philosophical grounding'
		],
		whatThisRemoves: [
			'Ad-hoc automation decisions without framework',
			'Miscommunication about what to automate',
			'Wasted effort on automations that complicate rather than simplify'
		],
		howItWorks: [
			'Downloadable audit template (Markdown)',
			'Step-by-step Subtractive Triad walkthrough',
			'Example applications from real projects',
			'Integration with Claude Code via skill file'
		],
		proof: {
			caseStudy: 'https://createsomething.io/papers/kickstand-triad-audit',
			name: 'Kickstand Triad Audit',
			headline: 'The framework behind CREATE SOMETHING methodology',
			stats: ['3-level audit', 'Production-tested', 'Open methodology']
		},
		pricing: 'Free',
		timeline: '1 hour',
		icon: 'checklist',
		tier: 'accessible',
		isProductized: true
	},
	{
		id: 'canon-css-starter',
		title: 'Canon CSS Starter',
		description:
			"The design tokens powering all CREATE SOMETHING properties. Dieter Rams' principles encoded as CSS custom properties.",
		triadQuestion: '"Have I built this before?"',
		triadAction: 'Unify',
		triadLevel: 'implementation',
		whenToUse: [
			'You want a minimal, principled CSS foundation',
			"You appreciate Rams' \"less, but better\" philosophy",
			'You need consistent tokens across projects'
		],
		whatThisRemoves: [
			'Decision fatigue over color/spacing/typography',
			'Inconsistent visual language across projects',
			'Arbitrary design choices without philosophical grounding'
		],
		howItWorks: [
			'npm install @create-something/components',
			'Import tokens.css or canon.css',
			'Golden ratio spacing, semantic colors, motion tokens',
			'Works with Tailwind or pure CSS'
		],
		proof: {
			caseStudy: 'https://github.com/createsomethingtoday/create-something-monorepo',
			name: 'CREATE SOMETHING Monorepo',
			headline: 'The same tokens powering .io, .space, .agency, .ltd',
			stats: ['Open source', 'WCAG AA compliant', 'Golden ratio spacing']
		},
		pricing: 'Free',
		timeline: '5 minutes',
		icon: 'palette',
		tier: 'accessible',
		isProductized: true
	},
	// Paid Products
	{
		id: 'vertical-templates',
		title: 'Vertical Templates',
		description:
			'Industry-specific website templates with built-in lead capture. Deploy to Cloudflare in minutes, customize with Canon design system.',
		triadQuestion: '"Have I built this before?"',
		triadAction: 'Unify',
		triadLevel: 'implementation',
		whenToUse: [
			'You need a professional website quickly',
			'Your industry has specific requirements (law, architecture, etc.)',
			'You want automation-ready infrastructure from day one'
		],
		whatThisRemoves: [
			'Months of custom development for standard needs',
			'Generic templates that miss industry requirements',
			'Manual lead capture and follow-up processes'
		],
		howItWorks: [
			'Choose your vertical (Law Firm, Architecture, etc.)',
			'Deploy to your subdomain instantly',
			'Customize content via admin panel',
			'Built-in analytics and lead tracking'
		],
		proof: {
			caseStudy: '/work/templates',
			name: 'Vertical Templates',
			headline: 'Professional websites deployed in minutes',
			stats: ['5+ verticals', 'Cloudflare edge', 'D1 database included']
		},
		pricing: '$29-79/mo',
		timeline: 'Same day',
		icon: 'template',
		tier: 'accessible',
		isProductized: true,
		pricingTiers: [
			{
				id: 'solo',
				name: 'Solo',
				price: '$29',
				period: '/mo',
				features: [
					'1 site with custom domain',
					'1,000 leads/month',
					'Built-in analytics',
					'Email support'
				]
			},
			{
				id: 'team',
				name: 'Team',
				price: '$79',
				period: '/mo',
				features: [
					'5 sites with custom domains',
					'Unlimited leads',
					'White-label branding',
					'API access',
					'Priority support'
				],
				recommended: true
			}
		]
	},
	{
		id: 'automation-patterns',
		title: 'Automation Patterns Pack',
		description:
			'Skip 20 hours of pattern discovery. The same automation playbook I use with fractional CTO clients—now for solo builders.',
		triadQuestion: '"Does this earn its existence?"',
		triadAction: 'Remove',
		triadLevel: 'artifact',
		whenToUse: [
			"You're a solo dev doing everything yourself",
			'You want proven patterns, not trial-and-error',
			'You bill by the hour and hate wasting time on setup'
		],
		whatThisRemoves: [
			'Hours spent figuring out "how should I automate this?"',
			'Context switching between coding and researching patterns',
			'The guilt of "I should build this myself"'
		],
		howItWorks: [
			'10 copy-paste patterns with complexity ratings',
			'3 Claude Code skills you drop into .claude/',
			'Shell scripts that work immediately',
			'No platform, no login—just markdown and code'
		],
		proof: {
			caseStudy: '/work/viralytics',
			name: 'Fractional CTO Playbook',
			headline: 'The patterns I repeat across every client engagement',
			stats: ['20 hours saved', 'Used across 10+ clients', 'Download and apply today']
		},
		pricing: '$99',
		timeline: 'Instant download',
		icon: 'book',
		tier: 'accessible',
		isProductized: true
	},
	{
		id: 'agent-in-a-box',
		title: 'Agent-in-a-Box Kit',
		description:
			'Complete AI development environment. WezTerm, Claude Code, Beads, MCP servers—all configured and ready. 90 days of onboarding support.',
		triadQuestion: '"Does this serve the whole?"',
		triadAction: 'Reconnect',
		triadLevel: 'system',
		whenToUse: [
			'You want the full CREATE SOMETHING development setup',
			'Your team needs a standardized AI development environment',
			'You want onboarding support, not just documentation'
		],
		whatThisRemoves: [
			'Hours of tool configuration and debugging',
			'Inconsistent environments across team members',
			'Learning curve for Claude Code best practices'
		],
		howItWorks: [
			'Pre-configured dotfiles and tool setup',
			'MCP server templates for common integrations',
			'90-day weekly office hours for questions',
			'LMS access for self-paced learning'
		],
		proof: {
			caseStudy: '/work/kickstand',
			name: 'Kickstand Development Environment',
			headline: 'The exact setup used for 155 → 13 script consolidation',
			stats: ['Full dotfiles', '90-day support', 'LMS access included']
		},
		pricing: '$2,500-10,000',
		timeline: '1 week setup + 90 days',
		icon: 'box',
		tier: 'accessible',
		isProductized: true
	}
];

// ============================================================================
// Combined Offerings & Lookup Functions
// ============================================================================

/** All offerings (consulting services + productized offerings) */
export const allOfferings: Service[] = [...products, ...services];

/** Get productized offerings only */
export function getProducts(): Service[] {
	return products;
}

/** Get consulting services only */
export function getConsultingServices(): Service[] {
	return services;
}

/** Get offerings by tier */
export function getOfferingsByTier(tier: ServiceTier): Service[] {
	return allOfferings.filter((s) => s.tier === tier);
}

/** Get offering by slug (searches both products and services) */
export function getOfferingBySlug(slug: string): Service | undefined {
	return allOfferings.find((s) => s.id === slug);
}

export function getServiceBySlug(slug: string): Service | undefined {
	return services.find((s) => s.id === slug);
}

export function getServiceSchemaData() {
	return allOfferings.map((service) => ({
		name: service.title,
		description: service.whatThisRemoves.join('. '),
		type: service.isProductized ? 'Product' : 'ProfessionalService',
		price: service.pricing.replace(/[\$,+\/mo-]/g, ''),
		priceDescription: service.pricing
	}));
}
