/**
 * WORKWAY Client for CLEARWAY
 *
 * Shared client for triggering WORKWAY workflows from both:
 * - SvelteKit API routes (webhook handlers)
 * - Cloudflare Workers (notification worker)
 *
 * Pattern: Follows BaseAPIClient from WORKWAY SDK.
 *
 * Zuhandenheit: The WORKWAY mechanism recedes. Workflows trigger invisibly.
 */

export interface WorkwayConfig {
	/**
	 * WORKWAY API endpoint
	 * @default 'https://api.workway.co'
	 */
	apiUrl?: string;

	/**
	 * API key for authentication
	 * Set via environment variable: WORKWAY_API_KEY
	 */
	apiKey: string;

	/**
	 * Organization ID (for private workflows)
	 */
	organizationId?: string;
}

export interface TriggerWorkflowOptions {
	/**
	 * Workflow ID to trigger
	 */
	workflowId: string;

	/**
	 * Event name (e.g., 'booking.confirmed')
	 */
	event: string;

	/**
	 * Payload data for the workflow
	 */
	data: Record<string, unknown>;

	/**
	 * Optional: Idempotency key to prevent duplicate triggers
	 */
	idempotencyKey?: string;
}

export interface WorkflowExecutionResponse {
	success: boolean;
	executionId?: string;
	message?: string;
	error?: string;
}

/**
 * WORKWAY Client
 *
 * Usage:
 * ```typescript
 * const workway = new WorkwayClient({
 *   apiKey: env.WORKWAY_API_KEY,
 *   organizationId: env.WORKWAY_ORG_ID
 * });
 *
 * await workway.trigger({
 *   workflowId: 'clearway-booking-confirmed',
 *   event: 'booking.confirmed',
 *   data: { reservationId, memberId, ... },
 *   idempotencyKey: `booking-${reservationId}`
 * });
 * ```
 */
export class WorkwayClient {
	private config: Required<WorkwayConfig>;

	constructor(config: WorkwayConfig) {
		this.config = {
			apiUrl: config.apiUrl || 'https://api.workway.co',
			apiKey: config.apiKey,
			organizationId: config.organizationId || ''
		};

		if (!this.config.apiKey) {
			throw new Error('WORKWAY API key is required');
		}
	}

	/**
	 * Trigger a workflow execution
	 *
	 * @param options Workflow trigger options
	 * @returns Promise<WorkflowExecutionResponse>
	 */
	async trigger(options: TriggerWorkflowOptions): Promise<WorkflowExecutionResponse> {
		const { workflowId, event, data, idempotencyKey } = options;

		try {
			const headers: Record<string, string> = {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.config.apiKey}`
			};

			if (idempotencyKey) {
				headers['Idempotency-Key'] = idempotencyKey;
			}

			if (this.config.organizationId) {
				headers['X-Organization-ID'] = this.config.organizationId;
			}

			const response = await fetch(`${this.config.apiUrl}/workflows/${workflowId}/trigger`, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					event,
					data,
					timestamp: new Date().toISOString()
				})
			});

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				return {
					success: false,
					error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
				};
			}

			const result = (await response.json()) as {
				executionId?: string;
				message?: string;
			};

			return {
				success: true,
				executionId: result.executionId,
				message: result.message || 'Workflow triggered successfully'
			};
		} catch (error) {
			console.error('WORKWAY trigger error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Test connection to WORKWAY API
	 *
	 * @returns Promise<boolean>
	 */
	async testConnection(): Promise<boolean> {
		try {
			const response = await fetch(`${this.config.apiUrl}/health`, {
				headers: {
					Authorization: `Bearer ${this.config.apiKey}`
				}
			});

			return response.ok;
		} catch (error) {
			console.error('WORKWAY connection test failed:', error);
			return false;
		}
	}
}

/**
 * Create a WORKWAY client instance
 *
 * Convenience factory function with graceful degradation
 */
export function createWorkwayClient(apiKey?: string, organizationId?: string): WorkwayClient | null {
	if (!apiKey) {
		console.warn('WORKWAY_API_KEY not configured, workflow triggers disabled');
		return null;
	}

	return new WorkwayClient({
		apiKey,
		organizationId
	});
}

/**
 * Type guard to check if workflow trigger was successful
 */
export function isWorkflowSuccess(
	response: WorkflowExecutionResponse
): response is WorkflowExecutionResponse & { success: true; executionId: string } {
	return response.success === true && !!response.executionId;
}

/**
 * Safe workflow trigger with graceful degradation
 *
 * If WORKWAY is unavailable, logs a warning and returns success
 * so the main operation doesn't fail.
 */
export async function triggerWorkflowSafely(
	client: WorkwayClient | null,
	options: TriggerWorkflowOptions
): Promise<void> {
	if (!client) {
		console.log(`WORKWAY trigger skipped (not configured): ${options.event}`);
		return;
	}

	const result = await client.trigger(options);

	if (isWorkflowSuccess(result)) {
		console.log(`WORKWAY workflow triggered: ${options.event} → ${result.executionId}`);
	} else {
		console.warn(`WORKWAY workflow trigger failed: ${options.event} → ${result.error}`);
		// Don't throw - graceful degradation
	}
}
