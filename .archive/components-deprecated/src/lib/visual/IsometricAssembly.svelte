<script lang="ts">
	/**
	 * IsometricAssembly Component
	 *
	 * Visualizes the hermeneutic circle through animated assembly.
	 * Parts appear, move into position, and form a unified whole.
	 * Labels emerge AFTER assembly - naming follows being.
	 *
	 * "We understand parts through the whole, and the whole through its parts."
	 *
	 * The animation sequence embodies the three levels:
	 * 1. Parts appear (DRY - discrete units)
	 * 2. Parts assemble (Rams - minimal connections)
	 * 3. Whole emerges with labels (Heidegger - meaning crystallizes)
	 */

	import { toIsometric } from './isometric.js';
	import { inview } from './inview.js';

	type AssemblyPart = {
		id: string;
		label: string;
		position: { x: number; y: number; z: number };
		size: { w: number; h: number; d: number };
		startOffset?: { x: number; y: number };
	};

	interface Props {
		parts?: AssemblyPart[];
		title?: string;
		showLabels?: boolean;
		animate?: boolean;
		animateOnScroll?: boolean;
		size?: number;
		class?: string;
	}

	// Default: The four domains as stacked boxes
	const defaultParts: AssemblyPart[] = [
		{
			id: 'ltd',
			label: '.ltd',
			position: { x: 0, y: 0, z: 0 },
			size: { w: 60, h: 20, d: 60 },
			startOffset: { x: -100, y: 50 }
		},
		{
			id: 'io',
			label: '.io',
			position: { x: 0, y: 20, z: 0 },
			size: { w: 60, h: 20, d: 60 },
			startOffset: { x: 100, y: -30 }
		},
		{
			id: 'space',
			label: '.space',
			position: { x: 0, y: 40, z: 0 },
			size: { w: 60, h: 20, d: 60 },
			startOffset: { x: -80, y: -60 }
		},
		{
			id: 'agency',
			label: '.agency',
			position: { x: 0, y: 60, z: 0 },
			size: { w: 60, h: 20, d: 60 },
			startOffset: { x: 80, y: 80 }
		}
	];

	let {
		parts = defaultParts,
		title = 'The Hermeneutic Circle',
		showLabels = true,
		animate = true,
		animateOnScroll = false,
		size = 300,
		class: className = ''
	}: Props = $props();

	// Scroll-triggered animation state
	let isInView = $state(!animateOnScroll);
	const shouldAnimate = $derived(animate && isInView);

	// Convert 3D positions to 2D isometric
	function getPartPosition(part: AssemblyPart): { x: number; y: number } {
		const { x, y, z } = part.position;
		const { w, h, d } = part.size;
		// Center of the box
		return toIsometric(x + w / 2, y + h / 2, z + d / 2);
	}

	// Generate isometric box path
	function boxPath(part: AssemblyPart): { top: string; left: string; right: string } {
		const { x, y, z } = part.position;
		const { w, h, d } = part.size;

		// Calculate all 8 vertices in isometric projection
		const v = [
			toIsometric(x, y, z), // 0: bottom-left-front
			toIsometric(x + w, y, z), // 1: bottom-right-front
			toIsometric(x + w, y + h, z), // 2: top-right-front
			toIsometric(x, y + h, z), // 3: top-left-front
			toIsometric(x, y, z + d), // 4: bottom-left-back
			toIsometric(x + w, y, z + d), // 5: bottom-right-back
			toIsometric(x + w, y + h, z + d), // 6: top-right-back
			toIsometric(x, y + h, z + d) // 7: top-left-back
		];

		return {
			top: `M ${v[3].x} ${v[3].y} L ${v[2].x} ${v[2].y} L ${v[6].x} ${v[6].y} L ${v[7].x} ${v[7].y} Z`,
			left: `M ${v[0].x} ${v[0].y} L ${v[3].x} ${v[3].y} L ${v[7].x} ${v[7].y} L ${v[4].x} ${v[4].y} Z`,
			right: `M ${v[1].x} ${v[1].y} L ${v[5].x} ${v[5].y} L ${v[6].x} ${v[6].y} L ${v[2].x} ${v[2].y} Z`
		};
	}

	// Calculate label position (right side of box)
	function labelPosition(part: AssemblyPart): { x: number; y: number } {
		const { x, y, z } = part.position;
		const { w, h } = part.size;
		const iso = toIsometric(x + w + 10, y + h / 2, z);
		return iso;
	}

	const viewBox = $derived(`-${size / 2} -${size / 2} ${size} ${size}`);
</script>

<div
	class="isometric-assembly {className}"
	use:inview={{ threshold: 0.3 }}
	oninview={() => (isInView = true)}
>
	<svg {viewBox} class="assembly-svg">
		<defs>
			<!-- Stripe pattern for texture -->
			<pattern
				id="stripes"
				patternUnits="userSpaceOnUse"
				width="4"
				height="4"
				patternTransform="rotate(45)"
			>
				<line x1="0" y1="0" x2="0" y2="4" class="stripe-line" />
			</pattern>
		</defs>

		<!-- Assembly group - all parts -->
		<g class="parts-group">
			{#each parts as part, index}
				{@const paths = boxPath(part)}
				{@const pos = getPartPosition(part)}
				{@const labelPos = labelPosition(part)}
				{@const startX = part.startOffset?.x ?? 0}
				{@const startY = part.startOffset?.y ?? 0}
				{@const delay = index * 200}

				<g class="part" data-id={part.id}>
					<!-- Box faces -->
					<g class="box-faces">
						<!-- Top face (lightest) -->
						<path d={paths.top} class="face face-top">
							{#if shouldAnimate}
								<animateTransform
									attributeName="transform"
									type="translate"
									from="{startX} {startY}"
									to="0 0"
									dur="600ms"
									begin="{delay}ms"
									fill="freeze"
									calcMode="spline"
									keySplines="0.2 0 0 1"
								/>
								<animate
									attributeName="opacity"
									from="0"
									to="1"
									dur="400ms"
									begin="{delay}ms"
									fill="freeze"
								/>
							{/if}
						</path>

						<!-- Left face -->
						<path d={paths.left} class="face face-left">
							{#if shouldAnimate}
								<animateTransform
									attributeName="transform"
									type="translate"
									from="{startX} {startY}"
									to="0 0"
									dur="600ms"
									begin="{delay}ms"
									fill="freeze"
									calcMode="spline"
									keySplines="0.2 0 0 1"
								/>
								<animate
									attributeName="opacity"
									from="0"
									to="1"
									dur="400ms"
									begin="{delay}ms"
									fill="freeze"
								/>
							{/if}
						</path>

						<!-- Right face (darkest) -->
						<path d={paths.right} class="face face-right">
							{#if shouldAnimate}
								<animateTransform
									attributeName="transform"
									type="translate"
									from="{startX} {startY}"
									to="0 0"
									dur="600ms"
									begin="{delay}ms"
									fill="freeze"
									calcMode="spline"
									keySplines="0.2 0 0 1"
								/>
								<animate
									attributeName="opacity"
									from="0"
									to="1"
									dur="400ms"
									begin="{delay}ms"
									fill="freeze"
								/>
							{/if}
						</path>
					</g>

					<!-- Label - appears after assembly -->
					{#if showLabels}
						<text
							x={labelPos.x + 15}
							y={labelPos.y}
							class="part-label"
							dominant-baseline="middle"
						>
							{#if shouldAnimate}
								<animate
									attributeName="opacity"
									from="0"
									to="1"
									dur="300ms"
									begin="{delay + 600}ms"
									fill="freeze"
								/>
							{/if}
							{part.label}
						</text>
					{/if}
				</g>
			{/each}
		</g>

		<!-- Title - appears last -->
		{#if title}
			<text x="0" y={size / 2 - 20} class="assembly-title" text-anchor="middle">
				{#if shouldAnimate}
					<animate
						attributeName="opacity"
						from="0"
						to="1"
						dur="400ms"
						begin="{parts.length * 200 + 400}ms"
						fill="freeze"
					/>
				{/if}
				{title}
			</text>
		{/if}
	</svg>
</div>

<style>
	.isometric-assembly {
		width: 100%;
		max-width: 400px;
		margin: 0 auto;
	}

	.assembly-svg {
		width: 100%;
		height: auto;
		display: block;
	}

	/* Stripe pattern */
	.stripe-line {
		stroke: currentColor;
		stroke-width: 0.5;
		stroke-opacity: 0.15;
	}

	/* Box faces */
	.face {
		stroke: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
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
	.part-label {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		fill: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		opacity: 0;
	}

	/* Title */
	.assembly-title {
		font-family: var(--font-sans, system-ui);
		font-size: 12px;
		fill: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		font-style: italic;
		opacity: 0;
	}

	/* Hover interactions */
	.part:hover .face {
		stroke: var(--color-fg-secondary, rgba(255, 255, 255, 0.6));
	}

	.part:hover .face-top {
		fill: var(--color-fg-muted, rgba(255, 255, 255, 0.25));
	}
</style>
