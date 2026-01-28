<script lang="ts">
	/**
	 * CubeLoader - Cube-based Loading Spinner
	 *
	 * Brand-aligned loading indicator using the isometric cube mark.
	 * Implements spin, pulse, and assemble animation variants per Canon motion tokens.
	 *
	 * "Good design is as little design as possible" - Dieter Rams
	 *
	 * @example
	 * <CubeLoader />
	 * <CubeLoader variant="pulse" message="Loading data..." />
	 * <CubeLoader variant="assemble" size="lg" />
	 */

	import type { LoaderProps, BrandSize } from '../types.js';
	import { BRAND_SIZE_MAP } from '../types.js';

	// =============================================================================
	// PROPS
	// =============================================================================

	interface Props extends LoaderProps {
		/** Additional CSS classes */
		class?: string;
	}

	let {
		size = 'md',
		variant = 'spin',
		message = '',
		class: className = ''
	}: Props = $props();

	// Resolve size to pixels
	const sizeInPx = $derived(
		typeof size === 'number' ? size : BRAND_SIZE_MAP[size as BrandSize]
	);

	// Animation class based on variant
	const animationClass = $derived(
		variant === 'spin' ? 'loader-spin' :
		variant === 'pulse' ? 'loader-pulse' :
		variant === 'assemble' ? 'loader-assemble' : ''
	);
</script>

<div
	class="cube-loader {animationClass} {className}"
	style="--loader-size: {sizeInPx}px"
	role="status"
	aria-live="polite"
	aria-busy="true"
>
	<svg
		viewBox="0 0 32 32"
		class="cube-icon"
		aria-hidden="true"
	>
		{#if variant === 'assemble'}
			<!-- Assemble variant: faces animate in separately -->
			<path d="M 16 4 L 26.39 10 L 16 16 L 5.61 10 Z" class="face-top" />
			<path d="M 5.61 10 L 16 16 L 16 28 L 5.61 22 Z" class="face-left" />
			<path d="M 16 16 L 26.39 10 L 26.39 22 L 16 28 Z" class="face-right" />
		{:else}
			<!-- Default: single cube mark -->
			<path d="M 16 4 L 26.39 10 L 16 16 L 5.61 10 Z" class="face-top" />
			<path d="M 5.61 10 L 16 16 L 16 28 L 5.61 22 Z" class="face-left" />
			<path d="M 16 16 L 26.39 10 L 26.39 22 L 16 28 Z" class="face-right" />
		{/if}
	</svg>

	{#if message}
		<span class="loader-message">{message}</span>
	{/if}

	<!-- Screen reader text -->
	<span class="sr-only">{message || 'Loading...'}</span>
</div>

<style>
	.cube-loader {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
	}

	.cube-icon {
		width: var(--loader-size, 32px);
		height: var(--loader-size, 32px);
	}

	/* Face colors following Canon opacities */
	.face-top {
		fill: var(--color-fg-primary);
		opacity: 1;
	}

	.face-left {
		fill: var(--color-fg-primary);
		opacity: 0.6;
	}

	.face-right {
		fill: var(--color-fg-primary);
		opacity: 0.3;
	}

	/* Loading message */
	.loader-message {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* ==========================================================================
	   Spin Animation
	   Continuous rotation for indeterminate loading
	   ========================================================================== */

	.loader-spin .cube-icon {
		animation: loader-spin calc(var(--duration-complex, 500ms) * 2) linear infinite;
	}

	@keyframes loader-spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* ==========================================================================
	   Pulse Animation
	   Subtle breathing effect for background loading
	   ========================================================================== */

	.loader-pulse .cube-icon {
		animation: loader-pulse var(--duration-complex, 500ms) var(--ease-standard) infinite alternate;
	}

	@keyframes loader-pulse {
		from {
			opacity: 0.5;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* ==========================================================================
	   Assemble Animation
	   Faces appear sequentially - used for initial load states
	   ========================================================================== */

	.loader-assemble .face-top {
		animation: face-assemble var(--duration-complex, 500ms) var(--ease-standard) infinite;
		animation-delay: 0ms;
	}

	.loader-assemble .face-left {
		animation: face-assemble var(--duration-complex, 500ms) var(--ease-standard) infinite;
		animation-delay: 150ms;
	}

	.loader-assemble .face-right {
		animation: face-assemble var(--duration-complex, 500ms) var(--ease-standard) infinite;
		animation-delay: 300ms;
	}

	@keyframes face-assemble {
		0%, 100% {
			opacity: 0.2;
		}
		50% {
			opacity: 1;
		}
	}

	/* Adjust base opacities for assemble animation */
	.loader-assemble .face-top {
		opacity: 0.2;
	}

	.loader-assemble .face-left {
		opacity: 0.2;
	}

	.loader-assemble .face-right {
		opacity: 0.2;
	}

	/* Screen reader only */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* ==========================================================================
	   Reduced Motion
	   Respect user preferences
	   ========================================================================== */

	@media (prefers-reduced-motion: reduce) {
		.loader-spin .cube-icon,
		.loader-pulse .cube-icon,
		.loader-assemble .face-top,
		.loader-assemble .face-left,
		.loader-assemble .face-right {
			animation: none;
		}

		/* Restore standard face opacities when animation disabled */
		.loader-assemble .face-top {
			opacity: 1;
		}

		.loader-assemble .face-left {
			opacity: 0.6;
		}

		.loader-assemble .face-right {
			opacity: 0.3;
		}
	}
</style>
