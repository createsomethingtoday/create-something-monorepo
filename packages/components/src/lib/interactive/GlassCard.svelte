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
		background-color: var(--glass-bg-light);
		border: 1px solid var(--glass-border-light);
		backdrop-filter: blur(var(--glass-blur-md)) var(--glass-saturate-md);
		-webkit-backdrop-filter: blur(var(--glass-blur-md)) var(--glass-saturate-md);
		transition:
			background var(--duration-micro, 200ms) var(--ease-standard),
			border-color var(--duration-micro, 200ms) var(--ease-standard),
			box-shadow var(--duration-micro, 200ms) var(--ease-standard),
			transform var(--duration-micro, 200ms) var(--ease-standard);
	}

	/* Variants */
	.glass-card.default {
		background-color: var(--glass-bg-light);
	}

	.glass-card.subtle {
		background-color: var(--glass-bg-subtle);
		border-color: var(--glass-border-subtle);
		backdrop-filter: blur(var(--glass-blur-sm)) var(--glass-saturate-sm);
		-webkit-backdrop-filter: blur(var(--glass-blur-sm)) var(--glass-saturate-sm);
	}

	.glass-card.elevated {
		background-color: var(--glass-bg-medium);
		box-shadow: var(--glass-shadow-md);
		backdrop-filter: blur(var(--glass-blur-lg)) var(--glass-saturate-lg);
		-webkit-backdrop-filter: blur(var(--glass-blur-lg)) var(--glass-saturate-lg);
	}

	/* Hover states */
	.glass-card:hover {
		background-color: var(--glass-bg-medium);
		border-color: var(--glass-border-medium);
		box-shadow: var(--glass-shadow-sm);
	}

	.glass-card.elevated:hover {
		transform: translateY(-4px);
		box-shadow: var(--glass-shadow-lg);
	}

	/* Padding */
	.glass-card.padding-none {
		padding: 0;
	}
	.glass-card.padding-sm {
		padding: var(--space-sm, 1rem);
	}
	.glass-card.padding-md {
		padding: var(--space-md, 1.618rem);
	}
	.glass-card.padding-lg {
		padding: var(--space-lg, 2.618rem);
	}

	/* Border radius */
	.glass-card.radius-sm {
		border-radius: var(--radius-sm, 6px);
	}
	.glass-card.radius-md {
		border-radius: var(--radius-md, 8px);
	}
	.glass-card.radius-lg {
		border-radius: var(--radius-lg, 12px);
	}
	.glass-card.radius-xl {
		border-radius: var(--radius-xl, 16px);
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
		transition: opacity var(--duration-standard, 300ms) var(--ease-standard);
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
