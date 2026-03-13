/**
 * WORKWAY Integration for CLEARWAY
 *
 * Exports:
 * - WorkwayClient: Main client class
 * - createWorkwayClient: Factory function with graceful degradation
 * - triggerWorkflowSafely: Safe trigger that doesn't throw on failure
 * - isWorkflowSuccess: Type guard for successful responses
 */

export {
	WorkwayClient,
	createWorkwayClient,
	triggerWorkflowSafely,
	isWorkflowSuccess,
	type WorkwayConfig,
	type TriggerWorkflowOptions,
	type WorkflowExecutionResponse
} from './client';
