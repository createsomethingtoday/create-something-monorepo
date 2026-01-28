/**
 * Experiment Framework
 *
 * Hypothesis-driven experimentation framework with metrics collection
 * for the crowd simulation engine. Enables:
 * - Statistical testing of simulation behavior under various conditions
 * - Deterministic reproduction of experiments via seed control
 * - Metric collection for throughput, panic propagation, bottlenecks
 * - Comparison of results across different configurations
 */

import type { SimulationConfig } from './crowdSimulation';
import { INFRASTRUCTURE_SCENARIOS, type InfrastructureScenario } from './infrastructureScenarios';

// ============================================================================
// Experiment Types
// ============================================================================

/** Aggregation mode for metrics */
export type MetricAggregation = 'per-frame' | 'per-run' | 'across-runs';

/** Source of metric data */
export type MetricSource = 'agents' | 'performance' | 'custom';

/** Metric data type */
export type MetricType = 'count' | 'average' | 'percentile' | 'rate';

/** Comparison operators for success criteria */
export type ComparisonOperator = 'lt' | 'lte' | 'eq' | 'gte' | 'gt' | 'between';

/** Definition of a metric to collect */
export interface MetricDefinition {
	/** Unique metric identifier */
	name: string;
	/** How to compute the metric */
	type: MetricType;
	/** Where to collect data from */
	source: MetricSource;
	/** How to aggregate across time/runs */
	aggregation: MetricAggregation;
	/** Optional: percentile value (e.g., 95 for p95) */
	percentile?: number;
	/** Optional: custom collector function */
	collector?: MetricCollector;
}

/** Success criteria for hypothesis testing */
export interface Criteria {
	/** Metric to evaluate */
	metricName: string;
	/** Comparison operator */
	operator: ComparisonOperator;
	/** Threshold value(s) */
	value: number | [number, number]; // single value or [min, max] for 'between'
	/** Human-readable description */
	description?: string;
}

/** Simulation experiment definition */
export interface SimulationExperiment {
	/** Unique experiment identifier */
	id: string;
	/** Hypothesis being tested (e.g., "System maintains throughput under 2x load") */
	hypothesis: string;
	/** Infrastructure scenario key from INFRASTRUCTURE_SCENARIOS */
	scenario: string;
	/** Partial config overrides for the simulation */
	config: Partial<SimulationConfig>;
	/** Metrics to collect during the experiment */
	metrics: MetricDefinition[];
	/** Criteria for determining if hypothesis is supported */
	successCriteria: Criteria[];
	/** Number of replications for statistical significance */
	runs: number;
	/** Optional: seed for deterministic reproduction (auto-generated if not provided) */
	seed?: number;
	/** Duration of each run in frames (default: 600 = 10 seconds at 60fps) */
	durationFrames?: number;
	/** Warmup frames before collecting metrics (default: 60 = 1 second) */
	warmupFrames?: number;
}

// ============================================================================
// Result Types
// ============================================================================

/** Single metric measurement */
export interface MetricMeasurement {
	name: string;
	value: number;
	unit?: string;
	timestamp?: number;
}

/** Time series data for per-frame metrics */
export interface MetricTimeSeries {
	name: string;
	values: number[];
	timestamps: number[];
	min: number;
	max: number;
	mean: number;
	stdDev: number;
}

/** Results from a single run */
export interface RunResult {
	runIndex: number;
	seed: number;
	durationMs: number;
	frameCount: number;
	metrics: Map<string, MetricTimeSeries>;
	/** Raw frame times for performance analysis */
	frameTimes: number[];
	/** Final metric values (aggregated per-run) */
	finalMetrics: MetricMeasurement[];
}

/** Statistical summary across runs */
export interface StatisticalSummary {
	/** Sample size */
	n: number;
	/** Mean value */
	mean: number;
	/** Standard deviation */
	stdDev: number;
	/** Standard error of the mean */
	sem: number;
	/** Minimum value */
	min: number;
	/** Maximum value */
	max: number;
	/** Median (p50) */
	median: number;
	/** 95th percentile */
	p95: number;
	/** 99th percentile */
	p99: number;
	/** 95% confidence interval */
	ci95: [number, number];
}

/** Criteria evaluation result */
export interface CriteriaResult {
	criteria: Criteria;
	passed: boolean;
	actualValue: number;
	summary: StatisticalSummary;
}

/** Complete experiment result */
export interface ExperimentResult {
	experimentId: string;
	hypothesis: string;
	/** Whether all success criteria were met */
	passed: boolean;
	/** Timestamp when experiment started */
	startTime: number;
	/** Timestamp when experiment completed */
	endTime: number;
	/** Total duration in milliseconds */
	totalDurationMs: number;
	/** Results from each run */
	runs: RunResult[];
	/** Statistical summaries per metric (across runs) */
	summaries: Map<string, StatisticalSummary>;
	/** Evaluation of each success criterion */
	criteriaResults: CriteriaResult[];
	/** Scenario used */
	scenario: InfrastructureScenario;
	/** Configuration used */
	config: SimulationConfig;
}

// ============================================================================
// Metric Collectors
// ============================================================================

/** Agent state snapshot for metric collection */
export interface AgentSnapshot {
	index: number;
	x: number;
	y: number;
	vx: number;
	vy: number;
	targetX: number;
	targetY: number;
	state: number; // 0=calm, 1=crowded, 2=panicked
	group: number;
}

/** Metric collector context */
export interface MetricContext {
	frameIndex: number;
	deltaTime: number;
	totalTime: number;
	agents: AgentSnapshot[];
	previousAgents?: AgentSnapshot[];
	config: SimulationConfig;
}

/** Custom metric collector function */
export type MetricCollector = (context: MetricContext) => number;

// ============================================================================
// Built-in Metric Collectors
// ============================================================================

/**
 * Count agents that have reached their targets (within threshold distance)
 */
export function collectAgentsAtTarget(context: MetricContext, threshold = 20): number {
	let count = 0;
	for (const agent of context.agents) {
		const dx = agent.x - agent.targetX;
		const dy = agent.y - agent.targetY;
		const distance = Math.sqrt(dx * dx + dy * dy);
		if (distance < threshold) {
			count++;
		}
	}
	return count;
}

/**
 * Calculate agent throughput (agents reaching targets per second)
 */
export function collectThroughput(context: MetricContext): number {
	if (!context.previousAgents || context.deltaTime === 0) return 0;

	let arrivals = 0;
	const threshold = 20;

	for (let i = 0; i < context.agents.length; i++) {
		const current = context.agents[i];
		const previous = context.previousAgents[i];
		if (!previous) continue;

		const prevDist = Math.sqrt(
			(previous.x - previous.targetX) ** 2 + (previous.y - previous.targetY) ** 2
		);
		const currDist = Math.sqrt(
			(current.x - current.targetX) ** 2 + (current.y - current.targetY) ** 2
		);

		// Count as arrival if crossed threshold this frame
		if (prevDist >= threshold && currDist < threshold) {
			arrivals++;
		}
	}

	// Convert to per-second rate
	return arrivals / context.deltaTime;
}

/**
 * Calculate panic propagation rate (panicked agents per frame)
 */
export function collectPanicPropagation(context: MetricContext): number {
	if (!context.previousAgents) return 0;

	let newPanicked = 0;
	const PANICKED_STATE = 2;

	for (let i = 0; i < context.agents.length; i++) {
		const current = context.agents[i];
		const previous = context.previousAgents[i];
		if (!previous) continue;

		if (current.state === PANICKED_STATE && previous.state !== PANICKED_STATE) {
			newPanicked++;
		}
	}

	return newPanicked;
}

/**
 * Count total panicked agents
 */
export function collectPanickedCount(context: MetricContext): number {
	const PANICKED_STATE = 2;
	return context.agents.filter((a) => a.state === PANICKED_STATE).length;
}

/**
 * Count crowded agents
 */
export function collectCrowdedCount(context: MetricContext): number {
	const CROWDED_STATE = 1;
	return context.agents.filter((a) => a.state === CROWDED_STATE).length;
}

/**
 * Detect bottlenecks (high agent density areas)
 * Returns number of bottleneck zones detected
 */
export function collectBottleneckCount(context: MetricContext): number {
	const CELL_SIZE = 30;
	const BOTTLENECK_THRESHOLD = 50; // agents per cell to be considered a bottleneck

	// Grid-based density calculation
	const grid = new Map<string, number>();

	for (const agent of context.agents) {
		const cellX = Math.floor(agent.x / CELL_SIZE);
		const cellY = Math.floor(agent.y / CELL_SIZE);
		const key = `${cellX},${cellY}`;
		grid.set(key, (grid.get(key) || 0) + 1);
	}

	// Count cells exceeding threshold
	let bottlenecks = 0;
	for (const count of grid.values()) {
		if (count >= BOTTLENECK_THRESHOLD) {
			bottlenecks++;
		}
	}

	return bottlenecks;
}

/**
 * Calculate maximum local density (agents in densest cell)
 */
export function collectMaxDensity(context: MetricContext): number {
	const CELL_SIZE = 25;
	const grid = new Map<string, number>();

	for (const agent of context.agents) {
		const cellX = Math.floor(agent.x / CELL_SIZE);
		const cellY = Math.floor(agent.y / CELL_SIZE);
		const key = `${cellX},${cellY}`;
		grid.set(key, (grid.get(key) || 0) + 1);
	}

	return Math.max(0, ...grid.values());
}

/**
 * Calculate average agent speed
 */
export function collectAverageSpeed(context: MetricContext): number {
	if (context.agents.length === 0) return 0;

	let totalSpeed = 0;
	for (const agent of context.agents) {
		totalSpeed += Math.sqrt(agent.vx * agent.vx + agent.vy * agent.vy);
	}

	return totalSpeed / context.agents.length;
}

/**
 * Gate utilization - percentage of agents near gates
 */
export function collectGateUtilization(context: MetricContext): number {
	const GATE_ZONES = [
		{ x: 400, y: 30, radius: 50 }, // North gate
		{ x: 400, y: 570, radius: 50 }, // South gate
		{ x: 770, y: 300, radius: 50 }, // East gate
		{ x: 30, y: 300, radius: 50 } // West gate
	];

	let nearGate = 0;
	for (const agent of context.agents) {
		for (const gate of GATE_ZONES) {
			const dist = Math.sqrt((agent.x - gate.x) ** 2 + (agent.y - gate.y) ** 2);
			if (dist < gate.radius) {
				nearGate++;
				break;
			}
		}
	}

	return context.agents.length > 0 ? (nearGate / context.agents.length) * 100 : 0;
}

// ============================================================================
// Built-in Metric Definitions
// ============================================================================

/** Standard metrics for crowd simulation */
export const STANDARD_METRICS: Record<string, MetricDefinition> = {
	throughput: {
		name: 'throughput',
		type: 'rate',
		source: 'agents',
		aggregation: 'per-frame',
		collector: collectThroughput
	},
	panicPropagation: {
		name: 'panicPropagation',
		type: 'rate',
		source: 'agents',
		aggregation: 'per-frame',
		collector: collectPanicPropagation
	},
	panickedCount: {
		name: 'panickedCount',
		type: 'count',
		source: 'agents',
		aggregation: 'per-frame',
		collector: collectPanickedCount
	},
	crowdedCount: {
		name: 'crowdedCount',
		type: 'count',
		source: 'agents',
		aggregation: 'per-frame',
		collector: collectCrowdedCount
	},
	bottleneckCount: {
		name: 'bottleneckCount',
		type: 'count',
		source: 'agents',
		aggregation: 'per-frame',
		collector: collectBottleneckCount
	},
	maxDensity: {
		name: 'maxDensity',
		type: 'count',
		source: 'agents',
		aggregation: 'per-frame',
		collector: collectMaxDensity
	},
	averageSpeed: {
		name: 'averageSpeed',
		type: 'average',
		source: 'agents',
		aggregation: 'per-frame',
		collector: collectAverageSpeed
	},
	gateUtilization: {
		name: 'gateUtilization',
		type: 'average',
		source: 'agents',
		aggregation: 'per-frame',
		collector: collectGateUtilization
	},
	agentsAtTarget: {
		name: 'agentsAtTarget',
		type: 'count',
		source: 'agents',
		aggregation: 'per-frame',
		collector: collectAgentsAtTarget
	},
	frameTime: {
		name: 'frameTime',
		type: 'average',
		source: 'performance',
		aggregation: 'per-frame'
	}
};

// ============================================================================
// Statistical Functions
// ============================================================================

/**
 * Calculate standard deviation
 */
function stdDev(values: number[]): number {
	if (values.length === 0) return 0;
	const mean = values.reduce((a, b) => a + b, 0) / values.length;
	const squaredDiffs = values.map((v) => (v - mean) ** 2);
	return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Calculate percentile
 */
function percentile(values: number[], p: number): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const index = Math.ceil((p / 100) * sorted.length) - 1;
	return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

/**
 * Calculate statistical summary
 */
export function calculateSummary(values: number[]): StatisticalSummary {
	if (values.length === 0) {
		return {
			n: 0,
			mean: 0,
			stdDev: 0,
			sem: 0,
			min: 0,
			max: 0,
			median: 0,
			p95: 0,
			p99: 0,
			ci95: [0, 0]
		};
	}

	const n = values.length;
	const mean = values.reduce((a, b) => a + b, 0) / n;
	const sd = stdDev(values);
	const sem = sd / Math.sqrt(n);
	const sorted = [...values].sort((a, b) => a - b);

	// 95% CI using t-distribution approximation (1.96 for large n)
	const tValue = n >= 30 ? 1.96 : 2.0; // Simplified
	const ci95: [number, number] = [mean - tValue * sem, mean + tValue * sem];

	return {
		n,
		mean,
		stdDev: sd,
		sem,
		min: Math.min(...values),
		max: Math.max(...values),
		median: percentile(values, 50),
		p95: percentile(values, 95),
		p99: percentile(values, 99),
		ci95
	};
}

// ============================================================================
// Experiment Execution
// ============================================================================

/**
 * Create a metric time series collector
 */
function createTimeSeriesCollector(): MetricTimeSeries {
	return {
		name: '',
		values: [],
		timestamps: [],
		min: Infinity,
		max: -Infinity,
		mean: 0,
		stdDev: 0
	};
}

/**
 * Finalize time series statistics
 */
function finalizeTimeSeries(series: MetricTimeSeries): void {
	if (series.values.length === 0) {
		series.min = 0;
		series.max = 0;
		series.mean = 0;
		series.stdDev = 0;
		return;
	}

	series.min = Math.min(...series.values);
	series.max = Math.max(...series.values);
	series.mean = series.values.reduce((a, b) => a + b, 0) / series.values.length;
	series.stdDev = stdDev(series.values);
}

/**
 * Evaluate a single criterion
 */
function evaluateCriterion(
	criteria: Criteria,
	summary: StatisticalSummary
): CriteriaResult {
	const actualValue = summary.mean;
	let passed = false;

	switch (criteria.operator) {
		case 'lt':
			passed = actualValue < (criteria.value as number);
			break;
		case 'lte':
			passed = actualValue <= (criteria.value as number);
			break;
		case 'eq':
			passed = Math.abs(actualValue - (criteria.value as number)) < 0.001;
			break;
		case 'gte':
			passed = actualValue >= (criteria.value as number);
			break;
		case 'gt':
			passed = actualValue > (criteria.value as number);
			break;
		case 'between': {
			const [min, max] = criteria.value as [number, number];
			passed = actualValue >= min && actualValue <= max;
			break;
		}
	}

	return {
		criteria,
		passed,
		actualValue,
		summary
	};
}

/**
 * Generate deterministic seed from experiment id and run index
 */
function generateSeed(experimentId: string, runIndex: number, baseSeed?: number): number {
	if (baseSeed !== undefined && baseSeed !== 0) {
		return baseSeed + runIndex;
	}

	// Hash the experiment id for reproducible but varied seeds
	let hash = 0;
	for (let i = 0; i < experimentId.length; i++) {
		const char = experimentId.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash) + runIndex;
}

/**
 * Simulation runner interface (for dependency injection in tests)
 */
export interface SimulationRunner {
	initialize(config: SimulationConfig, seed: number): Promise<void>;
	step(deltaTime: number): void;
	getAgentSnapshots(): AgentSnapshot[];
	getFrameTime(): number;
	destroy(): void;
}

/**
 * Run a single experiment run
 */
async function executeRun(
	runner: SimulationRunner,
	config: SimulationConfig,
	metrics: MetricDefinition[],
	durationFrames: number,
	warmupFrames: number,
	seed: number,
	runIndex: number
): Promise<RunResult> {
	const deltaTime = 1 / 60; // 60fps
	const startTime = performance.now();

	// Initialize the simulation
	await runner.initialize(config, seed);

	// Initialize metric collectors
	const metricSeries = new Map<string, MetricTimeSeries>();
	for (const metric of metrics) {
		const series = createTimeSeriesCollector();
		series.name = metric.name;
		metricSeries.set(metric.name, series);
	}

	// Frame time collector
	const frameTimes: number[] = [];

	// Run warmup
	for (let frame = 0; frame < warmupFrames; frame++) {
		runner.step(deltaTime);
	}

	// Collect initial agent state
	let previousAgents: AgentSnapshot[] | undefined;

	// Run experiment
	for (let frame = 0; frame < durationFrames; frame++) {
		const frameStart = performance.now();

		runner.step(deltaTime);

		const frameEnd = performance.now();
		const frameTimeMs = frameEnd - frameStart;
		frameTimes.push(frameTimeMs);

		// Collect metrics
		const currentAgents = runner.getAgentSnapshots();
		const context: MetricContext = {
			frameIndex: frame,
			deltaTime,
			totalTime: frame * deltaTime,
			agents: currentAgents,
			previousAgents,
			config
		};

		for (const metric of metrics) {
			const series = metricSeries.get(metric.name)!;
			let value: number;

			if (metric.source === 'performance') {
				value = frameTimeMs;
			} else if (metric.collector) {
				value = metric.collector(context);
			} else {
				// Default collectors based on metric name
				const defaultCollector = STANDARD_METRICS[metric.name]?.collector;
				value = defaultCollector ? defaultCollector(context) : 0;
			}

			series.values.push(value);
			series.timestamps.push(context.totalTime);
		}

		previousAgents = currentAgents;
	}

	// Finalize statistics
	for (const series of metricSeries.values()) {
		finalizeTimeSeries(series);
	}

	// Compute final metrics (aggregated per-run)
	const finalMetrics: MetricMeasurement[] = [];
	for (const metric of metrics) {
		const series = metricSeries.get(metric.name)!;
		let value: number;

		switch (metric.aggregation) {
			case 'per-frame':
				value = series.mean; // Average across frames
				break;
			case 'per-run':
				value = series.values[series.values.length - 1] ?? 0; // Last value
				break;
			default:
				value = series.mean;
		}

		finalMetrics.push({
			name: metric.name,
			value,
			timestamp: performance.now()
		});
	}

	runner.destroy();

	return {
		runIndex,
		seed,
		durationMs: performance.now() - startTime,
		frameCount: durationFrames,
		metrics: metricSeries,
		frameTimes,
		finalMetrics
	};
}

/**
 * Run an experiment with multiple replications
 */
export async function runExperiment(
	experiment: SimulationExperiment,
	runner: SimulationRunner
): Promise<ExperimentResult> {
	const startTime = performance.now();

	// Get scenario
	const scenarioFactory = INFRASTRUCTURE_SCENARIOS[experiment.scenario];
	const scenario = scenarioFactory ? scenarioFactory() : INFRASTRUCTURE_SCENARIOS.healthy();

	// Build full config
	const defaultConfig: SimulationConfig = {
		agentCount: 8000,
		canvasWidth: 1200,
		canvasHeight: 900,
		arenaWidth: 1200,
		arenaHeight: 900,
		goalStrength: 2.0,
		separationStrength: 8.0,
		wallStrength: 15.0,
		maxSpeed: 3.0,
		panicSpreadRadius: 30.0,
		seed: 0
	};

	const config: SimulationConfig = { ...defaultConfig, ...experiment.config };
	const durationFrames = experiment.durationFrames ?? 600;
	const warmupFrames = experiment.warmupFrames ?? 60;

	// Run all replications
	const runs: RunResult[] = [];
	for (let i = 0; i < experiment.runs; i++) {
		const seed = generateSeed(experiment.id, i, experiment.seed);
		const runConfig = { ...config, seed };

		const result = await executeRun(
			runner,
			runConfig,
			experiment.metrics,
			durationFrames,
			warmupFrames,
			seed,
			i
		);
		runs.push(result);
	}

	// Calculate cross-run summaries
	const summaries = new Map<string, StatisticalSummary>();
	for (const metric of experiment.metrics) {
		const values = runs.map((r) => {
			const m = r.finalMetrics.find((fm) => fm.name === metric.name);
			return m?.value ?? 0;
		});
		summaries.set(metric.name, calculateSummary(values));
	}

	// Evaluate success criteria
	const criteriaResults: CriteriaResult[] = [];
	for (const criteria of experiment.successCriteria) {
		const summary = summaries.get(criteria.metricName);
		if (summary) {
			criteriaResults.push(evaluateCriterion(criteria, summary));
		}
	}

	const passed = criteriaResults.every((cr) => cr.passed);
	const endTime = performance.now();

	return {
		experimentId: experiment.id,
		hypothesis: experiment.hypothesis,
		passed,
		startTime,
		endTime,
		totalDurationMs: endTime - startTime,
		runs,
		summaries,
		criteriaResults,
		scenario,
		config
	};
}

// ============================================================================
// Experiment Definition Helpers
// ============================================================================

/**
 * Define a new experiment with validation
 */
export function defineExperiment(
	partial: Omit<SimulationExperiment, 'id'> & { id?: string }
): SimulationExperiment {
	// Generate ID if not provided
	const id = partial.id ?? `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	// Validate scenario exists
	if (!INFRASTRUCTURE_SCENARIOS[partial.scenario]) {
		console.warn(
			`Unknown scenario "${partial.scenario}", falling back to "healthy"`
		);
	}

	// Validate metrics
	for (const metric of partial.metrics) {
		if (metric.type === 'percentile' && metric.percentile === undefined) {
			console.warn(
				`Metric "${metric.name}" is percentile type but no percentile value specified`
			);
		}
	}

	// Validate criteria reference valid metrics
	const metricNames = new Set(partial.metrics.map((m) => m.name));
	for (const criteria of partial.successCriteria) {
		if (!metricNames.has(criteria.metricName)) {
			console.warn(
				`Criteria references unknown metric "${criteria.metricName}"`
			);
		}
	}

	return {
		id,
		hypothesis: partial.hypothesis,
		scenario: partial.scenario,
		config: partial.config,
		metrics: partial.metrics,
		successCriteria: partial.successCriteria,
		runs: partial.runs,
		seed: partial.seed,
		durationFrames: partial.durationFrames,
		warmupFrames: partial.warmupFrames
	};
}

// ============================================================================
// Result Comparison
// ============================================================================

/** Comparison result between two experiments */
export interface ComparisonResult {
	baseline: ExperimentResult;
	comparison: ExperimentResult;
	metricDiffs: Map<
		string,
		{
			baselineMean: number;
			comparisonMean: number;
			absoluteDiff: number;
			percentDiff: number;
			significantlyDifferent: boolean; // Based on CI overlap
		}
	>;
	/** Overall assessment */
	assessment: 'improved' | 'degraded' | 'equivalent' | 'mixed';
}

/**
 * Compare results from two experiments
 */
export function compareResults(
	baseline: ExperimentResult,
	comparison: ExperimentResult
): ComparisonResult {
	const metricDiffs = new Map<
		string,
		{
			baselineMean: number;
			comparisonMean: number;
			absoluteDiff: number;
			percentDiff: number;
			significantlyDifferent: boolean;
		}
	>();

	// Find common metrics
	const baselineMetrics = new Set(baseline.summaries.keys());
	const comparisonMetrics = new Set(comparison.summaries.keys());

	let improved = 0;
	let degraded = 0;

	for (const metricName of baselineMetrics) {
		if (!comparisonMetrics.has(metricName)) continue;

		const baseSummary = baseline.summaries.get(metricName)!;
		const compSummary = comparison.summaries.get(metricName)!;

		const absoluteDiff = compSummary.mean - baseSummary.mean;
		const percentDiff =
			baseSummary.mean !== 0 ? (absoluteDiff / baseSummary.mean) * 100 : 0;

		// Check CI overlap for significance
		const baseCI = baseSummary.ci95;
		const compCI = compSummary.ci95;
		const significantlyDifferent = compCI[0] > baseCI[1] || compCI[1] < baseCI[0];

		metricDiffs.set(metricName, {
			baselineMean: baseSummary.mean,
			comparisonMean: compSummary.mean,
			absoluteDiff,
			percentDiff,
			significantlyDifferent
		});

		if (significantlyDifferent) {
			// For throughput/speed metrics, higher is better
			// For latency/error metrics, lower is better
			// This is a simplified heuristic
			if (
				metricName.includes('throughput') ||
				metricName.includes('speed') ||
				metricName.includes('atTarget')
			) {
				if (absoluteDiff > 0) improved++;
				else degraded++;
			} else if (
				metricName.includes('panic') ||
				metricName.includes('bottleneck') ||
				metricName.includes('frameTime')
			) {
				if (absoluteDiff < 0) improved++;
				else degraded++;
			}
		}
	}

	let assessment: ComparisonResult['assessment'];
	if (improved > 0 && degraded === 0) {
		assessment = 'improved';
	} else if (degraded > 0 && improved === 0) {
		assessment = 'degraded';
	} else if (improved > 0 && degraded > 0) {
		assessment = 'mixed';
	} else {
		assessment = 'equivalent';
	}

	return {
		baseline,
		comparison,
		metricDiffs,
		assessment
	};
}

// ============================================================================
// Predefined Experiments
// ============================================================================

/**
 * Create a throughput stability experiment
 */
export function createThroughputExperiment(
	agentCount: number,
	runs = 5
): SimulationExperiment {
	return defineExperiment({
		id: `throughput-stability-${agentCount}`,
		hypothesis: `System maintains stable throughput with ${agentCount} agents`,
		scenario: 'healthy',
		config: { agentCount },
		metrics: [
			STANDARD_METRICS.throughput,
			STANDARD_METRICS.averageSpeed,
			STANDARD_METRICS.frameTime
		],
		successCriteria: [
			{
				metricName: 'throughput',
				operator: 'gte',
				value: 10, // At least 10 agents/sec reaching targets
				description: 'Minimum throughput threshold'
			},
			{
				metricName: 'frameTime',
				operator: 'lt',
				value: 16.67, // Maintain 60fps
				description: 'Frame time under 16.67ms'
			}
		],
		runs,
		durationFrames: 600,
		warmupFrames: 60
	});
}

/**
 * Create a panic cascade experiment
 */
export function createPanicCascadeExperiment(runs = 5): SimulationExperiment {
	return defineExperiment({
		id: 'panic-cascade-containment',
		hypothesis: 'Panic does not spread to more than 30% of agents',
		scenario: 'meltdown',
		config: { agentCount: 5000 },
		metrics: [
			STANDARD_METRICS.panickedCount,
			STANDARD_METRICS.panicPropagation,
			STANDARD_METRICS.bottleneckCount
		],
		successCriteria: [
			{
				metricName: 'panickedCount',
				operator: 'lt',
				value: 1500, // Less than 30% of 5000
				description: 'Panic contained to under 30%'
			}
		],
		runs,
		durationFrames: 1200, // 20 seconds to observe cascade
		warmupFrames: 60
	});
}

/**
 * Create a bottleneck detection experiment
 */
export function createBottleneckExperiment(runs = 5): SimulationExperiment {
	return defineExperiment({
		id: 'bottleneck-detection',
		hypothesis: 'Gate bottlenecks resolve within 10 seconds',
		scenario: 'lb-failure', // Load balancer failure creates bottleneck
		config: { agentCount: 8000 },
		metrics: [
			STANDARD_METRICS.bottleneckCount,
			STANDARD_METRICS.maxDensity,
			STANDARD_METRICS.gateUtilization
		],
		successCriteria: [
			{
				metricName: 'bottleneckCount',
				operator: 'lte',
				value: 3, // At most 3 bottleneck zones
				description: 'Limited number of severe bottlenecks'
			}
		],
		runs,
		durationFrames: 600,
		warmupFrames: 120 // Longer warmup to establish bottleneck
	});
}

/**
 * Create a scalability experiment
 */
export function createScalabilityExperiment(
	baseAgents: number,
	multiplier: number,
	runs = 3
): SimulationExperiment {
	const scaledAgents = baseAgents * multiplier;
	return defineExperiment({
		id: `scalability-${multiplier}x`,
		hypothesis: `System maintains performance at ${multiplier}x load (${scaledAgents} agents)`,
		scenario: 'healthy',
		config: { agentCount: scaledAgents },
		metrics: [
			STANDARD_METRICS.frameTime,
			STANDARD_METRICS.throughput,
			STANDARD_METRICS.averageSpeed
		],
		successCriteria: [
			{
				metricName: 'frameTime',
				operator: 'lt',
				value: 33.33, // Maintain at least 30fps
				description: 'Frame time under 33.33ms (30fps)'
			}
		],
		runs,
		durationFrames: 300, // 5 seconds
		warmupFrames: 60
	});
}

// ============================================================================
// Result Formatting
// ============================================================================

/**
 * Format experiment result as a human-readable report
 */
export function formatExperimentReport(result: ExperimentResult): string {
	const lines: string[] = [];

	lines.push('═'.repeat(60));
	lines.push(`EXPERIMENT REPORT: ${result.experimentId}`);
	lines.push('═'.repeat(60));
	lines.push('');
	lines.push(`Hypothesis: ${result.hypothesis}`);
	lines.push(`Result: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
	lines.push(`Duration: ${(result.totalDurationMs / 1000).toFixed(2)}s`);
	lines.push(`Runs: ${result.runs.length}`);
	lines.push('');

	lines.push('─'.repeat(40));
	lines.push('CRITERIA RESULTS');
	lines.push('─'.repeat(40));
	for (const cr of result.criteriaResults) {
		const icon = cr.passed ? '✓' : '✗';
		const op = cr.criteria.operator;
		const thresh = Array.isArray(cr.criteria.value)
			? `[${cr.criteria.value[0]}, ${cr.criteria.value[1]}]`
			: cr.criteria.value;
		lines.push(
			`${icon} ${cr.criteria.metricName}: ${cr.actualValue.toFixed(2)} ${op} ${thresh}`
		);
		if (cr.criteria.description) {
			lines.push(`    ${cr.criteria.description}`);
		}
	}
	lines.push('');

	lines.push('─'.repeat(40));
	lines.push('METRIC SUMMARIES');
	lines.push('─'.repeat(40));
	for (const [name, summary] of result.summaries) {
		lines.push(`${name}:`);
		lines.push(`  Mean: ${summary.mean.toFixed(4)} ± ${summary.stdDev.toFixed(4)}`);
		lines.push(`  Range: [${summary.min.toFixed(4)}, ${summary.max.toFixed(4)}]`);
		lines.push(`  95% CI: [${summary.ci95[0].toFixed(4)}, ${summary.ci95[1].toFixed(4)}]`);
		lines.push(`  p95: ${summary.p95.toFixed(4)}, p99: ${summary.p99.toFixed(4)}`);
	}
	lines.push('');
	lines.push('═'.repeat(60));

	return lines.join('\n');
}

/**
 * Format comparison result as a human-readable report
 */
export function formatComparisonReport(result: ComparisonResult): string {
	const lines: string[] = [];

	lines.push('═'.repeat(60));
	lines.push('COMPARISON REPORT');
	lines.push('═'.repeat(60));
	lines.push('');
	lines.push(`Baseline: ${result.baseline.experimentId}`);
	lines.push(`Comparison: ${result.comparison.experimentId}`);
	lines.push(`Assessment: ${result.assessment.toUpperCase()}`);
	lines.push('');

	lines.push('─'.repeat(40));
	lines.push('METRIC DIFFERENCES');
	lines.push('─'.repeat(40));
	for (const [name, diff] of result.metricDiffs) {
		const sig = diff.significantlyDifferent ? '*' : '';
		const sign = diff.absoluteDiff >= 0 ? '+' : '';
		lines.push(`${name}${sig}:`);
		lines.push(
			`  Baseline: ${diff.baselineMean.toFixed(4)} → Comparison: ${diff.comparisonMean.toFixed(4)}`
		);
		lines.push(`  Change: ${sign}${diff.absoluteDiff.toFixed(4)} (${sign}${diff.percentDiff.toFixed(1)}%)`);
	}
	lines.push('');
	lines.push('* = statistically significant difference');
	lines.push('═'.repeat(60));

	return lines.join('\n');
}
