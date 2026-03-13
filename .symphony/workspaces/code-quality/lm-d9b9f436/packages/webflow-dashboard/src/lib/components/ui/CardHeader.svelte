<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		children?: Snippet;
	}

	let { class: className = '', children, ...restProps }: Props = $props();
</script>

<div class="card-header {className}" {...restProps}>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.card-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-md);
	}
</style>
