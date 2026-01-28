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
export { ARENA_WALLS, WallSegment, createSpatialHash, findNearbyAgents } from './arenaGeometry.js';

// Agent behavior
export { getAgentDirective, DEFAULT_CROWD_PARAMS, type CrowdParams } from './agentDirectives.js';

// Core simulation
export {
	CrowdSimulation,
	initWebGPU,
	isWebGPUSupported,
	type WebGPUContext,
	type Agent
} from './crowdSimulation.js';

// Experiment framework
export { loadShader, createBuffer, ExperimentTimer, FPSCounter } from './experimentFramework.js';

// Scenario effects
export {
	applyScenarioToAgents,
	INFRASTRUCTURE_SCENARIOS,
	type InfrastructureScenario
} from './infrastructureScenarios.js';

// Telemetry
export {
	TelemetryCollector,
	aggregateMetrics,
	type SimulationTelemetry,
	type AggregatedMetrics
} from './telemetry.js';
