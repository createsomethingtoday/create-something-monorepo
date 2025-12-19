<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		children: Snippet;
	}

	let { children, class: className = '', ...restProps }: Props = $props();
</script>

<div class="card-header {className}" {...restProps}>
	{@render children()}
</div>

<style>
	.card-header {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 1.5rem;
	}
</style>
