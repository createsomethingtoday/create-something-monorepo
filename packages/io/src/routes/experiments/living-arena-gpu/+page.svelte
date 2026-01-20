<script lang="ts">
	/**
	 * Living Arena GPU - WebGPU Crowd Simulation
	 *
	 * GPU-accelerated version of the Living Arena experiment featuring
	 * realistic crowd simulation with 5,000-10,000 agents showing
	 * emergent behaviors like bottleneck formation and panic spreading.
	 */

	import { onMount, onDestroy } from 'svelte';
	import {
		Shield,
		Lightbulb,
		Thermometer,
		Radio,
		User,
		AlertTriangle,
		Cpu,
		Zap,
		ExternalLink
	} from 'lucide-svelte';

	// Import simulation engine
	import {
		CrowdSimulation,
		initWebGPU,
		isWebGPUSupported,
		type WebGPUContext
	} from './crowdSimulation';

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

	// Simulation stats
	let agentCount = $state(8000);
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
	async function initializeSimulation(canvas: HTMLCanvasElement) {
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
				arenaHeight: 600
			});

			await simulation.initialize();
			console.log('[WebGPU] Simulation initialized');

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

	// Effect to initialize when canvas is available
	$effect(() => {
		if (canvasElement && webgpuSupported && !initializationStarted) {
			initializeSimulation(canvasElement);
		}
	});

	// Initialize on mount
	onMount(() => {
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

<svelte:head>
	<title>Living Arena GPU | Experiments | CREATE SOMETHING</title>
	<meta
		name="description"
		content="WebGPU-accelerated crowd simulation with 8,000+ agents showing emergent behaviors."
	/>
</svelte:head>

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
			<button class="live-toggle" class:active={liveMode} onclick={() => (liveMode = !liveMode)}>
				<span class="live-indicator" class:pulsing={liveMode}></span>
				{liveMode ? 'LIVE' : 'PAUSED'}
			</button>
			<div class="event-badge">
				<span class="event-phase">{currentEvent.phase}</span>
				<span class="event-name">{currentEvent.name}</span>
				<span class="attendance"
					>{currentEvent.attendance.toLocaleString()} / {currentEvent.capacity.toLocaleString()}</span
				>
			</div>
		</div>
	</header>

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
				
				<!-- Arena overlay - matches simulation coordinate space -->
				<svg class="arena-overlay" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
					<defs>
						<radialGradient id="court-glow-gpu" cx="50%" cy="50%" r="50%">
							<stop offset="0%" stop-color="var(--color-accent, #3b82f6)" stop-opacity="0.2" />
							<stop offset="100%" stop-color="var(--color-accent, #3b82f6)" stop-opacity="0" />
						</radialGradient>
					</defs>

					<!-- Arena outer ring -->
					<ellipse
						cx="400" cy="300"
						rx="380" ry="280"
						fill="none"
						stroke="rgba(255,255,255,0.15)"
						stroke-width="2"
					/>

					<!-- Seating section dividers -->
					<g stroke="rgba(255,255,255,0.08)" stroke-width="1">
						{#each Array(12) as _, i}
							{@const angle = (i * 30 * Math.PI) / 180}
							<line
								x1={400 + Math.cos(angle) * 180}
								y1={300 + Math.sin(angle) * 130}
								x2={400 + Math.cos(angle) * 370}
								y2={300 + Math.sin(angle) * 270}
							/>
						{/each}
					</g>

					<!-- Inner bowl ring -->
					<ellipse
						cx="400" cy="300"
						rx="180" ry="130"
						fill="none"
						stroke="rgba(255,255,255,0.1)"
						stroke-width="1"
					/>

					<!-- Amenities: Food stands (4 corners) -->
					<g class="food-stands">
						<g transform="translate(150, 150)">
							<rect x="-20" y="-15" width="40" height="30" rx="4" fill="rgba(255,180,50,0.15)" stroke="rgba(255,180,50,0.4)" stroke-width="1" />
							<text x="0" y="4" text-anchor="middle" fill="rgba(255,180,50,0.5)" font-size="8" font-family="system-ui">FOOD</text>
						</g>
						<g transform="translate(650, 150)">
							<rect x="-20" y="-15" width="40" height="30" rx="4" fill="rgba(255,180,50,0.15)" stroke="rgba(255,180,50,0.4)" stroke-width="1" />
							<text x="0" y="4" text-anchor="middle" fill="rgba(255,180,50,0.5)" font-size="8" font-family="system-ui">FOOD</text>
						</g>
						<g transform="translate(150, 450)">
							<rect x="-20" y="-15" width="40" height="30" rx="4" fill="rgba(255,180,50,0.15)" stroke="rgba(255,180,50,0.4)" stroke-width="1" />
							<text x="0" y="4" text-anchor="middle" fill="rgba(255,180,50,0.5)" font-size="8" font-family="system-ui">FOOD</text>
						</g>
						<g transform="translate(650, 450)">
							<rect x="-20" y="-15" width="40" height="30" rx="4" fill="rgba(255,180,50,0.15)" stroke="rgba(255,180,50,0.4)" stroke-width="1" />
							<text x="0" y="4" text-anchor="middle" fill="rgba(255,180,50,0.5)" font-size="8" font-family="system-ui">FOOD</text>
						</g>
					</g>

					<!-- Amenities: Restrooms (near N/S gates) -->
					<g class="restrooms">
						<g transform="translate(300, 80)">
							<rect x="-18" y="-12" width="36" height="24" rx="3" fill="rgba(100,150,255,0.15)" stroke="rgba(100,150,255,0.4)" stroke-width="1" />
							<text x="0" y="4" text-anchor="middle" fill="rgba(100,150,255,0.5)" font-size="7" font-family="system-ui">WC</text>
						</g>
						<g transform="translate(500, 80)">
							<rect x="-18" y="-12" width="36" height="24" rx="3" fill="rgba(100,150,255,0.15)" stroke="rgba(100,150,255,0.4)" stroke-width="1" />
							<text x="0" y="4" text-anchor="middle" fill="rgba(100,150,255,0.5)" font-size="7" font-family="system-ui">WC</text>
						</g>
						<g transform="translate(300, 520)">
							<rect x="-18" y="-12" width="36" height="24" rx="3" fill="rgba(100,150,255,0.15)" stroke="rgba(100,150,255,0.4)" stroke-width="1" />
							<text x="0" y="4" text-anchor="middle" fill="rgba(100,150,255,0.5)" font-size="7" font-family="system-ui">WC</text>
						</g>
						<g transform="translate(500, 520)">
							<rect x="-18" y="-12" width="36" height="24" rx="3" fill="rgba(100,150,255,0.15)" stroke="rgba(100,150,255,0.4)" stroke-width="1" />
							<text x="0" y="4" text-anchor="middle" fill="rgba(100,150,255,0.5)" font-size="7" font-family="system-ui">WC</text>
						</g>
					</g>

					<!-- Court / Main Floor -->
					<rect
						x="300" y="220"
						width="200" height="160"
						rx="4"
						fill="rgba(20,60,20,0.5)"
						stroke="rgba(255,255,255,0.3)"
						stroke-width="2"
					/>

					<!-- Court glow -->
					<rect
						x="280" y="200"
						width="240" height="200"
						fill="url(#court-glow-gpu)"
					/>

					<!-- Court markings (basketball court) -->
					<g stroke="rgba(255,255,255,0.25)" stroke-width="1" fill="none">
						<!-- Outer boundary -->
						<rect x="305" y="225" width="190" height="150" rx="2" />
						<!-- Center circle -->
						<circle cx="400" cy="300" r="25" />
						<!-- Center line -->
						<line x1="400" y1="225" x2="400" y2="375" />
						<!-- Three-point arcs (simplified) -->
						<path d="M 325 225 Q 325 300 325 375" />
						<path d="M 475 225 Q 475 300 475 375" />
						<!-- Free throw circles -->
						<circle cx="345" cy="300" r="20" />
						<circle cx="455" cy="300" r="20" />
						<!-- Key/paint areas -->
						<rect x="305" y="270" width="40" height="60" />
						<rect x="455" y="270" width="40" height="60" />
					</g>

					<!-- Team benches -->
					<g class="benches">
						<!-- Home bench (left) -->
						<rect x="270" y="260" width="20" height="80" rx="2" 
							fill="rgba(200,50,50,0.2)" stroke="rgba(200,50,50,0.4)" stroke-width="1" />
						<text x="280" y="305" text-anchor="middle" fill="rgba(200,50,50,0.5)" 
							font-size="8" font-family="system-ui" writing-mode="vertical-rl">HOME</text>
						
						<!-- Away bench (right) -->
						<rect x="510" y="260" width="20" height="80" rx="2" 
							fill="rgba(50,100,200,0.2)" stroke="rgba(50,100,200,0.4)" stroke-width="1" />
						<text x="520" y="305" text-anchor="middle" fill="rgba(50,100,200,0.5)" 
							font-size="8" font-family="system-ui" writing-mode="vertical-rl">AWAY</text>
					</g>

					<!-- Scorer's table -->
					<rect x="360" y="380" width="80" height="12" rx="2"
						fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
					<text x="400" y="389" text-anchor="middle" fill="rgba(255,255,255,0.3)" 
						font-size="6" font-family="system-ui">SCORERS</text>

					<!-- Entry corridors/hallways -->
					<g class="corridors">
						<!-- North corridor -->
						<rect x="360" y="0" width="80" height="50" fill="rgba(40,60,40,0.4)" stroke="rgba(100,200,100,0.2)" stroke-width="1" />
						<line x1="360" y1="0" x2="360" y2="50" stroke="rgba(100,200,100,0.3)" stroke-width="1" stroke-dasharray="4 2" />
						<line x1="440" y1="0" x2="440" y2="50" stroke="rgba(100,200,100,0.3)" stroke-width="1" stroke-dasharray="4 2" />
						
						<!-- South corridor -->
						<rect x="360" y="550" width="80" height="50" fill="rgba(40,60,40,0.4)" stroke="rgba(100,200,100,0.2)" stroke-width="1" />
						<line x1="360" y1="550" x2="360" y2="600" stroke="rgba(100,200,100,0.3)" stroke-width="1" stroke-dasharray="4 2" />
						<line x1="440" y1="550" x2="440" y2="600" stroke="rgba(100,200,100,0.3)" stroke-width="1" stroke-dasharray="4 2" />
						
						<!-- West corridor -->
						<rect x="0" y="275" width="50" height="50" fill="rgba(40,60,40,0.4)" stroke="rgba(100,200,100,0.2)" stroke-width="1" />
						<line x1="0" y1="275" x2="50" y2="275" stroke="rgba(100,200,100,0.3)" stroke-width="1" stroke-dasharray="4 2" />
						<line x1="0" y1="325" x2="50" y2="325" stroke="rgba(100,200,100,0.3)" stroke-width="1" stroke-dasharray="4 2" />
						
						<!-- East corridor -->
						<rect x="750" y="275" width="50" height="50" fill="rgba(40,60,40,0.4)" stroke="rgba(100,200,100,0.2)" stroke-width="1" />
						<line x1="750" y1="275" x2="800" y2="275" stroke="rgba(100,200,100,0.3)" stroke-width="1" stroke-dasharray="4 2" />
						<line x1="750" y1="325" x2="800" y2="325" stroke="rgba(100,200,100,0.3)" stroke-width="1" stroke-dasharray="4 2" />
					</g>

					<!-- Gate markers -->
					<g>
						<!-- North gate -->
						<rect x="365" y="15" width="70" height="20" rx="3" fill="rgba(100,200,100,0.25)" stroke="rgba(100,200,100,0.5)" stroke-width="1.5" />
						<text x="400" y="6" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="12" font-family="system-ui">NORTH ENTRANCE</text>
						
						<!-- South gate -->
						<rect x="365" y="565" width="70" height="20" rx="3" fill="rgba(100,200,100,0.25)" stroke="rgba(100,200,100,0.5)" stroke-width="1.5" />
						<text x="400" y="598" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="12" font-family="system-ui">SOUTH ENTRANCE</text>
						
						<!-- West gate -->
						<rect x="15" y="280" width="20" height="40" rx="3" fill="rgba(100,200,100,0.25)" stroke="rgba(100,200,100,0.5)" stroke-width="1.5" />
						<text x="6" y="304" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="10" font-family="system-ui" writing-mode="vertical-rl">WEST</text>
						
						<!-- East gate -->
						<rect x="765" y="280" width="20" height="40" rx="3" fill="rgba(100,200,100,0.25)" stroke="rgba(100,200,100,0.5)" stroke-width="1.5" />
						<text x="795" y="304" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="10" font-family="system-ui" writing-mode="vertical-rl">EAST</text>
					</g>

					<!-- Section labels -->
					<g fill="rgba(255,255,255,0.15)" font-size="10" font-family="system-ui">
						{#each Array(12) as _, i}
							{@const angle = ((i * 30 - 90) * Math.PI) / 180}
							{@const x = 400 + Math.cos(angle) * 280}
							{@const y = 300 + Math.sin(angle) * 200}
							<text x={x} y={y} text-anchor="middle" dominant-baseline="middle">{100 + i}</text>
						{/each}
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
</style>
