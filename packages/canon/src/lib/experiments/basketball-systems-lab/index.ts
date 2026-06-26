/**
 * Basketball Systems Lab - Complete System
 *
 * League-office systems game design prototype.
 * Status: 1 of 1 (experiment-specific)
 *
 * Graduation: If the causal court, policy rail, or board report patterns are reused,
 * generalize them into Canon clear communication or diagram components.
 */

export { default as BasketballSystemsLab } from './BasketballSystemsLab.svelte';
export {
	getDefaultLeagueState,
	listManagementPolicies,
	runManagementScenario,
	type BoardReport,
	type LeagueState,
	type ManagementPolicy,
	type ManagementScenario,
	type MapNode,
	type MetricOutput,
	type PolicyKey,
	type SeasonLedgerEntry
} from './simulation.js';
