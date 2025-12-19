<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
	}

	let { children, class: className = '' }: Props = $props();
</script>

<td class="table-cell {className}">
	{@render children()}
</td>

<style>
	.table-cell {
		padding: var(--space-sm) var(--space-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
	}
</style>
