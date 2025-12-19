<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
	}

	let { children, class: className = '' }: Props = $props();
</script>

<tr class="table-row {className}">
	{@render children()}
</tr>

<style>
	.table-row {
		border-bottom: 1px solid var(--color-border-default);
		transition: background-color var(--duration-micro) var(--ease-standard);
	}

	.table-row:hover {
		background: var(--color-hover);
	}

	.table-row:last-child {
		border-bottom: none;
	}
</style>
