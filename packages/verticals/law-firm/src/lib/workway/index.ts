/**
 * WORKWAY Integration Module
 *
 * Exports client and utilities for connecting law-firm template to WORKWAY workflows.
 */

export {
	WorkwayClient,
	createWorkwayClient,
	isWorkflowSuccess,
	type WorkwayConfig,
	type TriggerWorkflowOptions,
	type WorkflowExecutionResponse,
} from './client';
