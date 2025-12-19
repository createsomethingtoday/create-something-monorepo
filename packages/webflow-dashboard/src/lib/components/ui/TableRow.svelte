<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLTableRowElement> {
		children?: Snippet;
	}

	let { class: className = '', children, ...restProps }: Props = $props();
</script>

<tr class="table-row {className}" {...restProps}>
	{#if children}
		{@render children()}
	{/if}
</tr>

<style>
	.table-row {
		border-bottom: 1px solid var(--color-border-default);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.table-row:hover {
		background: var(--color-hover);
	}
</style>
