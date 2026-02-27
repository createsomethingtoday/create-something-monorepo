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
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-surface);
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			background-color var(--duration-micro) var(--ease-standard);
	}

	.card-default {
		border-color: var(--color-border-default);
	}

	.card-elevated {
		border-color: var(--color-border-emphasis);
	}

	.card-elevated:hover {
		background: var(--color-bg-subtle);
		border-color: var(--color-border-emphasis);
	}

	.card-glass {
		background: var(--color-bg-surface);
		border-color: color-mix(in srgb, var(--color-border-emphasis) 65%, var(--color-border-default));
	}

	.card-glass:hover {
		background: var(--color-bg-subtle);
		border-color: var(--color-border-emphasis);
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: none;
		}
	}
</style>
