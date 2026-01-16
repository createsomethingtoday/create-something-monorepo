<script lang="ts">
	import { onMount } from 'svelte';

	let mounted = false;
	let time = 0;
	let hoveredArena: string | null = null;
	let activePattern: number | null = null;

	const arenas = [
		{ id: 'dental', label: 'Dental', color: '#00D4AA', angle: 0 },
		{ id: 'legal', label: 'Legal', color: '#7B61FF', angle: 45 },
		{ id: 'medical', label: 'Medical', color: '#FF6B6B', angle: 90 },
		{ id: 'creative', label: 'Creative', color: '#FFB800', angle: 135 },
		{ id: 'hospitality', label: 'Hospitality', color: '#00B4D8', angle: 180 },
		{ id: 'architecture', label: 'Architecture', color: '#E056FD', angle: 225 },
		{ id: 'finance', label: 'Finance', color: '#20BF6B', angle: 270 },
		{ id: 'consulting', label: 'Consulting', color: '#FA8231', angle: 315 }
	];

	const patterns = [
		{ id: 1, name: 'No-Show Recovery', from: 'dental', flows: ['medical', 'legal'] },
		{ id: 2, name: 'Lead Scoring', from: 'creative', flows: ['consulting', 'legal'] },
		{ id: 3, name: 'Appointment Reminders', from: 'medical', flows: ['dental', 'hospitality'] },
		{ id: 4, name: 'Consultation Booking', from: 'legal', flows: ['finance', 'consulting'] },
		{ id: 5, name: 'Portfolio Showcase', from: 'architecture', flows: ['creative'] },
		{ id: 6, name: 'Reservation System', from: 'hospitality', flows: ['medical', 'dental'] }
	];

	// Animation loop
	onMount(() => {
		mounted = true;
		let frame: number;
		const animate = () => {
			time += 0.008;
			frame = requestAnimationFrame(animate);
		};
		animate();
		return () => cancelAnimationFrame(frame);
	});

	// Helper functions
	function getArenaPosition(angle: number, radius: number) {
		const rad = (angle - 90) * (Math.PI / 180);
		return {
			x: 400 + Math.cos(rad) * radius,
			y: 400 + Math.sin(rad) * radius
		};
	}

	function getArenaById(id: string) {
		return arenas.find((a) => a.id === id);
	}

	// Particle paths between arenas
	function getPatternPath(from: string, to: string) {
		const fromArena = getArenaById(from);
		const toArena = getArenaById(to);
		if (!fromArena || !toArena) return '';

		const fromPos = getArenaPosition(fromArena.angle, 200);
		const toPos = getArenaPosition(toArena.angle, 200);

		// Curved path through center
		const midX = 400 + (fromPos.x + toPos.x - 800) * 0.2;
		const midY = 400 + (fromPos.y + toPos.y - 800) * 0.2;

		return `M ${fromPos.x} ${fromPos.y} Q ${midX} ${midY} ${toPos.x} ${toPos.y}`;
	}
</script>

<svelte:head>
	<title>Arena-Scale AI-Native Automation | CREATE SOMETHING</title>
	<meta
		name="description"
		content="Visualizing how pattern collection enables AI-native automation at arena scale"
	/>
</svelte:head>

<div class="container">
	<header>
		<h1>Arena-Scale Automation</h1>
		<p class="subtitle">How Pattern Collection Enables AI-Native Systems Across Industries</p>
	</header>

	<div class="visualization-wrapper">
		<svg viewBox="0 0 800 800" class="arena-viz">
			<defs>
				<!-- Radial gradient for the core -->
				<radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
					<stop offset="0%" stop-color="#00D4AA" stop-opacity="0.4" />
					<stop offset="50%" stop-color="#7B61FF" stop-opacity="0.2" />
					<stop offset="100%" stop-color="transparent" />
				</radialGradient>

				<!-- Pattern flow gradient -->
				{#each arenas as arena}
					<linearGradient id="flow-{arena.id}" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stop-color={arena.color} stop-opacity="0.8" />
						<stop offset="100%" stop-color={arena.color} stop-opacity="0" />
					</linearGradient>
				{/each}

				<!-- Glow filter -->
				<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="3" result="blur" />
					<feMerge>
						<feMergeNode in="blur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>

				<!-- Arrow marker -->
				<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
					<polygon points="0 0, 10 3.5, 0 7" fill="#ffffff" fill-opacity="0.5" />
				</marker>
			</defs>

			<!-- Background grid -->
			<g class="grid" opacity="0.1">
				{#each Array(8) as _, i}
					<circle cx="400" cy="400" r={(i + 1) * 50} fill="none" stroke="#ffffff" />
				{/each}
				{#each Array(8) as _, i}
					<line
						x1="400"
						y1="0"
						x2="400"
						y2="800"
						stroke="#ffffff"
						transform="rotate({i * 45} 400 400)"
					/>
				{/each}
			</g>

			<!-- Central core - WORKWAY/CREATE SOMETHING -->
			<g class="core">
				<circle cx="400" cy="400" r="120" fill="url(#coreGlow)" />

				<!-- Rotating inner ring -->
				<circle
					cx="400"
					cy="400"
					r="80"
					fill="none"
					stroke="#00D4AA"
					stroke-width="1"
					stroke-dasharray="10 5"
					transform="rotate({time * 20} 400 400)"
					opacity="0.6"
				/>

				<!-- Core labels -->
				<text x="400" y="385" class="core-title" text-anchor="middle">WORKWAY</text>
				<text x="400" y="410" class="core-subtitle" text-anchor="middle">Pattern Engine</text>

				<!-- Subtractive Triad indicators -->
				<g transform="rotate({time * 15} 400 400)">
					{#each ['DRY', 'RAMS', 'HEIDEGGER'] as triad, i}
						{@const angle = i * 120 - 90}
						{@const rad = angle * (Math.PI / 180)}
						{@const x = 400 + Math.cos(rad) * 55}
						{@const y = 400 + Math.sin(rad) * 55}
						<circle cx={x} cy={y} r="4" fill="#ffffff" opacity="0.8" />
					{/each}
				</g>
			</g>

			<!-- Pattern flow connections -->
			<g class="pattern-flows">
				{#each patterns as pattern, i}
					{@const fromArena = getArenaById(pattern.from)}
					{#if fromArena}
						{#each pattern.flows as toId}
							{@const path = getPatternPath(pattern.from, toId)}
							<path
								d={path}
								fill="none"
								stroke={fromArena.color}
								stroke-width={activePattern === pattern.id || hoveredArena === pattern.from ? 3 : 1}
								stroke-opacity={activePattern === pattern.id || hoveredArena === pattern.from
									? 0.8
									: 0.2}
								marker-end="url(#arrowhead)"
								class="flow-path"
							/>

							<!-- Animated particle along path -->
							{#if mounted}
								<circle r="3" fill={fromArena.color} filter="url(#glow)">
									<animateMotion dur="{2 + i * 0.3}s" repeatCount="indefinite" path={path} />
								</circle>
							{/if}
						{/each}
					{/if}
				{/each}
			</g>

			<!-- Arena nodes -->
			{#each arenas as arena}
				{@const pos = getArenaPosition(arena.angle, 200)}
				<g
					class="arena-node"
					class:hovered={hoveredArena === arena.id}
					on:mouseenter={() => (hoveredArena = arena.id)}
					on:mouseleave={() => (hoveredArena = null)}
					role="button"
					tabindex="0"
				>
					<!-- Outer ring -->
					<circle
						cx={pos.x}
						cy={pos.y}
						r="50"
						fill="transparent"
						stroke={arena.color}
						stroke-width="2"
						opacity={hoveredArena === arena.id ? 1 : 0.6}
					/>

					<!-- Inner fill -->
					<circle
						cx={pos.x}
						cy={pos.y}
						r="40"
						fill={arena.color}
						fill-opacity={hoveredArena === arena.id ? 0.3 : 0.1}
					/>

					<!-- Pulsing indicator -->
					{#if mounted}
						<circle cx={pos.x} cy={pos.y} r="45" fill="none" stroke={arena.color} stroke-width="1">
							<animate
								attributeName="r"
								values="45;55;45"
								dur="{2 + arena.angle * 0.01}s"
								repeatCount="indefinite"
							/>
							<animate
								attributeName="opacity"
								values="0.6;0;0.6"
								dur="{2 + arena.angle * 0.01}s"
								repeatCount="indefinite"
							/>
						</circle>
					{/if}

					<!-- Arena label -->
					<text
						x={pos.x}
						y={pos.y + 5}
						class="arena-label"
						text-anchor="middle"
						fill={arena.color}
						opacity={hoveredArena === arena.id ? 1 : 0.8}
					>
						{arena.label}
					</text>

					<!-- Agent indicator -->
					<circle cx={pos.x + 30} cy={pos.y - 30} r="8" fill="#0D0D0D" stroke={arena.color} />
					<text x={pos.x + 30} y={pos.y - 26} class="agent-icon" text-anchor="middle" fill="#fff"
						>⚡</text
					>
				</g>
			{/each}

			<!-- Outer ring - Financial Freedom indicator -->
			<g class="freedom-ring">
				<circle
					cx="400"
					cy="400"
					r="320"
					fill="none"
					stroke="url(#coreGlow)"
					stroke-width="4"
					stroke-dasharray="20 10"
					transform="rotate({-time * 5} 400 400)"
				/>

				<!-- Label -->
				{#if mounted}
					<text class="freedom-label">
						<textPath href="#freedomPath" startOffset="50%" text-anchor="middle">
							AI-NATIVE AUTOMATION AT ARENA SCALE
						</textPath>
					</text>
					<path
						id="freedomPath"
						d="M 80 400 A 320 320 0 1 1 80 401"
						fill="none"
						stroke="none"
					/>
				{/if}
			</g>

			<!-- Multi-dimensional indicators -->
			<g class="dimensions" transform="translate(400, 400)">
				{#each [0, 1, 2] as dim}
					{@const radius = 280 + dim * 15}
					<circle
						r={radius}
						fill="none"
						stroke="#7B61FF"
						stroke-width="0.5"
						stroke-dasharray="5 15"
						opacity={0.3 - dim * 0.1}
						transform="rotate({time * (10 + dim * 5)})"
					/>
				{/each}
			</g>
		</svg>

		<!-- Legend -->
		<div class="legend">
			<h3>The Hypothesis</h3>
			<div class="hypothesis">
				<p>
					Pattern collection via <strong>WORKWAY</strong> creates a
					<em>compound intelligence effect</em>:
				</p>
				<ul>
					<li>
						<span class="bullet" style="background: #00D4AA"></span>
						<strong>Horizontal:</strong> Patterns flow between verticals
					</li>
					<li>
						<span class="bullet" style="background: #7B61FF"></span>
						<strong>Vertical:</strong> Deep industry-specific automation
					</li>
					<li>
						<span class="bullet" style="background: #FFB800"></span>
						<strong>Temporal:</strong> Patterns compound over time
					</li>
				</ul>
				<p class="result">
					Result: <strong>Arena-scale automation</strong> — entire industries, not just individual
					businesses
				</p>
			</div>

			<h3>Active Patterns</h3>
			<div class="patterns-list">
				{#each patterns as pattern}
					{@const arena = getArenaById(pattern.from)}
					<button
						class="pattern-item"
						class:active={activePattern === pattern.id}
						on:click={() => (activePattern = activePattern === pattern.id ? null : pattern.id)}
						style="--accent: {arena?.color}"
					>
						<span class="pattern-dot" style="background: {arena?.color}"></span>
						<span class="pattern-name">{pattern.name}</span>
						<span class="pattern-flow"
							>{pattern.from} → {pattern.flows.length} arena{pattern.flows.length > 1 ? 's' : ''}</span
						>
					</button>
				{/each}
			</div>
		</div>
	</div>

	<section class="insight">
		<h2>Financial Freedom Through Pattern Leverage</h2>
		<div class="insight-grid">
			<div class="insight-card">
				<div class="icon">🔄</div>
				<h3>Pattern Flywheel</h3>
				<p>Each client engagement refines patterns. Refined patterns enable faster, better future engagements. Value compounds.</p>
			</div>
			<div class="insight-card">
				<div class="icon">🤖</div>
				<h3>AI-Native Core</h3>
				<p>Agents don't just execute—they learn. Pattern collection is training data for your domain-specific automation.</p>
			</div>
			<div class="insight-card">
				<div class="icon">🎯</div>
				<h3>Arena Scale</h3>
				<p>When patterns reach critical mass, you can automate entire industry categories—not just individual workflows.</p>
			</div>
		</div>
	</section>
</div>

<style>
	:global(body) {
		background: #0a0a0f;
		color: #e0e0e0;
		font-family: 'JetBrains Mono', 'SF Mono', monospace;
	}

	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
	}

	header {
		text-align: center;
		margin-bottom: 3rem;
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 300;
		letter-spacing: 0.1em;
		background: linear-gradient(135deg, #00d4aa 0%, #7b61ff 50%, #ffb800 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: #666;
		font-size: 1rem;
		letter-spacing: 0.05em;
	}

	.visualization-wrapper {
		display: grid;
		grid-template-columns: 1fr 320px;
		gap: 2rem;
		margin-bottom: 4rem;
	}

	.arena-viz {
		width: 100%;
		max-width: 800px;
		height: auto;
		background: radial-gradient(circle at center, #141420 0%, #0a0a0f 70%);
		border-radius: 1rem;
		border: 1px solid #1a1a2e;
	}

	.core-title {
		font-size: 1rem;
		font-weight: 600;
		fill: #00d4aa;
		letter-spacing: 0.15em;
	}

	.core-subtitle {
		font-size: 0.6rem;
		fill: #666;
		letter-spacing: 0.1em;
	}

	.arena-label {
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.agent-icon {
		font-size: 0.5rem;
	}

	.arena-node {
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.arena-node.hovered {
		filter: url(#glow);
	}

	.flow-path {
		transition: all 0.3s ease;
	}

	.freedom-label {
		font-size: 0.55rem;
		fill: #7b61ff;
		letter-spacing: 0.3em;
		opacity: 0.6;
	}

	.legend {
		background: #111118;
		border-radius: 1rem;
		padding: 1.5rem;
		border: 1px solid #1a1a2e;
	}

	.legend h3 {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: #7b61ff;
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #1a1a2e;
	}

	.hypothesis {
		margin-bottom: 2rem;
	}

	.hypothesis p {
		font-size: 0.85rem;
		line-height: 1.6;
		color: #999;
		margin-bottom: 1rem;
	}

	.hypothesis ul {
		list-style: none;
		padding: 0;
		margin: 1rem 0;
	}

	.hypothesis li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.8rem;
		margin-bottom: 0.75rem;
		color: #ccc;
	}

	.bullet {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.result {
		background: linear-gradient(135deg, rgba(0, 212, 170, 0.1), rgba(123, 97, 255, 0.1));
		padding: 1rem;
		border-radius: 0.5rem;
		border-left: 2px solid #00d4aa;
		font-size: 0.85rem !important;
		color: #e0e0e0 !important;
	}

	.patterns-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.pattern-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: #0a0a0f;
		border: 1px solid #1a1a2e;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: inherit;
		color: #999;
	}

	.pattern-item:hover,
	.pattern-item.active {
		border-color: var(--accent);
		background: rgba(123, 97, 255, 0.05);
	}

	.pattern-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.pattern-name {
		flex: 1;
		font-size: 0.75rem;
		color: #e0e0e0;
	}

	.pattern-flow {
		font-size: 0.65rem;
		color: #666;
	}

	.insight {
		text-align: center;
	}

	.insight h2 {
		font-size: 1.5rem;
		font-weight: 300;
		letter-spacing: 0.05em;
		margin-bottom: 2rem;
		color: #e0e0e0;
	}

	.insight-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	.insight-card {
		background: #111118;
		border: 1px solid #1a1a2e;
		border-radius: 1rem;
		padding: 2rem;
		text-align: left;
		transition: all 0.3s ease;
	}

	.insight-card:hover {
		border-color: #7b61ff;
		transform: translateY(-4px);
	}

	.insight-card .icon {
		font-size: 2rem;
		margin-bottom: 1rem;
	}

	.insight-card h3 {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
		color: #00d4aa;
	}

	.insight-card p {
		font-size: 0.85rem;
		line-height: 1.6;
		color: #999;
	}

	@media (max-width: 1024px) {
		.visualization-wrapper {
			grid-template-columns: 1fr;
		}

		.legend {
			order: 2;
		}
	}

	@media (max-width: 768px) {
		.insight-grid {
			grid-template-columns: 1fr;
		}

		h1 {
			font-size: 1.75rem;
		}
	}
</style>
