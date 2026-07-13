<script lang="ts">
	/**
	 * MagicCard - Card with mouse-following gradient glow
	 * 
	 * Premium card effect with gradient that follows cursor position.
	 * Port of MagicUI MagicCard for Svelte.
	 * 
	 * @example
	 * <MagicCard>
	 *   <div class="p-6">Card content</div>
	 * </MagicCard>
	 */
	import type { Snippet } from 'svelte';
	
	interface Props {
		class?: string;
		gradientSize?: number;
		gradientColor?: string;
		gradientOpacity?: number;
		gradientFrom?: string;
		gradientTo?: string;
		children?: Snippet;
	}
	
	let {
		class: className = '',
		gradientSize = 200,
		gradientColor = '#262626',
		gradientOpacity = 0.8,
		gradientFrom = '#9E7AFF',
		gradientTo = '#FE8BBB',
		children
	}: Props = $props();
	
	let mouseX = $state(-200);
	let mouseY = $state(-200);
	
	function handlePointerMove(e: PointerEvent) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		mouseX = e.clientX - rect.left;
		mouseY = e.clientY - rect.top;
	}
	
	function reset() {
		mouseX = -gradientSize;
		mouseY = -gradientSize;
	}
</script>

<div
	class="magic-card {className}"
	onpointermove={handlePointerMove}
	onpointerleave={reset}
	onpointerenter={reset}
	role="presentation"
>
	<!-- Border gradient -->
	<div 
		class="border-gradient"
		style="
			background: radial-gradient(
				{gradientSize}px circle at {mouseX}px {mouseY}px,
				{gradientFrom},
				{gradientTo},
				var(--color-performance-border-default, rgba(255, 255, 255, 0.1)) 100%
			);
		"
	></div>
	
	<!-- Background -->
	<div class="card-bg"></div>
	
	<!-- Hover gradient -->
	<div 
		class="hover-gradient"
		style="
			background: radial-gradient(
				{gradientSize}px circle at {mouseX}px {mouseY}px,
				{gradientColor},
				transparent 100%
			);
			opacity: {gradientOpacity};
		"
	></div>
	
	<!-- Content -->
	<div class="card-content">
		{@render children?.()}
	</div>
</div>

<style>
	.magic-card {
		position: relative;
		border-radius: inherit;
	}
	
	.border-gradient {
		pointer-events: none;
		position: absolute;
		inset: 0;
		border-radius: inherit;
		transition: opacity 300ms;
		opacity: 0;
	}
	
	.magic-card:hover .border-gradient {
		opacity: 1;
	}
	
	.card-bg {
		position: absolute;
		inset: 1px;
		border-radius: inherit;
		background: var(--color-performance-bg-pure, #000000);
	}
	
	.hover-gradient {
		pointer-events: none;
		position: absolute;
		inset: 1px;
		border-radius: inherit;
		opacity: 0;
		transition: opacity 300ms;
	}
	
	.magic-card:hover .hover-gradient {
		opacity: 1;
	}
	
	.card-content {
		position: relative;
	}
</style>
