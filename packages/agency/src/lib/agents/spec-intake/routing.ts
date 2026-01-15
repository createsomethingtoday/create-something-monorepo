/**
 * Spec Intake Agent - Routing Rules
 *
 * Defines when to show template, ask clarifying questions, or route to consultation.
 */

export interface RoutingRules {
	show_template: {
		confidence_threshold: number;
		conditions: string[];
	};
	clarify: {
		confidence_threshold: number;
		max_questions: number;
	};
	consultation: {
		conditions: string[];
	};
}

/**
 * Default routing rules for CREATE SOMETHING .agency
 */
export const DEFAULT_ROUTING_RULES: RoutingRules = {
	show_template: {
		confidence_threshold: 0.8,
		conditions: ['clear_match', 'no_custom_requirements'],
	},
	clarify: {
		confidence_threshold: 0.5,
		max_questions: 2, // Keep it brief - max 2 questions
	},
	consultation: {
		conditions: [
			'custom_integrations',
			'enterprise_requirements',
			'multi_location',
			'compliance_needs',
			'hardware_iot',
			'unclear_after_clarification',
		],
	},
};

/**
 * Keywords that suggest consultation is needed
 */
export const CONSULTATION_TRIGGERS = [
	// Enterprise/Custom
	'custom',
	'enterprise',
	'integrate with',
	'existing system',
	'oracle',
	'sap',
	'salesforce',
	'legacy',

	// Scale
	'multi-location',
	'multiple locations',
	'franchise',
	'chain',

	// Compliance
	'hipaa baa',
	'soc 2',
	'gdpr',
	'compliance audit',

	// Hardware/IoT
	'hardware',
	'iot',
	'sensors',
	'manufacturing',
	'warehouse automation',

	// Complex
	'api',
	'migration',
	'data import',
];

/**
 * Keywords that map to specific templates
 */
export const TEMPLATE_KEYWORDS: Record<string, string[]> = {
	'dental-practice': [
		'dental',
		'dentist',
		'orthodont',
		'teeth',
		'hygien',
		'cleaning',
		'cavity',
		'crown',
		'implant',
	],
	'medical-practice': [
		'medical',
		'doctor',
		'physician',
		'clinic',
		'healthcare',
		'patient',
		'primary care',
	],
	'law-firm': [
		'law',
		'lawyer',
		'attorney',
		'legal',
		'litigation',
		'case',
		'client intake',
	],
	'personal-injury': [
		'personal injury',
		'pi attorney',
		'accident',
		'injury claim',
		'settlement',
	],
	restaurant: [
		'restaurant',
		'cafe',
		'bar',
		'reservation',
		'dining',
		'table',
		'menu',
	],
	'fashion-boutique': [
		'boutique',
		'fashion',
		'clothing',
		'apparel',
		'retail',
		'store',
		'ecommerce',
		'shop',
	],
	crm: ['crm', 'sales', 'lead', 'pipeline', 'customer relationship'],
	inventory: ['inventory', 'stock', 'warehouse', 'reorder', 'supply chain'],
};

/**
 * Keywords that map to consulting services
 */
export const SERVICE_KEYWORDS: Record<string, { keywords: string[]; reason: string }> = {
	'web-development': {
		keywords: ['website', 'web app', 'landing page', 'rebrand', 'redesign'],
		reason: '3 weeks to production with sub-100ms response times.',
	},
	automation: {
		keywords: [
			'automate',
			'automation',
			'manual work',
			'hours per week',
			'data entry',
			'copy paste',
			'repetitive',
			'workflow',
		],
		reason: '60-70% time savings on manual work with Claude Code + Cloudflare Workers.',
	},
	'agentic-systems': {
		keywords: [
			'agentic',
			'long-running',
			'autonomous',
			'multi-system',
			'coordinate',
			'orchestrat',
			'decision making',
		],
		reason: 'Long-running AI workflows that make decisions while you sleep.',
	},
	partnership: {
		keywords: ['ongoing', 'maintain', 'support', 'monthly', 'retainer', 'partner'],
		reason: '2-4 new automation features per month with 4-hour response time.',
	},
	transformation: {
		keywords: [
			'train',
			'team',
			'learn',
			'capability',
			'upskill',
			'teach',
			'ai native',
			'build internally',
		],
		reason: 'Your team builds AI systems in 90 days with hands-on training.',
	},
	advisory: {
		keywords: ['strategy', 'roadmap', 'direction', 'advisor', 'consulting', 'guidance'],
		reason: 'External perspective on your AI roadmap with quarterly reviews.',
	},
};

/**
 * Keywords that map to products
 */
export const PRODUCT_KEYWORDS: Record<string, { keywords: string[]; reason: string }> = {
	'automation-patterns': {
		keywords: ['patterns', 'templates', 'copy paste', 'skip research', 'solo dev'],
		reason: '10 copy-paste patterns, 3 Claude Code skills. Skip 20 hours of research.',
	},
	'agent-in-a-box': {
		keywords: [
			'development environment',
			'setup',
			'dotfiles',
			'dev setup',
			'claude code setup',
			'mcp server',
		],
		reason: 'Complete development environment with 90 days of weekly office hours.',
	},
	'vertical-templates': {
		keywords: ['template', 'quick website', 'same day', 'deploy fast'],
		reason: 'Professional website deployed same day with built-in lead capture.',
	},
};

/**
 * Match type for routing
 */
export type MatchType = 'template' | 'service' | 'product';

export interface OfferingMatch {
	type: MatchType;
	slug: string;
	reason: string;
}

/**
 * Quick keyword-based match for any offering type
 */
export function quickMatchOffering(userSpec: string): OfferingMatch | null {
	const lowerSpec = userSpec.toLowerCase();

	// Check services first (higher value)
	for (const [slug, { keywords, reason }] of Object.entries(SERVICE_KEYWORDS)) {
		for (const keyword of keywords) {
			if (lowerSpec.includes(keyword)) {
				return { type: 'service', slug, reason };
			}
		}
	}

	// Check products
	for (const [slug, { keywords, reason }] of Object.entries(PRODUCT_KEYWORDS)) {
		for (const keyword of keywords) {
			if (lowerSpec.includes(keyword)) {
				return { type: 'product', slug, reason };
			}
		}
	}

	// Check templates last
	for (const [slug, keywords] of Object.entries(TEMPLATE_KEYWORDS)) {
		for (const keyword of keywords) {
			if (lowerSpec.includes(keyword)) {
				return {
					type: 'template',
					slug,
					reason: `Our ${slug.replace(/-/g, ' ')} template includes automated agents.`,
				};
			}
		}
	}

	return null;
}

/**
 * Quick keyword-based template match (fallback if AI fails)
 * @deprecated Use quickMatchOffering instead for full offering support
 */
export function quickMatchTemplate(userSpec: string): string | null {
	const match = quickMatchOffering(userSpec);
	return match?.type === 'template' ? match.slug : null;
}

/**
 * Check if consultation is likely needed based on keywords
 */
export function shouldSuggestConsultation(userSpec: string): boolean {
	const lowerSpec = userSpec.toLowerCase();

	for (const trigger of CONSULTATION_TRIGGERS) {
		if (lowerSpec.includes(trigger)) {
			return true;
		}
	}

	return false;
}

export interface IntakeResult {
	action: 'show_offering' | 'clarify' | 'consultation';
	offering_type?: MatchType;
	matched_offering?: string;
	matched_reason?: string;
	clarifying_questions?: string[];
	consultation_reason?: string;
	confidence: number;
	understanding: string;
	// Legacy support
	matched_template?: string;
}

/**
 * Apply routing rules to AI response
 */
export function applyRoutingRules(
	aiResponse: Partial<IntakeResult>,
	rules: RoutingRules = DEFAULT_ROUTING_RULES
): IntakeResult {
	const confidence = aiResponse.confidence || 0;

	// High confidence + matched offering → show offering
	if (
		confidence >= rules.show_template.confidence_threshold &&
		(aiResponse.matched_offering || aiResponse.matched_template)
	) {
		return {
			action: 'show_offering',
			offering_type: aiResponse.offering_type || 'template',
			matched_offering: aiResponse.matched_offering || aiResponse.matched_template,
			matched_template: aiResponse.matched_template, // Legacy
			matched_reason: aiResponse.matched_reason,
			confidence,
			understanding: aiResponse.understanding || '',
		};
	}

	// Medium confidence → clarify (if questions available)
	if (
		confidence >= rules.clarify.confidence_threshold &&
		confidence < rules.show_template.confidence_threshold &&
		aiResponse.clarifying_questions?.length
	) {
		return {
			action: 'clarify',
			clarifying_questions: aiResponse.clarifying_questions.slice(
				0,
				rules.clarify.max_questions
			),
			confidence,
			understanding: aiResponse.understanding || '',
		};
	}

	// Low confidence or consultation suggested → consultation
	return {
		action: 'consultation',
		consultation_reason:
			aiResponse.consultation_reason ||
			'Your needs may require a custom solution. Let\'s discuss.',
		confidence,
		understanding: aiResponse.understanding || '',
	};
}
