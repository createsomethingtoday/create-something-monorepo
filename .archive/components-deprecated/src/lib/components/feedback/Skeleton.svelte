<script lang="ts">
	/**
	 * Skeleton Component
	 *
	 * Content placeholder with pulse animation for loading states.
	 * Provides visual hint of content structure before data loads.
	 *
	 * Canon: The skeleton anticipates; content arrives.
	 */

	interface Props {
		/** Preset shape */
		variant?: 'text' | 'circular' | 'rectangular';
		/** Custom width (CSS value) */
		width?: string;
		/** Custom height (CSS value) */
		height?: string;
		/** Border radius for rectangular (CSS value or size token) */
		radius?: 'none' | 'sm' | 'md' | 'lg' | 'full' | string;
		/** Whether to animate */
		animate?: boolean;
	}

	let {
		variant = 'text',
		width,
		height,
		radius,
		animate = true
	}: Props = $props();

	// Map radius tokens to CSS values
	const radiusMap: Record<string, string> = {
		none: '0',
		sm: 'var(--radius-sm)',
		md: 'var(--radius-md)',
		lg: 'var(--radius-lg)',
		full: 'var(--radius-full)'
	};

	const computedRadius = $derived(
		radius ? (radiusMap[radius] || radius) : undefined
	);

	const style = $derived(
		[
			width ? `width: ${width}` : null,
			height ? `height: ${height}` : null,
			computedRadius ? `border-radius: ${computedRadius}` : null
		]
			.filter(Boolean)
			.join('; ') || undefined
	);
</script>

<div
	class="skeleton skeleton-{variant}"
	class:animate
	{style}
	aria-hidden="true"
></div>

<style>
	.skeleton {
		background: var(--color-bg-subtle);
	}

	.skeleton.animate {
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	/* Text variant - single line of text */
	.skeleton-text {
		height: 1em;
		border-radius: var(--radius-sm);
		width: 100%;
	}

	/* Circular variant - avatar, icon */
	.skeleton-circular {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
	}

	/* Rectangular variant - images, cards */
	.skeleton-rectangular {
		width: 100%;
		height: 120px;
		border-radius: var(--radius-md);
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.skeleton.animate {
			animation: none;
			opacity: 0.7;
		}
	}
</style>
