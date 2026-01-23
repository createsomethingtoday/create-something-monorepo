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
	// Optional deliverables list for products
	deliverables?: string[];
	// CTA type: 'email' triggers email capture modal, 'link' uses direct URL
	ctaType?: 'email' | 'link';
}

export const services: Service[] = [
	{
		id: 'web-development',
		title: 'Web Development',
		description:
			'3 weeks to production. Sub-100ms response. We build the infrastructure agents need to work reliably—clean APIs, typed data, observable state.',
		triadQuestion: '"Have I built this before?"',
		triadAction: 'Unify',
		triadLevel: 'implementation',

		whenToUse: [
			'You need a site shipped in weeks, not months',
			'Your current infrastructure makes automation difficult',
			'You want a foundation that supports agents later'
		],

		whatThisRemoves: [
			'Fragmented code across multiple platforms',
			'Manual deployment and version conflicts',
			'Technical debt that blocks future automation'
		],

		howItWorks: [
			'Production-proven component library',
			'Type-safe TypeScript throughout',
			'Cloudflare Pages (global edge, sub-100ms)',
			'Automation audit included—we map what agents could handle next'
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
		title: 'Workflow Automation',
		description:
			'120 hours/week of research became automated. We build systems that process data, make decisions, and talk to your tools—the foundation before agents make sense.',
		triadQuestion: '"Does this earn its existence?"',
		triadAction: 'Remove',
		triadLevel: 'artifact',

		whenToUse: [
			'Manual tasks consume 10+ hours/week of skilled labor',
			'Data moves between systems via copy-paste',
			'Repeatable decisions follow patterns you could teach'
		],

		whatThisRemoves: [
			'Manual tasks eating your best hours',
			'Copy-paste between disconnected tools',
			'Decision fatigue from constant context-switching'
		],

		howItWorks: [
			'Claude Code for automation design',
			'Cloudflare Workers for execution',
			'OAuth integrations for your existing tools',
			'Metrics you can verify: time saved, errors caught, cost per run'
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
		title: 'Accountable Agents',
		description:
			'155 scripts became 13. 92% cost reduction. Agents that run for hours, make decisions, recover from failures, and prove what they did. The guardrails your compliance team will approve.',
		triadQuestion: '"Does this serve the whole?"',
		triadAction: 'Reconnect',
		triadLevel: 'system',

		whenToUse: [
			'Workflows span hours or days, not seconds',
			'Multiple systems need to coordinate autonomously',
			'You need agents you can audit and trust'
		],

		whatThisRemoves: [
			'Systems that fail silently',
			'Decisions you cannot trace or explain',
			'Human coordination overhead across long-running processes'
		],

		howItWorks: [
			'Durable execution (hours to days)',
			'Checkpointing—agents resume after failures',
			'Observable decision trails for every action',
			'Cost control and production monitoring'
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
		title: 'Systems Partnership',
		description:
			'2-4 new features per month. 4-hour response. We maintain what runs, optimize what costs too much, and ship new capabilities you did not have to spec.',
		triadQuestion: '"Does this serve the whole?"',
		triadAction: 'Reconnect',
		triadLevel: 'system',

		whenToUse: [
			'You have production systems that need watching',
			'Technical debt grows faster than you can pay it down',
			'You want new automation without new hiring'
		],

		whatThisRemoves: [
			'Technical debt piling up in production',
			'Firefighting instead of building',
			'Automation opportunities you never get to'
		],

		howItWorks: [
			'System maintenance and monitoring',
			'Cost and speed optimization',
			'2-4 new features per month',
			'Quarterly research collaboration—your systems become case studies'
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
		title: 'Team Enablement',
		description:
			'Your team ships an AI system in 90 days. Hands-on training, a real project in production, and a playbook you own. No vendor lock-in.',
		triadQuestion: '"Does this serve the whole?"',
		triadAction: 'Reconnect',
		triadLevel: 'system',

		whenToUse: [
			'Your team wants AI capability but lacks the starting point',
			'You are hiring AI talent and need to bridge the gap now',
			'Vendor dependency feels risky for core workflows'
		],

		whatThisRemoves: [
			'Organizational resistance slowing adoption',
			'Knowledge trapped in individual heads',
			'Dependency on us (or anyone) for your AI capability'
		],

		howItWorks: [
			'Current state assessment and workflow audit',
			'Hands-on Claude Code training',
			'Guided project: your team ships something real',
			'Internal playbook you keep forever'
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
		title: 'Advisory',
		description:
			'Monthly office hours. Quarterly architecture reviews. 4-hour response. An outside perspective when you are too close to the problem.',
		triadQuestion: '"Does this serve the whole?"',
		triadAction: 'Reconnect',
		triadLevel: 'system',

		whenToUse: [
			'AI investments feel scattered',
			'You need outside perspective on technical direction',
			'Decision paralysis is slowing your roadmap'
		],

		whatThisRemoves: [
			'Uncertainty about where to invest',
			'Tools that do not talk to each other',
			'Blind spots you cannot see from the inside'
		],

		howItWorks: [
			'Quarterly planning sessions',
			'Architecture review of your systems',
			'Performance and cost guidance',
			'Early access to our research'
		],

		proof: {
			caseStudy: '/work/kickstand',
			name: 'Kickstand',
			headline: 'Clear roadmap eliminates decision paralysis',
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
		id: 'ground',
		title: 'Ground MCP',
		description:
			'Stop AI hallucination in code analysis. An MCP server that requires verification before claims. Free. Open source.',
		triadQuestion: '"Have I checked this?"',
		triadAction: 'Verify',
		triadLevel: 'implementation',
		whenToUse: [
			'AI keeps claiming files are "95% similar" without comparing them',
			'You need to find dead code, duplicates, and orphans reliably',
			'Your codebase analysis needs grounded evidence, not guesses'
		],
		whatThisRemoves: [
			'Hallucinated code analysis from AI agents',
			'False positives in duplicate detection',
			'Unverified claims about dead code'
		],
		howItWorks: [
			'Install via npm or one-click buttons below',
			'Ground exposes MCP tools to your AI assistant',
			'Claims require verification: compare → then claim duplicate',
			'Works with Cursor, Claude Desktop, Windsurf, VS Code, Codex'
		],
		proof: {
			caseStudy: 'https://createsomething.io/papers/kickstand-triad-audit',
			name: 'Kickstand Triad Audit',
			headline: '155 scripts → 13 using grounded analysis',
			stats: ['92% reduction', 'Zero false positives', 'Verified claims only']
		},
		pricing: 'Free',
		timeline: '2 minutes to install',
		icon: 'shield',
		tier: 'accessible',
		isProductized: true,
		deliverables: [
			'ground_compare — Compare files for similarity',
			'ground_find_duplicates — Find duplicate functions',
			'ground_find_orphans — Find disconnected modules',
			'ground_find_dead_exports — Find unused exports',
			'ground_check_environment — Detect Workers/Node.js API leakage',
			'ground_find_drift — Find design system violations',
			'ground_adoption_ratio — Calculate token adoption metrics',
			'ground_claim_* — Make verified claims only after checking'
		]
	},
	{
		id: 'loom',
		title: 'Loom MCP',
		description:
			'Multi-agent coordination for AI coding assistants. Route tasks to the right agent, checkpoint progress, recover from crashes. Free. Open source.',
		triadQuestion: '"Who should work on this?"',
		triadAction: 'Coordinate',
		triadLevel: 'system',
		whenToUse: [
			'Multiple AI agents need to coordinate on work',
			'Long-running tasks need crash recovery',
			'You want to route work to the cheapest capable agent'
		],
		whatThisRemoves: [
			'Agents forgetting context between sessions',
			'Manual coordination of multi-agent workflows',
			'Lost progress when agents crash mid-task'
		],
		howItWorks: [
			'Install via npm or one-click buttons',
			'Loom exposes MCP tools to your AI assistant',
			'Tasks are routed to the best agent based on capabilities and cost',
			'Checkpoints allow recovery from any point'
		],
		proof: {
			caseStudy: 'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/loom',
			name: 'Loom README',
			headline: 'Multi-agent coordination with smart routing',
			stats: ['30+ MCP tools', 'Multi-agent routing', 'Crash recovery']
		},
		pricing: 'Free',
		timeline: '2 minutes to install',
		icon: 'network',
		tier: 'accessible',
		isProductized: true,
		deliverables: [
			'loom_work — Quick start: create and claim task atomically',
			'loom_route — Smart routing (best/cheapest/fastest)',
			'loom_checkpoint — Save progress for crash recovery',
			'loom_resume — Resume from any checkpoint',
			'loom_formulas — Repeatable workflow templates',
			'loom_agents — List and configure agents'
		]
	},
	{
		id: 'ai-readiness-assessment',
		title: 'AI Readiness Assessment',
		description:
			'3 minutes to know where to start. Three questions. Instant recommendation. No signup.',
		triadQuestion: '"Have I built this before?"',
		triadAction: 'Unify',
		triadLevel: 'implementation',
		whenToUse: [
			'You are curious but unsure where to begin',
			'You want to map your automation opportunities',
			'You need a framework before talking to vendors'
		],
		whatThisRemoves: [
			'Uncertainty about what to automate first',
			'Analysis paralysis when evaluating AI tools',
			'Time wasted exploring things that do not fit'
		],
		howItWorks: [
			'3-minute interactive assessment',
			'Maps your situation to the highest-impact starting point',
			'Recommendation based on your actual responses',
			'Consultation path if complexity warrants it'
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
			'The framework behind the 155→13 script reduction. Run it yourself in an hour.',
		triadQuestion: '"Does this earn its existence?"',
		triadAction: 'Remove',
		triadLevel: 'artifact',
		whenToUse: [
			'You want to evaluate your own systems',
			'Your team needs shared vocabulary for automation decisions',
			'You prefer DIY with a proven framework'
		],
		whatThisRemoves: [
			'Ad-hoc decisions about what to automate',
			'Arguments about priorities',
			'Automations that make things more complicated'
		],
		howItWorks: [
			'Ground MCP — finds duplicates, dead code, orphans automatically',
			'Claude Code skill for systematic DRY → Rams → Heidegger audits',
			'Markdown template for audit reports',
			'Case study: Kickstand (155→13 scripts)'
		],
		proof: {
			caseStudy: 'https://createsomething.io/papers/kickstand-triad-audit',
			name: 'Kickstand Triad Audit',
			headline: 'The framework behind 92% script reduction',
			stats: ['3-level audit', 'Production-tested', 'Open methodology']
		},
		pricing: 'Free',
		timeline: '1 hour',
		icon: 'checklist',
		tier: 'accessible',
		isProductized: true,
		ctaType: 'email'
	},
	{
		id: 'canon-css-starter',
		title: 'Canon CSS Starter',
		description:
			'5 minutes to consistent design. WCAG AA. Golden ratio spacing. The same tokens running on 4 production sites.',
		triadQuestion: '"Have I built this before?"',
		triadAction: 'Unify',
		triadLevel: 'implementation',
		whenToUse: [
			'You want a minimal CSS foundation',
			'You need consistent tokens across projects',
			'You prefer patterns over starting from zero'
		],
		whatThisRemoves: [
			'Decision fatigue over colors and spacing',
			'Inconsistent visuals across projects',
			'Design choices that drift over time'
		],
		howItWorks: [
			'npm install @create-something/components',
			'Import tokens.css or canon.css',
			'Golden ratio spacing, semantic colors, motion',
			'Works with Tailwind or plain CSS'
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
			'Professional website deployed same day. Lead capture, analytics, edge hosting. No dev time.',
		triadQuestion: '"Have I built this before?"',
		triadAction: 'Unify',
		triadLevel: 'implementation',
		whenToUse: [
			'You need a professional site quickly',
			'Your industry has specific requirements',
			'You want automation-ready infrastructure from day one'
		],
		whatThisRemoves: [
			'Months of custom development for standard needs',
			'Generic templates that miss your industry',
			'Manual lead capture and follow-up'
		],
		howItWorks: [
			'Choose your vertical (Law Firm, Architecture, etc.)',
			'Deploy to your subdomain instantly',
			'Edit content via admin panel',
			'Analytics and lead tracking included'
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
			'Skip 20 hours of research. 10 patterns, 3 Claude Code skills, shell scripts. Used on 10+ client engagements.',
		triadQuestion: '"Does this earn its existence?"',
		triadAction: 'Remove',
		triadLevel: 'artifact',
		whenToUse: [
			'You are a solo dev doing everything yourself',
			'You want patterns that already work',
			'You bill by the hour and hate wasting time on setup'
		],
		whatThisRemoves: [
			'Hours deciding "how should I automate this?"',
			'Switching between coding and researching',
			'The guilt of "I should build this myself"'
		],
		howItWorks: [
			'10 patterns with complexity ratings',
			'3 Claude Code skills (drop into .claude/)',
			'Shell scripts that run immediately',
			'No platform, no login—just markdown and code'
		],
		proof: {
			caseStudy: '/work/viralytics',
			name: 'Fractional CTO Playbook',
			headline: 'The patterns I repeat across every engagement',
			stats: ['20 hours saved', '10+ clients', 'Download and apply']
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
			'The exact setup behind 155→13 scripts. One command to install. 90 days of office hours. Ship in an hour.',
		triadQuestion: '"Does this serve the whole?"',
		triadAction: 'Reconnect',
		triadLevel: 'system',
		whenToUse: [
			'You want our full development environment',
			'Your team needs a standardized AI setup',
			'You want support, not just docs'
		],
		whatThisRemoves: [
			'Hours of tool configuration',
			'Inconsistent environments across your team',
			'The learning curve for Claude Code'
		],
		howItWorks: [
			'npx @create-something/agent-kit --key=xxx',
			'MCP server templates for common integrations',
			'90 days of weekly office hours',
			'LMS access for self-paced learning'
		],
		proof: {
			caseStudy: '/work/kickstand',
			name: 'Kickstand Development Environment',
			headline: 'The exact setup used for 155 → 13 script consolidation',
			stats: ['Full dotfiles', '90-day support', 'LMS access included']
		},
		pricing: '$2,500-10,000',
		timeline: 'Instant install + 90 days support',
		icon: 'box',
		tier: 'accessible',
		isProductized: true,
		pricingTiers: [
			{
				id: 'solo',
				name: 'Solo',
				price: '$2,500',
				features: [
					'Complete dotfiles package',
					'WezTerm + Claude Code configuration',
					'Beads task management setup',
					'6 MCP server templates',
					'LMS access (self-paced)',
					'4 weekly office hours sessions'
				]
			},
			{
				id: 'team',
				name: 'Team',
				price: '$5,000',
				features: [
					'Everything in Solo',
					'Up to 5 team member licenses',
					'Team onboarding session (2 hours)',
					'12 weekly office hours sessions',
					'Private Slack channel support'
				],
				recommended: true
			},
			{
				id: 'org',
				name: 'Organization',
				price: '$10,000',
				features: [
					'Everything in Team',
					'Unlimited team licenses',
					'Custom MCP server development (1)',
					'24 weekly office hours sessions',
					'Quarterly review sessions',
					'Priority support response'
				]
			}
		],
		deliverables: [
			'Pre-configured WezTerm with Canon color scheme',
			'Claude Code settings and skill templates',
			'Beads agent-native task management',
			'6 MCP server templates (Slack, Linear, Stripe, GitHub, Notion, Cloudflare)',
			'Harness specification templates for autonomous work',
			'LMS access for self-paced learning',
			'Weekly office hours with live Q&A'
		]
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
