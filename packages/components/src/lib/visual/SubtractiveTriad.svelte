<script lang="ts">
	/**
	 * SubtractiveTriad Component
	 *
	 * Isometric visualization of the Subtractive Triad:
	 * DRY (Unify) → Rams (Remove) → Heidegger (Reconnect)
	 *
	 * Demonstrates "creation is removing what obscures" through
	 * an animation where noise fades to reveal the three pillars.
	 *
	 * Replaces ASCII art animation with visual canon equivalent.
	 */

	import { toIsometric } from './isometric.js';

	interface Props {
		animate?: boolean;
		showLabels?: boolean;
		showQuestions?: boolean;
		size?: number;
		class?: string;
	}

	let {
		animate = true,
		showLabels = true,
		showQuestions = true,
		size = 400,
		class: className = ''
	}: Props = $props();

	// Three pillars of the triad
	const pillars = [
		{
			id: 'dry',
			label: 'DRY',
			sublabel: 'Implementation',
			action: 'Unify',
			question: 'Have I built this before?',
			x: -80
		},
		{
			id: 'rams',
			label: 'Rams',
			sublabel: 'Artifact',
			action: 'Remove',
			question: 'Does this earn its existence?',
			x: 0
		},
		{
			id: 'heidegger',
			label: 'Heidegger',
			sublabel: 'System',
			action: 'Reconnect',
			question: 'Does this serve the whole?',
			x: 80
		}
	];

	// Generate isometric pillar paths
	function pillarPath(x: number, height: number): { top: string; left: string; right: string } {
		const w = 50;
		const d = 30;
		const y = 0;
		const z = 0;

		const v = [
			toIsometric(x, y, z),
			toIsometric(x + w, y, z),
			toIsometric(x + w, y + height, z),
			toIsometric(x, y + height, z),
			toIsometric(x, y, z + d),
			toIsometric(x + w, y, z + d),
			toIsometric(x + w, y + height, z + d),
			toIsometric(x, y + height, z + d)
		];

		return {
			top: `M ${v[3].x} ${v[3].y} L ${v[2].x} ${v[2].y} L ${v[6].x} ${v[6].y} L ${v[7].x} ${v[7].y} Z`,
			left: `M ${v[0].x} ${v[0].y} L ${v[3].x} ${v[3].y} L ${v[7].x} ${v[7].y} L ${v[4].x} ${v[4].y} Z`,
			right: `M ${v[1].x} ${v[1].y} L ${v[5].x} ${v[5].y} L ${v[6].x} ${v[6].y} L ${v[2].x} ${v[2].y} Z`
		};
	}

	// Noise particles for the reveal effect
	const noiseCount = 60;
	const noiseParticles = Array.from({ length: noiseCount }, (_, i) => ({
		x: (Math.random() - 0.5) * size * 0.8,
		y: (Math.random() - 0.5) * size * 0.5,
		size: Math.random() * 3 + 1,
		delay: Math.random() * 800
	}));

	const viewBox = $derived(`-${size / 2} -${size / 2.5} ${size} ${size * 0.8}`);
</script>

<div class="subtractive-triad {className}">
	<svg viewBox={viewBox} class="triad-svg">
		<defs>
			<!-- Gradient for pillars -->
			<linearGradient id="pillar-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stop-color="rgba(255,255,255,0.15)" />
				<stop offset="100%" stop-color="rgba(255,255,255,0.05)" />
			</linearGradient>
		</defs>

		<!-- Noise layer (fades out) -->
		<g class="noise-layer">
			{#each noiseParticles as particle, i}
				<rect
					x={particle.x}
					y={particle.y}
					width={particle.size}
					height={particle.size}
					class="noise-particle"
					style:--delay="{particle.delay}ms"
				>
					{#if animate}
						<animate
							attributeName="opacity"
							from="0.4"
							to="0"
							dur="1200ms"
							begin="{particle.delay}ms"
							fill="freeze"
						/>
					{/if}
				</rect>
			{/each}
		</g>

		<!-- Three pillars -->
		<g class="pillars" transform="translate(0, 20)">
			{#each pillars as pillar, index}
				{@const paths = pillarPath(pillar.x, 80)}
				{@const delay = 600 + index * 200}

				<g class="pillar" data-id={pillar.id}>
					<!-- Pillar faces -->
					<path d={paths.top} class="face face-top">
						{#if animate}
							<animate
								attributeName="opacity"
								from="0"
								to="1"
								dur="500ms"
								begin="{delay}ms"
								fill="freeze"
							/>
						{/if}
					</path>
					<path d={paths.left} class="face face-left">
						{#if animate}
							<animate
								attributeName="opacity"
								from="0"
								to="1"
								dur="500ms"
								begin="{delay + 50}ms"
								fill="freeze"
							/>
						{/if}
					</path>
					<path d={paths.right} class="face face-right">
						{#if animate}
							<animate
								attributeName="opacity"
								from="0"
								to="1"
								dur="500ms"
								begin="{delay + 100}ms"
								fill="freeze"
							/>
						{/if}
					</path>

					<!-- Labels (appear after pillars) -->
					{#if showLabels}
						{@const labelY = -60}
						<g class="labels" transform="translate({pillar.x + 25}, {labelY})">
							<text class="pillar-label" text-anchor="middle" y="0">
								{#if animate}
									<animate
										attributeName="opacity"
										from="0"
										to="1"
										dur="300ms"
										begin="{delay + 400}ms"
										fill="freeze"
									/>
								{/if}
								{pillar.label}
							</text>
							<text class="pillar-sublabel" text-anchor="middle" y="12">
								{#if animate}
									<animate
										attributeName="opacity"
										from="0"
										to="1"
										dur="300ms"
										begin="{delay + 500}ms"
										fill="freeze"
									/>
								{/if}
								{pillar.sublabel}
							</text>
							<text class="pillar-action" text-anchor="middle" y="26">
								{#if animate}
									<animate
										attributeName="opacity"
										from="0"
										to="1"
										dur="300ms"
										begin="{delay + 600}ms"
										fill="freeze"
									/>
								{/if}
								{pillar.action}
							</text>
						</g>
					{/if}
				</g>
			{/each}
		</g>

		<!-- Questions (appear last) -->
		{#if showQuestions}
			<g class="questions" transform="translate(0, {size * 0.25})">
				{#each pillars as pillar, index}
					{@const delay = 1400 + index * 150}
					<text
						x={pillar.x + 25}
						y="0"
						class="question"
						text-anchor="middle"
					>
						{#if animate}
							<animate
								attributeName="opacity"
								from="0"
								to="1"
								dur="400ms"
								begin="{delay}ms"
								fill="freeze"
							/>
						{/if}
						"{pillar.question}"
					</text>
				{/each}
			</g>
		{/if}

		<!-- Meta-principle (appears last) -->
		<text x="0" y={size * 0.35} class="meta-principle" text-anchor="middle">
			{#if animate}
				<animate
					attributeName="opacity"
					from="0"
					to="1"
					dur="500ms"
					begin="2000ms"
					fill="freeze"
				/>
			{/if}
			"Creation is removing what obscures."
		</text>
	</svg>
</div>

<style>
	.subtractive-triad {
		width: 100%;
		max-width: 500px;
		margin: 0 auto;
	}

	.triad-svg {
		width: 100%;
		height: auto;
		display: block;
	}

	/* Noise particles */
	.noise-particle {
		fill: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		opacity: 0.4;
	}

	/* Pillar faces */
	.face {
		stroke: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
		opacity: 0;
	}

	.face-top {
		fill: var(--color-fg-subtle, rgba(255, 255, 255, 0.15));
	}

	.face-left {
		fill: var(--color-bg-subtle, rgba(255, 255, 255, 0.08));
	}

	.face-right {
		fill: var(--color-bg-elevated, rgba(255, 255, 255, 0.03));
	}

	/* Labels */
	.pillar-label {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 600;
		fill: var(--color-fg-primary, white);
		opacity: 0;
	}

	.pillar-sublabel {
		font-family: var(--font-sans, system-ui);
		font-size: 8px;
		fill: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		opacity: 0;
	}

	.pillar-action {
		font-family: var(--font-sans, system-ui);
		font-size: 9px;
		font-weight: 500;
		fill: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		opacity: 0;
	}

	/* Questions */
	.question {
		font-family: var(--font-sans, system-ui);
		font-size: 7px;
		font-style: italic;
		fill: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		opacity: 0;
	}

	/* Meta-principle */
	.meta-principle {
		font-family: var(--font-sans, system-ui);
		font-size: 10px;
		font-style: italic;
		fill: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		opacity: 0;
	}

	/* Hover states */
	.pillar:hover .face {
		stroke: var(--color-fg-secondary, rgba(255, 255, 255, 0.6));
	}

	.pillar:hover .face-top {
		fill: var(--color-fg-muted, rgba(255, 255, 255, 0.25));
	}
</style>
