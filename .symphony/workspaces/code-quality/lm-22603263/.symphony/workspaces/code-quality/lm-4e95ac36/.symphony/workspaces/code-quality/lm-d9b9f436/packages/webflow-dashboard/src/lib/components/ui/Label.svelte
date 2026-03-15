<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLLabelAttributes } from 'svelte/elements';

	interface Props extends HTMLLabelAttributes {
		children?: Snippet;
	}

	let { class: className = '', children, ...restProps }: Props = $props();
</script>

<label class="label {className}" {...restProps}>
	{#if children}
		{@render children()}
	{/if}
</label>

<style>
	.label {
		display: block;
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}
</style>
