<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { onMount } from 'svelte';
	import { EASE, gsap, motionOK } from '$lib/motion/core';

	let listEl = $state<HTMLDivElement | null>(null);
	let indicatorEl = $state<HTMLSpanElement | null>(null);

	// Click: one marker slides to the chosen tab, so the change of place is seen.
	function placeIndicator(animate: boolean) {
		if (!listEl || !indicatorEl) return;
		const current = listEl.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
		if (!current) {
			gsap.set(indicatorEl, { autoAlpha: 0 });
			return;
		}
		const target = { x: current.offsetLeft, width: current.offsetWidth, autoAlpha: 1 };
		if (animate && motionOK()) {
			gsap.to(indicatorEl, { ...target, duration: 0.36, ease: EASE.out, overwrite: 'auto' });
		} else {
			gsap.set(indicatorEl, target);
		}
	}

	onMount(() => {
		if (!listEl) return;
		listEl.classList.add('has-indicator');
		placeIndicator(false);
		const observer = new MutationObserver(() => placeIndicator(true));
		observer.observe(listEl, { attributes: true, attributeFilter: ['aria-selected'], subtree: true });
		const onResize = () => placeIndicator(false);
		window.addEventListener('resize', onResize);
		void document.fonts?.ready.then(() => placeIndicator(false));
		return () => {
			observer.disconnect();
			window.removeEventListener('resize', onResize);
		};
	});

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

<div
	class="tabs-list {className}"
	role="tablist"
	bind:this={listEl}
	onkeydown={handleKeydown}
	{...restProps}
>
	<span class="tabs-indicator" bind:this={indicatorEl} aria-hidden="true"></span>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.tabs-list {
		position: relative;
		display: flex;
		align-items: stretch;
		gap: 0.25rem;
		padding: 0;
		border-bottom: 1px solid var(--color-shell-border-default);
	}

	/* A rule under the selected tab; GSAP slides it to the next one. */
	.tabs-indicator {
		position: absolute;
		bottom: -1px;
		left: 0;
		width: 0;
		height: 2px;
		visibility: hidden;
		border-radius: 2px 2px 0 0;
		background: var(--color-info);
		pointer-events: none;
	}
</style>
