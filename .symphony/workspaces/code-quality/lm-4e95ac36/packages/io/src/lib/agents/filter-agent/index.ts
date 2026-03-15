/**
 * Filter Agent
 *
 * AI-native filtering for product catalogs.
 * Exports the executor and types for use in API endpoints.
 */

export { executeFilterAgent, applyFilters, parseProductFromDB } from './executor.js';
export type {
	Product,
	FilterState,
	AgentStep,
	FilterResult,
	AgentMessage
} from './types.js';
export { FILTER_TOOLS, FILTER_RESPONSE_SCHEMA } from './types.js';
