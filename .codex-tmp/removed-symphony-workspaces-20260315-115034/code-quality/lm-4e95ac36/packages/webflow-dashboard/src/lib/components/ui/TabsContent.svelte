<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		value: string;
		active?: boolean;
		children?: Snippet;
	}

	let {
		value,
		active = false,
		class: className = '',
		children,
		...restProps
	}: Props = $props();
</script>

{#if active}
	<div
		class="tabs-content {className}"
		role="tabpanel"
		data-value={value}
		{...restProps}
	>
		{#if children}
			{@render children()}
		{/if}
	</div>
{/if}

<style>
	.tabs-content {
		margin-top: var(--space-md);
	}

	.tabs-content:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
</style>
