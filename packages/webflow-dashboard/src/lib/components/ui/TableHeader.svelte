<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
	}

	let { children, class: className = '' }: Props = $props();
</script>

<thead class="table-header {className}">
	{@render children()}
</thead>

<style>
	.table-header {
		border-bottom: 1px solid var(--color-border-emphasis);
		background: var(--color-bg-subtle);
	}
</style>
