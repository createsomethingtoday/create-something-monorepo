<script lang="ts">
	/**
	 * AnimatedGridPattern - Animated SVG grid background
	 * 
	 * Creates a subtle grid with randomly animating squares.
	 * Port of MagicUI AnimatedGridPattern for Svelte.
	 * 
	 * @see https://magicui.design/docs/components/animated-grid-pattern
	 * 
	 * @example
	 * <div class="relative">
	 *   <AnimatedGridPattern numSquares={30} maxOpacity={0.1} />
	 *   <div class="relative z-10">Content</div>
	 * </div>
	 */
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		class?: string;
		width?: number;
		height?: number;
		x?: number;
		y?: number;
		strokeDasharray?: number;
		numSquares?: number;
		maxOpacity?: number;
		duration?: number;
		repeatDelay?: number;
	}

	let {
		class: className = '',
		width = 40,
		height = 40,
		x = -1,
		y = -1,
		strokeDasharray = 0,
		numSquares = 50,
		maxOpacity = 0.3,
		duration = 3,
		repeatDelay = 1
	}: Props = $props();

	// Generate unique ID
	const id = browser ? crypto.randomUUID().replace(/-/g, '').slice(0, 8) : 'ssr';

	let containerRef: SVGSVGElement;
	let dimensions = $state({ width: 0, height: 0 });
	let squares = $state<Array<{ id: number; col: number; row: number; delay: number }>>([]);

	// Calculate grid dimensions
	const cols = $derived(dimensions.width > 0 ? Math.ceil(dimensions.width / width) : 10);
	const rows = $derived(dimensions.height > 0 ? Math.ceil(dimensions.height / height) : 10);

	// Generate random squares
	function generateSquares() {
		return Array.from({ length: numSquares }, (_, i) => ({
			id: i,
			col: Math.floor(Math.random() * cols),
			row: Math.floor(Math.random() * rows),
			delay: Math.random() * duration * 2 // Random initial delay
		}));
	}

	onMount(() => {
		const updateDimensions = () => {
			if (containerRef) {
				const rect = containerRef.getBoundingClientRect();
				dimensions = { width: rect.width, height: rect.height };
			}
		};

		updateDimensions();
		squares = generateSquares();

		window.addEventListener('resize', updateDimensions);
		return () => window.removeEventListener('resize', updateDimensions);
	});

	// Regenerate squares when dimensions change
	$effect(() => {
		if (dimensions.width > 0 && dimensions.height > 0) {
			squares = generateSquares();
		}
	});
</script>

<svg
	bind:this={containerRef}
	aria-hidden="true"
	class="animated-grid-pattern {className}"
	style="--duration: {duration}s; --repeat-delay: {repeatDelay}s; --max-opacity: {maxOpacity};"
>
	<defs>
		<pattern
			id="grid-{id}"
			width={width}
			height={height}
			patternUnits="userSpaceOnUse"
			{x}
			{y}
		>
			<path
				d="M.5 {height}V.5H{width}"
				fill="none"
				stroke-dasharray={strokeDasharray}
			/>
		</pattern>
	</defs>

	<!-- Grid lines -->
	<rect width="100%" height="100%" fill="url(#grid-{id})" />

	<!-- Animated squares -->
	<svg {x} {y} class="overflow-visible">
		{#each squares as square (square.id)}
			<rect
				class="animated-square"
				width={width - 1}
				height={height - 1}
				x={square.col * width + 1}
				y={square.row * height + 1}
				style="animation-delay: {square.delay}s;"
			/>
		{/each}
	</svg>
</svg>

<style>
	.animated-grid-pattern {
		pointer-events: none;
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		fill: rgba(255, 255, 255, 0.03);
		stroke: rgba(255, 255, 255, 0.06);
	}

	.animated-square {
		fill: currentColor;
		stroke-width: 0;
		opacity: 0;
		animation: grid-pulse calc(var(--duration) * 2) ease-in-out infinite;
	}

	@keyframes grid-pulse {
		0%, 100% {
			opacity: 0;
		}
		50% {
			opacity: var(--max-opacity);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.animated-square {
			animation: none;
			opacity: calc(var(--max-opacity) * 0.5);
		}
	}
</style>
