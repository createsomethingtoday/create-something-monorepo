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
	quickMatchOffering,
	shouldSuggestConsultation,
	type IntakeResult,
	type RoutingRules,
	type MatchType,
} from './routing.js';

// Re-export types from routing
export type { IntakeResult, RoutingRules, MatchType };

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
	quickMatchOffering,
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

We also offer consulting services for custom AI systems, automation, and transformation projects.

## Consulting Services (Commercial Tier: $5,000+)

### Web Development - $5,000+, 2-4 weeks
"3 weeks to production. Sub-100ms response times."
- Production-proven component library
- Type-safe TypeScript, Cloudflare edge deployment
- Automation opportunity assessment included
- Best for: Custom websites/apps that need to ship fast

### AI Automation Systems - $15,000+, 4-8 weeks
"60-70% time savings on manual work."
- Claude Code for intelligent automation design
- Cloudflare Workers for serverless execution
- OAuth integrations, tracked metrics
- Best for: Manual tasks >10 hours/week, data moving between systems

### Agentic Systems Engineering - $35,000+, 8-16 weeks
"155 scripts became 13. 92% cost reduction."
- Long-running workflows (hours to days)
- Cloudflare Workflows for durable execution
- Production monitoring and cost control
- Best for: Multi-system coordination, autonomous decision-making

### Ongoing Partnership - $5,000/month
"2-4 new automation features per month."
- System maintenance and monitoring
- Performance optimization
- New automation development monthly
- Best for: Production AI systems needing ongoing care

### AI-Native Transformation - $50,000+, 12-16 weeks
"Your team builds AI systems in 90 days."
- Hands-on Claude Code training
- Guided first automation project
- Internal playbook development
- Best for: Building internal AI capability

### Strategic Advisory - $10,000/month, 6-month minimum
"External perspective on your AI roadmap."
- Quarterly strategic planning
- Architecture review
- Pre-publication research access
- Best for: AI investment direction, decision paralysis

## Productized Offerings (Accessible Tier)

### Free Products

**AI Readiness Assessment** - Free, 3 minutes
- 3 questions, instant recommendation
- Maps your situation to best opportunity
- No signup required

**Triad Audit Template** - Free, 1 hour
- The framework behind 155→13 script reduction
- Step-by-step walkthrough with real examples
- Integrates with Claude Code

**Canon CSS Starter** - Free, 5 minutes
- npm install @create-something/canon
- Golden ratio spacing, semantic colors
- WCAG AA compliant, works with Tailwind

### Paid Products

**Vertical Templates** - $29-79/mo
- Professional website deployed same day
- Built-in lead capture and analytics
- Verticals: Law Firm, Architecture, Dental, etc.

**Automation Patterns Pack** - $99 one-time
- 10 copy-paste patterns, 3 Claude Code skills
- Skip 20 hours of research
- Used across 10+ client engagements

**Agent-in-a-Box Kit** - $2,500-10,000
- Complete development environment
- WezTerm + Claude Code configuration
- 90 days of weekly office hours
- MCP server templates included

## Vertical Templates (with Agents)

### Healthcare
- **dental-practice** - 4 agents, $99/mo: no-show recovery, insurance verification, recall reminders, review requests
- **medical-practice** - 3 agents, $99/mo: appointment reminders, intake automation, referral tracking

### Professional Services
- **law-firm** - 4 agents, $99/mo: consultation booking, lead qualification, deadline tracking, client follow-up
- **personal-injury** - 2 agents, $99/mo: PI intake automation, medical records tracker

### Hospitality & Retail
- **restaurant** - 2 agents, $49/mo: reservation reminders, review requests
- **fashion-boutique** - 2 agents, $29/mo: order notifications, inventory alerts

### Operations (Custom)
- **crm** - lead scoring, follow-up automation
- **inventory** - auto-reorder, demand forecasting

## Research & Papers

We publish research on AI systems, phenomenology of tools, and automation patterns:

### Published Papers (createsomething.io/papers)
- **Code-Mediated Tool Use**: Heidegger's Zuhandenheit applied to LLM-tool interaction
- **Hermeneutic Spiral UX**: Understanding through iterative refinement
- **SvelteKit Zuhandenheit**: Framework design as phenomenology
- **Webflow Dashboard Refactor**: Practical application of Subtractive Triad

### Research Focus
- AI agent architecture and orchestration
- Phenomenological approaches to human-AI interaction
- Automation patterns and anti-patterns
- Edge-first infrastructure design

## Methodology: Subtractive Triad

We apply three questions to every decision:

1. **DRY** - "Have I built this before?" → Unify (Implementation level)
2. **Rams** - "Does this earn its existence?" → Remove (Artifact level)
3. **Heidegger** - "Does this serve the whole?" → Reconnect (System level)

## Routing Guidelines

### Route to Template when:
- Clear industry match (dental, law, restaurant, etc.)
- Need is website + agents
- Budget is Pro tier ($29-99/mo)

### Route to Product when:
- Self-serve preference expressed
- Learning/DIY interest
- Budget is accessible tier

### Route to Consulting when:
- Custom integrations needed
- Multi-location or enterprise scale
- Complex compliance (HIPAA BAA, SOC 2)
- Mentions: automation, AI systems, transformation, advisory
- Budget implies commercial tier ($5,000+)

### Ask Clarifying Questions when:
- Industry unclear
- Scope ambiguous
- Could match multiple offerings

## Response Guidelines

1. Match to specific offering when possible
2. For templates: mention the agents included
3. For consulting: mention outcomes and timeline
4. For products: mention what's included
5. Ask 1-2 clarifying questions if needed
6. Route to consultation for custom/complex needs
7. Be concise and outcome-focused`;

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
	console.log('[spec-intake] Processing:', userSpec.slice(0, 50));
	
	// First, check if we have a clear keyword match (service, product, or template)
	const offeringMatch = quickMatchOffering(userSpec);
	const consultationNeeded = shouldSuggestConsultation(userSpec);
	
	console.log('[spec-intake] Keyword match:', offeringMatch);
	console.log('[spec-intake] Consultation needed:', consultationNeeded);

	// If we have a service or product match, use it directly (more specific than AI template)
	// Services and products are explicit offerings that keywords identify precisely
	if (offeringMatch && (offeringMatch.type === 'service' || offeringMatch.type === 'product')) {
		const displayName = offeringMatch.slug.replace(/-/g, ' ');
		console.log('[spec-intake] Returning service/product match:', offeringMatch.slug);
		return {
			action: 'show_offering',
			offering_type: offeringMatch.type,
			matched_offering: offeringMatch.slug,
			matched_reason: offeringMatch.reason,
			confidence: 0.85,
			understanding: `Looking for ${offeringMatch.type === 'service' ? 'our ' : ''}${displayName} ${offeringMatch.type}`,
		};
	}

	// If AI is enabled and WORKWAY credentials provided, use the workflow for templates
	if (options.useAI && options.workwayApiKey) {
		try {
			const result = await callWorkwayIntake(userSpec, options);
			if (result) {
				// If AI returns consultation but we have a template keyword match
				// and no consultation triggers, prefer the keyword match
				if (
					result.action === 'consultation' &&
					offeringMatch?.type === 'template' &&
					!consultationNeeded &&
					result.confidence < 0.7
				) {
					console.log('AI uncertain, using keyword match:', offeringMatch.slug);
					return {
						action: 'show_offering',
						offering_type: 'template',
						matched_offering: offeringMatch.slug,
						matched_template: offeringMatch.slug,
						matched_reason: offeringMatch.reason,
						confidence: 0.75,
						understanding: `Looking for a ${offeringMatch.slug.replace(/-/g, ' ')} solution`,
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

	const result = (await response.json()) as {
		success: boolean;
		action?: 'show_offering' | 'clarify' | 'consultation';
		matched_template?: string;
		matched_reason?: string;
		clarifying_questions?: string[];
		consultation_reason?: string;
		confidence?: number;
		understanding?: string;
	};

	if (result.success && result.action) {
		return {
			action: result.action,
			matched_template: result.matched_template,
			matched_reason: result.matched_reason,
			clarifying_questions: result.clarifying_questions,
			consultation_reason: result.consultation_reason,
			confidence: result.confidence ?? 0,
			understanding: result.understanding ?? '',
		};
	}

	return null;
}

/**
 * Fallback keyword-based matching when AI is unavailable
 */
function fallbackKeywordMatch(userSpec: string): IntakeResult {
	// Check for consultation triggers first (enterprise/custom needs)
	if (shouldSuggestConsultation(userSpec)) {
		return {
			action: 'consultation',
			consultation_reason:
				'Your requirements suggest a custom solution. Let\'s discuss your specific needs.',
			confidence: 0.6,
			understanding: 'Complex or custom requirements detected',
		};
	}

	// Try to match any offering (service, product, or template)
	const match = quickMatchOffering(userSpec);

	if (match) {
		const displayName = match.slug.replace(/-/g, ' ');
		return {
			action: 'show_offering',
			offering_type: match.type,
			matched_offering: match.slug,
			matched_template: match.type === 'template' ? match.slug : undefined, // Legacy
			matched_reason: match.reason,
			confidence: 0.75,
			understanding: `Looking for ${match.type === 'service' ? 'our ' : 'a '}${displayName} ${match.type}`,
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
