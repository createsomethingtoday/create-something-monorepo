<script lang="ts">
	/**
	 * BorderBeam - Animated beam that travels around the border of a container
	 * Inspired by MagicUI's BorderBeam component
	 */

	interface Props {
		/** Size of the beam in pixels */
		size?: number;
		/** Duration of one full loop in seconds */
		duration?: number;
		/** Anchor point for the beam (0-100) */
		anchor?: number;
		/** Border width in pixels */
		borderWidth?: number;
		/** Starting gradient color */
		colorFrom?: string;
		/** Ending gradient color */
		colorTo?: string;
		/** Animation delay in seconds */
		delay?: number;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		size = 200,
		duration = 15,
		anchor = 90,
		borderWidth = 1.5,
		colorFrom = '#ffaa40',
		colorTo = '#9c40ff',
		delay = 0,
		class: className = ''
	}: Props = $props();
</script>

<div
	class="border-beam {className}"
	style:--beam-size="{size}px"
	style:--beam-duration="{duration}s"
	style:--beam-anchor="{anchor}%"
	style:--beam-border-width="{borderWidth}px"
	style:--beam-color-from={colorFrom}
	style:--beam-color-to={colorTo}
	style:--beam-delay="{delay}s"
	aria-hidden="true"
></div>

<style>
	.border-beam {
		pointer-events: none;
		position: absolute;
		inset: 0;
		border-radius: inherit;
		border: var(--beam-border-width) solid transparent;

		/* Mask to show only the border area */
		mask-clip: padding-box, border-box;
		mask-composite: intersect;
		mask-image: linear-gradient(transparent, transparent), linear-gradient(white, white);
		-webkit-mask-clip: padding-box, border-box;
		-webkit-mask-composite: source-in;
		-webkit-mask-image: linear-gradient(transparent, transparent), linear-gradient(white, white);
	}

	.border-beam::after {
		content: '';
		position: absolute;
		aspect-ratio: 1;
		width: var(--beam-size);
		background: linear-gradient(
			to left,
			var(--beam-color-from),
			var(--beam-color-to),
			transparent
		);
		offset-anchor: var(--beam-anchor) 50%;
		offset-path: rect(0 auto auto 0 round var(--beam-size));
		animation: border-beam-travel var(--beam-duration) linear infinite;
		animation-delay: var(--beam-delay);
	}

	@keyframes border-beam-travel {
		0% {
			offset-distance: 0%;
		}
		100% {
			offset-distance: 100%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.border-beam::after {
			animation: none;
			offset-distance: 25%;
			opacity: 0.55;
		}
	}
</style>
