/**
 * Spec Intake Agent
 *
 * Conversational intake for CREATE SOMETHING .agency
 *
 * This module provides the domain-specific configuration for the
 * conversational-intake-agent workflow running on WORKWAY.
 *
 * Architecture:
 * - WORKWAY: Hosts the generic workflow (AI execution, storage)
 * - This module: Provides context (llm.txt), prompts, routing rules
 *
 * Status: Ready for WORKWAY API gateway integration.
 * Currently uses keyword fallback until API is available.
 */

import { SYSTEM_PROMPT, buildPrompt, parseAIResponse } from './prompts.js';
import {
	DEFAULT_ROUTING_RULES,
	applyRoutingRules,
	quickMatchTemplate,
	shouldSuggestConsultation,
	type IntakeResult,
	type RoutingRules,
} from './routing.js';

// Re-export types from routing
export type { IntakeResult, RoutingRules };

// Re-export all types from types.ts
export type {
	SpecIntakeRequest,
	SpecIntakeResponse,
	SpecIntakeAPIRequest,
	SpecIntakeAPIResponse,
	SpecIntakeAPIResponseTemplate,
	SpecIntakeAPIResponseClarify,
	SpecIntakeAPIResponseConsultation,
	WorkwayTriggerPayload,
	WorkwayClientConfig,
	WorkwayExecutionResponse,
	RoutingRulesConfig,
	IntakeAction,
} from './types.js';

export {
	isShowTemplateResponse,
	isClarifyResponse,
	isConsultationResponse,
} from './types.js';

// Re-export utilities
export {
	SYSTEM_PROMPT,
	buildPrompt,
	parseAIResponse,
	DEFAULT_ROUTING_RULES,
	applyRoutingRules,
	quickMatchTemplate,
	shouldSuggestConsultation,
};

/**
 * Load the llm.txt context file
 */
export function loadLLMContext(): string {
	// In production, this could be fetched from a URL
	// For now, we'll embed it or load from file
	return LLM_CONTEXT;
}

/**
 * LLM Context (embedded for edge deployment)
 * This is the same content as llm.txt but embedded in the code
 */
export const LLM_CONTEXT = `# CREATE SOMETHING Agency - LLM Context

You help users find the right solution for their software needs.

## About CREATE SOMETHING

We build apps that keep working. Not just websites—apps with agents that deliver ongoing value:
- Recover no-shows
- Qualify leads
- Automate follow-ups
- Verify insurance

## Available Templates

### Healthcare

**dental-practice** - "Appointments that book themselves"
- 4 agents included: no-show recovery, insurance verification, recall reminders, review requests
- HIPAA-conscious architecture
- Integrations: NexHealth, Weave, Dentrix, Open Dental
- Best for: Dental practices, orthodontists
- Tier: Pro $99/mo

**medical-practice** - "Patient care, not paperwork"
- 3 agents included: appointment reminders, intake automation, referral tracking
- HIPAA-conscious architecture
- Best for: Medical practices, clinics
- Tier: Pro $99/mo

### Professional Services

**law-firm** - "Clients that convert themselves"
- 4 agents included: consultation booking, lead qualification, deadline tracking, client follow-up
- Clio integration
- Best for: Law firms, attorneys, legal practices
- Tier: Pro $99/mo

**personal-injury** - "Cases that intake themselves"
- 2 agents included: PI intake automation, medical records tracker
- Best for: Personal injury attorneys
- Tier: Pro $99/mo

### Hospitality

**restaurant** - "Tables that fill themselves"
- 2 agents included: reservation reminders, review requests
- OpenTable/Resy integration
- Best for: Restaurants, cafes, bars
- Tier: Pro $49/mo

### Retail

**fashion-boutique** - "Orders that process themselves"
- 2 agents included: order notifications, inventory alerts
- Stripe/Shopify integration
- Best for: Boutiques, online stores
- Tier: Pro $29/mo

### Operations (Custom)

**crm** - "Leads that follow up themselves"
- 2 agents included: lead scoring, follow-up automation
- HubSpot/Salesforce integration
- Best for: Sales teams
- Tier: Custom pricing

**inventory** - "Stock that orders itself"
- 2 agents included: auto-reorder, demand forecasting
- Best for: Warehouses, retail operations
- Tier: Custom pricing

## Methodology: Subtractive Triad

We apply three questions to every decision:

1. **DRY** - "Have I built this before?" → Unify
2. **Rams** - "Does this earn its existence?" → Remove  
3. **Heidegger** - "Does this serve the whole?" → Reconnect

## Pricing Tiers

- **Free**: Website template, no agents, self-hosted
- **Pro**: Website + 3-4 active agents, managed hosting, email support
- **Enterprise**: Unlimited agents, custom integrations, priority support

## When to Recommend Consultation

- Custom integrations not in standard templates
- Multi-location or enterprise requirements
- Complex compliance needs (HIPAA BAA, SOC 2)
- Hardware/IoT automation
- Unclear or novel requirements

## Response Guidelines

1. Match to specific template when possible (high confidence)
2. Ask 1-2 clarifying questions if industry/need is unclear
3. Route to consultation for custom/complex needs
4. Always mention the agents included - that's our differentiator
5. Be concise and outcome-focused`;

/**
 * Process a user spec using the intake agent
 *
 * In production, this calls the WORKWAY conversational-intake-agent workflow.
 * For now, provides a fallback using keyword matching.
 *
 * @param userSpec - Natural language description of what user needs
 * @param options - Optional configuration
 * @returns IntakeResult with action, matched template, or clarifying questions
 */
export async function processSpecIntake(
	userSpec: string,
	options: {
		useAI?: boolean;
		workwayApiKey?: string;
		workwayOrgId?: string;
		workwayApiUrl?: string;
	} = {}
): Promise<IntakeResult> {
	// First, check if we have a clear keyword match
	const keywordMatch = quickMatchTemplate(userSpec);
	const consultationNeeded = shouldSuggestConsultation(userSpec);

	// If AI is enabled and WORKWAY credentials provided, use the workflow
	if (options.useAI && options.workwayApiKey) {
		try {
			const result = await callWorkwayIntake(userSpec, options);
			if (result) {
				// If AI returns consultation but we have a clear keyword match
				// and no consultation triggers, prefer the keyword match
				if (
					result.action === 'consultation' &&
					keywordMatch &&
					!consultationNeeded &&
					result.confidence < 0.7
				) {
					console.log('AI uncertain, using keyword match:', keywordMatch);
					return {
						action: 'show_template',
						matched_template: keywordMatch,
						matched_reason: `Based on your description, our ${keywordMatch.replace(/-/g, ' ')} template looks like a great fit.`,
						confidence: 0.75,
						understanding: `Looking for a ${keywordMatch.replace(/-/g, ' ')} solution`,
					};
				}
				return result;
			}
		} catch (error) {
			console.warn('WORKWAY intake failed, falling back to keyword matching:', error);
		}
	}

	// Fallback: keyword-based matching
	return fallbackKeywordMatch(userSpec);
}

/**
 * Call the WORKWAY conversational-intake-agent workflow
 */
async function callWorkwayIntake(
	userSpec: string,
	options: { workwayApiKey?: string; workwayOrgId?: string; workwayApiUrl?: string }
): Promise<IntakeResult | null> {
	// Use custom URL or default to production gateway
	const apiUrl = options.workwayApiUrl || 'https://workway-api-gateway.half-dozen.workers.dev';

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${options.workwayApiKey}`,
	};

	if (options.workwayOrgId) {
		headers['X-Organization-ID'] = options.workwayOrgId;
	}

	const response = await fetch(`${apiUrl}/workflows/conversational-intake-agent/trigger`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			event: 'spec.submitted',
			data: {
				user_spec: userSpec,
				llm_context_url: 'https://createsomething.agency/api/llm-context',
				system_prompt: SYSTEM_PROMPT,
				routing_rules: JSON.stringify(DEFAULT_ROUTING_RULES),
			},
		}),
	});

	if (!response.ok) {
		throw new Error(`WORKWAY API error: ${response.statusText}`);
	}

	const result = await response.json();

	if (result.success) {
		return {
			action: result.action,
			matched_template: result.matched_template,
			matched_reason: result.matched_reason,
			clarifying_questions: result.clarifying_questions,
			consultation_reason: result.consultation_reason,
			confidence: result.confidence,
			understanding: result.understanding,
		};
	}

	return null;
}

/**
 * Fallback keyword-based matching when AI is unavailable
 */
function fallbackKeywordMatch(userSpec: string): IntakeResult {
	// Check for consultation triggers first
	if (shouldSuggestConsultation(userSpec)) {
		return {
			action: 'consultation',
			consultation_reason:
				'Your requirements suggest a custom solution. Let\'s discuss your specific needs.',
			confidence: 0.6,
			understanding: 'Complex or custom requirements detected',
		};
	}

	// Try to match a template
	const matchedTemplate = quickMatchTemplate(userSpec);

	if (matchedTemplate) {
		return {
			action: 'show_template',
			matched_template: matchedTemplate,
			matched_reason: `Based on your description, our ${matchedTemplate.replace('-', ' ')} template looks like a great fit.`,
			confidence: 0.7,
			understanding: `Looking for a ${matchedTemplate.replace('-', ' ')} solution`,
		};
	}

	// No clear match - ask clarifying questions
	return {
		action: 'clarify',
		clarifying_questions: [
			'What type of business or industry are you in?',
			'What\'s the main problem you\'re trying to solve?',
		],
		confidence: 0.3,
		understanding: 'Need more information to find the right solution',
	};
}
