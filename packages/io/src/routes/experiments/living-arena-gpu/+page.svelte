<script lang="ts">
	/**
	 * Living Arena GPU - WebGPU Crowd Simulation
	 *
	 * GPU-accelerated version of the Living Arena experiment featuring
	 * realistic crowd simulation with 8,000-50,000 agents showing
	 * emergent behaviors like bottleneck formation and panic spreading.
	 *
	 * Features:
	 * - Scalable agent count (8K-50K via spatial hashing)
	 * - Deterministic mode with shareable URLs
	 * - Real-time telemetry dashboard
	 */

	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { SEO } from '@create-something/components';
	import {
		Shield,
		Lightbulb,
		Thermometer,
		Radio,
		User,
		AlertTriangle,
		Cpu,
		Zap,
		ExternalLink,
		Share2,
		Activity,
		Gauge,
		Users
	} from 'lucide-svelte';

	// Import simulation engine
	import {
		CrowdSimulation,
		initWebGPU,
		isWebGPUSupported,
		type WebGPUContext
	} from './crowdSimulation';
	import type { SimulationTelemetry, AggregatedMetrics } from './telemetry';

	// Import shared data from original experiment
	import type { SecurityStatus, LightingMode, Incident } from '../living-arena/arenaTypes';
	import {
		intelligenceScenarios,
		scenarioEffects,
		createInitialHvacZones,
		createInitialNotifications,
		createInitialIncidentLog,
		scenarioMessages,
		incidentTypes
	} from '../living-arena/arenaData';

	// WebGPU state
	let webgpuSupported = $state(false);
	let webgpuContext = $state<WebGPUContext | null>(null);
	let simulation = $state<CrowdSimulation | null>(null);
	let canvasElement = $state<HTMLCanvasElement | null>(null);

	// Scale controls
	const MIN_AGENTS = 1000;
	const MAX_AGENTS = 50000;
	const HIGH_AGENT_WARNING = 20000;
	let agentCount = $state(8000);
	let pendingAgentCount = $state(8000);
	let showScaleWarning = $derived(pendingAgentCount > HIGH_AGENT_WARNING);

	// Deterministic mode / sharing
	let simulationSeed = $state(0); // 0 = non-deterministic
	let seedInput = $state('');
	let shareUrl = $state('');
	let showShareCopied = $state(false);

	// Telemetry state
	let telemetry = $state<SimulationTelemetry | null>(null);
	let telemetryMetrics = $state<AggregatedMetrics | null>(null);
	let systemHealth = $state(1.0);
	let panicRate = $state(0);
	let crowdingRate = $state(0);

	// Simulation stats
	let fps = $state(0);
	let lastFrameTime = 0;
	let frameCount = 0;

	// System states (matching original)
	let securityStatus = $state<SecurityStatus>('monitoring');
	let lightingMode = $state<LightingMode>('event');
	let hvacZones = $state(createInitialHvacZones());
	let currentEvent = $state({
		name: 'NBA Western Conference Finals',
		phase: 'Second Quarter',
		attendance: 18_847,
		capacity: 19_500
	});
	let notifications = $state(createInitialNotifications());

	let activeScenario = $state(0);
	let liveMode = $state(true);
	let scenarioCycleTimer = $state(0);
	let tick = $state(0);

	// Derived
	const currentScenario = $derived(intelligenceScenarios[activeScenario]);

	// Incident log
	let incidentLog = $state<Incident[]>(createInitialIncidentLog());

	// Intervals for cleanup
	let fpsInterval: ReturnType<typeof setInterval> | null = null;
	let uiInterval: ReturnType<typeof setInterval> | null = null;
	let initializationStarted = false;

	// Initialize WebGPU asynchronously
	async function initializeSimulation(canvas: HTMLCanvasElement, seed?: number) {
		if (initializationStarted) return;
		initializationStarted = true;

		console.log('[WebGPU] Starting initialization...');

		// Set canvas size
		const container = canvas.parentElement;
		if (container) {
			canvas.width = container.clientWidth;
			canvas.height = Math.min(container.clientWidth * 0.75, 700);
		}

		console.log('[WebGPU] Canvas size:', canvas.width, 'x', canvas.height);

		// Initialize WebGPU
		try {
			webgpuContext = await initWebGPU(canvas);

			if (!webgpuContext) {
				console.error('[WebGPU] Failed to get context');
				webgpuSupported = false;
				return;
			}

			console.log('[WebGPU] Context initialized');

			// Create and start simulation
			// Use 800x600 arena space to match original Living Arena
			simulation = new CrowdSimulation(webgpuContext, {
				agentCount,
				canvasWidth: canvas.width,
				canvasHeight: canvas.height,
				arenaWidth: 800,
				arenaHeight: 600,
				seed: seed ?? simulationSeed
			});

			await simulation.initialize();
			console.log('[WebGPU] Simulation initialized');

			// Enable telemetry for real-time metrics
			telemetry = simulation.enableTelemetry({
				debugConsole: false,
				aggregationWindowMs: 1000,
				onMetrics: (metrics) => {
					telemetryMetrics = metrics;
					// Update derived telemetry state
					const gauges = telemetry?.getGauges();
					if (gauges) {
						systemHealth = gauges.systemHealth;
					}
					if (metrics.agents.avg > 0) {
						// Estimate panic/crowding from frame data
						panicRate = (telemetryMetrics?.panicEvents ?? 0) > 0 ? 
							Math.min(100, (telemetryMetrics?.panicEvents ?? 0) * 10) : 0;
					}
				}
			});
			console.log('[WebGPU] Telemetry enabled');

			// Apply initial scenario
			const initialEffect = scenarioEffects[activeScenario];
			simulation.setScenario(activeScenario, initialEffect);

			simulation.start();
			console.log('[WebGPU] Simulation started');
		} catch (error) {
			console.error('[WebGPU] Initialization failed:', error);
			webgpuSupported = false;
		}
	}

	// Restart simulation with new agent count
	async function restartWithAgentCount(newCount: number) {
		if (!canvasElement || !webgpuContext) return;

		// Stop and destroy current simulation
		simulation?.destroy();
		simulation = null;
		initializationStarted = false;

		// Update agent count
		agentCount = newCount;
		pendingAgentCount = newCount;

		// Reinitialize
		await initializeSimulation(canvasElement, simulationSeed);
	}

	// Apply agent count change (debounced via button)
	function applyAgentCount() {
		if (pendingAgentCount !== agentCount && pendingAgentCount >= MIN_AGENTS && pendingAgentCount <= MAX_AGENTS) {
			restartWithAgentCount(pendingAgentCount);
		}
	}

	// Set deterministic seed
	function applySeed() {
		const seed = parseInt(seedInput, 10);
		if (!isNaN(seed) && seed > 0) {
			simulationSeed = seed;
			restartWithAgentCount(agentCount);
		} else if (seedInput === '' || seedInput === '0') {
			simulationSeed = 0;
			restartWithAgentCount(agentCount);
		}
	}

	// Generate shareable URL
	function generateShareUrl(): string {
		if (!browser) return '';
		const url = new URL(window.location.href);
		url.searchParams.set('agents', agentCount.toString());
		url.searchParams.set('scenario', activeScenario.toString());
		if (simulationSeed > 0) {
			url.searchParams.set('seed', simulationSeed.toString());
		}
		return url.toString();
	}

	// Copy share URL to clipboard
	async function copyShareUrl() {
		shareUrl = generateShareUrl();
		try {
			await navigator.clipboard.writeText(shareUrl);
			showShareCopied = true;
			setTimeout(() => { showShareCopied = false; }, 2000);
		} catch (err) {
			console.error('Failed to copy URL:', err);
		}
	}

	// Parse URL parameters on mount
	function parseUrlParams() {
		if (!browser) return;
		const urlParams = new URLSearchParams(window.location.search);
		
		const agentsParam = urlParams.get('agents');
		if (agentsParam) {
			const agents = parseInt(agentsParam, 10);
			if (!isNaN(agents) && agents >= MIN_AGENTS && agents <= MAX_AGENTS) {
				agentCount = agents;
				pendingAgentCount = agents;
			}
		}

		const scenarioParam = urlParams.get('scenario');
		if (scenarioParam) {
			const scenario = parseInt(scenarioParam, 10);
			if (!isNaN(scenario) && scenario >= 0 && scenario < intelligenceScenarios.length) {
				activeScenario = scenario;
			}
		}

		const seedParam = urlParams.get('seed');
		if (seedParam) {
			const seed = parseInt(seedParam, 10);
			if (!isNaN(seed) && seed > 0) {
				simulationSeed = seed;
				seedInput = seed.toString();
			}
		}
	}

	// Effect to initialize when canvas is available
	$effect(() => {
		if (canvasElement && webgpuSupported && !initializationStarted) {
			initializeSimulation(canvasElement, simulationSeed);
		}
	});

	// Initialize on mount
	onMount(() => {
		// Parse URL parameters first (before WebGPU check)
		parseUrlParams();

		webgpuSupported = isWebGPUSupported();
		console.log('[WebGPU] Supported:', webgpuSupported);

		if (!webgpuSupported) {
			return;
		}

		// The $effect above will handle initialization when canvas is ready

		// FPS counter
		fpsInterval = setInterval(() => {
			fps = frameCount;
			frameCount = 0;
		}, 1000);

		// Animation loop for FPS counting and UI updates
		uiInterval = setInterval(() => {
			frameCount++;
			tick = (tick + 1) % 360;

			if (liveMode) {
				scenarioCycleTimer++;

				// Auto-cycle scenarios every 8 seconds
				if (scenarioCycleTimer % 80 === 0) {
					activeScenario = (activeScenario + 1) % intelligenceScenarios.length;
					applyScenario(activeScenario);
				}

				// Update notifications
				if (tick % 40 === 0) {
					const msgs = scenarioMessages[activeScenario % scenarioMessages.length];
					if (msgs) {
						const msg = msgs[Math.floor(Math.random() * msgs.length)];
						notifications = [
							{
								id: Date.now(),
								system: msg.system,
								message: msg.message,
								time: 'now',
								priority: activeScenario === 4 ? 'high' : 'low'
							},
							...notifications.slice(0, 2)
						];
					}
				}

				// HVAC drift
				if (tick % 45 === 0) {
					hvacZones = hvacZones.map((zone) => ({
						...zone,
						temp: zone.target + Math.round((Math.random() - 0.5) * 4)
					}));
				}

				// Incidents
				if (tick % 120 === 0) {
					const newIncident = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
					const now = new Date();
					incidentLog = [
						{
							id: Date.now(),
							timestamp: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
							type: newIncident.type as 'success' | 'failure' | 'override' | 'escalation',
							system: newIncident.system,
							event: newIncident.event,
							resolution: newIncident.resolution,
							learned: newIncident.learned,
							humanInvolved: Math.random() > 0.3
						},
						...incidentLog.slice(0, 4)
					];
				}
			}
		}, 100);

		return () => {
			if (fpsInterval) clearInterval(fpsInterval);
			if (uiInterval) clearInterval(uiInterval);
		};
	});

	onDestroy(() => {
		simulation?.destroy();
	});

	function applyScenario(index: number) {
		const effect = scenarioEffects[index];

		// Update UI state
		securityStatus = effect.securityStatus;
		lightingMode = effect.lightingMode;
		currentEvent = {
			...currentEvent,
			phase: intelligenceScenarios[index].phase,
			attendance: effect.attendance
		};

		// Update simulation
		simulation?.setScenario(index, effect);
	}

	function selectScenario(index: number) {
		activeScenario = index;
		applyScenario(index);
		scenarioCycleTimer = 0;
	}

	// Derived values
	const lightingIntensity = $derived(lightingMode === 'event' ? 1 : lightingMode === 'ambient' ? 0.5 : 0.8);
</script>

<SEO
	title="Living Arena GPU | Experiments | CREATE SOMETHING"
	description="WebGPU-accelerated crowd simulation with 8,000+ agents showing emergent behaviors."
	keywords="WebGPU, crowd simulation, emergent behavior, GPU computing, real-time visualization"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Experiments', url: 'https://createsomething.io/experiments' },
		{ name: 'Living Arena GPU', url: 'https://createsomething.io/experiments/living-arena-gpu' }
	]}
/>

<div class="arena-experiment">
	<!-- Header -->
	<header class="experiment-header">
		<div class="header-content">
			<span class="experiment-label">Experiment</span>
			<h1 class="experiment-title">Living Arena <span class="gpu-badge"><Cpu size={20} /> GPU</span></h1>
			<p class="experiment-description">
				WebGPU-accelerated crowd simulation with <strong>{agentCount.toLocaleString()} agents</strong> showing
				emergent behaviors—bottleneck formation, wave propagation, and panic spreading.
			</p>
		</div>
		<div class="header-right">
			<div class="header-controls">
				<button class="live-toggle" class:active={liveMode} onclick={() => (liveMode = !liveMode)}>
					<span class="live-indicator" class:pulsing={liveMode}></span>
					{liveMode ? 'LIVE' : 'PAUSED'}
				</button>
				<button class="share-button" onclick={copyShareUrl} title="Copy shareable URL">
					<Share2 size={16} />
					{showShareCopied ? 'Copied!' : 'Share'}
				</button>
			</div>
			<div class="event-badge">
				<span class="event-phase">{currentEvent.phase}</span>
				<span class="event-name">{currentEvent.name}</span>
				<span class="attendance"
					>{currentEvent.attendance.toLocaleString()} / {currentEvent.capacity.toLocaleString()}</span
				>
			</div>
		</div>
	</header>

	<!-- Scale & Seed Controls -->
	{#if webgpuSupported}
		<div class="controls-bar">
			<!-- Agent Count Slider -->
			<div class="control-group scale-control">
				<label class="control-label">
					<Users size={14} />
					Agents
				</label>
				<div class="slider-container">
					<input
						type="range"
						min={MIN_AGENTS}
						max={MAX_AGENTS}
						step="1000"
						bind:value={pendingAgentCount}
						class="agent-slider"
					/>
					<span class="slider-value">{pendingAgentCount.toLocaleString()}</span>
				</div>
				{#if pendingAgentCount !== agentCount}
					<button class="apply-button" onclick={applyAgentCount}>
						Apply
					</button>
				{/if}
				{#if showScaleWarning}
					<span class="scale-warning">
						<AlertTriangle size={12} />
						High count may affect performance
					</span>
				{/if}
			</div>

			<!-- Seed Input -->
			<div class="control-group seed-control">
				<label class="control-label">
					<Gauge size={14} />
					Seed
				</label>
				<div class="seed-input-group">
					<input
						type="text"
						placeholder="Random"
						bind:value={seedInput}
						class="seed-input"
						onkeydown={(e) => e.key === 'Enter' && applySeed()}
					/>
					<button class="seed-apply" onclick={applySeed} title="Apply seed for deterministic simulation">
						Set
					</button>
				</div>
				{#if simulationSeed > 0}
					<span class="seed-active">Seed: {simulationSeed}</span>
				{/if}
			</div>
		</div>
	{/if}

	<!-- WebGPU Visualization -->
	<div class="visualization-container">
		{#if !webgpuSupported}
			<div class="webgpu-fallback">
				<div class="fallback-content">
					<AlertTriangle size={48} />
					<h2>WebGPU Not Available</h2>
					<p>
						This experiment requires WebGPU, which is available in:
					</p>
					<ul>
						<li>Chrome 113+ (desktop)</li>
						<li>Edge 113+ (desktop)</li>
						<li>Firefox Nightly (with flags)</li>
					</ul>
					<a href="/experiments/living-arena" class="fallback-link">
						<ExternalLink size={16} />
						View original SVG version
					</a>
				</div>
			</div>
		{:else}
			<div class="canvas-container">
				<canvas bind:this={canvasElement} class="simulation-canvas"></canvas>
				
				<!-- Labels overlay - arena lines are now rendered directly on WebGPU canvas -->
				<svg class="arena-overlay" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
					<!-- Section labels only - lines are drawn by WebGPU for perfect alignment -->
					<g fill="rgba(255,255,255,0.2)" font-size="10" font-family="system-ui">
						{#each Array(12) as _, i}
							{@const angle = ((i * 30 - 90) * Math.PI) / 180}
							{@const x = 400 + Math.cos(angle) * 340}
							{@const y = 300 + Math.sin(angle) * 250}
							<text x={x} y={y} text-anchor="middle" dominant-baseline="middle">{100 + i}</text>
						{/each}
					</g>

					<!-- Gate labels -->
					<g fill="rgba(255,255,255,0.35)" font-size="11" font-family="system-ui">
						<text x="400" y="12" text-anchor="middle">NORTH ENTRANCE</text>
						<text x="400" y="594" text-anchor="middle">SOUTH ENTRANCE</text>
						<text x="12" y="300" text-anchor="middle" writing-mode="vertical-rl">WEST</text>
						<text x="788" y="300" text-anchor="middle" writing-mode="vertical-rl">EAST</text>
					</g>

					<!-- Bench labels -->
					<g font-size="8" font-family="system-ui">
						<text x="260" y="300" text-anchor="middle" fill="rgba(200,100,100,0.5)" writing-mode="vertical-rl">HOME</text>
						<text x="540" y="300" text-anchor="middle" fill="rgba(100,150,200,0.5)" writing-mode="vertical-rl">AWAY</text>
					</g>
				</svg>

				<!-- Performance overlay -->
				<div class="performance-overlay">
					<div class="perf-stat">
						<Zap size={14} />
						<span>{fps} FPS</span>
					</div>
					<div class="perf-stat">
						<User size={14} />
						<span>{agentCount.toLocaleString()} agents</span>
					</div>
				</div>

				<!-- Legend -->
				<div class="legend">
					<div class="legend-item">
						<span class="legend-dot calm"></span>
						<span>Calm</span>
					</div>
					<div class="legend-item">
						<span class="legend-dot crowded"></span>
						<span>Crowded</span>
					</div>
					<div class="legend-item">
						<span class="legend-dot panicked"></span>
						<span>Panicked</span>
					</div>
				</div>
			</div>
		{/if}

		<!-- Status Panels -->
		<div class="status-panels">
			<!-- Telemetry Panel (new) -->
			<div class="status-panel telemetry-panel">
				<div class="panel-header">
					<span class="panel-icon"><Activity size={18} /></span>
					<span class="panel-title">Performance</span>
					<span class="status-indicator" class:healthy={systemHealth > 0.7} class:warning={systemHealth <= 0.7 && systemHealth > 0.4} class:critical={systemHealth <= 0.4}>
						{systemHealth > 0.7 ? 'healthy' : systemHealth > 0.4 ? 'degraded' : 'critical'}
					</span>
				</div>
				<div class="telemetry-metrics">
					<div class="telemetry-row">
						<span class="telemetry-label">FPS</span>
						<span class="telemetry-value" class:warning={fps < 30}>{fps}</span>
					</div>
					<div class="telemetry-row">
						<span class="telemetry-label">Frame Time</span>
						<span class="telemetry-value" class:warning={(telemetryMetrics?.avgFrameTimeMs ?? 0) > 20}>
							{(telemetryMetrics?.avgFrameTimeMs ?? 0).toFixed(1)}ms
						</span>
					</div>
					<div class="telemetry-row">
						<span class="telemetry-label">P95 Frame</span>
						<span class="telemetry-value" class:warning={(telemetryMetrics?.p95FrameTimeMs ?? 0) > 33}>
							{(telemetryMetrics?.p95FrameTimeMs ?? 0).toFixed(1)}ms
						</span>
					</div>
					<div class="telemetry-row">
						<span class="telemetry-label">System Health</span>
						<div class="health-bar">
							<div class="health-fill" style="width: {systemHealth * 100}%"></div>
						</div>
					</div>
				</div>
			</div>

			<!-- Security Panel -->
			<div class="status-panel security-panel">
				<div class="panel-header">
					<span class="panel-icon"><Shield size={18} /></span>
					<span class="panel-title">Security</span>
					<span class="status-indicator {securityStatus}">{securityStatus}</span>
				</div>
				<div class="panel-metrics">
					<div class="metric">
						<span class="metric-value">16</span>
						<span class="metric-label">Sensors Active</span>
					</div>
					<div class="metric">
						<span class="metric-value">4</span>
						<span class="metric-label">Cameras Online</span>
					</div>
				</div>
			</div>

			<!-- Lighting Panel -->
			<div class="status-panel lighting-panel">
				<div class="panel-header">
					<span class="panel-icon"><Lightbulb size={18} /></span>
					<span class="panel-title">Lighting</span>
					<span class="status-indicator active">{lightingMode}</span>
				</div>
				<div class="panel-metrics">
					<div class="metric">
						<span class="metric-value">{Math.round(lightingIntensity * 100)}%</span>
						<span class="metric-label">Court Intensity</span>
					</div>
					<div class="metric">
						<span class="metric-value">12</span>
						<span class="metric-label">Zones Active</span>
					</div>
				</div>
			</div>

			<!-- HVAC Panel -->
			<div class="status-panel hvac-panel">
				<div class="panel-header">
					<span class="panel-icon"><Thermometer size={18} /></span>
					<span class="panel-title">HVAC</span>
					<span class="status-indicator active">nominal</span>
				</div>
				<div class="hvac-zones-list">
					{#each hvacZones as zone}
						<div class="hvac-zone-item">
							<span class="zone-name">{zone.name}</span>
							<span class="zone-temp" class:warning={Math.abs(zone.temp - zone.target) > 2}>
								{zone.temp}°F
							</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Notifications Panel -->
			<div class="status-panel notifications-panel">
				<div class="panel-header">
					<span class="panel-icon"><Radio size={18} /></span>
					<span class="panel-title">Activity Stream</span>
				</div>
				<div class="notifications-list">
					{#each notifications as notif (notif.id)}
						<div class="notification-item">
							<span class="notif-system">{notif.system}</span>
							<span class="notif-message">{notif.message}</span>
							<span class="notif-time">{notif.time}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Scenario Selector -->
	<section class="scenarios-section">
		<div class="section-header">
			<h2>Scenarios</h2>
			<p>Select a scenario to see how the crowd behaves. Watch for emergent patterns.</p>
		</div>

		<div class="scenario-tabs">
			{#each intelligenceScenarios as scenario, i}
				<button
					class="scenario-tab"
					class:active={activeScenario === i}
					onclick={() => selectScenario(i)}
				>
					<span class="tab-number">{i + 1}</span>
					<span class="tab-trigger">{scenario.trigger}</span>
				</button>
			{/each}
		</div>

		<div class="scenario-detail">
			<div class="scenario-trigger">
				<span class="trigger-label">Active Scenario</span>
				<span class="trigger-text">{currentScenario.trigger}</span>
			</div>

			<div class="responses-flow">
				{#each currentScenario.responses as response, i}
					<div class="response-card" style:animation-delay="{i * 100}ms">
						<span class="response-system">{response.system}</span>
						<span class="response-arrow">→</span>
						<span class="response-action">{response.action}</span>
					</div>
				{/each}
			</div>

			<div class="human-loop-callout" class:critical={currentScenario.humanLoopCritical}>
				<span class="human-icon"><User size={16} /></span>
				{#if currentScenario.humanLoopCritical}<span class="critical-icon"
						><AlertTriangle size={14} /></span
					>{/if}
				<span class="human-text">{currentScenario.humanLoop}</span>
			</div>

			<div class="scenario-insight">
				<span class="insight-text">{currentScenario.insight}</span>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="experiment-footer">
		<div class="hypothesis">
			<h3>About This Experiment</h3>
			<p>
				This WebGPU-accelerated version simulates realistic crowd dynamics using a social force model.
				Each agent considers: <strong>goal attraction</strong> (moving toward exits, concessions, seats),
				<strong>separation</strong> (avoiding collisions), and <strong>wall avoidance</strong>.
				States spread through the crowd—panic propagates from nearby panicked agents.
			</p>
		</div>
		<div class="patterns-note">
			<span class="label">Technologies</span>
			<div class="pattern-tags">
				<span class="tag">WebGPU</span>
				<span class="tag">WGSL Compute</span>
				<span class="tag">Instanced Rendering</span>
				<span class="tag">Social Force Model</span>
				<span class="tag">Emergent Behavior</span>
			</div>
		</div>
	</footer>
</div>

<style>
	.arena-experiment {
		min-height: 100vh;
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	/* Header */
	.experiment-header {
		padding: var(--space-xl) var(--space-lg);
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		border-bottom: 1px solid var(--color-border-default);
		flex-wrap: wrap;
		gap: var(--space-md);
	}

	.experiment-label {
		display: inline-block;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-sm);
	}

	.experiment-title {
		font-size: var(--text-h1);
		font-weight: 700;
		margin-bottom: var(--space-sm);
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.gpu-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: linear-gradient(135deg, var(--color-accent), var(--color-data-1));
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-bg-pure);
	}

	.experiment-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		max-width: 600px;
		line-height: 1.6;
	}

	.header-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-sm);
	}

	.event-badge {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-xs);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.event-phase {
		font-size: var(--text-caption);
		color: var(--color-accent);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.event-name {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		font-weight: 600;
	}

	.attendance {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-variant-numeric: tabular-nums;
	}

	/* Live Toggle */
	.live-toggle {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-caption);
		font-weight: 600;
		color: var(--color-fg-muted);
		cursor: pointer;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.live-toggle:hover {
		border-color: var(--color-border-emphasis);
	}

	.live-toggle.active {
		background: var(--color-error);
		border-color: var(--color-error);
		color: white;
	}

	.live-indicator {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
		background: var(--color-fg-muted);
	}

	.live-toggle.active .live-indicator {
		background: white;
	}

	.live-indicator.pulsing {
		animation: livePulse 1s ease-in-out infinite;
	}

	@keyframes livePulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}

	/* Visualization Container */
	.visualization-container {
		display: grid;
		grid-template-columns: 1fr 320px;
		gap: var(--space-lg);
		padding: var(--space-lg);
	}

	@media (max-width: 1024px) {
		.visualization-container {
			grid-template-columns: 1fr;
		}
	}

	/* Canvas Container */
	.canvas-container {
		position: relative;
		background: #0a0a10;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.simulation-canvas {
		width: 100%;
		height: auto;
		display: block;
	}

	/* Arena Overlay */
	.arena-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	/* Performance Overlay */
	.performance-overlay {
		position: absolute;
		top: var(--space-sm);
		left: var(--space-sm);
		display: flex;
		gap: var(--space-sm);
	}

	.perf-stat {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: rgba(0, 0, 0, 0.7);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		color: var(--color-data-2);
		font-family: monospace;
	}

	/* Legend */
	.legend {
		position: absolute;
		bottom: var(--space-sm);
		right: var(--space-sm);
		display: flex;
		gap: var(--space-md);
		padding: var(--space-xs) var(--space-sm);
		background: rgba(0, 0, 0, 0.7);
		border-radius: var(--radius-sm);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.legend-dot {
		width: 10px;
		height: 10px;
		border-radius: var(--radius-full);
	}

	.legend-dot.calm {
		background: rgb(51, 204, 102);
	}

	.legend-dot.crowded {
		background: rgb(230, 179, 51);
	}

	.legend-dot.panicked {
		background: rgb(230, 51, 51);
	}

	/* WebGPU Fallback */
	.webgpu-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.fallback-content {
		text-align: center;
		padding: var(--space-xl);
		max-width: 400px;
	}

	.fallback-content h2 {
		margin-top: var(--space-md);
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
	}

	.fallback-content p {
		margin-top: var(--space-sm);
		color: var(--color-fg-tertiary);
	}

	.fallback-content ul {
		margin-top: var(--space-sm);
		text-align: left;
		color: var(--color-fg-secondary);
	}

	.fallback-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		margin-top: var(--space-lg);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-accent);
		color: var(--color-bg-pure);
		border-radius: var(--radius-md);
		text-decoration: none;
		font-weight: 500;
	}

	.fallback-link:hover {
		opacity: 0.9;
	}

	/* Status Panels */
	.status-panels {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.status-panel {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.panel-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.panel-title {
		font-weight: 600;
		color: var(--color-fg-primary);
		flex: 1;
	}

	.status-indicator {
		font-size: var(--text-caption);
		padding: 2px 8px;
		border-radius: var(--radius-full);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.status-indicator.monitoring {
		background: var(--color-data-1);
		color: var(--color-bg-pure);
	}

	.status-indicator.alert {
		background: var(--color-error);
		color: white;
	}

	.status-indicator.active {
		background: var(--color-data-2);
		color: var(--color-bg-pure);
	}

	.panel-metrics {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-sm);
	}

	.metric {
		text-align: center;
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
	}

	.metric-value {
		display: block;
		font-size: var(--text-h3);
		font-weight: 700;
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.metric-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* HVAC Panel */
	.hvac-zones-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.hvac-zone-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
	}

	.zone-name {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.zone-temp {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-data-2);
		font-variant-numeric: tabular-nums;
	}

	.zone-temp.warning {
		color: var(--color-data-4);
	}

	/* Notifications Panel */
	.notifications-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		max-height: 200px;
		overflow-y: auto;
	}

	.notification-item {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		align-items: center;
	}

	.notif-system {
		color: var(--color-accent);
		font-weight: 600;
	}

	.notif-message {
		color: var(--color-fg-secondary);
	}

	.notif-time {
		color: var(--color-fg-muted);
	}

	/* Scenarios Section */
	.scenarios-section {
		padding: var(--space-xl) var(--space-lg);
		background: var(--color-bg-subtle);
		border-top: 1px solid var(--color-border-default);
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.section-header h2 {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.section-header p {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
	}

	.scenario-tabs {
		display: flex;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
		flex-wrap: wrap;
		max-width: 900px;
		margin-left: auto;
		margin-right: auto;
	}

	.scenario-tab {
		flex: 1;
		min-width: 180px;
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		cursor: pointer;
		transition: all var(--duration-standard) var(--ease-standard);
		text-align: left;
	}

	.scenario-tab:hover {
		border-color: var(--color-border-emphasis);
	}

	.scenario-tab.active {
		background: var(--color-bg-pure);
		border-color: var(--color-accent);
		box-shadow: 0 0 0 1px var(--color-accent);
	}

	.tab-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-muted);
	}

	.scenario-tab.active .tab-number {
		background: var(--color-accent);
		color: var(--color-bg-pure);
	}

	.tab-trigger {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.4;
	}

	.scenario-detail {
		max-width: 900px;
		margin: 0 auto;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.scenario-trigger {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
		margin-bottom: var(--space-lg);
	}

	.trigger-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.trigger-text {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-data-4);
	}

	.responses-flow {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
	}

	.response-card {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		animation: slideIn 0.3s ease-out forwards;
		opacity: 0;
		transform: translateX(-10px);
	}

	@keyframes slideIn {
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.response-system {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-accent);
		min-width: 80px;
	}

	.response-arrow {
		color: var(--color-fg-muted);
	}

	.response-action {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.human-loop-callout {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-subtle);
		border: 1px dashed var(--color-border-emphasis);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-md);
	}

	.human-loop-callout.critical {
		background: rgba(255, 200, 50, 0.1);
		border-color: var(--color-data-4);
		border-style: solid;
		border-width: 2px;
	}

	.human-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.human-loop-callout.critical .human-text {
		color: var(--color-data-4);
		font-weight: 600;
	}

	.scenario-insight {
		padding: var(--space-md);
		background: linear-gradient(135deg, var(--color-bg-subtle), transparent);
		border-left: 3px solid var(--color-data-2);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
	}

	.insight-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		font-style: italic;
	}

	/* Footer */
	.experiment-footer {
		padding: var(--space-xl) var(--space-lg);
		border-top: 1px solid var(--color-border-default);
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: var(--space-xl);
	}

	@media (max-width: 768px) {
		.experiment-footer {
			grid-template-columns: 1fr;
		}
	}

	.hypothesis h3 {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.hypothesis p {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		line-height: 1.7;
	}

	.patterns-note .label {
		display: block;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-sm);
	}

	.pattern-tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.tag {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		font-family: monospace;
	}

	/* Header Controls */
	.header-controls {
		display: flex;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
	}

	.share-button {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.share-button:hover {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}

	/* Controls Bar */
	.controls-bar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-lg);
		padding: var(--space-md) var(--space-lg);
		background: var(--color-bg-subtle);
		border-bottom: 1px solid var(--color-border-default);
	}

	.control-group {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.control-label {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-caption);
		font-weight: 600;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Scale Controls */
	.slider-container {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.agent-slider {
		width: 150px;
		height: 4px;
		-webkit-appearance: none;
		appearance: none;
		background: var(--color-bg-surface);
		border-radius: var(--radius-full);
		outline: none;
		cursor: pointer;
	}

	.agent-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		background: var(--color-accent);
		border-radius: var(--radius-full);
		cursor: pointer;
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.agent-slider::-webkit-slider-thumb:hover {
		transform: scale(1.2);
	}

	.agent-slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		background: var(--color-accent);
		border-radius: var(--radius-full);
		cursor: pointer;
		border: none;
	}

	.slider-value {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
		min-width: 60px;
	}

	.apply-button {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-accent);
		border: none;
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		font-weight: 600;
		color: var(--color-bg-pure);
		cursor: pointer;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.apply-button:hover {
		opacity: 0.9;
	}

	.scale-warning {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-data-4);
	}

	/* Seed Controls */
	.seed-input-group {
		display: flex;
		align-items: center;
	}

	.seed-input {
		width: 80px;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm) 0 0 var(--radius-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		outline: none;
	}

	.seed-input:focus {
		border-color: var(--color-accent);
	}

	.seed-input::placeholder {
		color: var(--color-fg-muted);
	}

	.seed-apply {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-left: none;
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.seed-apply:hover {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: var(--color-bg-pure);
	}

	.seed-active {
		font-size: var(--text-caption);
		color: var(--color-data-2);
		font-weight: 500;
	}

	/* Telemetry Panel */
	.telemetry-panel {
		background: linear-gradient(135deg, var(--color-bg-surface), rgba(var(--color-accent-rgb), 0.05));
	}

	.telemetry-metrics {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.telemetry-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
	}

	.telemetry-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.telemetry-value {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-data-2);
		font-variant-numeric: tabular-nums;
	}

	.telemetry-value.warning {
		color: var(--color-data-4);
	}

	.health-bar {
		width: 80px;
		height: 8px;
		background: var(--color-bg-surface);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.health-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-error), var(--color-data-4), var(--color-data-2));
		transition: width var(--duration-standard) var(--ease-standard);
	}

	.status-indicator.healthy {
		background: var(--color-data-2);
		color: var(--color-bg-pure);
	}

	.status-indicator.warning {
		background: var(--color-data-4);
		color: var(--color-bg-pure);
	}

	.status-indicator.critical {
		background: var(--color-error);
		color: white;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.controls-bar {
			flex-direction: column;
			gap: var(--space-md);
		}

		.control-group {
			width: 100%;
		}

		.slider-container {
			flex: 1;
		}

		.agent-slider {
			flex: 1;
			width: auto;
		}
	}
</style>
