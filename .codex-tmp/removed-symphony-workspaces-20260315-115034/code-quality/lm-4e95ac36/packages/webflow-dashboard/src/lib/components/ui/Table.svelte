<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLTableAttributes } from 'svelte/elements';

	interface Props extends HTMLTableAttributes {
		children?: Snippet;
		/** Hides table on mobile (<768px). Use with cardMobileContent slot. */
		hideOnMobile?: boolean;
	}

	let { class: className = '', children, hideOnMobile = false, ...restProps }: Props = $props();
</script>

<div class="table-wrapper" class:hide-on-mobile={hideOnMobile}>
	<table class="table {className}" {...restProps}>
		{#if children}
			{@render children()}
		{/if}
	</table>
</div>

<style>
	.table-wrapper {
		position: relative;
		width: 100%;
		overflow-x: auto;
	}

	.table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-body-sm);
	}

	@media (max-width: 767px) {
		.table-wrapper.hide-on-mobile {
			display: none;
		}
	}
</style>
