<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
	}

	let { children, class: className = '' }: Props = $props();
</script>

<div class="table-container {className}">
	<table class="data-table">
		{@render children()}
	</table>
</div>

<style>
	.table-container {
		overflow-x: auto;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
	}
</style>
