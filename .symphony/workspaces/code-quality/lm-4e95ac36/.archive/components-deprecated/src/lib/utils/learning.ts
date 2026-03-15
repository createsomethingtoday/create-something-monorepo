/**
 * Learning Event Tracking
 *
 * Unified interface for tracking learning activity across all CREATE SOMETHING properties.
 * Events flow to the LMS API and contribute to the learner's hermeneutic journey.
 *
 * Canon: The infrastructure disappears; only the unified journey remains.
 */

export type PropertyId = 'io' | 'space' | 'ltd' | 'agency';

export interface LearningEventMetadata {
	[key: string]: string | number | boolean | null | undefined;
}

export interface LearningEvent {
	property: PropertyId;
	eventType: string;
	metadata?: LearningEventMetadata;
}

export interface LearningEventResponse {
	success: boolean;
	eventId?: string;
	error?: string;
}

const LMS_API_URL = 'https://learn.createsomething.space/api/events';

/**
 * Track a learning event
 *
 * Sends the event to the LMS API. Requires the user to be authenticated
 * (cookies are sent automatically).
 *
 * @example
 * ```typescript
 * await trackLearningEvent({
 *   property: 'io',
 *   eventType: 'paper_completed',
 *   metadata: {
 *     paperId: 'code-mode-hermeneutic-analysis',
 *     timeSpent: 1800,
 *     reflected: true
 *   }
 * });
 * ```
 */
export async function trackLearningEvent(event: LearningEvent): Promise<LearningEventResponse> {
	try {
		const response = await fetch(LMS_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			credentials: 'include', // Send cookies for authentication
			body: JSON.stringify(event),
		});

		if (!response.ok) {
			const error = await response.text();
			return {
				success: false,
				error: error || 'Failed to track event',
			};
		}

		const data = await response.json();
		return {
			success: true,
			eventId: data.eventId,
		};
	} catch (err) {
		console.error('Error tracking learning event:', err);
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error',
		};
	}
}

/**
 * Batch track multiple learning events
 *
 * Useful for tracking multiple related actions (e.g., completing a multi-part exercise).
 * Events are sent sequentially to maintain order.
 */
export async function trackLearningEvents(
	events: LearningEvent[]
): Promise<LearningEventResponse[]> {
	const results: LearningEventResponse[] = [];

	for (const event of events) {
		const result = await trackLearningEvent(event);
		results.push(result);

		// Stop on first failure to maintain event integrity
		if (!result.success) {
			break;
		}
	}

	return results;
}

/**
 * Property-specific event tracking helpers
 */
export const io = {
	paperStarted: (paperId: string) =>
		trackLearningEvent({
			property: 'io',
			eventType: 'paper_started',
			metadata: { paperId },
		}),

	paperCompleted: (paperId: string, timeSpent?: number) =>
		trackLearningEvent({
			property: 'io',
			eventType: 'paper_completed',
			metadata: { paperId, timeSpent },
		}),

	paperReflected: (paperId: string, reflectionLength: number) =>
		trackLearningEvent({
			property: 'io',
			eventType: 'paper_reflected',
			metadata: { paperId, reflectionLength },
		}),
};

export const space = {
	experimentStarted: (experimentId: string) =>
		trackLearningEvent({
			property: 'space',
			eventType: 'experiment_started',
			metadata: { experimentId },
		}),

	experimentCompleted: (experimentId: string, timeSpent?: number) =>
		trackLearningEvent({
			property: 'space',
			eventType: 'experiment_completed',
			metadata: { experimentId, timeSpent },
		}),

	challengeSubmitted: (challengeId: string, passed: boolean) =>
		trackLearningEvent({
			property: 'space',
			eventType: 'challenge_submitted',
			metadata: { challengeId, passed },
		}),
};

export const ltd = {
	canonReviewed: (principleId: string) =>
		trackLearningEvent({
			property: 'ltd',
			eventType: 'canon_reviewed',
			metadata: { principleId },
		}),

	principleAdopted: (principleId: string, context?: string) =>
		trackLearningEvent({
			property: 'ltd',
			eventType: 'principle_adopted',
			metadata: { principleId, context },
		}),
};

export const agency = {
	methodologyApplied: (methodologyId: string, projectId?: string) =>
		trackLearningEvent({
			property: 'agency',
			eventType: 'methodology_applied',
			metadata: { methodologyId, projectId },
		}),

	projectCompleted: (projectId: string, methodologiesUsed: string[]) =>
		trackLearningEvent({
			property: 'agency',
			eventType: 'project_completed',
			metadata: { projectId, methodologiesUsed: methodologiesUsed.join(',') },
		}),
};
