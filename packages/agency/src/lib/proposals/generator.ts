/**
 * Proposal Generator
 *
 * Generates standardized proposals from input data.
 * Philosophy: Proposals answer "what will we remove?" not "what will we add?"
 */

import { getOfferingBySlug } from '../data/services';
import type { Proposal, ProposalInput, TimelinePhase } from './types';

function generateId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 6);
	return `prop_${timestamp}_${random}`;
}

function getValidUntilDate(daysFromNow: number = 30): string {
	const date = new Date();
	date.setDate(date.getDate() + daysFromNow);
	return date.toISOString().split('T')[0];
}

function parseTimeline(service: ReturnType<typeof getOfferingBySlug>): TimelinePhase[] {
	if (!service) return [];

	// Default phases based on service type
	const phases: Record<string, TimelinePhase[]> = {
		'web-development': [
			{
				name: 'Discovery & Planning',
				description: 'Requirements gathering, sitemap, wireframes',
				duration: '1 week',
				deliverables: ['Sitemap document', 'Wireframe mockups', 'Technical specification']
			},
			{
				name: 'Development',
				description: 'Build and iterate on production code',
				duration: '2-3 weeks',
				deliverables: ['Staging environment', 'Component library', 'CMS integration']
			},
			{
				name: 'Launch & Handoff',
				description: 'Deploy to production, documentation, training',
				duration: '1 week',
				deliverables: ['Production deployment', 'Documentation', 'Training session']
			}
		],
		automation: [
			{
				name: 'Assessment',
				description: 'Audit current workflows, identify automation opportunities',
				duration: '1 week',
				deliverables: ['Workflow audit', 'Opportunity matrix', 'Priority recommendations']
			},
			{
				name: 'Design',
				description: 'Architecture design, integration planning',
				duration: '1-2 weeks',
				deliverables: ['System architecture', 'Integration plan', 'Data flow diagrams']
			},
			{
				name: 'Implementation',
				description: 'Build automation systems with testing',
				duration: '3-4 weeks',
				deliverables: ['Working automation', 'Test coverage', 'Monitoring dashboard']
			},
			{
				name: 'Deployment & Training',
				description: 'Production deployment, documentation, team training',
				duration: '1 week',
				deliverables: ['Production system', 'Runbooks', 'Training materials']
			}
		],
		'agentic-systems': [
			{
				name: 'Discovery & Architecture',
				description: 'Deep dive into workflows, system design',
				duration: '2 weeks',
				deliverables: ['Workflow analysis', 'Agent architecture', 'Integration map']
			},
			{
				name: 'Core Development',
				description: 'Build agent infrastructure and decision logic',
				duration: '4-6 weeks',
				deliverables: ['Agent framework', 'Decision trees', 'Integration layer']
			},
			{
				name: 'Integration & Testing',
				description: 'Connect to existing systems, extensive testing',
				duration: '2-4 weeks',
				deliverables: ['System integrations', 'Test suites', 'Error handling']
			},
			{
				name: 'Deployment & Optimization',
				description: 'Production deployment, monitoring, cost optimization',
				duration: '2-4 weeks',
				deliverables: ['Production system', 'Monitoring', 'Optimization report']
			}
		],
		partnership: [
			{
				name: 'Ongoing',
				description: 'Monthly maintenance, optimization, and new feature development',
				duration: 'Monthly',
				deliverables: [
					'System maintenance',
					'Performance optimization',
					'2-4 new automations/month',
					'Monthly report'
				]
			}
		],
		transformation: [
			{
				name: 'Assessment',
				description: 'Current state audit, team capability assessment',
				duration: '2 weeks',
				deliverables: ['Current state report', 'Skills gap analysis', 'Roadmap draft']
			},
			{
				name: 'Training Foundation',
				description: 'Core training on AI tools and methodology',
				duration: '4 weeks',
				deliverables: ['Training curriculum', 'Hands-on workshops', 'Skill certifications']
			},
			{
				name: 'Guided Project',
				description: 'Supervised first automation project',
				duration: '4-6 weeks',
				deliverables: ['Working automation', 'Team-built solution', 'Documentation']
			},
			{
				name: 'Playbook Development',
				description: 'Create internal standards and playbooks',
				duration: '2-4 weeks',
				deliverables: ['Internal playbook', 'Best practices guide', 'Graduation session']
			}
		],
		advisory: [
			{
				name: 'Ongoing',
				description: 'Quarterly strategic planning and monthly guidance',
				duration: 'Quarterly',
				deliverables: [
					'Quarterly strategy session',
					'Monthly office hours',
					'Architecture reviews',
					'Priority support'
				]
			}
		]
	};

	return phases[service.id] || [
		{
			name: 'Engagement',
			description: 'Custom engagement based on scope',
			duration: service.timeline,
			deliverables: service.howItWorks
		}
	];
}

function calculateTotalWeeks(phases: TimelinePhase[]): number {
	let total = 0;
	for (const phase of phases) {
		// Parse duration strings like "1 week", "2-3 weeks", "4-6 weeks"
		const match = phase.duration.match(/(\d+)(?:-(\d+))?\s*week/);
		if (match) {
			// Use the upper bound if range, otherwise the single value
			total += parseInt(match[2] || match[1]);
		}
	}
	return total || 4; // Default to 4 weeks if unable to parse
}

function parsePrice(pricing: string): number {
	// Handle strings like "$5,000+", "$15,000+", "$5,000/month", "$29-79/mo"
	const cleanedPrice = pricing.replace(/[,$+\/moear]/g, '');
	const match = cleanedPrice.match(/(\d+)/);
	return match ? parseInt(match[1]) : 0;
}

export function generateProposal(input: ProposalInput): Proposal {
	const service = getOfferingBySlug(input.serviceId);

	if (!service) {
		throw new Error(`Service not found: ${input.serviceId}`);
	}

	const phases = parseTimeline(service);
	const totalWeeks = calculateTotalWeeks(phases);
	const basePrice = input.priceOverride || parsePrice(service.pricing);

	const proposal: Proposal = {
		id: generateId(),
		version: '1.0',
		createdAt: new Date().toISOString(),
		validUntil: getValidUntilDate(30),

		prospect: input.prospect,

		problem: input.problem,

		triad: {
			level: service.triadLevel,
			question: service.triadQuestion,
			action: service.triadAction,
			whatWeRemove: service.whatThisRemoves
		},

		scope: {
			serviceId: input.serviceId,
			customizations: input.customizations,
			exclusions: [],
			assumptions: [
				'Timely access to stakeholders for decisions',
				'Necessary system credentials provided within first week',
				'Scope changes will be addressed via change order process'
			]
		},

		service,

		timeline: {
			phases,
			totalWeeks,
			startDate: input.startDate
		},

		pricing: {
			type: service.pricing.includes('/mo') ? 'monthly' : 'fixed',
			basePrice,
			currency: 'USD',
			paymentTerms:
				service.pricing.includes('/mo')
					? 'Monthly billing, net 15'
					: '50% upfront, 50% on completion',
			validUntil: getValidUntilDate(30)
		},

		nextSteps: [
			'Review this proposal and reply with questions',
			'Schedule a 30-minute call to discuss scope',
			'Sign and return agreement',
			'Receive onboarding package and kickoff calendar invite'
		],

		caseStudyRef: service.proof.caseStudy,
		additionalNotes: input.additionalNotes
	};

	return proposal;
}

export function proposalToMarkdown(proposal: Proposal): string {
	const formatDate = (iso: string) => {
		return new Date(iso).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0
		}).format(price);
	};

	const sections = [
		`# Proposal: ${proposal.service.title}`,
		`**Prepared for:** ${proposal.prospect.company}`,
		`**Contact:** ${proposal.prospect.contact}${proposal.prospect.role ? ` (${proposal.prospect.role})` : ''}`,
		`**Date:** ${formatDate(proposal.createdAt)}`,
		`**Valid Until:** ${formatDate(proposal.validUntil)}`,
		`**Proposal ID:** ${proposal.id}`,
		'',
		'---',
		'',
		'## The Problem',
		'',
		proposal.problem.summary,
		'',
		'### Current State',
		'',
		...proposal.problem.currentState.map((item) => `- ${item}`),
		'',
		'### Business Impact',
		'',
		...proposal.problem.impact.map((item) => `- ${item}`),
		'',
		'### Desired Outcome',
		'',
		proposal.problem.desiredState,
		'',
		'---',
		'',
		'## Our Approach',
		'',
		`**Subtractive Triad Level:** ${proposal.triad.level.charAt(0).toUpperCase() + proposal.triad.level.slice(1)}`,
		'',
		`> ${proposal.triad.question}`,
		'',
		'### What We Will Remove',
		'',
		...proposal.triad.whatWeRemove.map((item) => `- ${item}`),
		'',
		'### How It Works',
		'',
		...proposal.service.howItWorks.map((item) => `- ${item}`),
		''
	];

	// Add customizations if any
	if (proposal.scope.customizations?.length) {
		sections.push('### Customizations', '');
		sections.push(...proposal.scope.customizations.map((item) => `- ${item}`));
		sections.push('');
	}

	// Timeline
	sections.push('---', '', '## Timeline', '');

	if (proposal.timeline.startDate) {
		sections.push(`**Proposed Start:** ${formatDate(proposal.timeline.startDate)}`);
	}
	sections.push(
		`**Estimated Duration:** ${proposal.timeline.totalWeeks} weeks`,
		''
	);

	for (const phase of proposal.timeline.phases) {
		sections.push(
			`### ${phase.name}`,
			`*${phase.duration}*`,
			'',
			phase.description,
			'',
			'**Deliverables:**',
			...phase.deliverables.map((d) => `- ${d}`),
			''
		);
	}

	// Pricing
	sections.push('---', '', '## Investment', '');

	sections.push(
		`**${proposal.service.title}:** ${formatPrice(proposal.pricing.basePrice)}${proposal.pricing.type === 'monthly' ? '/month' : ''}`,
		''
	);

	if (proposal.pricing.breakdown?.length) {
		sections.push('### Breakdown', '');
		for (const item of proposal.pricing.breakdown) {
			sections.push(
				`- **${item.item}:** ${formatPrice(item.price)}${item.note ? ` (${item.note})` : ''}`
			);
		}
		sections.push('');
	}

	sections.push(
		`**Payment Terms:** ${proposal.pricing.paymentTerms}`,
		''
	);

	// Proof point
	sections.push(
		'---',
		'',
		'## Proof of Work',
		'',
		`**${proposal.service.proof.name}:** ${proposal.service.proof.headline}`,
		'',
		...proposal.service.proof.stats.map((stat) => `- ${stat}`),
		'',
		`[View Case Study](${proposal.caseStudyRef})`,
		''
	);

	// Assumptions
	if (proposal.scope.assumptions?.length) {
		sections.push(
			'---',
			'',
			'## Assumptions',
			'',
			...proposal.scope.assumptions.map((item) => `- ${item}`),
			''
		);
	}

	// Next Steps
	sections.push(
		'---',
		'',
		'## Next Steps',
		'',
		...proposal.nextSteps.map((step, i) => `${i + 1}. ${step}`),
		''
	);

	// Additional notes
	if (proposal.additionalNotes) {
		sections.push('---', '', '## Notes', '', proposal.additionalNotes, '');
	}

	// Footer
	sections.push(
		'---',
		'',
		'*This proposal was generated by CREATE SOMETHING.*',
		'*Questions? Reply to this document or email micah@createsomething.io*',
		'',
		'**CREATE SOMETHING** | createsomething.agency',
		''
	);

	return sections.join('\n');
}
