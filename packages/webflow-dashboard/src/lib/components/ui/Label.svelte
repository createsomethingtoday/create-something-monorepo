<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLLabelAttributes } from 'svelte/elements';

	interface Props extends HTMLLabelAttributes {
		required?: boolean;
		children: Snippet;
	}

	let {
		required = false,
		children,
		class: className = '',
		...restProps
	}: Props = $props();
</script>

<label class="label {className}" {...restProps}>
	{@render children()}
	{#if required}
		<span class="required" aria-hidden="true">*</span>
	{/if}
</label>

<style>
	.label {
		display: block;
		font-family: var(--font-sans);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin-bottom: 0.375rem;
	}

	.required {
		color: var(--color-error);
		margin-left: 0.125rem;
	}
</style>
