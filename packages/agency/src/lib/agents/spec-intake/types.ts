/**
 * Spec Intake Agent - Type Definitions
 *
 * Types for the conversational-intake-agent workflow interface.
 * Ready for WORKWAY API integration when gateway is available.
 */

// =============================================================================
// WORKFLOW REQUEST TYPES
// =============================================================================

/**
 * Input to the conversational-intake-agent workflow
 */
export interface SpecIntakeRequest {
	/** Natural language description of what user needs */
	user_spec: string;

	/** URL to fetch domain-specific context (llm.txt format) */
	llm_context_url: string;

	/** System prompt defining agent persona and behavior */
	system_prompt: string;

	/** JSON string of routing rules */
	routing_rules?: string;

	/** AI model to use */
	model?: 'llama-3-8b' | 'llama-2-7b' | 'mistral-7b';

	/** Temperature for AI generation (0-1) */
	temperature?: number;

	/** Maximum tokens in response */
	max_tokens?: number;
}

/**
 * WORKWAY workflow trigger payload
 */
export interface WorkwayTriggerPayload {
	event: 'spec.submitted';
	data: SpecIntakeRequest;
	timestamp?: string;
	idempotency_key?: string;
}

// =============================================================================
// WORKFLOW RESPONSE TYPES
// =============================================================================

/**
 * Action types for intake routing
 */
export type IntakeAction = 'show_template' | 'clarify' | 'consultation';

/**
 * Response from the conversational-intake-agent workflow
 */
export interface SpecIntakeResponse {
	/** Whether the workflow executed successfully */
	success: boolean;

	/** Unique conversation ID for tracking */
	conversation_id?: string;

	/** Brief summary of what user needs */
	understanding: string;

	/** Confidence score (0.0 - 1.0) */
	confidence: number;

	/** Routing action to take */
	action: IntakeAction;

	/** Matched template slug (when action = 'show_template') */
	matched_template?: string;

	/** Reason why this template fits */
	matched_reason?: string;

	/** Follow-up questions (when action = 'clarify') */
	clarifying_questions?: string[];

	/** Reason for consultation (when action = 'consultation') */
	consultation_reason?: string;

	/** Execution metadata */
	metadata?: {
		model_used?: string;
		tokens_used?: number;
		execution_time_ms?: number;
	};

	/** Error message if success = false */
	error?: string;
	error_code?: string;
}

// =============================================================================
// API ENDPOINT TYPES (CREATE SOMETHING side)
// =============================================================================

/**
 * POST /api/spec-intake request body
 */
export interface SpecIntakeAPIRequest {
	spec: string;
}

/**
 * POST /api/spec-intake response - show_template action
 */
export interface SpecIntakeAPIResponseTemplate {
	action: 'show_template';
	template: string;
	reason: string;
	confidence: number;
	redirect: string;
}

/**
 * POST /api/spec-intake response - clarify action
 */
export interface SpecIntakeAPIResponseClarify {
	action: 'clarify';
	questions: string[];
	understanding: string;
	confidence: number;
}

/**
 * POST /api/spec-intake response - consultation action
 */
export interface SpecIntakeAPIResponseConsultation {
	action: 'consultation';
	reason: string;
	understanding: string;
	confidence: number;
	redirect: string;
}

/**
 * Union type for all API responses
 */
export type SpecIntakeAPIResponse =
	| SpecIntakeAPIResponseTemplate
	| SpecIntakeAPIResponseClarify
	| SpecIntakeAPIResponseConsultation;

// =============================================================================
// ROUTING CONFIGURATION TYPES
// =============================================================================

/**
 * Routing rules configuration
 */
export interface RoutingRulesConfig {
	show_template: {
		/** Minimum confidence to show template directly */
		confidence_threshold: number;
		/** Additional conditions */
		conditions?: string[];
	};
	clarify: {
		/** Minimum confidence to ask clarifying questions */
		confidence_threshold: number;
		/** Maximum number of questions to ask */
		max_questions: number;
	};
	consultation: {
		/** Conditions that trigger consultation */
		conditions: string[];
	};
}

// =============================================================================
// WORKWAY CLIENT TYPES (for future API integration)
// =============================================================================

/**
 * WORKWAY API client configuration
 */
export interface WorkwayClientConfig {
	/** WORKWAY API endpoint */
	apiUrl?: string;

	/** API key for authentication */
	apiKey: string;

	/** Organization ID (for private workflows) */
	organizationId?: string;
}

/**
 * WORKWAY workflow execution response
 */
export interface WorkwayExecutionResponse<T = unknown> {
	success: boolean;
	execution_id?: string;
	data?: T;
	error?: string;
}

/**
 * Type guard: check if response is show_template action
 */
export function isShowTemplateResponse(
	response: SpecIntakeAPIResponse
): response is SpecIntakeAPIResponseTemplate {
	return response.action === 'show_template';
}

/**
 * Type guard: check if response is clarify action
 */
export function isClarifyResponse(
	response: SpecIntakeAPIResponse
): response is SpecIntakeAPIResponseClarify {
	return response.action === 'clarify';
}

/**
 * Type guard: check if response is consultation action
 */
export function isConsultationResponse(
	response: SpecIntakeAPIResponse
): response is SpecIntakeAPIResponseConsultation {
	return response.action === 'consultation';
}
