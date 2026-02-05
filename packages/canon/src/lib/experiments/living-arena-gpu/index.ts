/**
 * Living Arena GPU - Complete System
 * 
 * WebGPU-accelerated crowd simulation with spatial hashing.
 * Status: 1 of 1 (experiment-specific)
 * 
 * Graduation: If WebGPU simulation is reused,
 * generalize to `@create-something/canon/components/gpu-simulation`
 * 
 * Shaders available at:
 * - ./shaders/arena.wgsl
 * - ./shaders/bitonicSort.wgsl
 * - ./shaders/cellAssign.wgsl
 * - ./shaders/cellBounds.wgsl
 * - ./shaders/crowd.wgsl
 * - ./shaders/render.wgsl
 */

// Geometry utilities
export {
	getWallSegments,
	gates,
	getScenarioTargets,
	getSpawnZones,
	isInsideArena,
	getArenaCenter,
	getArenaDimensions,
	type WallSegment,
	type TargetZone,
	type Gate,
	type SpawnZone
} from './arenaGeometry.js';

// Agent behavior
export {
	AgentRole,
	Directive,
	EventPhase,
	ARENA_LOCATIONS,
	updatePossession,
	getCurrentPossession,
	getDirectiveTarget,
	updateDirective,
	initializeAgentDirectives,
	getInitialPosition,
	eventPhaseToScenario,
	type AgentRoleType,
	type DirectiveType,
	type EventPhaseType,
	type AgentDirectiveState
} from './agentDirectives.js';

// Core simulation
export {
	CrowdSimulation,
	initWebGPU,
	isWebGPUSupported,
	AgentState,
	type WebGPUContext,
	type SimulationConfig
} from './crowdSimulation.js';

// Experiment framework
export {
	STANDARD_METRICS,
	calculateSummary,
	runExperiment,
	defineExperiment,
	compareResults,
	createThroughputExperiment,
	createPanicCascadeExperiment,
	createBottleneckExperiment,
	createScalabilityExperiment,
	formatExperimentReport,
	formatComparisonReport,
	type MetricAggregation,
	type MetricSource,
	type MetricType,
	type ComparisonOperator,
	type MetricCollector,
	type MetricDefinition,
	type Criteria,
	type SimulationExperiment,
	type MetricMeasurement,
	type MetricTimeSeries,
	type RunResult,
	type StatisticalSummary,
	type CriteriaResult,
	type ExperimentResult,
	type AgentSnapshot,
	type MetricContext,
	type SimulationRunner,
	type ComparisonResult
} from './experimentFramework.js';

// Scenario effects
export {
	ARENA_ZONES,
	INFRASTRUCTURE_SCENARIOS,
	getInfrastructureScenario,
	listInfrastructureScenarios,
	calculateCascadeEffects,
	recoverService,
	getSystemHealth,
	getHealthColor,
	getTierColor,
	getServiceArenaPosition,
	getServicesInZone,
	arenaScenarioToInfrastructure,
	type ServiceHealth,
	type ServiceTier,
	type CascadeMode,
	type InfrastructureService,
	type CascadeEvent,
	type InfrastructureScenario
} from './infrastructureScenarios.js';

// Telemetry
export {
	SimulationTelemetry,
	createTelemetry,
	defaultTelemetry,
	type FrameMetrics,
	type AggregatedMetrics,
	type Span,
	type SpanEvent,
	type ExperimentContext,
	type TelemetryConfig,
	type TelemetryCounters,
	type TelemetryGauges
} from './telemetry.js';
