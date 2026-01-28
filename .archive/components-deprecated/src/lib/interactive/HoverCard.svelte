<script lang="ts">
	/**
	 * HoverCard Component
	 *
	 * Shows a preview card on hover or focus with smart positioning.
	 * Useful for link previews, user profiles, or additional context.
	 *
	 * Canon principle: Reveal context without disrupting flow.
	 *
	 * @example
	 * <HoverCard>
	 *   {#snippet trigger()}
	 *     <a href="/profile">@username</a>
	 *   {/snippet}
	 *   <div class="profile-preview">
	 *     <img src="/avatar.jpg" alt="User" />
	 *     <p>User bio here...</p>
	 *   </div>
	 * </HoverCard>
	 */
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		/** Preferred side for the card */
		side?: 'top' | 'bottom' | 'left' | 'right';
		/** Alignment along the side */
		align?: 'start' | 'center' | 'end';
		/** Offset from trigger in pixels */
		offset?: number;
		/** Delay before opening (ms) */
		openDelay?: number;
		/** Delay before closing (ms) */
		closeDelay?: number;
		/** Show arrow pointer */
		showArrow?: boolean;
		/** Card width */
		width?: string;
		/** Disabled state */
		disabled?: boolean;
		/** Additional card classes */
		class?: string;
		/** Trigger element */
		trigger: import('svelte').Snippet;
		/** Card content */
		children?: import('svelte').Snippet;
	}

	let {
		side = 'bottom',
		align = 'center',
		offset = 8,
		openDelay = 300,
		closeDelay = 200,
		showArrow = true,
		width = '320px',
		disabled = false,
		class: className = '',
		trigger,
		children
	}: Props = $props();

	let triggerElement: HTMLElement;
	let cardElement: HTMLElement;
	let isOpen = $state(false);
	let isVisible = $state(false);
	let openTimeout: ReturnType<typeof setTimeout>;
	let closeTimeout: ReturnType<typeof setTimeout>;
	let actualSide = $state(side);
	let position = $state({ top: 0, left: 0 });
	let arrowPosition = $state({ top: 0, left: 0 });

	// Check for reduced motion preference
	const prefersReducedMotion = browser
		? window.matchMedia('(prefers-reduced-motion: reduce)').matches
		: false;

	function calculatePosition() {
		if (!triggerElement || !cardElement || !browser) return;

		const triggerRect = triggerElement.getBoundingClientRect();
		const cardRect = cardElement.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const scrollY = window.scrollY;
		const scrollX = window.scrollX;

		let newSide = side;
		let top = 0;
		let left = 0;
		let arrowTop = 0;
		let arrowLeft = 0;

		// Check if preferred side has enough space, otherwise flip
		const spaceAbove = triggerRect.top;
		const spaceBelow = viewportHeight - triggerRect.bottom;
		const spaceLeft = triggerRect.left;
		const spaceRight = viewportWidth - triggerRect.right;

		if (side === 'bottom' && spaceBelow < cardRect.height + offset && spaceAbove > spaceBelow) {
			newSide = 'top';
		} else if (side === 'top' && spaceAbove < cardRect.height + offset && spaceBelow > spaceAbove) {
			newSide = 'bottom';
		} else if (side === 'left' && spaceLeft < cardRect.width + offset && spaceRight > spaceLeft) {
			newSide = 'right';
		} else if (side === 'right' && spaceRight < cardRect.width + offset && spaceLeft > spaceRight) {
			newSide = 'left';
		}

		actualSide = newSide;

		// Calculate position based on side
		switch (newSide) {
			case 'top':
				top = triggerRect.top + scrollY - cardRect.height - offset;
				arrowTop = cardRect.height - 1;
				break;
			case 'bottom':
				top = triggerRect.bottom + scrollY + offset;
				arrowTop = -6;
				break;
			case 'left':
				left = triggerRect.left + scrollX - cardRect.width - offset;
				arrowLeft = cardRect.width - 1;
				break;
			case 'right':
				left = triggerRect.right + scrollX + offset;
				arrowLeft = -6;
				break;
		}

		// Calculate alignment
		if (newSide === 'top' || newSide === 'bottom') {
			switch (align) {
				case 'start':
					left = triggerRect.left + scrollX;
					arrowLeft = Math.min(triggerRect.width / 2, 24);
					break;
				case 'center':
					left = triggerRect.left + scrollX + (triggerRect.width - cardRect.width) / 2;
					arrowLeft = cardRect.width / 2 - 6;
					break;
				case 'end':
					left = triggerRect.right + scrollX - cardRect.width;
					arrowLeft = cardRect.width - Math.min(triggerRect.width / 2, 24) - 12;
					break;
			}

			// Clamp to viewport
			const padding = 8;
			if (left < scrollX + padding) {
				const adjustment = scrollX + padding - left;
				left = scrollX + padding;
				arrowLeft = Math.max(12, arrowLeft - adjustment);
			} else if (left + cardRect.width > scrollX + viewportWidth - padding) {
				const adjustment = left + cardRect.width - (scrollX + viewportWidth - padding);
				left = scrollX + viewportWidth - cardRect.width - padding;
				arrowLeft = Math.min(cardRect.width - 24, arrowLeft + adjustment);
			}
		} else {
			switch (align) {
				case 'start':
					top = triggerRect.top + scrollY;
					arrowTop = Math.min(triggerRect.height / 2, 24);
					break;
				case 'center':
					top = triggerRect.top + scrollY + (triggerRect.height - cardRect.height) / 2;
					arrowTop = cardRect.height / 2 - 6;
					break;
				case 'end':
					top = triggerRect.bottom + scrollY - cardRect.height;
					arrowTop = cardRect.height - Math.min(triggerRect.height / 2, 24) - 12;
					break;
			}

			// Clamp to viewport
			const padding = 8;
			if (top < scrollY + padding) {
				const adjustment = scrollY + padding - top;
				top = scrollY + padding;
				arrowTop = Math.max(12, arrowTop - adjustment);
			} else if (top + cardRect.height > scrollY + viewportHeight - padding) {
				const adjustment = top + cardRect.height - (scrollY + viewportHeight - padding);
				top = scrollY + viewportHeight - cardRect.height - padding;
				arrowTop = Math.min(cardRect.height - 24, arrowTop + adjustment);
			}
		}

		position = { top, left };
		arrowPosition = { top: arrowTop, left: arrowLeft };
	}

	function open() {
		if (disabled) return;

		clearTimeout(closeTimeout);
		openTimeout = setTimeout(
			() => {
				isOpen = true;
				// Wait for render, then calculate position
				requestAnimationFrame(() => {
					calculatePosition();
					// Small delay for position calc, then make visible
					requestAnimationFrame(() => {
						isVisible = true;
					});
				});
			},
			prefersReducedMotion ? 0 : openDelay
		);
	}

	function close() {
		clearTimeout(openTimeout);
		closeTimeout = setTimeout(
			() => {
				isVisible = false;
				// Wait for animation, then remove from DOM
				setTimeout(
					() => {
						isOpen = false;
					},
					prefersReducedMotion ? 0 : 150
				);
			},
			prefersReducedMotion ? 0 : closeDelay
		);
	}

	function handleTriggerMouseEnter() {
		open();
	}

	function handleTriggerMouseLeave() {
		close();
	}

	function handleCardMouseEnter() {
		clearTimeout(closeTimeout);
	}

	function handleCardMouseLeave() {
		close();
	}

	function handleTriggerFocus() {
		open();
	}

	function handleTriggerBlur(event: FocusEvent) {
		// Don't close if focus moved to card
		if (cardElement?.contains(event.relatedTarget as Node)) {
			return;
		}
		close();
	}

	function handleCardBlur(event: FocusEvent) {
		// Don't close if focus moved back to trigger or within card
		if (
			triggerElement?.contains(event.relatedTarget as Node) ||
			cardElement?.contains(event.relatedTarget as Node)
		) {
			return;
		}
		close();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			close();
			triggerElement?.focus();
		}
	}

	onMount(() => {
		if (!browser) return;

		window.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
			clearTimeout(openTimeout);
			clearTimeout(closeTimeout);
		};
	});
</script>

<div class="hover-card-container">
	<!-- Trigger -->
	<div
		bind:this={triggerElement}
		class="hover-card-trigger"
		onmouseenter={handleTriggerMouseEnter}
		onmouseleave={handleTriggerMouseLeave}
		onfocusin={handleTriggerFocus}
		onfocusout={handleTriggerBlur}
		aria-describedby={isOpen ? 'hover-card-content' : undefined}
	>
		{@render trigger()}
	</div>

	<!-- Card -->
	{#if isOpen}
		<div
			bind:this={cardElement}
			id="hover-card-content"
			class="hover-card {actualSide} {className}"
			class:visible={isVisible}
			class:reduced-motion={prefersReducedMotion}
			style="
				top: {position.top}px;
				left: {position.left}px;
				width: {width};
				--arrow-top: {arrowPosition.top}px;
				--arrow-left: {arrowPosition.left}px;
			"
			role="tooltip"
			onmouseenter={handleCardMouseEnter}
			onmouseleave={handleCardMouseLeave}
			onfocusout={handleCardBlur}
		>
			{#if showArrow}
				<div class="hover-card-arrow"></div>
			{/if}
			<div class="hover-card-content">
				{@render children?.()}
			</div>
		</div>
	{/if}
</div>

<style>
	.hover-card-container {
		position: relative;
		display: inline-block;
	}

	.hover-card-trigger {
		display: inline-block;
	}

	.hover-card {
		position: fixed;
		z-index: 1000;
		background: var(--color-bg-elevated, #0a0a0a);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-lg, 12px);
		box-shadow: var(--shadow-xl, 0 20px 60px rgba(0, 0, 0, 0.4));
		opacity: 0;
		transform: scale(0.96);
		transition:
			opacity var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			transform var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
		pointer-events: none;
	}

	.hover-card.visible {
		opacity: 1;
		transform: scale(1);
		pointer-events: auto;
	}

	/* Side-specific transforms for animation direction */
	.hover-card.top {
		transform-origin: bottom center;
	}

	.hover-card.bottom {
		transform-origin: top center;
	}

	.hover-card.left {
		transform-origin: right center;
	}

	.hover-card.right {
		transform-origin: left center;
	}

	.hover-card.top:not(.visible) {
		transform: scale(0.96) translateY(4px);
	}

	.hover-card.bottom:not(.visible) {
		transform: scale(0.96) translateY(-4px);
	}

	.hover-card.left:not(.visible) {
		transform: scale(0.96) translateX(4px);
	}

	.hover-card.right:not(.visible) {
		transform: scale(0.96) translateX(-4px);
	}

	.hover-card-content {
		padding: var(--space-md, 1.618rem);
	}

	/* Arrow */
	.hover-card-arrow {
		position: absolute;
		width: 12px;
		height: 12px;
		background: var(--color-bg-elevated, #0a0a0a);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		transform: rotate(45deg);
	}

	.hover-card.top .hover-card-arrow {
		top: var(--arrow-top);
		left: var(--arrow-left);
		border-top: none;
		border-left: none;
	}

	.hover-card.bottom .hover-card-arrow {
		top: var(--arrow-top);
		left: var(--arrow-left);
		border-bottom: none;
		border-right: none;
	}

	.hover-card.left .hover-card-arrow {
		top: var(--arrow-top);
		left: var(--arrow-left);
		border-top: none;
		border-right: none;
	}

	.hover-card.right .hover-card-arrow {
		top: var(--arrow-top);
		left: var(--arrow-left);
		border-bottom: none;
		border-left: none;
	}

	/* Reduced motion */
	.hover-card.reduced-motion {
		transition: none;
		transform: scale(1);
	}

	@media (prefers-reduced-motion: reduce) {
		.hover-card {
			transition: none;
			transform: scale(1);
		}
	}
</style>
