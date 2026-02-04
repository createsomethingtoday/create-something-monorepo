<script lang="ts">
	/**
	 * Marquee - Infinite scrolling content
	 * 
	 * Horizontally scrolling content that loops infinitely.
	 * Port of MagicUI Marquee for Svelte.
	 * 
	 * @example
	 * <Marquee>
	 *   {#each items as item}
	 *     <Card>{item}</Card>
	 *   {/each}
	 * </Marquee>
	 */
	import type { Snippet } from 'svelte';
	
	interface Props {
		class?: string;
		reverse?: boolean;
		pauseOnHover?: boolean;
		vertical?: boolean;
		repeat?: number;
		duration?: number;
		gap?: number;
		children?: Snippet;
	}
	
	let {
		class: className = '',
		reverse = false,
		pauseOnHover = false,
		vertical = false,
		repeat = 4,
		duration = 40,
		gap = 16,
		children
	}: Props = $props();
</script>

<div
	class="marquee-container {className}"
	class:vertical
	class:pause-on-hover={pauseOnHover}
	style="
		--duration: {duration}s;
		--gap: {gap}px;
	"
>
	{#each Array(repeat) as _, i}
		<div class="marquee-group" class:reverse>
			{@render children?.()}
		</div>
	{/each}
</div>

<style>
	.marquee-container {
		display: flex;
		overflow: hidden;
		gap: var(--gap);
	}
	
	.marquee-container.vertical {
		flex-direction: column;
	}
	
	.marquee-group {
		display: flex;
		flex-shrink: 0;
		gap: var(--gap);
		animation: marquee var(--duration) linear infinite;
	}
	
	.marquee-container.vertical .marquee-group {
		flex-direction: column;
		animation-name: marquee-vertical;
	}
	
	.marquee-group.reverse {
		animation-direction: reverse;
	}
	
	.marquee-container.pause-on-hover:hover .marquee-group {
		animation-play-state: paused;
	}
	
	@keyframes marquee {
		from { transform: translateX(0); }
		to { transform: translateX(calc(-100% - var(--gap))); }
	}
	
	@keyframes marquee-vertical {
		from { transform: translateY(0); }
		to { transform: translateY(calc(-100% - var(--gap))); }
	}
	
	/* Respect reduced motion preference */
	@media (prefers-reduced-motion: reduce) {
		.marquee-group {
			animation: none;
		}
	}
</style>
