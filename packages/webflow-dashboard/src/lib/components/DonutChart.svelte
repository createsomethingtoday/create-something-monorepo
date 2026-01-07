<script lang="ts">
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	interface DataPoint {
		label: string;
		value: number;
		color: string;
	}

	interface Props {
		data: DataPoint[];
		size?: number;
		thickness?: number;
	}

	let { data, size = 200, thickness = 30 }: Props = $props();

	const radius = size / 2;
	const innerRadius = radius - thickness;
	const circumference = 2 * Math.PI * (radius - thickness / 2);

	// Calculate total and percentages
	const total = $derived(data.reduce((sum, item) => sum + item.value, 0));
	const segments = $derived(
		data.map((item, index) => {
			const percentage = total > 0 ? item.value / total : 0;
			const dashArray = percentage * circumference;
			// Calculate starting offset based on previous segments
			const previousTotal = data.slice(0, index).reduce((sum, prev) => sum + prev.value, 0);
			const startOffset = total > 0 ? (previousTotal / total) * circumference : 0;

			return {
				...item,
				percentage,
				dashArray,
				startOffset
			};
		})
	);

	// Animate the circle stroke
	const animatedProgress = tweened(0, {
		duration: 1000,
		easing: cubicOut
	});

	$effect(() => {
		animatedProgress.set(1);
	});
</script>

<div class="donut-chart" style="width: {size}px; height: {size}px;">
	<svg viewBox="0 0 {size} {size}" class="donut-svg">
		<!-- Background circle -->
		<circle
			cx={radius}
			cy={radius}
			r={radius - thickness / 2}
			fill="none"
			stroke="var(--color-bg-subtle)"
			stroke-width={thickness}
		/>

		<!-- Segments -->
		{#each segments as segment, index}
			<circle
				cx={radius}
				cy={radius}
				r={radius - thickness / 2}
				fill="none"
				stroke={segment.color}
				stroke-width={thickness}
				stroke-dasharray="{segment.dashArray * $animatedProgress} {circumference}"
				stroke-dashoffset={-segment.startOffset}
				transform="rotate(-90 {radius} {radius})"
				class="segment"
				style="transition-delay: {index * 50}ms;"
			/>
		{/each}
	</svg>

	<!-- Center text -->
	<div class="donut-center">
		<div class="donut-total">{total}</div>
		<div class="donut-label">Total</div>
	</div>
</div>

<style>
	.donut-chart {
		position: relative;
		display: inline-block;
	}

	.donut-svg {
		width: 100%;
		height: 100%;
	}

	.segment {
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.donut-center {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
	}

	.donut-total {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		line-height: 1;
	}

	.donut-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: var(--space-xs);
	}

	@media (prefers-reduced-motion: reduce) {
		.segment {
			transition: none;
		}
	}
</style>
