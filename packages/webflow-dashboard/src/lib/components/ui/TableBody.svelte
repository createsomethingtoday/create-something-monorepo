<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
	}

	let { children, class: className = '' }: Props = $props();
</script>

<tbody class="table-body {className}">
	{@render children()}
</tbody>

<style>
	.table-body {
		background: var(--color-bg-surface);
	}
</style>
