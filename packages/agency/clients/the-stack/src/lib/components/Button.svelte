<script lang="ts">
	/**
	 * Button Component
	 *
	 * Variants:
	 * - primary: Green background, dark text
	 * - secondary: Outlined, transparent background
	 * - link: No background, just text
	 */

	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'link';
		href?: string;
		type?: 'button' | 'submit';
		disabled?: boolean;
		showArrow?: boolean;
		children: Snippet;
	}

	let {
		variant = 'primary',
		href,
		type = 'button',
		disabled = false,
		showArrow = false,
		children
	}: Props = $props();

	const classes = {
		primary: 'button',
		secondary: 'button is-secondary',
		link: 'button is-link'
	};
</script>

{#if href}
	<a {href} class={classes[variant]}>
		<span class="z-index-2">
			{@render children()}
		</span>
		{#if showArrow}
			<span class="z-index-2">
				<img src="/icons/icon-arrow-light.svg" alt="" class="icon-16" />
			</span>
		{/if}
	</a>
{:else}
	<button {type} {disabled} class={classes[variant]}>
		<span class="z-index-2">
			{@render children()}
		</span>
		{#if showArrow}
			<span class="z-index-2">
				<img src="/icons/icon-arrow-light.svg" alt="" class="icon-16" />
			</span>
		{/if}
	</button>
{/if}

<style>
	.is-link {
		letter-spacing: 0.02em;
		background-color: transparent;
		border: 1px solid transparent;
		border-radius: 0;
		padding: 0;
		font-family: 'Coolvetica Condensed', sans-serif;
		font-size: 1.125rem;
		line-height: 1;
	}

	.is-link:hover {
		background-color: transparent;
	}
</style>
