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
		background: rgba(0, 0, 0, 0.90);
		border: 1px solid rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(10px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.card-glass:hover {
		background: rgba(0, 0, 0, 0.92);
		border-color: rgba(255, 255, 255, 0.2);
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
