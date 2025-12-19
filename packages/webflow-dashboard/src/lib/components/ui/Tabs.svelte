<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		value?: string;
		onValueChange?: (value: string) => void;
		children?: Snippet;
	}

	let {
		value = $bindable(''),
		onValueChange,
		class: className = '',
		children,
		...restProps
	}: Props = $props();
</script>

<div class="tabs {className}" {...restProps} data-value={value}>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.tabs {
		display: flex;
		flex-direction: column;
		width: 100%;
	}
</style>
