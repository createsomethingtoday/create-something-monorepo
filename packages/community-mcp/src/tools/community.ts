/**
 * Community Tools Implementation
 * 
 * Each tool makes HTTP calls to the agency API.
 * The agent monitors. The human reviews.
 */

const COMMUNITY_API = process.env.COMMUNITY_API_URL || 'https://createsomething.agency/api/community';

// Type definitions for tool parameters
export interface SignalsParams {
	status?: string;
	platform?: string;
	urgency?: string;
	limit?: number;
}

export interface RecordSignalParams {
	platform: string;
	signal_type: string;
	content: string;
	source_url?: string;
	source_id?: string;
	author_id?: string;
	author_name?: string;
	author_handle?: string;
	author_followers?: number;
	relevance_score?: number;
	urgency?: string;
	context?: string;
	metadata?: Record<string, unknown>;
}

export interface DraftParams {
	signal_id: string;
	tone?: string;
	action_type?: string;
}

export interface QueueResponseParams {
	signal_id?: string;
	draft_content: string;
	draft_reasoning?: string;
	tone?: string;
	action_type: string;
	platform: string;
	target_url?: string;
	priority?: number;
	expires_in_hours?: number;
}

export interface QueueParams {
	status?: string;
	limit?: number;
}

export interface RelationshipsParams {
	sort?: string;
	platform?: string;
	lead_potential?: string;
	min_warmth?: number;
	limit?: number;
}

export interface UpdateRelationshipParams {
	id: string;
	notes?: string;
	tags?: string[];
	lead_potential?: string;
	interests?: string[];
}

export interface BatchReviewParams {
	actions: Array<{
		type: string;
		id: string;
		edited_content?: string;
	}>;
}

// Helper for API calls
async function apiCall(
	endpoint: string,
	method: string = 'GET',
	body?: unknown,
	params?: Record<string, string | number | undefined>
): Promise<unknown> {
	let url = `${COMMUNITY_API}${endpoint}`;
	
	if (params) {
		const searchParams = new URLSearchParams();
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined) {
				searchParams.set(key, String(value));
			}
		}
		const queryString = searchParams.toString();
		if (queryString) {
			url += `?${queryString}`;
		}
	}
	
	const options: RequestInit = {
		method,
		headers: {
			'Content-Type': 'application/json'
		}
	};
	
	if (body && method !== 'GET') {
		options.body = JSON.stringify(body);
	}
	
	const response = await fetch(url, options);
	
	if (!response.ok) {
		const error = await response.text();
		throw new Error(`API error (${response.status}): ${error}`);
	}
	
	return response.json();
}

/**
 * Get the daily review summary
 */
export async function getReview(): Promise<unknown> {
	return apiCall('/review');
}

/**
 * Get inbound signals
 */
export async function getSignals(params: SignalsParams): Promise<unknown> {
	return apiCall('/signals', 'GET', undefined, {
		status: params.status,
		platform: params.platform,
		urgency: params.urgency,
		limit: params.limit
	});
}

/**
 * Record a new signal
 */
export async function recordSignal(params: RecordSignalParams): Promise<unknown> {
	return apiCall('/signals', 'POST', params);
}

/**
 * Get draft context for a signal
 */
export async function getDraftContext(params: DraftParams): Promise<unknown> {
	return apiCall('/draft', 'POST', params);
}

/**
 * Queue a response for review
 */
export async function queueResponse(params: QueueResponseParams): Promise<unknown> {
	return apiCall('/queue', 'POST', params);
}

/**
 * Get the response queue
 */
export async function getQueue(params: QueueParams): Promise<unknown> {
	return apiCall('/queue', 'GET', undefined, {
		status: params.status,
		limit: params.limit
	});
}

/**
 * Get relationships
 */
export async function getRelationships(params: RelationshipsParams): Promise<unknown> {
	return apiCall('/relationships', 'GET', undefined, {
		sort: params.sort,
		platform: params.platform,
		lead_potential: params.lead_potential,
		min_warmth: params.min_warmth,
		limit: params.limit
	});
}

/**
 * Update a relationship
 */
export async function updateRelationship(params: UpdateRelationshipParams): Promise<unknown> {
	return apiCall('/relationships', 'PATCH', params);
}

/**
 * Dismiss a signal
 */
export async function dismissSignal(params: { signal_id: string }): Promise<unknown> {
	return apiCall('/signals', 'PATCH', {
		id: params.signal_id,
		status: 'dismissed'
	});
}

/**
 * Batch process review actions
 */
export async function batchReview(params: BatchReviewParams): Promise<unknown> {
	return apiCall('/review', 'POST', params);
}
