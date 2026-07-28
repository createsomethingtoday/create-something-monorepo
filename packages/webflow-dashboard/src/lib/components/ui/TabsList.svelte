<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		children?: Snippet;
	}

	let { class: className = '', children, ...restProps }: Props = $props();

	// Roving keyboard navigation shared by every tab list (WAI-ARIA tabs pattern).
	// A page may still override by passing its own onkeydown through restProps.
	function handleKeydown(event: KeyboardEvent) {
		if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
		const tabs = Array.from(
			(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
				'[role="tab"]:not(:disabled)'
			)
		);
		if (tabs.length === 0) return;

		event.preventDefault();
		const currentIndex = tabs.indexOf(document.activeElement as HTMLElement);
		let nextIndex: number;
		if (event.key === 'Home') {
			nextIndex = 0;
		} else if (event.key === 'End') {
			nextIndex = tabs.length - 1;
		} else {
			const delta = event.key === 'ArrowRight' ? 1 : -1;
			nextIndex = (currentIndex + delta + tabs.length) % tabs.length;
		}
		tabs[nextIndex]?.focus();
		tabs[nextIndex]?.click();
	}
</script>

<div class="tabs-list {className}" role="tablist" onkeydown={handleKeydown} {...restProps}>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.tabs-list {
		display: inline-flex;
		align-items: center;
		gap: 0;
		padding: 0;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}
</style>
