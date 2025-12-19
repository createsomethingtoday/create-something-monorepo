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
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		background: var(--color-bg-surface);
	}
</style>
