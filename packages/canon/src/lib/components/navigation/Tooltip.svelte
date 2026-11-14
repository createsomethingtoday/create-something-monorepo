<script lang="ts">
	/**
	 * Tooltip Component
	 *
	 * Hover/focus information overlay with configurable positioning.
	 * Shows additional context without cluttering the interface.
	 *
	 * Canon: The tooltip reveals; context emerges.
	 */

	import {onDestroy, type Snippet} from 'svelte';

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
	const tooltipId=$props.id();
	let describedElement:HTMLElement|undefined=$state();
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	function show(event:MouseEvent|FocusEvent) {
		const wrapper=event.currentTarget as HTMLElement;
		describedElement=(event.target instanceof HTMLElement && event.target.matches('button,a,input,[tabindex]') ? event.target : wrapper.querySelector<HTMLElement>('button,a,input,[tabindex]')) ?? undefined;
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			visible = true;
		}, delay);
	}

	function hide() {
		if (timeoutId) clearTimeout(timeoutId);
		visible = false;
	}
    $effect(()=>{
        if(!visible || !describedElement)return;
        const element=describedElement;
        element.setAttribute('aria-describedby',[element.getAttribute('aria-describedby'),tooltipId].filter(Boolean).join(' '));
        return ()=>{const ids=(element.getAttribute('aria-describedby')??'').split(' ').filter(id=>id&&id!==tooltipId);if(ids.length)element.setAttribute('aria-describedby',ids.join(' '));else element.removeAttribute('aria-describedby');};
    });
    onDestroy(()=>{if(timeoutId)clearTimeout(timeoutId);});

</script>

<div
	class="tooltip-wrapper"
	role="presentation"
	onmouseenter={show}
	onmouseleave={hide}
	onfocusin={show}
	onfocusout={hide}
	onkeydown={(event)=>{if(event.key==='Escape')hide();}}
>
	{@render children()}

	{#if visible}
		<div class="tooltip tooltip-{position}" role="tooltip" id={tooltipId}>
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
		z-index: var(--z-performance-tooltip, 40);
		padding: var(--space-performance-xs) var(--space-performance-sm);
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-pure);
		font-size: var(--text-performance-caption);
		font-weight: var(--font-performance-medium);
		line-height: 1.4;
		white-space:normal;
		width:max-content;
		max-width:min(260px,calc(100vw - 32px));
		border-radius: var(--radius-performance-scale-sm);
		box-shadow: var(--shadow-performance-scale-md);
		pointer-events:auto;
		animation: tooltipIn var(--duration-performance-micro) var(--ease-performance-standard);
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
		background: var(--color-performance-fg-primary);
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
