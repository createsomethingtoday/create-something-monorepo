<script lang="ts">
	/**
	 * ExitIntent Component - Retention Through Invitation
	 *
	 * Detects when a visitor's mouse leaves the viewport towards the top
	 * (indicating intent to close tab or navigate away) and shows a
	 * non-intrusive modal with a contextual offer.
	 *
	 * Principle: Invite, don't trap. The modal should offer value,
	 * not guilt the visitor into staying.
	 *
	 * @example
	 * <ExitIntent
	 *   title="Before you go..."
	 *   message="Get our free guide to better design."
	 *   ctaText="Download Guide"
	 *   ctaHref="/guide"
	 * />
	 */

	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		/** Modal title */
		title?: string;
		/** Modal message/description */
		message?: string;
		/** CTA button text */
		ctaText?: string;
		/** CTA link href */
		ctaHref?: string;
		/** Secondary/dismiss button text */
		dismissText?: string;
		/** Delay before detection activates (ms) - prevents false triggers on page load */
		activationDelay?: number;
		/** Minimum scroll depth before triggering (0-100) */
		minScrollDepth?: number;
		/** Storage key for tracking if already shown */
		storageKey?: string;
		/** Use session storage instead of local storage (shows once per session vs once ever) */
		sessionOnly?: boolean;
		/** Sensitivity threshold for mouse exit detection (pixels from top) */
		sensitivity?: number;
		/** Disabled state */
		disabled?: boolean;
		/** Custom content slot */
		children?: import('svelte').Snippet;
		/** Called when modal opens */
		onopen?: () => void;
		/** Called when modal closes */
		onclose?: () => void;
		/** Called when CTA is clicked */
		onconvert?: () => void;
	}

	let {
		title = 'Before you go...',
		message = "Don't miss out on our latest insights and resources.",
		ctaText = 'Stay Connected',
		ctaHref = '#',
		dismissText = 'No thanks',
		activationDelay = 2000,
		minScrollDepth = 0,
		storageKey = 'exit-intent-shown',
		sessionOnly = true,
		sensitivity = 20,
		disabled = false,
		children,
		onopen,
		onclose,
		onconvert
	}: Props = $props();

	let isOpen = $state(false);
	let isActive = $state(false);
	let hasTriggered = $state(false);
	let dialogElement: HTMLDialogElement;

	// Check for reduced motion preference
	const prefersReducedMotion = browser
		? window.matchMedia('(prefers-reduced-motion: reduce)').matches
		: false;

	function getStorage() {
		return sessionOnly ? sessionStorage : localStorage;
	}

	function hasBeenShown(): boolean {
		if (!browser) return true;
		try {
			return getStorage().getItem(storageKey) === 'true';
		} catch {
			return false;
		}
	}

	function markAsShown(): void {
		if (!browser) return;
		try {
			getStorage().setItem(storageKey, 'true');
		} catch {
			// Storage might be full or disabled
		}
	}

	function getScrollDepth(): number {
		if (!browser) return 0;
		const scrollTop = window.scrollY;
		const docHeight = document.documentElement.scrollHeight - window.innerHeight;
		return docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
	}

	function openModal(): void {
		if (hasTriggered || disabled || hasBeenShown()) return;
		if (getScrollDepth() < minScrollDepth) return;

		hasTriggered = true;
		markAsShown();
		isOpen = true;

		// Use dialog element for accessibility
		dialogElement?.showModal();
		onopen?.();
	}

	function closeModal(): void {
		isOpen = false;
		dialogElement?.close();
		onclose?.();
	}

	function handleConvert(): void {
		onconvert?.();
		closeModal();
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && isOpen) {
			closeModal();
		}
	}

	function handleMouseLeave(event: MouseEvent): void {
		if (!isActive || hasTriggered || disabled) return;

		// Only trigger when mouse exits towards the top of the viewport
		if (event.clientY <= sensitivity) {
			openModal();
		}
	}

	function handleBackdropClick(event: MouseEvent): void {
		// Close if clicking on the backdrop (dialog element itself, not content)
		if (event.target === dialogElement) {
			closeModal();
		}
	}

	onMount(() => {
		if (disabled || hasBeenShown()) return;

		// Activate detection after delay
		const activationTimer = setTimeout(() => {
			isActive = true;
		}, activationDelay);

		// Listen for mouse leaving document
		document.addEventListener('mouseleave', handleMouseLeave);

		return () => {
			clearTimeout(activationTimer);
			document.removeEventListener('mouseleave', handleMouseLeave);
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<dialog
	bind:this={dialogElement}
	class="exit-intent-dialog"
	class:reduced-motion={prefersReducedMotion}
	onclick={handleBackdropClick}
	aria-labelledby="exit-intent-title"
	aria-describedby="exit-intent-message"
>
	<div class="exit-intent-content" role="document">
		<!-- Close button -->
		<button
			type="button"
			class="exit-intent-close"
			onclick={closeModal}
			aria-label="Close dialog"
		>
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
		</button>

		{#if children}
			{@render children()}
		{:else}
			<h2 id="exit-intent-title" class="exit-intent-title">{title}</h2>
			<p id="exit-intent-message" class="exit-intent-message">{message}</p>

			<div class="exit-intent-actions">
				<a
					href={ctaHref}
					class="exit-intent-cta"
					onclick={handleConvert}
				>
					{ctaText}
				</a>
				<button
					type="button"
					class="exit-intent-dismiss"
					onclick={closeModal}
				>
					{dismissText}
				</button>
			</div>
		{/if}
	</div>
</dialog>

<style>
	.exit-intent-dialog {
		position: fixed;
		inset: 0;
		width: 100%;
		max-width: 100%;
		height: 100%;
		max-height: 100%;
		margin: 0;
		padding: 0;
		border: none;
		background: transparent;
		overflow: hidden;
	}

	/* Backdrop */
	.exit-intent-dialog::backdrop {
		background: var(--color-overlay, rgba(0, 0, 0, 0.5));
		animation: fadeIn var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.exit-intent-dialog[open] {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Content container */
	.exit-intent-content {
		position: relative;
		width: 90%;
		max-width: 480px;
		margin: auto;
		padding: var(--space-xl, 4.236rem) var(--space-lg, 2.618rem);
		background: var(--color-bg-surface, #111);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-xl, 16px);
		box-shadow: var(--shadow-2xl, 0 25px 50px -12px rgba(0, 0, 0, 0.25));
		animation: slideUp var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	/* Close button */
	.exit-intent-close {
		position: absolute;
		top: var(--space-md, 1.618rem);
		right: var(--space-md, 1.618rem);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: var(--radius-md, 8px);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		cursor: pointer;
		transition: color var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			background var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.exit-intent-close:hover {
		color: var(--color-fg-primary, #fff);
		background: var(--color-hover, rgba(255, 255, 255, 0.05));
	}

	.exit-intent-close:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	/* Title */
	.exit-intent-title {
		margin: 0 0 var(--space-sm, 1rem);
		font-size: var(--text-h2, clamp(1.5rem, 2vw + 0.75rem, 2.25rem));
		font-weight: 700;
		color: var(--color-fg-primary, #fff);
		text-align: center;
		line-height: 1.2;
	}

	/* Message */
	.exit-intent-message {
		margin: 0 0 var(--space-lg, 2.618rem);
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		text-align: center;
		line-height: 1.6;
	}

	/* Actions */
	.exit-intent-actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm, 1rem);
		align-items: center;
	}

	/* Primary CTA */
	.exit-intent-cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: var(--space-sm, 1rem) var(--space-lg, 2.618rem);
		background: var(--color-fg-primary, #fff);
		color: var(--color-bg-pure, #000);
		font-size: var(--text-body, 1rem);
		font-weight: 600;
		text-decoration: none;
		border-radius: var(--radius-lg, 12px);
		transition: transform var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			box-shadow var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.exit-intent-cta:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
	}

	.exit-intent-cta:active {
		transform: translateY(0) scale(0.98);
	}

	.exit-intent-cta:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	/* Dismiss button */
	.exit-intent-dismiss {
		padding: var(--space-xs, 0.5rem) var(--space-sm, 1rem);
		background: transparent;
		border: none;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		font-size: var(--text-body-sm, 0.875rem);
		cursor: pointer;
		transition: color var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.exit-intent-dismiss:hover {
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	.exit-intent-dismiss:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	/* Animations */
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	/* Reduced motion */
	.exit-intent-dialog.reduced-motion::backdrop,
	.exit-intent-dialog.reduced-motion .exit-intent-content {
		animation: none;
	}

	.exit-intent-dialog.reduced-motion .exit-intent-close,
	.exit-intent-dialog.reduced-motion .exit-intent-cta,
	.exit-intent-dialog.reduced-motion .exit-intent-dismiss {
		transition: none;
	}

	.exit-intent-dialog.reduced-motion .exit-intent-cta:hover,
	.exit-intent-dialog.reduced-motion .exit-intent-cta:active {
		transform: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.exit-intent-dialog::backdrop,
		.exit-intent-content {
			animation: none;
		}

		.exit-intent-close,
		.exit-intent-cta,
		.exit-intent-dismiss {
			transition: none;
		}

		.exit-intent-cta:hover,
		.exit-intent-cta:active {
			transform: none;
		}
	}

	/* Mobile adjustments */
	@media (max-width: 640px) {
		.exit-intent-content {
			width: 95%;
			padding: var(--space-lg, 2.618rem) var(--space-md, 1.618rem);
		}

		.exit-intent-title {
			font-size: var(--text-h3, clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem));
		}
	}

	/* High contrast mode */
	@media (prefers-contrast: more) {
		.exit-intent-content {
			border-color: var(--color-border-strong, rgba(255, 255, 255, 0.3));
		}

		.exit-intent-close:focus-visible,
		.exit-intent-cta:focus-visible,
		.exit-intent-dismiss:focus-visible {
			outline-width: 3px;
		}
	}
</style>
