/**
 * TEND SDK: Agent Builder (Enterprise only)
 *
 * defineAgent() — reasoning automations with human-in-the-loop.
 * Agents propose, humans approve.
 */

import type { AgentDefinition, AgentExecution, AgentStep, ProposedAction } from './types.js';

/**
 * Define an agent.
 *
 * @example
 * ```typescript
 * export default defineAgent({
 *   name: 'invoice-analyzer',
 *   description: 'Analyzes invoices for anomalies and categorization',
 *
 *   trigger: (item) =>
 *     item.sourceType === 'gmail' &&
 *     item.metadata.labels?.includes('invoice'),
 *
 *   tools: ['read_item', 'search_similar', 'query_quickbooks', 'draft_response'],
 *
 *   task: `
 *     Analyze this invoice and:
 *     1. Extract line items, total, due date
 *     2. Check if vendor exists in QuickBooks
 *     3. Flag if amount >20% higher than previous invoices
 *     4. Suggest category based on similar past invoices
 *     5. Draft approval memo for human review
 *   `,
 *
 *   output: {
 *     requiresApproval: true,
 *     actions: ['categorize', 'flag_anomaly', 'create_memo'],
 *   },
 * });
 * ```
 */
export function defineAgent(definition: AgentDefinition): AgentDefinition {
	// Validate required fields
	if (!definition.name) {
		throw new Error('Agent name is required');
	}
	if (!definition.trigger) {
		throw new Error('Agent trigger is required');
	}
	if (!definition.task) {
		throw new Error('Agent task is required');
	}
	if (!definition.output) {
		throw new Error('Agent output configuration is required');
	}

	// Default to requiring approval (human-in-the-loop)
	if (definition.output.requiresApproval === undefined) {
		definition.output.requiresApproval = true;
	}

	return definition;
}

/**
 * Create a new agent execution record.
 */
export function createExecution(
	agentName: string,
	triggeredBy: AgentExecution['triggeredBy']
): AgentExecution {
	return {
		id: crypto.randomUUID(),
		agentName,
		triggeredBy,
		status: 'thinking',
		steps: [],
		toolCalls: [],
		proposedActions: [],
		startedAt: new Date(),
	};
}

/**
 * Add a step to an execution.
 */
export function addStep(
	execution: AgentExecution,
	type: AgentStep['type'],
	content: string
): AgentExecution {
	return {
		...execution,
		steps: [
			...execution.steps,
			{
				timestamp: new Date(),
				type,
				content,
			},
		],
	};
}

/**
 * Propose an action for human approval.
 */
export function proposeAction(
	execution: AgentExecution,
	action: Omit<ProposedAction, 'approved'>
): AgentExecution {
	return {
		...execution,
		status: 'awaiting_approval',
		proposedActions: [
			...execution.proposedActions,
			{
				...action,
				approved: undefined, // Pending
			},
		],
	};
}

/**
 * Mark an execution as complete.
 */
export function completeExecution(
	execution: AgentExecution,
	result?: unknown
): AgentExecution {
	return {
		...execution,
		status: 'completed',
		result,
		completedAt: new Date(),
	};
}

/**
 * Mark an execution as failed.
 */
export function failExecution(execution: AgentExecution, error: string): AgentExecution {
	return {
		...execution,
		status: 'failed',
		steps: [
			...execution.steps,
			{
				timestamp: new Date(),
				type: 'observation',
				content: `Error: ${error}`,
			},
		],
		completedAt: new Date(),
	};
}

/**
 * Review an execution (approve or reject).
 */
export function reviewExecution(
	execution: AgentExecution,
	approved: boolean,
	reviewedBy: string,
	notes?: string
): AgentExecution {
	return {
		...execution,
		status: approved ? 'approved' : 'rejected',
		reviewedBy,
		reviewedAt: new Date(),
		reviewNotes: notes,
		proposedActions: execution.proposedActions.map((action) => ({
			...action,
			approved,
		})),
	};
}
