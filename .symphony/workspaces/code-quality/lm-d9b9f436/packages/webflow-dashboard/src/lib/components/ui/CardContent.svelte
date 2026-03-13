<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		children?: Snippet;
	}

	let { class: className = '', children, ...restProps }: Props = $props();
</script>

<div class="card-content {className}" {...restProps}>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.card-content {
		padding: 0 var(--space-md) var(--space-md);
	}
</style>
