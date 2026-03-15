<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLTableSectionElement> {
		children?: Snippet;
	}

	let { class: className = '', children, ...restProps }: Props = $props();
</script>

<tbody class="table-body {className}" {...restProps}>
	{#if children}
		{@render children()}
	{/if}
</tbody>

<style>
	.table-body :global(tr:last-child) {
		border-bottom: none;
	}
</style>
