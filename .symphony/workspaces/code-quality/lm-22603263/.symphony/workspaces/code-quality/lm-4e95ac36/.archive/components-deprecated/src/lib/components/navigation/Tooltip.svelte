<script lang="ts">
	/**
	 * Tooltip Component
	 *
	 * Hover/focus information overlay with configurable positioning.
	 * Shows additional context without cluttering the interface.
	 *
	 * Canon: The tooltip reveals; context emerges.
	 */

	import type { Snippet } from 'svelte';

	interface Props {
		/** Tooltip content text */
		content: string;
		/** Position relative to trigger */
		position?: 'top' | 'bottom' | 'left' | 'right';
		/** Delay before showing (ms) */
		delay?: number;
		/** Trigger element */
		children: Snippet;
	}

	let { content, position = 'top', delay = 200, children }: Props = $props();

	let visible = $state(false);
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	function show() {
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			visible = true;
		}, delay);
	}

	function hide() {
		if (timeoutId) clearTimeout(timeoutId);
		visible = false;
	}
</script>

<div
	class="tooltip-wrapper"
	onmouseenter={show}
	onmouseleave={hide}
	onfocusin={show}
	onfocusout={hide}
>
	{@render children()}

	{#if visible}
		<div class="tooltip tooltip-{position}" role="tooltip">
			{content}
			<span class="tooltip-arrow"></span>
		</div>
	{/if}
</div>

<style>
	.tooltip-wrapper {
		position: relative;
		display: inline-flex;
	}

	.tooltip {
		position: absolute;
		z-index: var(--z-tooltip, 40);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		line-height: 1.4;
		white-space: nowrap;
		border-radius: var(--radius-sm);
		box-shadow: var(--shadow-md);
		pointer-events: none;
		animation: tooltipIn var(--duration-micro) var(--ease-standard);
	}

	@keyframes tooltipIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* Arrow base */
	.tooltip-arrow {
		position: absolute;
		width: 8px;
		height: 8px;
		background: var(--color-fg-primary);
		transform: rotate(45deg);
	}

	/* Position: Top */
	.tooltip-top {
		bottom: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
	}

	.tooltip-top .tooltip-arrow {
		bottom: -4px;
		left: 50%;
		margin-left: -4px;
	}

	/* Position: Bottom */
	.tooltip-bottom {
		top: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
	}

	.tooltip-bottom .tooltip-arrow {
		top: -4px;
		left: 50%;
		margin-left: -4px;
	}

	/* Position: Left */
	.tooltip-left {
		right: calc(100% + 8px);
		top: 50%;
		transform: translateY(-50%);
	}

	.tooltip-left .tooltip-arrow {
		right: -4px;
		top: 50%;
		margin-top: -4px;
	}

	/* Position: Right */
	.tooltip-right {
		left: calc(100% + 8px);
		top: 50%;
		transform: translateY(-50%);
	}

	.tooltip-right .tooltip-arrow {
		left: -4px;
		top: 50%;
		margin-top: -4px;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.tooltip {
			animation: none;
		}
	}
</style>
