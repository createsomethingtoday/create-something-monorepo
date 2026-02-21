<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Variant = 'default' | 'elevated' | 'glass';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		variant?: Variant;
		children?: Snippet;
	}

	let {
		variant = 'default',
		class: className = '',
		children,
		...restProps
	}: Props = $props();
</script>

<div class="card card-{variant} {className}" {...restProps}>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.card {
		border-radius: var(--radius-lg);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.card-default {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
	}

	.card-elevated {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		box-shadow: var(--shadow-md);
	}

	.card-elevated:hover {
		transform: translateY(-4px) scale(1.01);
		box-shadow: var(--shadow-lg);
		border-color: var(--color-border-emphasis);
	}

	.card-glass {
		background: color-mix(in srgb, var(--color-bg-surface) 86%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-border-emphasis) 55%, transparent);
		backdrop-filter: blur(10px);
		box-shadow: var(--shadow-md);
	}

	.card-glass:hover {
		background: color-mix(in srgb, var(--color-bg-surface) 92%, transparent);
		border-color: color-mix(in srgb, var(--color-border-emphasis) 75%, transparent);
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: none;
		}

		.card-elevated:hover,
		.card-glass:hover {
			transform: none;
		}
	}
</style>
