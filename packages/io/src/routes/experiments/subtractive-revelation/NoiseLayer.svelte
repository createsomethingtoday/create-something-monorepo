<script lang="ts">
	/**
	 * NoiseLayer - Particles that conceal the underlying truth
	 *
	 * Follows the SubtractiveTriad.svelte pattern for noise particles.
	 * Each particle can be individually revealed (removed) through interaction.
	 */

	import type { Particle } from './types';

	interface Props {
		particles: Particle[];
	}

	let { particles }: Props = $props();
</script>

<g class="noise-layer">
	{#each particles as particle (particle.id)}
		<rect
			x={particle.x}
			y={particle.y}
			width={particle.width}
			height={particle.height}
			class="noise-particle"
			class:revealed={particle.revealed}
			style:--particle-opacity={particle.opacity}
			style:--reveal-delay="{particle.revealDelay}ms"
		/>
	{/each}
</g>

<style>
	.noise-particle {
		fill: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		opacity: var(--particle-opacity, 0.4);
		transition:
			opacity var(--duration-micro, 200ms) var(--ease-standard, ease),
			transform var(--duration-micro, 200ms) var(--ease-standard, ease);
		transition-delay: var(--reveal-delay, 0ms);
	}

	.noise-particle.revealed {
		opacity: 0;
		transform: translateY(-4px) scale(0.9);
	}
</style>
