<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Variant = 'default' | 'elevated';

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
		transform: translateY(-4px);
		box-shadow: var(--shadow-lg);
	}
</style>
