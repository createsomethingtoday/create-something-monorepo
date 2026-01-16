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

	// System states - simulating real-time automation data
	let securityStatus = $state<'armed' | 'monitoring' | 'alert'>('monitoring');
	let lightingMode = $state<'event' | 'ambient' | 'emergency'>('event');
	let hvacZones = $state([
		{ id: 1, name: 'Main Floor', temp: 72, target: 72, active: true },
		{ id: 2, name: 'Upper Bowl', temp: 74, target: 72, active: true },
		{ id: 3, name: 'Concourse', temp: 71, target: 70, active: true },
		{ id: 4, name: 'VIP Suites', temp: 70, target: 70, active: true }
	]);
	let currentEvent = $state({
		name: 'NBA Western Conference Finals',
		phase: 'Second Quarter',
		attendance: 18_847,
		capacity: 19_500
	});
	let notifications = $state([
		{ id: 1, system: 'Security', message: 'Perimeter scan complete', time: '2s ago', priority: 'low' },
		{ id: 2, system: 'HVAC', message: 'Zone 2 adjusting +2°', time: '15s ago', priority: 'medium' },
		{ id: 3, system: 'Lighting', message: 'Court lights at 100%', time: '30s ago', priority: 'low' }
	]);

	// Animation state
	let mounted = $state(false);
	let tick = $state(0);

	onMount(() => {
		mounted = true;

		// Simulation tick - creates the "living" effect
		const interval = setInterval(() => {
			tick = (tick + 1) % 360;

			// Occasionally update notifications
			if (tick % 60 === 0) {
				const systems = ['Security', 'Lighting', 'HVAC', 'Scheduling'];
				const messages = [
					'Routine scan completed',
					'Pattern recognized',
					'Automation triggered',
					'Status nominal'
				];
				notifications = [
					{
						id: Date.now(),
						system: systems[Math.floor(Math.random() * systems.length)],
						message: messages[Math.floor(Math.random() * messages.length)],
						time: 'now',
						priority: 'low' as const
					},
					...notifications.slice(0, 2)
				];
			}

			// HVAC temperature drift simulation
			if (tick % 45 === 0) {
				hvacZones = hvacZones.map((zone) => ({
					...zone,
					temp: zone.target + Math.round((Math.random() - 0.5) * 4)
				}));
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

<svelte:head>
	<title>Living Arena | Experiments | CREATE SOMETHING</title>
	<meta
		name="description"
		content="Visualization of AI-native automations orchestrating arena systems through WORKWAY pattern collection."
	/>
</svelte:head>

<div class="arena-experiment">
	<!-- Header -->
	<header class="experiment-header">
		<div class="header-content">
			<span class="experiment-label">Experiment</span>
			<h1 class="experiment-title">Living Arena</h1>
			<p class="experiment-description">
				AI-native automations orchestrating all systems of an arena through WORKWAY pattern
				collection. Security, lighting, HVAC, scheduling, and notifications—all breathing as one.
			</p>
		</div>
		<div class="event-badge">
			<span class="event-phase">{currentEvent.phase}</span>
			<span class="event-name">{currentEvent.name}</span>
			<span class="attendance">{currentEvent.attendance.toLocaleString()} / {currentEvent.capacity.toLocaleString()}</span>
		</div>
	</header>

	<!-- Main Visualization -->
	<div class="visualization-container">
		<!-- Arena SVG -->
		<svg class="arena-svg" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
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
			</defs>

			<!-- Background -->
			<rect width="800" height="600" fill="var(--color-bg-pure)" />
			<rect width="800" height="600" fill="url(#grid)" />

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
			<g class="entry-points" fill="var(--color-data-4)">
				<rect x="395" y="15" width="10" height="20" rx="2" class="entry north" />
				<rect x="395" y="565" width="10" height="20" rx="2" class="entry south" />
				<rect x="15" y="295" width="20" height="10" rx="2" class="entry west" />
				<rect x="765" y="295" width="20" height="10" rx="2" class="entry east" />
			</g>

			<!-- Labels -->
			<g class="labels" font-size="10" fill="var(--color-fg-tertiary)">
				<text x="400" y="50" text-anchor="middle">NORTH ENTRANCE</text>
				<text x="400" y="570" text-anchor="middle">SOUTH ENTRANCE</text>
				<text x="60" y="305" text-anchor="middle">WEST</text>
				<text x="740" y="305" text-anchor="middle">EAST</text>
			</g>
		</svg>

		<!-- System Status Panels -->
		<div class="status-panels">
			<!-- Security Panel -->
			<div class="status-panel security-panel">
				<div class="panel-header">
					<span class="panel-icon">🛡️</span>
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
					<span class="panel-icon">💡</span>
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
					<span class="panel-icon">🌡️</span>
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
					<span class="panel-icon">📡</span>
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

	<!-- Footer -->
	<footer class="experiment-footer">
		<div class="hypothesis">
			<h3>Hypothesis</h3>
			<p>
				WORKWAY pattern collection enables AI-native automations that can orchestrate complex venue
				operations at arena scale. By capturing business logic as reusable patterns, we create
				automations that are intelligent across multiple dimensions—security awareness informs lighting,
				scheduling drives HVAC, and all systems breathe as one coherent organism.
			</p>
		</div>
		<div class="patterns-note">
			<span class="label">Patterns Demonstrated</span>
			<div class="pattern-tags">
				<span class="tag">venue-security-perimeter</span>
				<span class="tag">adaptive-lighting-zones</span>
				<span class="tag">hvac-occupancy-optimization</span>
				<span class="tag">event-phase-scheduling</span>
				<span class="tag">cross-system-orchestration</span>
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
</style>
