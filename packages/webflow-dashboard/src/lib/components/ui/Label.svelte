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
		font-family: var(--webflow-font-medium);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--webflow-fg-primary);
		margin-bottom: 0.375rem;
	}

	.required {
		color: var(--webflow-error);
		margin-left: 0.125rem;
	}
</style>
