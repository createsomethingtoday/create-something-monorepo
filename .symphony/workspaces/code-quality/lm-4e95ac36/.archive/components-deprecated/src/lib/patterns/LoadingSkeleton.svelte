<script lang="ts">
	/**
	 * Loading Skeleton Pattern
	 *
	 * Displays placeholder UI while content is loading.
	 * Reduces perceived wait time by showing the expected layout.
	 *
	 * Canon Principle: Anticipation over emptiness.
	 * A skeleton previews structure, turning waiting into expectation.
	 *
	 * @example
	 * // Single text skeleton
	 * <LoadingSkeleton variant="text" />
	 *
	 * // Multiple text lines
	 * <LoadingSkeleton variant="text" count={3} />
	 *
	 * // Avatar skeleton
	 * <LoadingSkeleton variant="avatar" />
	 *
	 * // Card skeleton
	 * <LoadingSkeleton variant="card" />
	 *
	 * // Custom dimensions
	 * <LoadingSkeleton width="200px" height="50px" />
	 */

	interface Props {
		/** Number of skeleton items to render */
		count?: number;
		/** Skeleton variant for different content types */
		variant?: 'text' | 'avatar' | 'card' | 'row' | 'custom';
		/** Width of the skeleton (CSS value) */
		width?: string;
		/** Height of the skeleton (CSS value) */
		height?: string;
		/** Enable shimmer animation */
		animated?: boolean;
		/** Border radius variant */
		radius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
		/** Accessible loading label */
		label?: string;
	}

	let {
		count = 1,
		variant = 'text',
		width,
		height,
		animated = true,
		radius,
		label = 'Loading content'
	}: Props = $props();

	const defaultDimensions = {
		text: { width: '100%', height: '1rem' },
		avatar: { width: '3rem', height: '3rem' },
		card: { width: '100%', height: '12rem' },
		row: { width: '100%', height: '4rem' },
		custom: { width: '100%', height: '2rem' }
	};

	const defaultRadius = {
		text: 'sm',
		avatar: 'full',
		card: 'lg',
		row: 'md',
		custom: 'sm'
	} as const;

	const effectiveWidth = $derived(width ?? defaultDimensions[variant].width);
	const effectiveHeight = $derived(height ?? defaultDimensions[variant].height);
	const effectiveRadius = $derived(radius ?? defaultRadius[variant]);
</script>

<div
	class="skeleton-container"
	role="status"
	aria-busy="true"
	aria-label={label}
>
	{#each Array(count) as _, i}
		<div
			class="skeleton skeleton--{variant} skeleton--radius-{effectiveRadius}"
			class:skeleton--animated={animated}
			style:width={effectiveWidth}
			style:height={effectiveHeight}
			aria-hidden="true"
		></div>
	{/each}
	<span class="visually-hidden">{label}</span>
</div>

<style>
	.skeleton-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.skeleton {
		background: var(--color-bg-subtle);
		position: relative;
		overflow: hidden;
	}

	/* Radius variants */
	.skeleton--radius-none {
		border-radius: 0;
	}

	.skeleton--radius-sm {
		border-radius: var(--radius-sm);
	}

	.skeleton--radius-md {
		border-radius: var(--radius-md);
	}

	.skeleton--radius-lg {
		border-radius: var(--radius-lg);
	}

	.skeleton--radius-full {
		border-radius: var(--radius-full);
	}

	/* Shimmer animation */
	.skeleton--animated::after {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		background: linear-gradient(
			90deg,
			transparent,
			var(--color-hover),
			transparent
		);
		animation: shimmer 1.5s infinite;
		transform: translateX(-100%);
	}

	@keyframes shimmer {
		100% {
			transform: translateX(100%);
		}
	}

	/* Respect reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.skeleton--animated::after {
			animation: none;
			background: var(--color-hover);
			transform: none;
		}
	}

	/* Variant-specific styles */
	.skeleton--row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
	}

	.skeleton--card {
		border: 1px solid var(--color-border-default);
	}

	/* Screen reader only */
	.visually-hidden {
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
</style>
