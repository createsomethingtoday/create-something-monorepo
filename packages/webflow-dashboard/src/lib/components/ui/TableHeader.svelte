<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLTableSectionElement> {
		children?: Snippet;
	}

	let { class: className = '', children, ...restProps }: Props = $props();
</script>

<thead class="table-header {className}" {...restProps}>
	{#if children}
		{@render children()}
	{/if}
</thead>

<style>
	.table-header {
		border-bottom: 1px solid var(--color-border-default);
	}
</style>
