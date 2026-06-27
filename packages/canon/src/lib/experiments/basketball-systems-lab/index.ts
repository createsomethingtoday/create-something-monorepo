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
	getDefaultEnvironment,
	getSampleSystemUpload,
	listEnvironments,
	listManagementPolicies,
	listSeasonPhases,
	listSystems,
	parseSystemUpload,
	runManagementScenario,
	runSystemMatch,
	type BoardReport,
	type Environment,
	type GameRequirement,
	type GameRequirementKey,
	type GameRequirementSeverity,
	type LabMode,
	type LeagueState,
	type ManagementPolicy,
	type ManagementScenario,
	type MapNode,
	type MetricOutput,
	type PolicyKey,
	type SeasonLedgerEntry,
	type SeasonPhase,
	type SeasonPhaseKey,
	type System,
	type SystemId,
	type SystemKey,
	type SystemMatch,
	type SystemMatchInput,
	type SystemProjection,
	type SystemResult,
	type SystemScoreContribution,
	type SystemTimelineEntry,
	type SystemUploadDefinition,
	type SystemUploadIssue,
	type SystemUploadResult,
	type ValidationSummary
} from './simulation.js';
