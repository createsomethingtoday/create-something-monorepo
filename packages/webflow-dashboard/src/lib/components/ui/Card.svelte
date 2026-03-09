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
		border: 1px solid var(--color-shell-border-default);
		background: var(--color-bg-surface);
		box-shadow: var(--shadow-sm);
		transition:
			transform var(--duration-micro) var(--ease-standard),
			border-color var(--duration-micro) var(--ease-standard),
			background-color var(--duration-micro) var(--ease-standard),
			box-shadow var(--duration-micro) var(--ease-standard);
	}

	.card-default {
		border-color: var(--color-shell-border-default);
	}

	.card-elevated {
		border-color: var(--color-info-border);
		box-shadow: var(--shadow-md);
	}

	.card-elevated:hover {
		background: var(--color-bg-subtle);
		border-color: var(--color-info-border);
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
	}

	.card-glass {
		background: var(--glass-bg-strong);
		border-color: color-mix(in srgb, var(--color-info-border) 45%, var(--color-shell-border-default));
	}

	.card-glass:hover {
		background: var(--color-bg-subtle);
		border-color: var(--color-info-border);
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: none;
		}
	}
</style>
