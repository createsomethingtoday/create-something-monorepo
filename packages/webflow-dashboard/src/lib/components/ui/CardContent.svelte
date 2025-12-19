<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		children: Snippet;
	}

	let { children, class: className = '', ...restProps }: Props = $props();
</script>

<div class="card-content {className}" {...restProps}>
	{@render children()}
</div>

<style>
	.card-content {
		padding: 0 1.5rem 1.5rem;
	}
</style>
