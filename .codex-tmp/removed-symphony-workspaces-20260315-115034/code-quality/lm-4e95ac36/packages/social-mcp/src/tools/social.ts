/**
 * Social Calendar Tools
 *
 * Agent-native tools for managing LinkedIn content calendar.
 * Calls the agency API endpoints deployed at createsomething.agency.
 */

// API base URL - in production, this would be the deployed agency
const SOCIAL_API = process.env.SOCIAL_API_URL || 'https://createsomething.agency/api/social';

// =============================================================================
// Types
// =============================================================================

export interface StatusResult {
	tokenStatus: {
		connected: boolean;
		daysRemaining?: number;
		expiresAt?: string;
		warning?: string;
	};
	stats: Record<string, number>;
	next: {
		id: string;
		scheduledFor: string;
		preview: string;
	} | null;
	posts: Array<{
		id: string;
		platform: string;
		status: string;
		scheduledFor: string;
		preview: string;
		postUrl?: string;
		error?: string;
	}>;
}

export interface GapsResult {
	timezone: string;
	weeksAnalyzed: number;
	currentWeek: {
		weekNumber: string;
		days: Record<string, {
			date: string;
			dayOfWeek: string;
			status: 'posted' | 'scheduled' | 'gap';
			postId?: string;
			preview?: string;
		}>;
	};
	gaps: string[];
	gapCount: number;
	nextOptimalSlot: string;
	nextOptimalSlotFormatted: string;
	suggestion: string;
}

export interface RhythmResult {
	week: string;
	dayOfWeek: string;
	todaysFocus: string;
	todaysDescription: string;
	rhythm: Record<string, {
		focus: string;
		description: string;
		status: 'complete' | 'in_progress' | 'pending' | 'missed';
		postId?: string;
		content?: string;
	}>;
	score: string;
	completedDays: number;
	missedDays: number;
	recommendation: string;
}

export interface SuggestResult {
	dayOfWeek: string;
	focus: string;
	recentPostCount: number;
	categoryCoverage: Record<string, {
		lastPosted: string | null;
		daysSince: number | null;
	}>;
	suggestions: Array<{
		type: string;
		title: string;
		rationale: string;
		contentFile?: string;
		confidence: number;
		priority: 'high' | 'medium' | 'low';
	}>;
	availableContentFiles: Array<{
		filename: string;
		title: string;
		category: string;
	}>;
}

export interface ScheduleResult {
	success?: boolean;
	dryRun?: boolean;
	mode: string;
	timezone: string;
	threadId: string;
	totalPosts: number;
	scheduled: Array<{
		id?: string;
		scheduledFor: string;
		preview: string;
		fullContent?: string;
	}>;
	error?: string;
	conflicts?: {
		detected: boolean;
		count?: number;
		message?: string;
	};
}

export interface CancelResult {
	success: boolean;
	message: string;
	postId?: string;
}

// =============================================================================
// API Helpers
// =============================================================================

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options?.headers
		}
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`API error (${response.status}): ${error}`);
	}

	return response.json();
}

// =============================================================================
// Tool Implementations
// =============================================================================

/**
 * Get current status of the social calendar
 */
export async function getStatus(
	status?: string,
	limit?: number
): Promise<StatusResult> {
	const params = new URLSearchParams();
	if (status) params.set('status', status);
	if (limit) params.set('limit', limit.toString());

	const url = `${SOCIAL_API}/status${params.toString() ? '?' + params.toString() : ''}`;
	return fetchJson<StatusResult>(url);
}

/**
 * Find gaps in the weekly posting rhythm
 */
export async function getGaps(weeks?: number): Promise<GapsResult> {
	const params = new URLSearchParams();
	if (weeks) params.set('weeks', weeks.toString());

	const url = `${SOCIAL_API}/gaps${params.toString() ? '?' + params.toString() : ''}`;
	return fetchJson<GapsResult>(url);
}

/**
 * Get the next optimal posting slot
 */
export async function getNextSlot(): Promise<{
	nextSlot: string;
	nextSlotFormatted: string;
	suggestion: string;
}> {
	const gaps = await getGaps(1);
	return {
		nextSlot: gaps.nextOptimalSlot,
		nextSlotFormatted: gaps.nextOptimalSlotFormatted,
		suggestion: gaps.suggestion
	};
}

/**
 * Schedule content for LinkedIn
 */
export async function scheduleContent(
	content: string,
	mode?: string,
	startDate?: string,
	dryRun?: boolean
): Promise<ScheduleResult> {
	return fetchJson<ScheduleResult>(`${SOCIAL_API}/schedule`, {
		method: 'POST',
		body: JSON.stringify({
			platform: 'linkedin',
			content,
			mode: mode || 'longform',
			startDate,
			dryRun: dryRun ?? false
		})
	});
}

/**
 * Cancel a scheduled post
 */
export async function cancelPost(postId: string): Promise<CancelResult> {
	return fetchJson<CancelResult>(`${SOCIAL_API}/cancel`, {
		method: 'POST',
		body: JSON.stringify({ postId })
	});
}

/**
 * Get AI-powered content suggestions
 */
export async function getSuggestions(focus?: string): Promise<SuggestResult> {
	const params = new URLSearchParams();
	if (focus) params.set('focus', focus);

	const url = `${SOCIAL_API}/suggest${params.toString() ? '?' + params.toString() : ''}`;
	return fetchJson<SuggestResult>(url);
}

/**
 * Check adherence to Clay playbook weekly rhythm
 */
export async function getRhythm(): Promise<RhythmResult> {
	return fetchJson<RhythmResult>(`${SOCIAL_API}/rhythm`);
}

/**
 * Get content format and topic intelligence
 */
export interface IntelligenceResult {
	day: string;
	theme: string;
	description: string;
	suggestion: {
		format: string;
		format_tips: string[];
		topic_ideas: string[];
		hook_templates: string[];
		methodology_angle: string;
		performance_note: string;
	};
	all_formats: Array<{
		format: string;
		engagement_rate: number;
		best_for: string[];
		tips: string[];
	}>;
}

export async function getIntelligence(
	day?: string,
	contentGoal?: string,
	researchTopic?: string
): Promise<IntelligenceResult> {
	if (contentGoal || researchTopic) {
		// POST for more detailed suggestions
		return fetchJson<IntelligenceResult>(`${SOCIAL_API}/intelligence`, {
			method: 'POST',
			body: JSON.stringify({
				research_topic: researchTopic,
				content_goal: contentGoal
			})
		});
	}
	
	// GET for day-based suggestions
	const params = new URLSearchParams();
	if (day) params.set('day', day);
	
	const url = `${SOCIAL_API}/intelligence${params.toString() ? '?' + params.toString() : ''}`;
	return fetchJson<IntelligenceResult>(url);
}

// =============================================================================
// Content Pipeline Tools
// =============================================================================

const CONTENT_API = process.env.SOCIAL_API_URL?.replace('/social', '/content') 
	|| 'https://createsomething.agency/api/content';

/**
 * Get ideas from the content pipeline
 */
export async function getIdeas(
	status?: string,
	pillar?: string
): Promise<unknown> {
	const params = new URLSearchParams();
	if (status) params.set('status', status);
	if (pillar) params.set('pillar', pillar);
	
	const url = `${CONTENT_API}/ideas${params.toString() ? '?' + params.toString() : ''}`;
	return fetchJson(url);
}

/**
 * Create a new content idea
 */
export async function createIdea(
	title: string,
	source: string,
	description?: string,
	pillar?: string,
	format?: string,
	priority?: number
): Promise<unknown> {
	return fetchJson(`${CONTENT_API}/ideas`, {
		method: 'POST',
		body: JSON.stringify({
			title,
			source,
			description,
			pillar,
			format,
			priority,
			created_by: 'agent'
		})
	});
}

/**
 * Update an idea in the pipeline
 */
export async function updateIdea(
	id: string,
	status?: string,
	research_notes?: string,
	draft_content?: string,
	priority?: number
): Promise<unknown> {
	return fetchJson(`${CONTENT_API}/ideas`, {
		method: 'PATCH',
		body: JSON.stringify({
			id,
			status,
			research_notes,
			draft_content,
			priority
		})
	});
}

/**
 * Get content coverage analysis
 */
export async function getCoverage(
	pillar?: string,
	days?: number
): Promise<unknown> {
	const params = new URLSearchParams();
	if (pillar) params.set('pillar', pillar);
	if (days) params.set('days', days.toString());
	
	const url = `${CONTENT_API}/coverage${params.toString() ? '?' + params.toString() : ''}`;
	return fetchJson(url);
}

/**
 * Check rhythm adherence
 */
export async function checkRhythm(
	weeks?: number
): Promise<unknown> {
	const params = new URLSearchParams();
	if (weeks) params.set('weeks', weeks.toString());
	
	const url = `${CONTENT_API}/rhythm${params.toString() ? '?' + params.toString() : ''}`;
	return fetchJson(url);
}
