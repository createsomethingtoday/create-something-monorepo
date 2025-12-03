<script lang="ts">
	/**
	 * IsometricSpiral Component
	 *
	 * Visualizes the hermeneutic spiral - understanding that accumulates
	 * rather than resets. Each iteration builds on the previous.
	 *
	 * "We understand parts through the whole, and the whole through its parts."
	 *
	 * The spiral rises upward, with each level representing deeper understanding.
	 */

	import { toIsometric } from './isometric.js';

	interface Props {
		iterations?: number;
		labels?: string[];
		title?: string;
		animate?: boolean;
		size?: number;
		class?: string;
	}

	let {
		iterations = 4,
		labels = ['Basic grasp', 'Refined understanding', 'Nuanced comprehension', 'Deep familiarity'],
		title = 'Understanding accumulates',
		animate = true,
		size = 350,
		class: className = ''
	}: Props = $props();

	// Generate spiral path points
	function generateSpiralPoints(numPoints: number): { x: number; y: number }[] {
		const points: { x: number; y: number }[] = [];
		const baseRadius = 60;
		const heightStep = 25;
		const shrinkRate = 0.85;

		for (let i = 0; i <= numPoints * 8; i++) {
			const angle = (i / 8) * Math.PI * 2;
			const level = Math.floor(i / 8);
			const t = (i % 8) / 8;
			const currentRadius = baseRadius * Math.pow(shrinkRate, level + t);
			const height = (level + t) * heightStep;

			const x3d = Math.cos(angle) * currentRadius;
			const z3d = Math.sin(angle) * currentRadius;
			const y3d = height;

			const iso = toIsometric(x3d, y3d, z3d);
			points.push(iso);
		}

		return points;
	}

	// Generate platform at each level
	function levelPlatform(level: number): string {
		const baseRadius = 60;
		const heightStep = 25;
		const shrinkRate = 0.85;
		const radius = baseRadius * Math.pow(shrinkRate, level);
		const height = level * heightStep;

		const segments = 8;
		const points: { x: number; y: number }[] = [];

		for (let i = 0; i < segments; i++) {
			const angle = (i / segments) * Math.PI * 2;
			const x3d = Math.cos(angle) * radius;
			const z3d = Math.sin(angle) * radius;
			const iso = toIsometric(x3d, height, z3d);
			points.push(iso);
		}

		return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';
	}

	// Center point for each level (for labels)
	function levelCenter(level: number): { x: number; y: number } {
		const heightStep = 25;
		return toIsometric(0, level * heightStep, 0);
	}

	const spiralPoints = $derived(generateSpiralPoints(iterations));
	const spiralPath = $derived(
		spiralPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
	);

	const viewBox = $derived(`-${size / 2} -${size / 1.5} ${size} ${size}`);
</script>

<div class="isometric-spiral {className}">
	<svg viewBox={viewBox} class="spiral-svg">
		<defs>
			<!-- Gradient for spiral -->
			<linearGradient id="spiral-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
				<stop offset="0%" stop-color="rgba(255,255,255,0.2)" />
				<stop offset="100%" stop-color="rgba(255,255,255,0.6)" />
			</linearGradient>
		</defs>

		<!-- Level platforms (ghost circles at each iteration) -->
		<g class="platforms">
			{#each Array(iterations) as _, level}
				{@const delay = level * 300}
				<path d={levelPlatform(level)} class="platform">
					{#if animate}
						<animate
							attributeName="opacity"
							from="0"
							to="0.15"
							dur="400ms"
							begin="{delay}ms"
							fill="freeze"
						/>
					{/if}
				</path>
			{/each}
		</g>

		<!-- Spiral path -->
		<path d={spiralPath} class="spiral-line">
			{#if animate}
				<animate
					attributeName="stroke-dashoffset"
					from="1000"
					to="0"
					dur="2000ms"
					begin="0ms"
					fill="freeze"
					calcMode="spline"
					keySplines="0.4 0 0.2 1"
				/>
			{/if}
		</path>

		<!-- Level markers and labels -->
		<g class="level-markers">
			{#each Array(iterations) as _, level}
				{@const center = levelCenter(level)}
				{@const delay = 500 + level * 300}

				<!-- Marker dot -->
				<circle cx={center.x} cy={center.y} r="4" class="marker">
					{#if animate}
						<animate
							attributeName="opacity"
							from="0"
							to="1"
							dur="300ms"
							begin="{delay}ms"
							fill="freeze"
						/>
					{/if}
				</circle>

				<!-- Level label -->
				{#if labels[level]}
					<text x={center.x + 50} y={center.y} class="level-label" dominant-baseline="middle">
						{#if animate}
							<animate
								attributeName="opacity"
								from="0"
								to="1"
								dur="400ms"
								begin="{delay + 200}ms"
								fill="freeze"
							/>
						{/if}
						{labels[level]}
					</text>
				{/if}

				<!-- Iteration number -->
				<text x={center.x - 45} y={center.y} class="iteration-num" dominant-baseline="middle" text-anchor="end">
					{#if animate}
						<animate
							attributeName="opacity"
							from="0"
							to="1"
							dur="300ms"
							begin="{delay}ms"
							fill="freeze"
						/>
					{/if}
					{level + 1}
				</text>
			{/each}
		</g>

		<!-- Title -->
		{#if title}
			<text x="0" y={size / 3} class="spiral-title" text-anchor="middle">
				{#if animate}
					<animate
						attributeName="opacity"
						from="0"
						to="1"
						dur="500ms"
						begin="{iterations * 300 + 500}ms"
						fill="freeze"
					/>
				{/if}
				{title}
			</text>
		{/if}
	</svg>
</div>

<style>
	.isometric-spiral {
		width: 100%;
		max-width: 450px;
		margin: 0 auto;
	}

	.spiral-svg {
		width: 100%;
		height: auto;
		display: block;
	}

	/* Platforms */
	.platform {
		fill: var(--color-fg-subtle, rgba(255, 255, 255, 0.1));
		stroke: var(--color-fg-muted, rgba(255, 255, 255, 0.3));
		stroke-width: 0.5;
		opacity: 0;
	}

	/* Spiral line */
	.spiral-line {
		fill: none;
		stroke: url(#spiral-gradient);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-dasharray: 1000;
		stroke-dashoffset: 1000;
	}

	/* Markers */
	.marker {
		fill: var(--color-fg-primary, white);
		opacity: 0;
	}

	/* Labels */
	.level-label {
		font-family: var(--font-sans, system-ui);
		font-size: 9px;
		fill: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		opacity: 0;
	}

	.iteration-num {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 600;
		fill: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		opacity: 0;
	}

	/* Title */
	.spiral-title {
		font-family: var(--font-sans, system-ui);
		font-size: 11px;
		font-style: italic;
		fill: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		opacity: 0;
	}
</style>
