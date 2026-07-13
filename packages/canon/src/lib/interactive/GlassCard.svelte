<script lang="ts">
	/**
	 * GlassCard - Frosted glass card with hover shine effect
	 *
	 * Port of Maverick X pattern. Uses backdrop-filter for
	 * glass effect with gradient shine on hover.
	 *
	 * @example
	 * <GlassCard>
	 *   <h3>Feature Title</h3>
	 *   <p>Description text</p>
	 * </GlassCard>
	 */
	import { browser } from '$app/environment';

	interface Props {
		/** Card variant */
		variant?: 'default' | 'subtle' | 'elevated';
		/** Show shine effect on hover */
		showShine?: boolean;
		/** Padding size */
		padding?: 'none' | 'sm' | 'md' | 'lg';
		/** Border radius */
		radius?: 'sm' | 'md' | 'lg' | 'xl';
		/** Additional classes */
		class?: string;
		/** Children */
		children?: import('svelte').Snippet;
	}

	let {
		variant = 'default',
		showShine = true,
		padding = 'md',
		radius = 'lg',
		class: className = '',
		children
	}: Props = $props();

	// Check for reduced motion preference
	const prefersReducedMotion = browser
		? window.matchMedia('(prefers-reduced-motion: reduce)').matches
		: false;
</script>

<div
	class="glass-card {variant} padding-{padding} radius-{radius} {className}"
	class:show-shine={showShine && !prefersReducedMotion}
>
	<!-- Edge glow -->
	<div class="edge-glow"></div>

	<!-- Shine effect on hover -->
	{#if showShine && !prefersReducedMotion}
		<div class="shine"></div>
	{/if}

	<!-- Content -->
	<div class="content">
		{@render children?.()}
	</div>
</div>

<style>
	.glass-card {
		position: relative;
		overflow: hidden;
		/* Glass Design System - "The Automation Layer" */
		background-color: var(--glass-performance-bg-light);
		border: 1px solid var(--glass-performance-border-light);
		backdrop-filter: blur(var(--glass-performance-blur-md)) var(--glass-performance-saturate-md);
		transition:
			background var(--duration-performance-micro, 200ms) var(--ease-performance-standard),
			border-color var(--duration-performance-micro, 200ms) var(--ease-performance-standard),
			box-shadow var(--duration-performance-micro, 200ms) var(--ease-performance-standard),
			transform var(--duration-performance-micro, 200ms) var(--ease-performance-standard);
	}

	/* Variants */
	.glass-card.default {
		background-color: var(--glass-performance-bg-light);
	}

	.glass-card.subtle {
		background-color: var(--glass-performance-bg-subtle);
		border-color: var(--glass-performance-border-subtle);
		backdrop-filter: blur(var(--glass-performance-blur-sm)) var(--glass-performance-saturate-sm);
	}

	.glass-card.elevated {
		background-color: var(--glass-performance-bg-medium);
		box-shadow: var(--glass-performance-shadow-md);
		backdrop-filter: blur(var(--glass-performance-blur-lg)) var(--glass-performance-saturate-lg);
	}

	/* Hover states */
	.glass-card:hover {
		background-color: var(--glass-performance-bg-medium);
		border-color: var(--glass-performance-border-medium);
		box-shadow: var(--glass-performance-shadow-sm);
	}

	.glass-card.elevated:hover {
		transform: translateY(-4px);
		box-shadow: var(--glass-performance-shadow-lg);
	}

	/* Padding */
	.glass-card.padding-none {
		padding: 0;
	}
	.glass-card.padding-sm {
		padding: var(--space-performance-sm, 1rem);
	}
	.glass-card.padding-md {
		padding: var(--space-performance-md, 1.618rem);
	}
	.glass-card.padding-lg {
		padding: var(--space-performance-lg, 2.618rem);
	}

	/* Border radius */
	.glass-card.radius-sm {
		border-radius: var(--radius-performance-scale-sm, 6px);
	}
	.glass-card.radius-md {
		border-radius: var(--radius-performance-scale-md, 8px);
	}
	.glass-card.radius-lg {
		border-radius: var(--radius-performance-scale-lg, 12px);
	}
	.glass-card.radius-xl {
		border-radius: var(--radius-performance-scale-xl, 16px);
	}

	/* Edge glow - subtle gradient at top */
	.edge-glow {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to bottom right,
			rgba(255, 255, 255, 0.1) 0%,
			transparent 50%,
			transparent 100%
		);
		pointer-events: none;
		opacity: 0.5;
	}

	/* Shine effect on hover */
	.shine {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to bottom right,
			rgba(255, 255, 255, 0.15) 0%,
			transparent 40%,
			transparent 100%
		);
		opacity: 0;
		transition: opacity var(--duration-performance-standard, 300ms) var(--ease-performance-standard);
		pointer-events: none;
	}

	.glass-card:hover .shine {
		opacity: 1;
	}

	/* Content */
	.content {
		position: relative;
		z-index: 1;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.glass-card {
			transition: none;
		}

		.glass-card.elevated:hover {
			transform: none;
		}

		.shine {
			display: none;
		}
	}
</style>
