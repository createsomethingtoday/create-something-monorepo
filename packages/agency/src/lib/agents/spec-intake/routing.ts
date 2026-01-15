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
 * Quick keyword-based template match (fallback if AI fails)
 */
export function quickMatchTemplate(userSpec: string): string | null {
	const lowerSpec = userSpec.toLowerCase();

	for (const [template, keywords] of Object.entries(TEMPLATE_KEYWORDS)) {
		for (const keyword of keywords) {
			if (lowerSpec.includes(keyword)) {
				return template;
			}
		}
	}

	return null;
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
	action: 'show_template' | 'clarify' | 'consultation';
	matched_template?: string;
	matched_reason?: string;
	clarifying_questions?: string[];
	consultation_reason?: string;
	confidence: number;
	understanding: string;
}

/**
 * Apply routing rules to AI response
 */
export function applyRoutingRules(
	aiResponse: Partial<IntakeResult>,
	rules: RoutingRules = DEFAULT_ROUTING_RULES
): IntakeResult {
	const confidence = aiResponse.confidence || 0;
	const suggestedAction = aiResponse.action || 'consultation';

	// High confidence + matched template → show template
	if (
		confidence >= rules.show_template.confidence_threshold &&
		aiResponse.matched_template
	) {
		return {
			action: 'show_template',
			matched_template: aiResponse.matched_template,
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
