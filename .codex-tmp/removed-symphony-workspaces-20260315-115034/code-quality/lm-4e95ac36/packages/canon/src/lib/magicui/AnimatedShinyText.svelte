<script lang="ts">
	/**
	 * AnimatedShinyText - Text with shimmer animation
	 * 
	 * Text with a subtle shimmer that sweeps across periodically.
	 * Port of MagicUI AnimatedShinyText for Svelte.
	 * 
	 * @example
	 * <AnimatedShinyText>
	 *   ✨ Introducing Magic
	 * </AnimatedShinyText>
	 */
	import type { Snippet } from 'svelte';
	
	interface Props {
		class?: string;
		shimmerWidth?: number;
		children?: Snippet;
	}
	
	let {
		class: className = '',
		shimmerWidth = 100,
		children
	}: Props = $props();
</script>

<span
	class="shiny-text {className}"
	style="--shiny-width: {shimmerWidth}px;"
>
	{@render children?.()}
</span>

<style>
	.shiny-text {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(
			120deg,
			currentColor 40%,
			rgba(255, 255, 255, 0.8) 50%,
			currentColor 60%
		);
		background-size: 200% 100%;
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		animation: shiny-text 8s infinite;
	}
	
	@keyframes shiny-text {
		0%, 90%, 100% {
			background-position: calc(-100% - var(--shiny-width)) 0;
		}
		30%, 60% {
			background-position: calc(100% + var(--shiny-width)) 0;
		}
	}
	
	/* Respect reduced motion preference */
	@media (prefers-reduced-motion: reduce) {
		.shiny-text {
			animation: none;
			background: none;
			-webkit-text-fill-color: currentColor;
		}
	}
</style>
