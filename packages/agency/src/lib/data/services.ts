// Service definitions shared across routes
export interface ServiceProof {
	caseStudy: string;
	name: string;
	headline: string;
	stats: string[];
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
		icon: 'globe'
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
		icon: 'automation'
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
		icon: 'robot'
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
		icon: 'partnership'
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
		icon: 'academy'
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
		icon: 'advisor'
	}
];

export function getServiceBySlug(slug: string): Service | undefined {
	return services.find((s) => s.id === slug);
}

export function getServiceSchemaData() {
	return services.map((service) => ({
		name: service.title,
		description: service.whatThisRemoves.join('. '),
		type: 'ProfessionalService',
		price: service.pricing.replace(/[\$,+\/mo]/g, ''),
		priceDescription: service.pricing
	}));
}
