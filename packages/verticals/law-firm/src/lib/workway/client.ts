/**
 * WORKWAY Client
 *
 * Lightweight client for triggering WORKWAY workflows from SvelteKit applications.
 *
 * Pattern: This follows BaseAPIClient from WORKWAY SDK but simplified for
 * client-side use in professional services templates.
 *
 * Zuhandenheit: The WORKWAY mechanism recedes. Developers call `workway.trigger()`
 * and the workflow happens invisibly.
 */

import type { WorkflowResult } from '@workwayco/sdk';

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
	 * Event name (e.g., 'consultation.requested')
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
 *   workflowId: 'consultation-booking',
 *   event: 'consultation.requested',
 *   data: { name, email, service, ... }
 * });
 * ```
 */
export class WorkwayClient {
	private config: Required<WorkwayConfig>;

	constructor(config: WorkwayConfig) {
		this.config = {
			apiUrl: config.apiUrl || 'https://api.workway.co',
			apiKey: config.apiKey,
			organizationId: config.organizationId || '',
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
				Authorization: `Bearer ${this.config.apiKey}`,
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
					timestamp: new Date().toISOString(),
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				return {
					success: false,
					error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
				};
			}

			const result = await response.json();

			return {
				success: true,
				executionId: result.executionId,
				message: result.message || 'Workflow triggered successfully',
			};
		} catch (error) {
			console.error('WORKWAY trigger error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Get workflow execution status
	 *
	 * @param executionId Execution ID from trigger response
	 * @returns Promise<WorkflowResult>
	 */
	async getExecutionStatus(executionId: string): Promise<WorkflowResult> {
		try {
			const response = await fetch(`${this.config.apiUrl}/executions/${executionId}`, {
				headers: {
					Authorization: `Bearer ${this.config.apiKey}`,
				},
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
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
					Authorization: `Bearer ${this.config.apiKey}`,
				},
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
 * Convenience factory function
 */
export function createWorkwayClient(config: WorkwayConfig): WorkwayClient {
	return new WorkwayClient(config);
}

/**
 * Type guard to check if workflow trigger was successful
 */
export function isWorkflowSuccess(
	response: WorkflowExecutionResponse
): response is WorkflowExecutionResponse & { success: true; executionId: string } {
	return response.success === true && !!response.executionId;
}
