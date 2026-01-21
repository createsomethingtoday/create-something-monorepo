/**
 * TEND SDK
 *
 * AI-native database service SDK for CREATE SOMETHING Enterprise.
 *
 * @example
 * ```typescript
 * import { defineAutomation, defineAgent } from '@create-something/tend/sdk';
 *
 * // Database tier: automations
 * export const gmailSync = defineAutomation({
 *   name: 'gmail-sync',
 *   source: 'gmail',
 *   score: (item, ctx) => ctx.vipSenders.includes(item.metadata.from) ? 0.9 : 0.5,
 * });
 *
 * // Enterprise tier: agents
 * export const invoiceAgent = defineAgent({
 *   name: 'invoice-analyzer',
 *   trigger: (item) => item.sourceType === 'gmail' && item.title.includes('Invoice'),
 *   tools: ['search_similar', 'query_quickbooks'],
 *   task: 'Analyze this invoice and draft an approval memo.',
 *   output: { requiresApproval: true, actions: ['approve', 'flag'] },
 * });
 * ```
 */

// Automation SDK
export { defineAutomation, computeScore, shouldInclude, shouldNotify } from './automation.js';

// Agent SDK (Enterprise)
export {
	defineAgent,
	createExecution,
	addStep,
	proposeAction,
	completeExecution,
	failExecution,
	reviewExecution,
} from './agent.js';

// Types
export type {
	// Data models
	DataItem,
	ItemStatus,
	Source,
	SourceType,
	SourceStatus,
	Tenant,
	TenantTier,
	// Automation
	AutomationContext,
	AutomationDefinition,
	TransformFunction,
	ScoreFunction,
	FilterFunction,
	NotifyFunction,
	// Agent (Enterprise)
	AgentDefinition,
	AgentContext,
	AgentTool,
	AgentOutput,
	AgentExecution,
	AgentExecutionStatus,
	AgentStep,
	ToolCall,
	ProposedAction,
	// API
	PaginationParams,
	ItemQuery,
	CurationAction,
} from './types.js';
