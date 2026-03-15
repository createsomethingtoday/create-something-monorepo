/**
 * Simulation Telemetry Module
 *
 * OpenTelemetry-compatible metrics and tracing for the Living Arena GPU simulation.
 * Designed to integrate with @create-something/harness for agent coordination metrics.
 *
 * Philosophy: Observability enables experimentation. Each metric tells a story
 * about system behavior that informs the next hypothesis.
 *
 * @packageDocumentation
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Per-frame simulation metrics collected during the render loop.
 */
export interface FrameMetrics {
	/** Frame number since simulation start */
	frameNumber: number;
	/** Time to complete the frame in milliseconds */
	frameTimeMs: number;
	/** Time spent in compute shader (agent updates) */
	computeTimeMs: number;
	/** Time spent in render pass */
	renderTimeMs: number;
	/** Number of active agents in this frame */
	activeAgents: number;
	/** Number of agents in panicked state */
	panickedAgents: number;
	/** Number of agents in crowded state */
	crowdedAgents: number;
	/** Average agent density (agents per grid cell) */
	avgDensity: number;
	/** Maximum density hotspot value */
	maxDensity: number;
	/** Current scenario index */
	scenario: number;
	/** Current event phase */
	eventPhase: string;
}

/**
 * Aggregated simulation metrics over a time window.
 */
export interface AggregatedMetrics {
	/** Time window start (ISO 8601) */
	windowStart: string;
	/** Time window end (ISO 8601) */
	windowEnd: string;
	/** Window duration in milliseconds */
	windowDurationMs: number;
	/** Total frames in this window */
	frameCount: number;
	/** Average frame time */
	avgFrameTimeMs: number;
	/** P95 frame time */
	p95FrameTimeMs: number;
	/** P99 frame time */
	p99FrameTimeMs: number;
	/** Minimum frame time */
	minFrameTimeMs: number;
	/** Maximum frame time */
	maxFrameTimeMs: number;
	/** Frame time standard deviation */
	stdDevFrameTimeMs: number;
	/** Frames per second achieved */
	fps: number;
	/** Total panic events detected */
	panicEvents: number;
	/** Agent count statistics */
	agents: {
		avg: number;
		min: number;
		max: number;
	};
	/** Density statistics */
	density: {
		avg: number;
		max: number;
	};
	/** Scenario changes in this window */
	scenarioChanges: number;
}

/**
 * Span representing a traced operation (OTel-compatible).
 */
export interface Span {
	/** Unique span ID */
	spanId: string;
	/** Parent span ID (for hierarchical tracing) */
	parentSpanId: string | null;
	/** Trace ID (groups related spans) */
	traceId: string;
	/** Operation name */
	name: string;
	/** Start time (ISO 8601) */
	startTime: string;
	/** End time (ISO 8601, null if in progress) */
	endTime: string | null;
	/** Duration in milliseconds (null if in progress) */
	durationMs: number | null;
	/** Span status */
	status: 'ok' | 'error' | 'unset';
	/** Status message (for errors) */
	statusMessage?: string;
	/** Span attributes */
	attributes: Record<string, string | number | boolean>;
	/** Span events */
	events: SpanEvent[];
}

/**
 * Event within a span timeline.
 */
export interface SpanEvent {
	/** Event name */
	name: string;
	/** Event timestamp (ISO 8601) */
	timestamp: string;
	/** Event attributes */
	attributes?: Record<string, string | number | boolean>;
}

/**
 * Experiment metadata for correlation with harness runs.
 */
export interface ExperimentContext {
	/** Unique experiment ID */
	experimentId: string;
	/** Experiment name/description */
	name: string;
	/** Hypothesis being tested */
	hypothesis?: string;
	/** Simulation configuration snapshot */
	config: Record<string, unknown>;
	/** Start time (ISO 8601) */
	startTime: string;
	/** Associated harness session ID (if any) */
	harnessSessionId?: string;
	/** Associated Beads issue ID (if any) */
	beadsIssueId?: string;
	/** Labels for filtering/grouping */
	labels: string[];
}

/**
 * Configuration for telemetry collection.
 */
export interface TelemetryConfig {
	/** Whether telemetry is enabled */
	enabled: boolean;
	/** Aggregation window size in milliseconds */
	aggregationWindowMs: number;
	/** Maximum frames to buffer before flushing */
	maxBufferSize: number;
	/** Whether to emit to console (debug mode) */
	debugConsole: boolean;
	/** Callback for metric emission */
	onMetrics?: (metrics: AggregatedMetrics) => void;
	/** Callback for span emission */
	onSpan?: (span: Span) => void;
}

/**
 * Telemetry counter values (monotonically increasing).
 */
export interface TelemetryCounters {
	agentUpdates: number;
	panicEvents: number;
	scenarioChanges: number;
	framesRendered: number;
}

/**
 * Telemetry gauge values (current point-in-time measurements).
 */
export interface TelemetryGauges {
	activeAgents: number;
	systemHealth: number;
	fps: number;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: TelemetryConfig = {
	enabled: true,
	aggregationWindowMs: 1000, // 1 second windows
	maxBufferSize: 120, // ~2 seconds at 60fps
	debugConsole: false
};

// =============================================================================
// TELEMETRY COLLECTOR
// =============================================================================

/**
 * Simulation telemetry collector with OpenTelemetry-compatible API.
 *
 * Provides:
 * - Frame-level metrics collection
 * - Automatic aggregation over configurable windows
 * - Span-based tracing for experiments
 * - Integration hooks for harness consumption
 */
export class SimulationTelemetry {
	private config: TelemetryConfig;
	private frameBuffer: FrameMetrics[] = [];
	private windowStart: Date;
	private activeSpans: Map<string, Span> = new Map();
	private currentExperiment: ExperimentContext | null = null;
	private panicEventCount = 0;
	private scenarioChangeCount = 0;
	private lastScenario = -1;

	// Counters (OTel-style)
	private counters: TelemetryCounters = {
		agentUpdates: 0,
		panicEvents: 0,
		scenarioChanges: 0,
		framesRendered: 0
	};

	// Observable gauges (current values)
	private gauges: TelemetryGauges = {
		activeAgents: 0,
		systemHealth: 1.0, // 0-1 scale
		fps: 60
	};

	constructor(config: Partial<TelemetryConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.windowStart = new Date();
	}

	// ─────────────────────────────────────────────────────────────────────────
	// FRAME METRICS
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Record metrics for a single simulation frame.
	 */
	recordFrame(metrics: FrameMetrics): void {
		if (!this.config.enabled) return;

		this.frameBuffer.push(metrics);
		this.counters.framesRendered++;
		this.counters.agentUpdates += metrics.activeAgents;

		// Track panic events
		if (metrics.panickedAgents > 0 && this.gauges.activeAgents > 0) {
			const panicRate = metrics.panickedAgents / metrics.activeAgents;
			if (panicRate > 0.1) {
				// >10% panic threshold
				this.counters.panicEvents++;
				this.panicEventCount++;
			}
		}

		// Track scenario changes
		if (metrics.scenario !== this.lastScenario && this.lastScenario !== -1) {
			this.scenarioChangeCount++;
			this.counters.scenarioChanges++;
		}
		this.lastScenario = metrics.scenario;

		// Update gauges
		this.gauges.activeAgents = metrics.activeAgents;
		this.updateSystemHealth(metrics);

		// Check for window flush
		const now = new Date();
		const windowDuration = now.getTime() - this.windowStart.getTime();

		if (
			windowDuration >= this.config.aggregationWindowMs ||
			this.frameBuffer.length >= this.config.maxBufferSize
		) {
			this.flushWindow();
		}
	}

	/**
	 * Update system health gauge based on frame metrics.
	 * Health degrades with high frame times, panic rates, and density hotspots.
	 */
	private updateSystemHealth(metrics: FrameMetrics): void {
		let health = 1.0;

		// Penalize high frame times (target: 16.67ms for 60fps)
		if (metrics.frameTimeMs > 16.67) {
			health -= Math.min(0.3, (metrics.frameTimeMs - 16.67) / 50);
		}

		// Penalize high panic rates
		const panicRate = metrics.panickedAgents / Math.max(1, metrics.activeAgents);
		health -= panicRate * 0.3;

		// Penalize extreme density (overcrowding)
		if (metrics.maxDensity > 10) {
			health -= Math.min(0.2, (metrics.maxDensity - 10) / 50);
		}

		this.gauges.systemHealth = Math.max(0, Math.min(1, health));
	}

	/**
	 * Flush the current frame buffer and emit aggregated metrics.
	 */
	private flushWindow(): void {
		if (this.frameBuffer.length === 0) return;

		const now = new Date();
		const aggregated = this.aggregateFrames(this.frameBuffer, this.windowStart, now);

		// Update FPS gauge
		this.gauges.fps = aggregated.fps;

		// Emit metrics
		if (this.config.onMetrics) {
			this.config.onMetrics(aggregated);
		}

		if (this.config.debugConsole) {
			console.log('[Telemetry]', {
				fps: aggregated.fps.toFixed(1),
				avgFrame: aggregated.avgFrameTimeMs.toFixed(2) + 'ms',
				p95Frame: aggregated.p95FrameTimeMs.toFixed(2) + 'ms',
				agents: aggregated.agents.avg.toFixed(0),
				health: (this.gauges.systemHealth * 100).toFixed(0) + '%'
			});
		}

		// Reset for next window
		this.frameBuffer = [];
		this.panicEventCount = 0;
		this.scenarioChangeCount = 0;
		this.windowStart = now;
	}

	/**
	 * Aggregate frame metrics over a time window.
	 */
	private aggregateFrames(
		frames: FrameMetrics[],
		windowStart: Date,
		windowEnd: Date
	): AggregatedMetrics {
		const frameTimes = frames.map((f) => f.frameTimeMs).sort((a, b) => a - b);
		const windowDurationMs = windowEnd.getTime() - windowStart.getTime();

		// Statistical calculations
		const sum = frameTimes.reduce((a, b) => a + b, 0);
		const avg = sum / frameTimes.length;
		const variance =
			frameTimes.reduce((acc, t) => acc + Math.pow(t - avg, 2), 0) / frameTimes.length;
		const stdDev = Math.sqrt(variance);

		const p95Index = Math.floor(frameTimes.length * 0.95);
		const p99Index = Math.floor(frameTimes.length * 0.99);

		// Agent statistics
		const agentCounts = frames.map((f) => f.activeAgents);
		const avgAgents = agentCounts.reduce((a, b) => a + b, 0) / agentCounts.length;

		// Density statistics
		const densities = frames.map((f) => f.avgDensity);
		const maxDensities = frames.map((f) => f.maxDensity);

		return {
			windowStart: windowStart.toISOString(),
			windowEnd: windowEnd.toISOString(),
			windowDurationMs,
			frameCount: frames.length,
			avgFrameTimeMs: avg,
			p95FrameTimeMs: frameTimes[p95Index] ?? avg,
			p99FrameTimeMs: frameTimes[p99Index] ?? avg,
			minFrameTimeMs: frameTimes[0] ?? 0,
			maxFrameTimeMs: frameTimes[frameTimes.length - 1] ?? 0,
			stdDevFrameTimeMs: stdDev,
			fps: frames.length / (windowDurationMs / 1000),
			panicEvents: this.panicEventCount,
			agents: {
				avg: avgAgents,
				min: Math.min(...agentCounts),
				max: Math.max(...agentCounts)
			},
			density: {
				avg: densities.reduce((a, b) => a + b, 0) / densities.length,
				max: Math.max(...maxDensities)
			},
			scenarioChanges: this.scenarioChangeCount
		};
	}

	// ─────────────────────────────────────────────────────────────────────────
	// SCENARIO TRACKING
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Record a scenario change event.
	 */
	recordScenarioChange(scenario: string, previousScenario?: string): void {
		if (!this.config.enabled) return;

		const event: SpanEvent = {
			name: 'scenario_change',
			timestamp: new Date().toISOString(),
			attributes: {
				scenario,
				previousScenario: previousScenario ?? 'unknown'
			}
		};

		// Add to active experiment span if present
		if (this.currentExperiment) {
			const experimentSpan = this.activeSpans.get(this.currentExperiment.experimentId);
			if (experimentSpan) {
				experimentSpan.events.push(event);
			}
		}

		if (this.config.debugConsole) {
			console.log('[Telemetry] Scenario change:', scenario);
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// SPAN-BASED TRACING
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Start an experiment span for tracing a complete experiment run.
	 */
	startExperimentSpan(
		experimentId: string,
		options: Partial<ExperimentContext> = {}
	): Span {
		const traceId = generateId();
		const spanId = generateId();
		const now = new Date().toISOString();

		const experiment: ExperimentContext = {
			experimentId,
			name: options.name ?? `Experiment ${experimentId}`,
			hypothesis: options.hypothesis,
			config: options.config ?? {},
			startTime: now,
			harnessSessionId: options.harnessSessionId,
			beadsIssueId: options.beadsIssueId,
			labels: options.labels ?? []
		};

		const span: Span = {
			spanId,
			parentSpanId: null,
			traceId,
			name: `experiment.${experimentId}`,
			startTime: now,
			endTime: null,
			durationMs: null,
			status: 'unset',
			attributes: {
				'experiment.id': experimentId,
				'experiment.name': experiment.name,
				...(experiment.hypothesis && { 'experiment.hypothesis': experiment.hypothesis }),
				...(experiment.harnessSessionId && {
					'harness.session_id': experiment.harnessSessionId
				}),
				...(experiment.beadsIssueId && { 'beads.issue_id': experiment.beadsIssueId })
			},
			events: [
				{
					name: 'experiment_started',
					timestamp: now,
					attributes: { config: JSON.stringify(experiment.config) }
				}
			]
		};

		this.currentExperiment = experiment;
		this.activeSpans.set(experimentId, span);

		if (this.config.debugConsole) {
			console.log('[Telemetry] Started experiment span:', experimentId);
		}

		return span;
	}

	/**
	 * End an experiment span.
	 */
	endExperimentSpan(
		experimentId: string,
		status: 'ok' | 'error' = 'ok',
		statusMessage?: string
	): Span | null {
		const span = this.activeSpans.get(experimentId);
		if (!span) return null;

		const now = new Date();
		span.endTime = now.toISOString();
		span.durationMs = now.getTime() - new Date(span.startTime).getTime();
		span.status = status;
		if (statusMessage) span.statusMessage = statusMessage;

		span.events.push({
			name: 'experiment_ended',
			timestamp: span.endTime,
			attributes: {
				status,
				duration_ms: span.durationMs,
				total_frames: this.counters.framesRendered
			}
		});

		// Emit span
		if (this.config.onSpan) {
			this.config.onSpan(span);
		}

		this.activeSpans.delete(experimentId);
		if (this.currentExperiment?.experimentId === experimentId) {
			this.currentExperiment = null;
		}

		if (this.config.debugConsole) {
			console.log('[Telemetry] Ended experiment span:', experimentId, {
				duration: span.durationMs + 'ms',
				status
			});
		}

		return span;
	}

	/**
	 * Create a child span for a specific operation within an experiment.
	 */
	startChildSpan(parentExperimentId: string, name: string): Span | null {
		const parentSpan = this.activeSpans.get(parentExperimentId);
		if (!parentSpan) return null;

		const spanId = generateId();
		const now = new Date().toISOString();

		const span: Span = {
			spanId,
			parentSpanId: parentSpan.spanId,
			traceId: parentSpan.traceId,
			name,
			startTime: now,
			endTime: null,
			durationMs: null,
			status: 'unset',
			attributes: {},
			events: []
		};

		this.activeSpans.set(spanId, span);
		return span;
	}

	/**
	 * End a child span.
	 */
	endChildSpan(
		spanId: string,
		status: 'ok' | 'error' = 'ok',
		attributes?: Record<string, string | number | boolean>
	): Span | null {
		const span = this.activeSpans.get(spanId);
		if (!span || span.parentSpanId === null) return null;

		const now = new Date();
		span.endTime = now.toISOString();
		span.durationMs = now.getTime() - new Date(span.startTime).getTime();
		span.status = status;
		if (attributes) {
			Object.assign(span.attributes, attributes);
		}

		if (this.config.onSpan) {
			this.config.onSpan(span);
		}

		this.activeSpans.delete(spanId);
		return span;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// COUNTER & GAUGE ACCESS
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Get current counter values.
	 */
	getCounters(): TelemetryCounters {
		return { ...this.counters };
	}

	/**
	 * Get current gauge values.
	 */
	getGauges(): TelemetryGauges {
		return { ...this.gauges };
	}

	/**
	 * Get current experiment context if active.
	 */
	getCurrentExperiment(): ExperimentContext | null {
		return this.currentExperiment;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// HARNESS INTEGRATION
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Generate a summary suitable for harness checkpoint context.
	 * Compatible with harness AgentContext pattern.
	 */
	generateCheckpointSummary(): {
		counters: TelemetryCounters;
		gauges: TelemetryGauges;
		experiment: ExperimentContext | null;
		activeSpanCount: number;
		lastWindowMetrics: AggregatedMetrics | null;
	} {
		// Flush any pending metrics
		const lastMetrics =
			this.frameBuffer.length > 0
				? this.aggregateFrames(this.frameBuffer, this.windowStart, new Date())
				: null;

		return {
			counters: this.getCounters(),
			gauges: this.getGauges(),
			experiment: this.currentExperiment,
			activeSpanCount: this.activeSpans.size,
			lastWindowMetrics: lastMetrics
		};
	}

	/**
	 * Reset all counters and gauges.
	 */
	reset(): void {
		this.counters = {
			agentUpdates: 0,
			panicEvents: 0,
			scenarioChanges: 0,
			framesRendered: 0
		};
		this.gauges = {
			activeAgents: 0,
			systemHealth: 1.0,
			fps: 60
		};
		this.frameBuffer = [];
		this.panicEventCount = 0;
		this.scenarioChangeCount = 0;
		this.lastScenario = -1;
		this.windowStart = new Date();
		this.activeSpans.clear();
		this.currentExperiment = null;
	}

	/**
	 * Enable or disable telemetry collection.
	 */
	setEnabled(enabled: boolean): void {
		this.config.enabled = enabled;
	}

	/**
	 * Update telemetry configuration.
	 */
	updateConfig(config: Partial<TelemetryConfig>): void {
		Object.assign(this.config, config);
	}
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate a random ID for spans and traces.
 */
function generateId(): string {
	return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Default telemetry instance for the living arena simulation.
 * Use createTelemetry() for custom configurations.
 */
export const defaultTelemetry = new SimulationTelemetry();

/**
 * Create a new telemetry instance with custom configuration.
 */
export function createTelemetry(config?: Partial<TelemetryConfig>): SimulationTelemetry {
	return new SimulationTelemetry(config);
}
