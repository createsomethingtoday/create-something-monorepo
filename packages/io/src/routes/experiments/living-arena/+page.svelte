<script lang="ts">
	/**
	 * Living Arena Experiment
	 *
	 * Visualization demonstrating how AI-native automations from WORKWAY
	 * pattern collection could orchestrate all systems of an arena at scale.
	 *
	 * Shows security, lighting, HVAC, scheduling, and notifications as
	 * living, breathing systems coordinated by pattern-driven automation.
	 */

	import { onMount } from 'svelte';
	import { SEO } from '@create-something/components';
	import {
		Shield,
		Lightbulb,
		Thermometer,
		Radio,
		User,
		AlertTriangle,
		CloudLightning,
		Check,
		X,
		RotateCcw,
		ArrowUp,
		Siren,
		BarChart3,
		Clock,
		FileText,
		CheckCircle
	} from 'lucide-svelte';

	// Import extracted modules
	import type { SecurityStatus, LightingMode, Particle, Incident } from './arenaTypes';
	import {
		intelligenceScenarios,
		particleColors,
		reasoningExamples,
		holisticUpdate,
		incidentTypes,
		scenarioEffects,
		scenarioMessages,
		createInitialHvacZones,
		createInitialNotifications,
		createInitialIncidentLog
	} from './arenaData';
	import { generateParticles, updateParticles as updateParticlePositions } from './arenaParticles';

	// System states - simulating real-time automation data
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
	let scenarioTransitioning = $state(false);

	// Derived for template use
	const currentScenario = $derived(intelligenceScenarios[activeScenario]);

	let activeReasoning = $state(0);

	// Derived for template use
	const currentReasoning = $derived(reasoningExamples[activeReasoning]);

	// Incident log - showing failures, resolutions, and learning
	let incidentLog = $state<Incident[]>(createInitialIncidentLog());

	// Animation state
	let mounted = $state(false);
	let tick = $state(0);
	let liveMode = $state(true);
	let scenarioCycleTimer = $state(0);

	// Active zones for visual highlighting based on scenario
	let activeZones = $state<string[]>([]);
	let highlightedEntry = $state<string | null>(null);

	// Crowd particles - representing people moving through the arena
	let crowdParticles = $state<Particle[]>([]);

	// Helper to regenerate particles for current scenario
	function regenerateParticles() {
		crowdParticles = generateParticles(scenarioEffects[activeScenario]);
	}

	// Helper to update particle positions
	function tickParticles() {
		crowdParticles = updateParticlePositions(crowdParticles, scenarioEffects[activeScenario]);
	}

	onMount(() => {
		mounted = true;

		// Apply initial scenario effects
		const initialEffects = scenarioEffects[activeScenario];
		activeZones = initialEffects.zones;
		highlightedEntry = initialEffects.entry;
		securityStatus = initialEffects.securityStatus;
		lightingMode = initialEffects.lightingMode;
		currentEvent = { ...currentEvent, attendance: initialEffects.attendance };
		regenerateParticles();

		// Simulation tick - creates the "living" effect
		const interval = setInterval(() => {
			tick = (tick + 1) % 360;

			// Always update particle positions for smooth movement
			tickParticles();

			if (liveMode) {
				scenarioCycleTimer++;

				// Auto-cycle scenarios every 6 seconds for better pacing
				if (scenarioCycleTimer % 60 === 0) {
					// Brief transition effect
					scenarioTransitioning = true;
					setTimeout(() => {
						scenarioTransitioning = false;
					}, 500);

					activeScenario = (activeScenario + 1) % intelligenceScenarios.length;

					// Apply scenario effects to arena
					const effects = scenarioEffects[activeScenario];
					activeZones = effects.zones;
					highlightedEntry = effects.entry;
					securityStatus = effects.securityStatus;
					lightingMode = effects.lightingMode;

					// Update event with scenario-specific attendance and phase
					currentEvent = {
						...currentEvent,
						phase: intelligenceScenarios[activeScenario].phase,
						attendance: effects.attendance
					};

					// Regenerate particles for new scenario
					regenerateParticles();
				}

				// Auto-cycle reasoning examples every 6 seconds
				if (scenarioCycleTimer % 60 === 0) {
					activeReasoning = (activeReasoning + 1) % reasoningExamples.length;
				}
			}

			// Notifications - more contextual based on active scenario
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

			// HVAC temperature drift simulation
			if (tick % 45 === 0) {
				hvacZones = hvacZones.map((zone) => ({
					...zone,
					temp: zone.target + Math.round((Math.random() - 0.5) * 4)
				}));
			}

			// Occasionally add new incidents
			if (tick % 120 === 0 && liveMode) {
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
		}, 100);

		return () => clearInterval(interval);
	});

	// Derived states for visual indicators
	const securityPulseSpeed = $derived(
		securityStatus === 'alert' ? '0.5s' : securityStatus === 'monitoring' ? '2s' : '4s'
	);

	const lightingIntensity = $derived(lightingMode === 'event' ? 1 : lightingMode === 'ambient' ? 0.5 : 0.8);
</script>

<SEO
	title="Living Arena | Experiments | CREATE SOMETHING"
	description="Visualization of AI-native automations orchestrating arena systems through WORKWAY pattern collection."
	keywords="AI automation, arena systems, WORKWAY patterns, living arena, smart buildings"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Experiments', url: 'https://createsomething.io/experiments' },
		{ name: 'Living Arena', url: 'https://createsomething.io/experiments/living-arena' }
	]}
/>

<div class="arena-experiment">
	<!-- Header -->
	<header class="experiment-header">
		<div class="header-content">
			<span class="experiment-label">Experiment</span>
			<h1 class="experiment-title">Living Arena</h1>
			<p class="experiment-description">
				What if your building could help people without them having to ask? 
				The lights guide you to your seat. The air feels right before you notice. 
				And through it all, <strong>safety comes first</strong>—always.
			</p>
		</div>
		<div class="header-right">
			<button class="live-toggle" class:active={liveMode} onclick={() => liveMode = !liveMode}>
				<span class="live-indicator" class:pulsing={liveMode}></span>
				{liveMode ? 'LIVE' : 'PAUSED'}
			</button>
			<div class="event-badge">
				<span class="event-phase">{currentEvent.phase}</span>
				<span class="event-name">{currentEvent.name}</span>
				<span class="attendance">{currentEvent.attendance.toLocaleString()} / {currentEvent.capacity.toLocaleString()}</span>
			</div>
		</div>
	</header>

	<!-- Main Visualization -->
	<div class="visualization-container">
		<!-- Arena SVG -->
		<svg class="arena-svg" viewBox="-200 -150 1200 900" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<!-- Gradients -->
				<radialGradient id="court-glow" cx="50%" cy="50%" r="50%">
					<stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.3" />
					<stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0" />
				</radialGradient>

				<radialGradient id="hvac-zone" cx="50%" cy="50%" r="50%">
					<stop offset="0%" stop-color="var(--color-data-2)" stop-opacity="0.15" />
					<stop offset="100%" stop-color="var(--color-data-2)" stop-opacity="0" />
				</radialGradient>

				<linearGradient id="security-beam" x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" stop-color="var(--color-data-1)" stop-opacity="0" />
					<stop offset="50%" stop-color="var(--color-data-1)" stop-opacity="0.6" />
					<stop offset="100%" stop-color="var(--color-data-1)" stop-opacity="0" />
				</linearGradient>

				<linearGradient id="road-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
					<stop offset="0%" stop-color="var(--color-fg-tertiary)" stop-opacity="0.3" />
					<stop offset="100%" stop-color="var(--color-fg-tertiary)" stop-opacity="0.15" />
				</linearGradient>

				<!-- Filters -->
				<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="3" result="blur" />
					<feMerge>
						<feMergeNode in="blur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>

				<!-- Patterns -->
				<pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
					<path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--color-border-default)" stroke-width="0.5" opacity="0.3" />
				</pattern>

				<pattern id="parking-lines" width="24" height="40" patternUnits="userSpaceOnUse">
					<path d="M 0 0 L 0 40 M 24 0 L 24 40" fill="none" stroke="var(--color-fg-tertiary)" stroke-width="1" opacity="0.3" />
				</pattern>
			</defs>

			<!-- Background (expanded) -->
			<rect x="-200" y="-150" width="1200" height="900" fill="var(--color-bg-pure)" />
			<rect x="-200" y="-150" width="1200" height="900" fill="url(#grid)" />

			<!-- === SURROUNDING SPACE === -->
			
			<!-- Access Roads -->
			<g class="access-roads">
				<!-- Main entrance road (north) -->
				<rect x="350" y="-150" width="100" height="150" fill="url(#road-gradient)" />
				<line x1="370" y1="-150" x2="370" y2="0" stroke="var(--color-data-4)" stroke-width="2" stroke-dasharray="10 15" opacity="0.5" class="road-marking" />
				<line x1="430" y1="-150" x2="430" y2="0" stroke="var(--color-data-4)" stroke-width="2" stroke-dasharray="10 15" opacity="0.5" class="road-marking" />
				
				<!-- South exit road -->
				<rect x="350" y="600" width="100" height="150" fill="url(#road-gradient)" />
				<line x1="400" y1="600" x2="400" y2="750" stroke="var(--color-fg-tertiary)" stroke-width="2" stroke-dasharray="10 15" opacity="0.4" />
				
				<!-- Perimeter road (ring around arena) -->
				<ellipse cx="400" cy="300" rx="440" ry="330" fill="none" stroke="var(--color-fg-tertiary)" stroke-width="25" opacity="0.15" />
			</g>

			<!-- Parking Lots -->
			<g class="parking-lots">
				<!-- North parking lot -->
				<rect x="-150" y="-120" width="220" height="150" rx="8" fill="var(--color-bg-surface)" stroke="var(--color-border-default)" stroke-width="1" opacity="0.8" />
				<rect x="-140" y="-110" width="200" height="130" fill="url(#parking-lines)" opacity="0.5" />
				<text x="-50" y="-50" text-anchor="middle" font-size="10" fill="var(--color-fg-tertiary)">LOT A</text>
				
				<!-- Northeast parking lot -->
				<rect x="730" y="-120" width="220" height="150" rx="8" fill="var(--color-bg-surface)" stroke="var(--color-border-default)" stroke-width="1" opacity="0.8" />
				<rect x="740" y="-110" width="200" height="130" fill="url(#parking-lines)" opacity="0.5" />
				<text x="840" y="-50" text-anchor="middle" font-size="10" fill="var(--color-fg-tertiary)">LOT B</text>
				
				<!-- South parking lot -->
				<rect x="290" y="680" width="220" height="140" rx="8" fill="var(--color-bg-surface)" stroke="var(--color-border-default)" stroke-width="1" opacity="0.8" />
				<rect x="300" y="690" width="200" height="120" fill="url(#parking-lines)" opacity="0.5" />
				<text x="400" y="730" text-anchor="middle" font-size="10" fill="var(--color-fg-tertiary)">LOT C - VIP</text>
			</g>

			<!-- Vehicles in parking lots (animated based on event phase) -->
			<g class="parked-vehicles">
				{#each Array(8) as _, i}
					<rect x={-130 + (i % 4) * 50} y={-100 + Math.floor(i / 4) * 50} width="18" height="8" rx="2" fill="var(--color-fg-muted)" opacity={0.4 + (tick % 60) * 0.01 * ((i % 3) + 1) * 0.1} />
				{/each}
				{#each Array(8) as _, i}
					<rect x={750 + (i % 4) * 50} y={-100 + Math.floor(i / 4) * 50} width="18" height="8" rx="2" fill="var(--color-fg-muted)" opacity={0.4 + (tick % 60) * 0.01 * ((i % 3) + 1) * 0.1} />
				{/each}
			</g>

			<!-- Perimeter Security Points -->
			<g class="perimeter-security">
				{#each [[-100, 100], [900, 100], [-100, 500], [900, 500], [400, -100], [400, 700]] as [x, y], i}
					<g transform="translate({x}, {y})">
						<circle r="12" fill="var(--color-bg-elevated)" stroke="var(--color-data-1)" stroke-width="2" />
						<circle r="8" fill="var(--color-data-1)" opacity="0.3" class="security-pulse" style:animation-delay="{i * 0.3}s" />
						<circle r="3" fill="var(--color-data-1)" />
					</g>
				{/each}
			</g>

			<!-- Vehicles approaching/leaving (animated) -->
			<g class="moving-vehicles">
				{#if activeScenario === 0}
					<!-- Pre-game: vehicles arriving from north -->
					{#each Array(4) as _, i}
						<rect 
							x={360 + (i % 2) * 40} 
							y={-80 + ((tick * 2 + i * 50) % 150)} 
							width="14" 
							height="8" 
							rx="2" 
							fill="var(--color-data-4)" 
							opacity="0.6"
						/>
					{/each}
				{:else if activeScenario === 1}
					<!-- VIP: luxury vehicles arriving at south -->
					{#each Array(2) as _, i}
						<rect 
							x={385 + i * 30} 
							y={720 - ((tick * 1.5 + i * 40) % 80)} 
							width="20" 
							height="10" 
							rx="3" 
							fill="var(--color-accent)" 
							opacity="0.7"
						/>
					{/each}
				{:else if activeScenario === 4}
					<!-- Emergency: vehicles leaving rapidly to south -->
					{#each Array(6) as _, i}
						<rect 
							x={370 + (i % 3) * 20} 
							y={620 + ((tick * 3 + i * 25) % 130)} 
							width="14" 
							height="8" 
							rx="2" 
							fill="var(--color-error)" 
							opacity="0.5"
						/>
					{/each}
				{:else if activeScenario === 5}
					<!-- Game end: vehicles leaving from all lots -->
					{#each Array(4) as _, i}
						<rect 
							x={360 + (i % 2) * 40} 
							y={-80 - ((tick * 1.5 + i * 50) % 100)} 
							width="14" 
							height="8" 
							rx="2" 
							fill="var(--color-data-1)" 
							opacity="0.5"
						/>
					{/each}
					{#each Array(4) as _, i}
						<rect 
							x={370 + (i % 2) * 40} 
							y={620 + ((tick * 1.5 + i * 40) % 130)} 
							width="14" 
							height="8" 
							rx="2" 
							fill="var(--color-data-1)" 
							opacity="0.5"
						/>
					{/each}
				{/if}
			</g>

			<!-- Pedestrian Crossings -->
			<g class="crossings">
				<g transform="translate(400, -50)">
					<rect x="-30" y="-10" width="60" height="20" rx="2" fill="var(--color-fg-tertiary)" opacity="0.1" />
					{#each Array(6) as _, i}
						<rect x={-25 + i * 10} y="-5" width="4" height="10" fill="var(--color-fg-tertiary)" opacity="0.4" />
					{/each}
				</g>
			</g>

			<!-- Shuttle/Bus Lanes -->
			<g class="transit-lanes">
				<rect x="-180" y="200" width="60" height="200" rx="4" fill="var(--color-bg-surface)" stroke="var(--color-border-default)" opacity="0.7" />
				<text x="-150" y="295" text-anchor="middle" font-size="8" fill="var(--color-fg-tertiary)" transform="rotate(-90, -150, 295)">SHUTTLE</text>
				
				<!-- Shuttle bus icon -->
				<rect x="-165" y={250 + Math.sin(tick * 0.05) * 30} width="30" height="15" rx="3" fill="var(--color-accent)" opacity="0.6" />
			</g>

			<!-- === ARENA INNER AREA === -->

			<!-- Arena Structure - Outer Ring (Concourse) -->
			<ellipse
				cx="400"
				cy="300"
				rx="380"
				ry="280"
				fill="none"
				stroke="var(--color-border-emphasis)"
				stroke-width="2"
				class="arena-outer"
			/>

			<!-- HVAC Zones - Visualized as breathing sections -->
			<g class="hvac-zones" style:opacity={mounted ? 1 : 0}>
				<!-- Zone 1: Main Floor -->
				<ellipse
					cx="400"
					cy="300"
					rx="150"
					ry="100"
					fill="url(#hvac-zone)"
					class="hvac-zone zone-1"
					style:animation-duration={hvacZones[0].active ? '4s' : '0s'}
				/>
				<!-- Zone 2: Upper Bowl -->
				<path
					d="M 400 300 m -300 0 a 300 220 0 0 1 600 0"
					fill="none"
					stroke="var(--color-data-2)"
					stroke-width="40"
					stroke-opacity="0.1"
					class="hvac-zone zone-2"
				/>
				<!-- Zone 3: Concourse -->
				<ellipse
					cx="400"
					cy="300"
					rx="350"
					ry="260"
					fill="none"
					stroke="var(--color-data-2)"
					stroke-width="30"
					stroke-opacity="0.08"
					class="hvac-zone zone-3"
				/>
			</g>

			<!-- Seating Sections -->
			<g class="seating">
				{#each Array(12) as _, i}
					<path
						d="M {400 + Math.cos((i * 30 * Math.PI) / 180) * 180} {300 + Math.sin((i * 30 * Math.PI) / 180) * 130}
						   L {400 + Math.cos((i * 30 * Math.PI) / 180) * 320} {300 + Math.sin((i * 30 * Math.PI) / 180) * 240}"
						stroke="var(--color-border-default)"
						stroke-width="1"
						opacity="0.5"
					/>
				{/each}
			</g>

			<!-- Court / Main Floor -->
			<rect
				x="300"
				y="220"
				width="200"
				height="160"
				rx="4"
				fill="var(--color-bg-subtle)"
				stroke="var(--color-border-emphasis)"
				stroke-width="2"
			/>

			<!-- Court Glow (Lighting) -->
			<rect
				x="280"
				y="200"
				width="240"
				height="200"
				fill="url(#court-glow)"
				class="court-lighting"
				style:opacity={lightingIntensity}
			/>

			<!-- Court Markings -->
			<g class="court-markings" stroke="var(--color-fg-muted)" stroke-width="1" fill="none" opacity="0.6">
				<rect x="310" y="230" width="180" height="140" rx="2" />
				<circle cx="400" cy="300" r="20" />
				<line x1="400" y1="230" x2="400" y2="370" />
			</g>

			<!-- Security Perimeter -->
			<g class="security-system">
				<!-- Perimeter sensors -->
				{#each Array(16) as _, i}
					{@const angle = (i * 22.5 * Math.PI) / 180}
					{@const x = 400 + Math.cos(angle) * 370}
					{@const y = 300 + Math.sin(angle) * 270}
					<circle
						cx={x}
						cy={y}
						r="6"
						fill="var(--color-data-1)"
						class="security-sensor"
						style:animation-delay="{i * 0.1}s"
						style:animation-duration={securityPulseSpeed}
					/>
					<!-- Sensor coverage arc -->
					<circle
						cx={x}
						cy={y}
						r="25"
						fill="none"
						stroke="var(--color-data-1)"
						stroke-width="1"
						opacity="0.2"
						class="sensor-range"
					/>
				{/each}

				<!-- Scanning beam -->
				<g class="security-beam" style:transform="rotate({tick}deg)" style:transform-origin="400px 300px">
					<line x1="400" y1="300" x2="780" y2="300" stroke="url(#security-beam)" stroke-width="3" />
				</g>
			</g>

			<!-- Camera positions -->
			<g class="cameras">
				{#each [[150, 120], [650, 120], [150, 480], [650, 480]] as [cx, cy], i}
					<g transform="translate({cx}, {cy})">
						<rect x="-8" y="-5" width="16" height="10" rx="2" fill="var(--color-fg-muted)" />
						<circle cx="0" cy="0" r="4" fill="var(--color-data-1)" class="camera-indicator" style:animation-delay="{i * 0.5}s" />
					</g>
				{/each}
			</g>

			<!-- AI Orchestration Hub (Center) -->
			<g class="ai-hub" transform="translate(400, 300)">
				<circle r="30" fill="var(--color-bg-surface)" stroke="var(--color-accent)" stroke-width="2" class="hub-core" />
				<circle r="40" fill="none" stroke="var(--color-accent)" stroke-width="1" opacity="0.5" class="hub-ring ring-1" />
				<circle r="50" fill="none" stroke="var(--color-accent)" stroke-width="1" opacity="0.3" class="hub-ring ring-2" />
				<circle r="60" fill="none" stroke="var(--color-accent)" stroke-width="1" opacity="0.15" class="hub-ring ring-3" />

				<!-- AI Symbol -->
				<text y="5" text-anchor="middle" fill="var(--color-accent)" font-size="14" font-weight="600" class="ai-text">AI</text>
			</g>

			<!-- Data Flow Lines (connecting systems to AI hub) -->
			<g class="data-flows" opacity="0.6">
				{#each Array(8) as _, i}
					{@const angle = (i * 45 * Math.PI) / 180}
					{@const startX = 400 + Math.cos(angle) * 70}
					{@const startY = 300 + Math.sin(angle) * 50}
					{@const endX = 400 + Math.cos(angle) * 200}
					{@const endY = 300 + Math.sin(angle) * 150}
					<line
						x1={startX}
						y1={startY}
						x2={endX}
						y2={endY}
						stroke="var(--color-accent)"
						stroke-width="1"
						stroke-dasharray="4 4"
						class="data-flow"
						style:animation-delay="{i * 0.2}s"
					/>
				{/each}
			</g>

			<!-- Entry/Exit Points -->
			<g class="entry-points">
				<rect x="395" y="15" width="10" height="20" rx="2" class="entry north" class:highlighted={highlightedEntry === 'north'} fill={highlightedEntry === 'north' ? 'var(--color-data-4)' : 'var(--color-fg-muted)'} />
				<rect x="395" y="565" width="10" height="20" rx="2" class="entry south" class:highlighted={highlightedEntry === 'south'} fill={highlightedEntry === 'south' ? 'var(--color-error)' : 'var(--color-fg-muted)'} />
				<rect x="15" y="295" width="20" height="10" rx="2" class="entry west" class:highlighted={highlightedEntry === 'west'} fill={highlightedEntry === 'west' ? 'var(--color-data-4)' : 'var(--color-fg-muted)'} />
				<rect x="765" y="295" width="20" height="10" rx="2" class="entry east" class:highlighted={highlightedEntry === 'east'} fill={highlightedEntry === 'east' ? 'var(--color-data-4)' : 'var(--color-fg-muted)'} />
			</g>

			<!-- Active Scenario Indicator -->
			{#if activeScenario === 0}
				<!-- Gate crowding - highlight north area -->
				<ellipse cx="400" cy="80" rx="120" ry="60" fill="var(--color-data-4)" opacity="0.15" class="scenario-zone pulse" />
				<text x="400" y="85" text-anchor="middle" font-size="11" fill="var(--color-data-4)" font-weight="600">CROWD BUILDING</text>
				<!-- Flow arrows from parking to entrance -->
				<path d="M -50 -30 Q 150 30 380 40" fill="none" stroke="var(--color-data-4)" stroke-width="2" opacity="0.4" stroke-dasharray="8 4" class="flow-arrow" />
				<path d="M 850 -30 Q 650 30 420 40" fill="none" stroke="var(--color-data-4)" stroke-width="2" opacity="0.4" stroke-dasharray="8 4" class="flow-arrow" />
			{:else if activeScenario === 1}
				<!-- VIP arrival - highlight south entrance and Lot C -->
				<ellipse cx="400" cy="680" rx="100" ry="40" fill="var(--color-accent)" opacity="0.2" class="scenario-zone pulse" />
				<rect x="290" y="680" width="220" height="140" rx="8" fill="var(--color-accent)" opacity="0.1" class="scenario-zone pulse" />
				<text x="400" y="640" text-anchor="middle" font-size="11" fill="var(--color-accent)" font-weight="600">VIP ARRIVAL</text>
			{:else if activeScenario === 2}
				<!-- Halftime - highlight concourse -->
				<ellipse cx="400" cy="300" rx="340" ry="250" fill="none" stroke="var(--color-data-2)" stroke-width="30" opacity="0.1" class="scenario-zone pulse" />
				<text x="400" y="180" text-anchor="middle" font-size="11" fill="var(--color-data-2)" font-weight="600">HALFTIME RUSH</text>
				<!-- Concession hotspots -->
				<circle cx="200" cy="180" r="25" fill="var(--color-data-2)" opacity="0.2" class="hotspot pulse" />
				<circle cx="600" cy="180" r="25" fill="var(--color-data-2)" opacity="0.2" class="hotspot pulse" />
				<circle cx="200" cy="420" r="25" fill="var(--color-data-2)" opacity="0.2" class="hotspot pulse" />
				<circle cx="600" cy="420" r="25" fill="var(--color-data-2)" opacity="0.2" class="hotspot pulse" />
			{:else if activeScenario === 3}
				<!-- Weather incoming - highlight covered areas -->
				<rect x="-150" y="-120" width="220" height="150" rx="8" fill="var(--color-data-3)" opacity="0.15" class="scenario-zone pulse" />
				<rect x="730" y="-120" width="220" height="150" rx="8" fill="var(--color-data-3)" opacity="0.15" class="scenario-zone pulse" />
				<text x="400" y="-80" text-anchor="middle" font-size="11" fill="var(--color-data-3)" font-weight="600">STORM APPROACHING</text>
				<!-- Rain effect -->
				{#each Array(20) as _, i}
					<line 
						x1={-100 + i * 55} y1={-140 + (tick * 2 + i * 10) % 80} 
						x2={-95 + i * 55} y2={-130 + (tick * 2 + i * 10) % 80} 
						stroke="var(--color-data-3)" stroke-width="1" opacity="0.3" 
					/>
				{/each}
			{:else if activeScenario === 4}
				<!-- Emergency - highlight section 112 area -->
				<ellipse cx="550" cy="400" rx="80" ry="60" fill="var(--color-error)" opacity="0.2" class="scenario-zone alert-pulse" />
				<text x="550" y="405" text-anchor="middle" font-size="11" fill="var(--color-error)" font-weight="600">SECTION 112</text>
				<!-- Exit path indicators -->
				<line x1="550" y1="400" x2="400" y2="560" stroke="var(--color-error)" stroke-width="3" stroke-dasharray="10 5" opacity="0.6" class="exit-path" />
				<line x1="400" y1="560" x2="400" y2="700" stroke="var(--color-error)" stroke-width="3" stroke-dasharray="10 5" opacity="0.6" class="exit-path" />
			{:else if activeScenario === 5}
				<!-- Game end - all exits active -->
				<text x="400" y="180" text-anchor="middle" font-size="12" fill="var(--color-data-1)" font-weight="600">FINAL BUZZER</text>
				<!-- Exit flow arrows -->
				<line x1="400" y1="250" x2="400" y2="40" stroke="var(--color-data-1)" stroke-width="2" opacity="0.4" stroke-dasharray="6 4" class="flow-arrow" />
				<line x1="400" y1="350" x2="400" y2="580" stroke="var(--color-data-1)" stroke-width="2" opacity="0.4" stroke-dasharray="6 4" class="flow-arrow" />
				<line x1="300" y1="300" x2="50" y2="300" stroke="var(--color-data-1)" stroke-width="2" opacity="0.4" stroke-dasharray="6 4" class="flow-arrow" />
				<line x1="500" y1="300" x2="750" y2="300" stroke="var(--color-data-1)" stroke-width="2" opacity="0.4" stroke-dasharray="6 4" class="flow-arrow" />
				<!-- Parking lot activity -->
				<rect x="-150" y="-120" width="220" height="150" rx="8" fill="var(--color-data-1)" opacity="0.1" class="scenario-zone pulse" />
				<rect x="730" y="-120" width="220" height="150" rx="8" fill="var(--color-data-1)" opacity="0.1" class="scenario-zone pulse" />
				<rect x="290" y="680" width="220" height="140" rx="8" fill="var(--color-data-1)" opacity="0.1" class="scenario-zone pulse" />
			{:else if activeScenario === 6}
				<!-- Overnight - minimal activity, perimeter security -->
				<text x="400" y="180" text-anchor="middle" font-size="11" fill="var(--color-fg-tertiary)" font-weight="600">OVERNIGHT MODE</text>
				<!-- Dimmed arena -->
				<ellipse cx="400" cy="300" rx="380" ry="280" fill="var(--color-bg-pure)" opacity="0.6" />
				<!-- Security patrol path -->
				<ellipse cx="400" cy="300" rx="440" ry="330" fill="none" stroke="var(--color-data-1)" stroke-width="2" stroke-dasharray="20 10" opacity="0.3" class="patrol-path" />
			{/if}

			<!-- Labels -->
			<g class="labels" font-size="10" fill="var(--color-fg-tertiary)">
				<text x="400" y="50" text-anchor="middle">NORTH ENTRANCE</text>
				<text x="400" y="570" text-anchor="middle">SOUTH ENTRANCE</text>
				<text x="60" y="305" text-anchor="middle">WEST</text>
				<text x="740" y="305" text-anchor="middle">EAST</text>
			</g>

			<!-- Crowd Particles - People moving through arena -->
			<g class="crowd-particles">
				{#each crowdParticles as particle (particle.id)}
					<circle
						cx={particle.x}
						cy={particle.y}
						r={particle.size}
						fill={particleColors[activeScenario]}
						opacity={activeScenario === 4 ? 0.8 : 0.6}
						class="crowd-person"
					/>
				{/each}
				
				<!-- Movement trail for emergency evacuation -->
				{#if activeScenario === 4}
					{#each crowdParticles.slice(0, 8) as particle (particle.id)}
						<circle
							cx={particle.x - 8}
							cy={particle.y - 8}
							r={particle.size * 0.5}
							fill="var(--color-error)"
							opacity="0.2"
						/>
					{/each}
				{/if}
			</g>

			<!-- Crowd density heat zones -->
			{#if activeScenario === 0}
				<!-- Entering: density at north gate -->
				<ellipse cx="400" cy="60" rx="80" ry="30" fill="var(--color-data-4)" opacity="0.3" class="density-high" />
			{:else if activeScenario === 1}
				<!-- VIP: density at south entrance -->
				<ellipse cx="400" cy="620" rx="60" ry="25" fill="var(--color-accent)" opacity="0.3" class="density-high" />
			{:else if activeScenario === 2}
				<!-- Halftime: concession crowds -->
				<g class="concession-crowds">
					<ellipse cx="200" cy="180" rx="40" ry="25" fill="var(--color-data-2)" opacity="0.25" class="density-high" />
					<ellipse cx="600" cy="180" rx="40" ry="25" fill="var(--color-data-2)" opacity="0.25" class="density-high" />
					<ellipse cx="200" cy="420" rx="40" ry="25" fill="var(--color-data-2)" opacity="0.25" class="density-high" />
					<ellipse cx="600" cy="420" rx="40" ry="25" fill="var(--color-data-2)" opacity="0.25" class="density-high" />
				</g>
			{:else if activeScenario === 4}
				<!-- Emergency: density near exit -->
				<ellipse cx="400" cy="540" rx="100" ry="40" fill="var(--color-error)" opacity="0.2" class="density-high" />
			{:else if activeScenario === 5}
				<!-- Game end: density at all exits -->
				<ellipse cx="400" cy="60" rx="60" ry="25" fill="var(--color-data-1)" opacity="0.2" class="density-high" />
				<ellipse cx="400" cy="540" rx="60" ry="25" fill="var(--color-data-1)" opacity="0.2" class="density-high" />
				<ellipse cx="60" cy="300" rx="25" ry="40" fill="var(--color-data-1)" opacity="0.2" class="density-high" />
				<ellipse cx="740" cy="300" rx="25" ry="40" fill="var(--color-data-1)" opacity="0.2" class="density-high" />
			{/if}

			<!-- Live Mode Indicator -->
			{#if liveMode}
				<g class="live-badge">
					<rect x="-180" y="-130" width="60" height="24" rx="4" fill="var(--color-error)" opacity="0.9" />
					<circle cx="-165" cy="-118" r="4" fill="white" class="live-dot" />
					<text x="-145" y="-113" font-size="11" fill="white" font-weight="600">LIVE</text>
				</g>
			{/if}

			<!-- Scenario Info Panel (bottom right) -->
			<g class="scenario-info" transform="translate(700, 620)" class:transitioning={scenarioTransitioning}>
				<rect x="0" y="0" width="280" height="120" rx="8" fill="var(--color-bg-elevated)" opacity="0.95" stroke="var(--color-border-emphasis)" stroke-width="1" />
				
				<!-- Scenario title -->
				<text x="15" y="25" font-size="10" fill="var(--color-fg-tertiary)" font-weight="500">SCENARIO {activeScenario + 1} OF {intelligenceScenarios.length}</text>
				<text x="15" y="48" font-size="14" fill="var(--color-fg-default)" font-weight="600">{currentScenario.trigger}</text>
				
				<!-- Phase indicator -->
				<rect x="15" y="60" width="auto" height="18" rx="3" fill="var(--color-accent)" opacity="0.2" />
				<text x="22" y="73" font-size="10" fill="var(--color-accent)" font-weight="500">{currentScenario.phase}</text>
				
				<!-- Visual cue -->
				<text x="15" y="100" font-size="9" fill="var(--color-fg-muted)" font-style="italic">{currentScenario.visualCue}</text>
				
				<!-- Progress dots -->
				<g transform="translate(200, 18)">
					{#each intelligenceScenarios as _, i}
						<circle 
							cx={i * 10} 
							cy="0" 
							r="3" 
							fill={i === activeScenario ? 'var(--color-accent)' : 'var(--color-fg-tertiary)'} 
							opacity={i === activeScenario ? 1 : 0.3}
						/>
					{/each}
				</g>
			</g>

			<!-- Attendance counter -->
			<g class="attendance-counter" transform="translate(-180, 700)">
				<rect x="0" y="0" width="140" height="40" rx="6" fill="var(--color-bg-surface)" opacity="0.9" stroke="var(--color-border-default)" />
				<text x="15" y="18" font-size="9" fill="var(--color-fg-tertiary)">CURRENT ATTENDANCE</text>
				<text x="15" y="33" font-size="14" fill="var(--color-fg-default)" font-weight="600">{currentEvent.attendance.toLocaleString()}</text>
			</g>
		</svg>

		<!-- System Status Panels -->
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
				<div class="panel-action">
					<button onclick={() => securityStatus = securityStatus === 'monitoring' ? 'armed' : 'monitoring'}>
						Toggle Mode
					</button>
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
				<div class="panel-action">
					<button onclick={() => lightingMode = lightingMode === 'event' ? 'ambient' : 'event'}>
						Switch Mode
					</button>
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

	<!-- Cross-System Intelligence Section -->
	<section class="intelligence-section">
		<div class="section-header">
			<h2>When Systems Talk to Each Other</h2>
			<p>Something interesting happens when lighting, security, and climate work together. The building starts to feel like it's paying attention.</p>
		</div>

		<div class="scenarios-container">
			<div class="scenario-tabs">
				{#each intelligenceScenarios as scenario, i}
					<button
						class="scenario-tab"
						class:active={activeScenario === i}
						onclick={() => activeScenario = i}
					>
						<span class="tab-number">{i + 1}</span>
						<span class="tab-trigger">{scenario.trigger}</span>
					</button>
				{/each}
			</div>

		<div class="scenario-detail">
			<div class="scenario-trigger">
				<span class="trigger-label">Trigger Event</span>
				<span class="trigger-text">{currentScenario.trigger}</span>
			</div>

			<div class="responses-flow">
				{#each currentScenario.responses as response, i}
					<div class="response-card" style:animation-delay="{i * 150}ms">
						<span class="response-system">{response.system}</span>
						<span class="response-arrow">→</span>
						<span class="response-action">{response.action}</span>
					</div>
				{/each}
				</div>

			<div class="human-loop-callout" class:critical={currentScenario.humanLoopCritical}>
				<span class="human-icon"><User size={16} /></span>
				{#if currentScenario.humanLoopCritical}<span class="critical-icon"><AlertTriangle size={14} /></span>{/if}
				<span class="human-text">{currentScenario.humanLoop}</span>
			</div>

			<div class="scenario-insight">
				<span class="insight-icon"><Lightbulb size={14} /></span>
				<span class="insight-text">{currentScenario.insight}</span>
			</div>
			</div>
		</div>

		<div class="security-emphasis">
			<div class="emphasis-icon"><Shield size={32} /></div>
			<div class="emphasis-content">
				<h3>Safety First. Everything Else Second.</h3>
				<p>
					The building can make your experience better—but not if it means making you less safe. 
					Every suggestion the system makes gets checked against one question: does this keep people secure? 
					If there's ever a conflict, safety wins. No exceptions.
				</p>
			</div>
		</div>
	</section>

	<!-- AI Reasoning Section -->
	<section class="reasoning-section">
		<div class="section-header">
			<h2>The System Shows Its Thinking</h2>
			<p>This isn't a black box. When the AI makes a decision, you can see why. Every time.</p>
		</div>

		<div class="reasoning-container">
			<div class="reasoning-tabs">
				{#each reasoningExamples as example, i}
					<button
						class="reasoning-tab"
						class:active={activeReasoning === i}
						onclick={() => activeReasoning = i}
					>
						{example.situation}
					</button>
				{/each}
			</div>

			<div class="reasoning-detail">
				<div class="reasoning-header">
					<span class="situation-label">Situation</span>
					<span class="situation-text">{currentReasoning.situation}</span>
				</div>

				<div class="thinking-process">
					<span class="thinking-label">What the system noticed:</span>
					<ul class="thinking-list">
						{#each currentReasoning.thinking as thought, i}
							<li style:animation-delay="{i * 100}ms">{thought}</li>
						{/each}
					</ul>
				</div>

				<div class="decision-box">
					<div class="decision-main">
						<span class="decision-label">Decision</span>
						<span class="decision-text">{currentReasoning.decision}</span>
					</div>
					<div class="confidence-meter">
						<span class="confidence-label">Confidence</span>
						<div class="confidence-bar">
							<div class="confidence-fill" style:width="{currentReasoning.confidence}%"></div>
						</div>
						<span class="confidence-value">{currentReasoning.confidence}%</span>
					</div>
				</div>

				<div class="alternative-note">
					<span class="alt-icon"><Lightbulb size={14} /></span>
					<span class="alt-text">{currentReasoning.alternative}</span>
				</div>
			</div>
		</div>

		<div class="reasoning-benefit">
			<p>
				<strong>Why this matters:</strong> You can question it. You can override it. You can understand 
				why it did what it did. That's the difference between automation you trust and automation you tolerate.
			</p>
		</div>
	</section>

	<!-- Holistic Update Section -->
	<section class="holistic-section">
		<div class="section-header">
			<h2>One Change, Everything Adapts</h2>
			<p>When something changes, the whole building thinks it through—not just the part that noticed.</p>
		</div>

		<div class="holistic-container">
			<div class="holistic-trigger">
				<div class="trigger-icon"><CloudLightning size={32} /></div>
				<div class="trigger-content">
					<span class="trigger-time">{holisticUpdate.timestamp}</span>
					<span class="trigger-event">{holisticUpdate.trigger}</span>
				</div>
			</div>

			<div class="holistic-arrow">
				<span>The system thinks through everything at once:</span>
			</div>

			<div class="systems-cascade">
				{#each holisticUpdate.systemUpdates as update, i}
					<div class="cascade-item" style:animation-delay="{i * 150}ms">
						<div class="cascade-header">
							<span class="cascade-system">{update.system}</span>
						</div>
						<div class="cascade-change">
							<div class="change-before">
								<span class="change-label">Was:</span>
								<span class="change-value">{update.before}</span>
							</div>
							<div class="change-arrow">→</div>
							<div class="change-after">
								<span class="change-label">Now:</span>
								<span class="change-value">{update.after}</span>
							</div>
						</div>
						<div class="cascade-reason">
							<span class="reason-label">Because:</span>
							{update.reason}
						</div>
					</div>
				{/each}
			</div>

			<div class="holistic-approval">
				<div class="approval-icon"><Check size={18} /></div>
				<div class="approval-content">
					<p class="approval-text">{holisticUpdate.humanApproval}</p>
					<p class="approval-time">{holisticUpdate.totalTime}</p>
				</div>
			</div>
		</div>

		<div class="holistic-benefit">
			<p>
				<strong>The old way:</strong> Six different people get six different alerts. They each make changes. 
				Things get missed. Things conflict. It takes an hour of coordination.
			</p>
			<p>
				<strong>AI-native:</strong> One coherent plan, generated in seconds, reviewed by one person, 
				executed across everything. The systems already know how to work together.
			</p>
		</div>
	</section>

	<!-- Incident Log - The Honest Story -->
	<section class="incident-section">
		<div class="section-header">
			<h2>Here's What Actually Happens</h2>
			<p>Things go wrong. Sensors break. The AI gets confused. That's okay—what matters is what happens next.</p>
		</div>

		<div class="incident-log">
			<div class="log-header">
				<span class="log-title">Live Incident Log</span>
				<div class="log-legend">
					<span class="legend-item success"><Check size={12} /> Success</span>
					<span class="legend-item failure"><X size={12} /> Failure</span>
					<span class="legend-item override"><RotateCcw size={12} /> Override</span>
					<span class="legend-item escalation"><ArrowUp size={12} /> Escalation</span>
				</div>
			</div>

			<div class="incidents-list">
				{#each incidentLog as incident (incident.id)}
					<div class="incident-item {incident.type}">
						<div class="incident-header">
							<span class="incident-time">{incident.timestamp}</span>
							<span class="incident-type-badge {incident.type}">
								{#if incident.type === 'success'}<Check size={10} />{:else if incident.type === 'failure'}<X size={10} />{:else if incident.type === 'override'}<RotateCcw size={10} />{:else}<ArrowUp size={10} />{/if}
							</span>
							<span class="incident-system">{incident.system}</span>
							{#if incident.humanInvolved}
								<span class="human-badge"><User size={12} /> Human involved</span>
							{/if}
						</div>
						<div class="incident-event">{incident.event}</div>
						<div class="incident-resolution">
							<span class="resolution-label">Resolution:</span>
							{incident.resolution}
						</div>
						<div class="incident-learned">
							<span class="learned-label">System learned:</span>
							{incident.learned}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="human-loop-emphasis">
			<div class="loop-visual">
				<div class="loop-node ai">AI</div>
				<div class="loop-arrow">→</div>
				<div class="loop-node action">Action</div>
				<div class="loop-arrow">→</div>
				<div class="loop-node human">Human</div>
				<div class="loop-arrow">→</div>
				<div class="loop-node feedback">Feedback</div>
				<div class="loop-arrow loop-back">↩</div>
			</div>
			<div class="loop-content">
				<h3>Human in the Loop — Always</h3>
				<p>
					The AI proposes. Humans dispose. Every critical decision requires human confirmation. 
					Every failure is logged. Every override teaches the system. Every escalation is an 
					admission: "I don't know enough—help me."
				</p>
				<div class="loop-principles">
					<div class="principle">
						<span class="principle-icon"><Siren size={18} /></span>
						<span class="principle-text"><strong>Critical actions</strong> require explicit human approval</span>
					</div>
					<div class="principle">
						<span class="principle-icon"><BarChart3 size={18} /></span>
						<span class="principle-text"><strong>Confidence scores</strong> shown on all AI decisions</span>
					</div>
					<div class="principle">
						<span class="principle-icon"><Clock size={18} /></span>
						<span class="principle-text"><strong>Escalation timers</strong> prevent AI from waiting too long</span>
					</div>
					<div class="principle">
						<span class="principle-icon"><FileText size={18} /></span>
						<span class="principle-text"><strong>Every failure logged</strong> and reviewed by humans</span>
					</div>
				</div>
			</div>
		</div>

		<div class="not-perfect-note">
			<div class="note-icon"><AlertTriangle size={24} /></div>
			<div class="note-content">
				<h4>This System Is Not Perfect</h4>
				<p>
					Sensors fail. Predictions are wrong. Edge cases exist. The value of AI-native automation 
					isn't perfection—it's <strong>speed of detection</strong>, <strong>transparency of failure</strong>, 
					<strong>rapid human escalation</strong>, and <strong>continuous learning</strong>. 
					The building gets smarter every day, but humans remain in control.
				</p>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="experiment-footer">
		<div class="hypothesis">
			<h3>What We're Trying to Show</h3>
			<p>
				Buildings can be helpful without being creepy. They can learn without pretending to be smarter than they are. 
				They can make things easier while keeping people safe—and keeping people in charge. 
				When something goes wrong, you'll know. When the system isn't sure, it asks. When you override it, it listens. 
				That's the kind of automation we believe in: <strong>honest</strong>, <strong>humble</strong>, and <strong>always getting better</strong>.
			</p>
		</div>
		<div class="patterns-note">
			<span class="label">AI-Native Patterns</span>
			<div class="pattern-tags">
				<span class="tag">explainable-reasoning</span>
				<span class="tag">holistic-updates</span>
				<span class="tag">human-in-the-loop</span>
				<span class="tag">confidence-transparency</span>
				<span class="tag">cross-system-thinking</span>
				<span class="tag">graceful-escalation</span>
				<span class="tag">continuous-learning</span>
				<span class="tag">honest-failures</span>
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
		background: linear-gradient(135deg, var(--color-fg-primary), var(--color-accent));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.experiment-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		max-width: 600px;
		line-height: 1.6;
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

	/* Header Right Section */
	.header-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-sm);
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
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	/* Main Visualization */
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

	.arena-svg {
		width: 100%;
		height: auto;
		max-height: 70vh;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		background: var(--color-bg-subtle);
	}

	/* SVG Animations */
	.security-sensor {
		animation: pulse 2s ease-in-out infinite;
	}

	.camera-indicator {
		animation: blink 1s ease-in-out infinite;
	}

	.hub-core {
		animation: hub-pulse 3s ease-in-out infinite;
	}

	.hub-ring {
		animation: ring-expand 3s ease-in-out infinite;
	}

	.ring-1 {
		animation-delay: 0s;
	}

	.ring-2 {
		animation-delay: 0.5s;
	}

	.ring-3 {
		animation-delay: 1s;
	}

	.data-flow {
		animation: dash 2s linear infinite;
	}

	.hvac-zone {
		animation: breathe 4s ease-in-out infinite;
	}

	.zone-1 {
		animation-delay: 0s;
	}

	.zone-2 {
		animation-delay: 1s;
	}

	.zone-3 {
		animation-delay: 2s;
	}

	.court-lighting {
		transition: opacity 1s ease;
	}

	.security-beam {
		transition: transform 0.1s linear;
	}

	/* Scenario Zone Highlights */
	.scenario-zone {
		transition: opacity 0.5s ease;
	}

	.scenario-zone.pulse {
		animation: zonePulse 2s ease-in-out infinite;
	}

	.scenario-zone.alert-pulse {
		animation: alertPulse 0.5s ease-in-out infinite;
	}

	@keyframes zonePulse {
		0%, 100% { opacity: 0.1; }
		50% { opacity: 0.25; }
	}

	@keyframes alertPulse {
		0%, 100% { opacity: 0.15; }
		50% { opacity: 0.35; }
	}

	.exit-path {
		animation: dashFlow 1s linear infinite;
	}

	@keyframes dashFlow {
		to { stroke-dashoffset: -15; }
	}

	/* Entry Point Highlights */
	.entry {
		transition: all 0.3s ease;
	}

	.entry.highlighted {
		filter: drop-shadow(0 0 8px currentColor);
		animation: entryPulse 1s ease-in-out infinite;
	}

	@keyframes entryPulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}

	/* Live Badge in SVG */
	.live-badge .live-dot {
		animation: livePulse 1s ease-in-out infinite;
	}

	/* Surrounding Space Animations */
	.road-marking {
		animation: roadFlow 2s linear infinite;
	}

	@keyframes roadFlow {
		to { stroke-dashoffset: -25; }
	}

	.security-pulse {
		animation: securityPulse 2s ease-out infinite;
	}

	@keyframes securityPulse {
		0% { 
			r: 8;
			opacity: 0.5;
		}
		100% { 
			r: 25;
			opacity: 0;
		}
	}

	.crowd-person {
		transition: all 0.1s linear;
	}

	.moving-vehicles rect {
		filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.3));
	}

	.density-high {
		animation: densityPulse 1.5s ease-in-out infinite;
	}

	@keyframes densityPulse {
		0%, 100% { opacity: 0.2; }
		50% { opacity: 0.4; }
	}

	.parked-vehicles rect {
		transition: opacity 0.3s ease;
	}

	.flow-arrow {
		animation: flowPulse 2s ease-in-out infinite;
	}

	@keyframes flowPulse {
		0%, 100% { opacity: 0.2; stroke-dashoffset: 0; }
		50% { opacity: 0.5; stroke-dashoffset: -24; }
	}

	.patrol-path {
		animation: patrolDash 4s linear infinite;
	}

	@keyframes patrolDash {
		to { stroke-dashoffset: -60; }
	}

	.scenario-info {
		transition: opacity 0.3s ease, transform 0.3s ease;
	}

	.scenario-info.transitioning {
		opacity: 0.5;
		transform: translate(700px, 620px) scale(0.98);
	}

	.hotspot {
		animation: hotspotPulse 1.5s ease-in-out infinite;
	}

	@keyframes hotspotPulse {
		0%, 100% { r: 25; opacity: 0.15; }
		50% { r: 35; opacity: 0.3; }
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.5;
			r: 4;
		}
		50% {
			opacity: 1;
			r: 6;
		}
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}

	@keyframes hub-pulse {
		0%,
		100% {
			filter: drop-shadow(0 0 4px var(--color-accent));
		}
		50% {
			filter: drop-shadow(0 0 12px var(--color-accent));
		}
	}

	@keyframes ring-expand {
		0%,
		100% {
			opacity: 0.3;
			transform: scale(1);
		}
		50% {
			opacity: 0.6;
			transform: scale(1.1);
		}
	}

	@keyframes dash {
		to {
			stroke-dashoffset: -16;
		}
	}

	@keyframes breathe {
		0%,
		100% {
			opacity: 0.1;
		}
		50% {
			opacity: 0.2;
		}
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

	.panel-icon {
		font-size: 1.2em;
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

	.status-indicator.armed {
		background: var(--color-data-2);
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
		margin-bottom: var(--space-sm);
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

	.panel-action button {
		width: 100%;
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		cursor: pointer;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.panel-action button:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
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

	/* Cross-System Intelligence Section */
	.intelligence-section {
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
		max-width: 600px;
		margin: 0 auto;
	}

	.scenarios-container {
		max-width: 900px;
		margin: 0 auto var(--space-xl);
	}

	.scenario-tabs {
		display: flex;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
		flex-wrap: wrap;
	}

	.scenario-tab {
		flex: 1;
		min-width: 200px;
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

	.scenario-insight {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: linear-gradient(135deg, var(--color-bg-subtle), transparent);
		border-left: 3px solid var(--color-data-2);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
	}

	.insight-icon {
		font-size: 1.2em;
	}

	.insight-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		font-style: italic;
	}

	/* Human Loop Callout in Scenarios */
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

	.human-icon {
		font-size: 1.2em;
	}

	.human-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.human-loop-callout.critical .human-text {
		color: var(--color-data-4);
		font-weight: 600;
	}

	/* Security Emphasis */
	.security-emphasis {
		display: flex;
		gap: var(--space-lg);
		align-items: flex-start;
		max-width: 700px;
		margin: 0 auto;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 2px solid var(--color-data-1);
		border-radius: var(--radius-lg);
	}

	.emphasis-icon {
		font-size: 2rem;
		line-height: 1;
	}

	.emphasis-content h3 {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.emphasis-content p {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		line-height: 1.6;
	}

	/* Incident Log Section */
	.incident-section {
		padding: var(--space-xl) var(--space-lg);
		background: var(--color-bg-pure);
		border-top: 1px solid var(--color-border-default);
	}

	.incident-log {
		max-width: 900px;
		margin: 0 auto var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.log-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-md) var(--space-lg);
		background: var(--color-bg-subtle);
		border-bottom: 1px solid var(--color-border-default);
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.log-title {
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.log-legend {
		display: flex;
		gap: var(--space-md);
		font-size: var(--text-caption);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-fg-muted);
	}

	.legend-item.success {
		color: var(--color-data-2);
	}

	.legend-item.failure {
		color: var(--color-error);
	}

	.legend-item.override {
		color: var(--color-data-4);
	}

	.legend-item.escalation {
		color: var(--color-data-1);
	}

	.incidents-list {
		max-height: 400px;
		overflow-y: auto;
	}

	.incident-item {
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.incident-item:last-child {
		border-bottom: none;
	}

	.incident-item:hover {
		background: var(--color-bg-subtle);
	}

	.incident-item.failure {
		border-left: 3px solid var(--color-error);
	}

	.incident-item.success {
		border-left: 3px solid var(--color-data-2);
	}

	.incident-item.override {
		border-left: 3px solid var(--color-data-4);
	}

	.incident-item.escalation {
		border-left: 3px solid var(--color-data-1);
	}

	.incident-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-xs);
		flex-wrap: wrap;
	}

	.incident-time {
		font-family: monospace;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.incident-type-badge {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-full);
		font-size: 10px;
		font-weight: bold;
	}

	.incident-type-badge.success {
		background: var(--color-data-2);
		color: var(--color-bg-pure);
	}

	.incident-type-badge.failure {
		background: var(--color-error);
		color: white;
	}

	.incident-type-badge.override {
		background: var(--color-data-4);
		color: var(--color-bg-pure);
	}

	.incident-type-badge.escalation {
		background: var(--color-data-1);
		color: var(--color-bg-pure);
	}

	.incident-system {
		font-weight: 600;
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.human-badge {
		font-size: var(--text-caption);
		padding: 2px 6px;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-muted);
	}

	.incident-event {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.incident-resolution,
	.incident-learned {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		line-height: 1.5;
	}

	.resolution-label,
	.learned-label {
		color: var(--color-fg-muted);
		font-weight: 500;
	}

	.incident-learned {
		color: var(--color-data-2);
		font-style: italic;
	}

	/* Human in the Loop Emphasis */
	.human-loop-emphasis {
		max-width: 900px;
		margin: 0 auto var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.loop-visual {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
		flex-wrap: wrap;
	}

	.loop-node {
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		font-weight: 600;
	}

	.loop-node.ai {
		background: var(--color-accent);
		color: var(--color-bg-pure);
	}

	.loop-node.action {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
	}

	.loop-node.human {
		background: var(--color-data-2);
		color: var(--color-bg-pure);
	}

	.loop-node.feedback {
		background: var(--color-data-4);
		color: var(--color-bg-pure);
	}

	.loop-arrow {
		color: var(--color-fg-muted);
		font-size: 1.2em;
	}

	.loop-arrow.loop-back {
		color: var(--color-accent);
	}

	.loop-content h3 {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
		text-align: center;
	}

	.loop-content > p {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		line-height: 1.6;
		text-align: center;
		max-width: 700px;
		margin: 0 auto var(--space-lg);
	}

	.loop-principles {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-md);
	}

	.principle {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
	}

	.principle-icon {
		font-size: 1.2em;
		line-height: 1.4;
	}

	.principle-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.4;
	}

	/* Not Perfect Note */
	.not-perfect-note {
		display: flex;
		gap: var(--space-md);
		align-items: flex-start;
		max-width: 700px;
		margin: 0 auto;
		padding: var(--space-lg);
		background: linear-gradient(135deg, rgba(255, 200, 50, 0.1), transparent);
		border: 1px solid var(--color-data-4);
		border-radius: var(--radius-lg);
	}

	.note-icon {
		font-size: 1.5rem;
		line-height: 1;
	}

	.note-content h4 {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-data-4);
		margin-bottom: var(--space-xs);
	}

	.note-content p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: 1.6;
	}

	.note-content strong {
		color: var(--color-fg-secondary);
	}

	/* AI Reasoning Section */
	.reasoning-section {
		padding: var(--space-xl) var(--space-lg);
		background: var(--color-bg-subtle);
		border-top: 1px solid var(--color-border-default);
	}

	.reasoning-container {
		max-width: 800px;
		margin: 0 auto var(--space-lg);
	}

	.reasoning-tabs {
		display: flex;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
		flex-wrap: wrap;
	}

	.reasoning-tab {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.reasoning-tab:hover {
		border-color: var(--color-border-emphasis);
	}

	.reasoning-tab.active {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: var(--color-bg-pure);
	}

	.reasoning-detail {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.reasoning-header {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.situation-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.situation-text {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.thinking-process {
		margin-bottom: var(--space-lg);
	}

	.thinking-label {
		display: block;
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.thinking-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.thinking-list li {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		border-left: 2px solid var(--color-border-emphasis);
		animation: fadeSlideIn 0.3s ease-out forwards;
		opacity: 0;
	}

	@keyframes fadeSlideIn {
		from {
			opacity: 0;
			transform: translateX(-10px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.decision-box {
		background: var(--color-bg-subtle);
		border: 2px solid var(--color-data-2);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.decision-main {
		margin-bottom: var(--space-sm);
	}

	.decision-label {
		display: block;
		font-size: var(--text-caption);
		color: var(--color-data-2);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-xs);
	}

	.decision-text {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		font-weight: 500;
	}

	.confidence-meter {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.confidence-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		min-width: 70px;
	}

	.confidence-bar {
		flex: 1;
		height: 8px;
		background: var(--color-bg-pure);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.confidence-fill {
		height: 100%;
		background: var(--color-data-2);
		border-radius: var(--radius-full);
		transition: width 0.5s ease-out;
	}

	.confidence-value {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-data-2);
		min-width: 40px;
		text-align: right;
	}

	.alternative-note {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		font-style: italic;
	}

	.alt-icon {
		font-size: 1em;
	}

	.alt-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.reasoning-benefit {
		max-width: 600px;
		margin: 0 auto;
		text-align: center;
	}

	.reasoning-benefit p {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		line-height: 1.6;
	}

	.reasoning-benefit strong {
		color: var(--color-fg-secondary);
	}

	/* Holistic Update Section */
	.holistic-section {
		padding: var(--space-xl) var(--space-lg);
		background: var(--color-bg-pure);
		border-top: 1px solid var(--color-border-default);
	}

	.holistic-container {
		max-width: 900px;
		margin: 0 auto var(--space-lg);
	}

	.holistic-trigger {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: linear-gradient(135deg, rgba(100, 150, 255, 0.1), transparent);
		border: 2px solid var(--color-data-1);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-md);
	}

	.trigger-icon {
		font-size: 2rem;
	}

	.trigger-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.trigger-time {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: monospace;
	}

	.trigger-event {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.holistic-arrow {
		text-align: center;
		padding: var(--space-md);
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.systems-cascade {
		display: grid;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
	}

	.cascade-item {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		animation: cascadeIn 0.4s ease-out forwards;
		opacity: 0;
	}

	@keyframes cascadeIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.cascade-header {
		margin-bottom: var(--space-sm);
	}

	.cascade-system {
		font-weight: 600;
		color: var(--color-accent);
		font-size: var(--text-body-sm);
	}

	.cascade-change {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
		flex-wrap: wrap;
	}

	.change-before,
	.change-after {
		flex: 1;
		min-width: 200px;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
	}

	.change-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-right: var(--space-xs);
	}

	.change-value {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.change-before {
		opacity: 0.6;
		text-decoration: line-through;
	}

	.change-after {
		border-left: 2px solid var(--color-data-2);
	}

	.change-arrow {
		color: var(--color-fg-muted);
		font-weight: bold;
	}

	.cascade-reason {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		font-style: italic;
	}

	.reason-label {
		color: var(--color-fg-muted);
	}

	.holistic-approval {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 2px solid var(--color-data-2);
		border-radius: var(--radius-lg);
	}

	.approval-icon {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-data-2);
		color: var(--color-bg-pure);
		border-radius: var(--radius-full);
		font-weight: bold;
	}

	.approval-content {
		flex: 1;
	}

	.approval-text {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.approval-time {
		font-size: var(--text-caption);
		color: var(--color-data-2);
		font-weight: 500;
	}

	.holistic-benefit {
		max-width: 700px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.holistic-benefit p {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		line-height: 1.6;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
	}

	.holistic-benefit p:last-child {
		background: linear-gradient(135deg, rgba(100, 200, 100, 0.1), transparent);
		border-left: 3px solid var(--color-data-2);
	}

	.holistic-benefit strong {
		color: var(--color-fg-secondary);
	}
</style>
