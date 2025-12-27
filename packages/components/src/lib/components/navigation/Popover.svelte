<script lang="ts">
	/**
	 * Popover Component
	 *
	 * Click-triggered content overlay with positioning.
	 * Supports focus trapping and click-outside dismissal.
	 *
	 * Canon: The popover surfaces; focus shifts.
	 */

	import type { Snippet } from 'svelte';
	import { focusTrap } from '../../actions/a11y.js';

	interface Props {
		/** Whether popover is open (bindable) */
		open?: boolean;
		/** Position relative to trigger */
		position?: 'top' | 'bottom' | 'left' | 'right';
		/** Alignment along the position axis */
		align?: 'start' | 'center' | 'end';
		/** Whether to close when clicking outside */
		closeOnClickOutside?: boolean;
		/** Whether to close on Escape */
		closeOnEscape?: boolean;
		/** Trigger element */
		trigger: Snippet;
		/** Popover content */
		children: Snippet;
		/** Called when popover should close */
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		position = 'bottom',
		align = 'start',
		closeOnClickOutside = true,
		closeOnEscape = true,
		trigger,
		children,
		onclose
	}: Props = $props();

	let wrapperRef: HTMLDivElement;

	function toggle() {
		open = !open;
		if (!open) {
			onclose?.();
		}
	}

	function close() {
		open = false;
		onclose?.();
	}

	function handleClickOutside(event: MouseEvent) {
		if (closeOnClickOutside && open && wrapperRef && !wrapperRef.contains(event.target as Node)) {
			close();
		}
	}

	function handleEscape() {
		if (closeOnEscape) {
			close();
		}
	}

	$effect(() => {
		if (open) {
			document.addEventListener('click', handleClickOutside, true);
			return () => {
				document.removeEventListener('click', handleClickOutside, true);
			};
		}
	});
</script>

<div class="popover-wrapper" bind:this={wrapperRef}>
	<div class="popover-trigger" onclick={toggle}>
		{@render trigger()}
	</div>

	{#if open}
		<div
			class="popover popover-{position} popover-align-{align}"
			role="dialog"
			aria-modal="false"
			use:focusTrap={{ active: open, onEscape: handleEscape }}
		>
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.popover-wrapper {
		position: relative;
		display: inline-flex;
	}

	.popover-trigger {
		display: inline-flex;
	}

	.popover {
		position: absolute;
		z-index: var(--z-popover, 30);
		min-width: 200px;
		max-width: 320px;
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		animation: popoverIn var(--duration-micro) var(--ease-standard);
	}

	@keyframes popoverIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* Position: Top */
	.popover-top {
		bottom: calc(100% + 8px);
	}

	.popover-top.popover-align-start {
		left: 0;
	}

	.popover-top.popover-align-center {
		left: 50%;
		transform: translateX(-50%);
	}

	.popover-top.popover-align-end {
		right: 0;
	}

	/* Position: Bottom */
	.popover-bottom {
		top: calc(100% + 8px);
	}

	.popover-bottom.popover-align-start {
		left: 0;
	}

	.popover-bottom.popover-align-center {
		left: 50%;
		transform: translateX(-50%);
	}

	.popover-bottom.popover-align-end {
		right: 0;
	}

	/* Position: Left */
	.popover-left {
		right: calc(100% + 8px);
	}

	.popover-left.popover-align-start {
		top: 0;
	}

	.popover-left.popover-align-center {
		top: 50%;
		transform: translateY(-50%);
	}

	.popover-left.popover-align-end {
		bottom: 0;
	}

	/* Position: Right */
	.popover-right {
		left: calc(100% + 8px);
	}

	.popover-right.popover-align-start {
		top: 0;
	}

	.popover-right.popover-align-center {
		top: 50%;
		transform: translateY(-50%);
	}

	.popover-right.popover-align-end {
		bottom: 0;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.popover {
			animation: none;
		}
	}
</style>
