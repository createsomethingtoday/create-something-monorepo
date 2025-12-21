<script lang="ts">
	/**
	 * CubeSkeleton - Skeleton Placeholder with Cube Motif
	 *
	 * Content placeholder that uses the isometric cube as a visual anchor
	 * while content loads. Implements shimmer animation per Canon motion tokens.
	 *
	 * "Good design is as little design as possible" - Dieter Rams
	 *
	 * @example
	 * <CubeSkeleton lines={3} showHeader showImage />
	 */

	import type { SkeletonProps } from '../types.js';

	// =============================================================================
	// PROPS
	// =============================================================================

	interface Props extends SkeletonProps {
		/** Additional CSS classes */
		class?: string;
	}

	let {
		lines = 3,
		showHeader = false,
		showImage = false,
		class: className = ''
	}: Props = $props();

	// Generate line widths for visual variety
	// Uses a deterministic pattern: 100%, 85%, 70% cycling
	const lineWidths = $derived(
		Array.from({ length: lines }, (_, i) => {
			const pattern = [100, 85, 70];
			return pattern[i % pattern.length];
		})
	);
</script>

<div class="cube-skeleton {className}" role="status" aria-label="Loading content">
	<!-- Cube motif anchor -->
	<div class="skeleton-cube">
		<svg viewBox="0 0 32 32" class="cube-icon" aria-hidden="true">
			<!-- Top face -->
			<path d="M 16 4 L 26.39 10 L 16 16 L 5.61 10 Z" class="face-top" />
			<!-- Left face -->
			<path d="M 5.61 10 L 16 16 L 16 28 L 5.61 22 Z" class="face-left" />
			<!-- Right face -->
			<path d="M 16 16 L 26.39 10 L 26.39 22 L 16 28 Z" class="face-right" />
		</svg>
	</div>

	<!-- Content skeleton -->
	<div class="skeleton-content">
		{#if showImage}
			<div class="skeleton-image shimmer" aria-hidden="true"></div>
		{/if}

		{#if showHeader}
			<div class="skeleton-header shimmer" aria-hidden="true"></div>
		{/if}

		{#if lines > 0}
			<div class="skeleton-lines" aria-hidden="true">
				{#each lineWidths as width, i}
					<div class="skeleton-line shimmer" style="--line-width: {width}%"></div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Screen reader text -->
	<span class="sr-only">Loading...</span>
</div>

<style>
	.cube-skeleton {
		display: flex;
		gap: var(--space-sm);
		padding: var(--space-sm);
	}

	/* Cube motif */
	.skeleton-cube {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
	}

	.cube-icon {
		width: 100%;
		height: 100%;
	}

	.face-top {
		fill: var(--color-fg-subtle);
		opacity: 1;
	}

	.face-left {
		fill: var(--color-fg-subtle);
		opacity: 0.6;
	}

	.face-right {
		fill: var(--color-fg-subtle);
		opacity: 0.3;
	}

	/* Content area */
	.skeleton-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	/* Image skeleton */
	.skeleton-image {
		width: 100%;
		height: 120px;
		border-radius: var(--radius-md);
		background: var(--color-bg-subtle);
	}

	/* Header skeleton */
	.skeleton-header {
		height: 24px;
		width: 60%;
		border-radius: var(--radius-sm);
		background: var(--color-bg-subtle);
	}

	/* Lines skeleton */
	.skeleton-lines {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.skeleton-line {
		height: 14px;
		width: var(--line-width, 100%);
		border-radius: var(--radius-sm);
		background: var(--color-bg-subtle);
	}

	/* Shimmer animation */
	.shimmer {
		position: relative;
		overflow: hidden;
	}

	.shimmer::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			transparent 0%,
			var(--color-hover) 50%,
			transparent 100%
		);
		transform: translateX(-100%);
		animation: shimmer var(--duration-slow) var(--ease-standard) infinite;
	}

	@keyframes shimmer {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(100%);
		}
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

	/* Respect reduced motion preference */
	@media (prefers-reduced-motion: reduce) {
		.shimmer::after {
			animation: none;
		}
	}
</style>
