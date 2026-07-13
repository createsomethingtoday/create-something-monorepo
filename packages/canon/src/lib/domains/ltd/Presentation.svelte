<script lang="ts">
	/**
	 * Presentation Component
	 *
	 * A minimal slide deck following CREATE SOMETHING principles.
	 * - Keyboard navigation (←, →, Space, Escape)
	 * - Progressive revelation
	 * - No decorative transitions—state changes are functional
	 *
	 * "The tool should disappear."
	 */
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		title: string;
		subtitle?: string;
		scriptUrl?: string;
		children?: import('svelte').Snippet;
	}

	let { title, subtitle, scriptUrl, children }: Props = $props();

	let currentSlide = $state(0);
	let totalSlides = $state(0);
	let slideElements: HTMLElement[] = $state([]);
	let isFullscreen = $state(false);
	let containerRef: HTMLElement | null = $state(null);

	function nextSlide() {
		if (currentSlide < totalSlides - 1) {
			currentSlide++;
		}
	}

	function prevSlide() {
		if (currentSlide > 0) {
			currentSlide--;
		}
	}

	function goToSlide(index: number) {
		if (index >= 0 && index < totalSlides) {
			currentSlide = index;
		}
	}

	function toggleFullscreen() {
		if (!browser || !containerRef) return;

		if (!document.fullscreenElement) {
			containerRef.requestFullscreen();
			isFullscreen = true;
		} else {
			document.exitFullscreen();
			isFullscreen = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowRight':
			case ' ':
			case 'Enter':
				event.preventDefault();
				nextSlide();
				break;
			case 'ArrowLeft':
			case 'Backspace':
				event.preventDefault();
				prevSlide();
				break;
			case 'Home':
				event.preventDefault();
				goToSlide(0);
				break;
			case 'End':
				event.preventDefault();
				goToSlide(totalSlides - 1);
				break;
			case 'f':
			case 'F':
				event.preventDefault();
				toggleFullscreen();
				break;
			case 'Escape':
				if (isFullscreen) {
					document.exitFullscreen();
					isFullscreen = false;
				}
				break;
		}
	}

	onMount(() => {
		// Count slides from DOM
		if (containerRef) {
			slideElements = Array.from(containerRef.querySelectorAll('[data-slide]'));
			totalSlides = slideElements.length;
		}

		// Listen for fullscreen changes
		const handleFullscreenChange = () => {
			isFullscreen = !!document.fullscreenElement;
		};
		document.addEventListener('fullscreenchange', handleFullscreenChange);

		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
		};
	});

	// Update slide visibility when currentSlide changes
	$effect(() => {
		slideElements.forEach((el, index) => {
			el.style.display = index === currentSlide ? 'flex' : 'none';
		});
	});
</script>

<svelte:window on:keydown={handleKeydown} />

<div
	class="presentation"
	class:fullscreen={isFullscreen}
	bind:this={containerRef}
	role="application"
	aria-label="Presentation: {title}"
>
	<!-- Slide Container -->
	<div class="slide-container">
		{@render children?.()}
	</div>

	<!-- Controls -->
	<nav class="controls" aria-label="Presentation controls">
		<button
			class="control-btn"
			onclick={prevSlide}
			disabled={currentSlide === 0}
			aria-label="Previous slide"
		>
			←
		</button>

		<span class="slide-counter">
			{currentSlide + 1} / {totalSlides}
		</span>

		<button
			class="control-btn"
			onclick={nextSlide}
			disabled={currentSlide === totalSlides - 1}
			aria-label="Next slide"
		>
			→
		</button>

		<button
			class="control-btn fullscreen-btn"
			onclick={toggleFullscreen}
			aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
		>
			{isFullscreen ? '⊠' : '⊡'}
		</button>
	</nav>

	<!-- Progress Bar -->
	<div
		class="progress-bar"
		style="--progress: {((currentSlide + 1) / totalSlides) * 100}%"
		role="progressbar"
		aria-valuenow={currentSlide + 1}
		aria-valuemin={1}
		aria-valuemax={totalSlides}
	></div>

	<!-- Keyboard Hints (shown briefly) -->
	<div class="hints">
		<span>← → navigate</span>
		<span>f fullscreen</span>
		{#if scriptUrl}
			<a href={scriptUrl} class="script-link">📝 script</a>
		{/if}
	</div>
</div>

<style>
	.presentation {
		position: relative;
		width: 100%;
		min-height: 100vh;
		background: var(--color-performance-bg-pure);
		display: flex;
		flex-direction: column;
		outline: none;
	}

	.presentation.fullscreen {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: var(--z-performance-modal);
	}

	.slide-container {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-performance-xl); /* Golden ratio: 4.236rem */
	}

	/* Slide base styles - applied via data-slide attribute */
	:global([data-slide]) {
		display: none;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		max-width: 960px;
		min-height: 60vh;
		text-align: center;
		gap: var(--space-performance-xl); /* Golden ratio: 4.236rem */
	}

	:global([data-slide].active) {
		display: flex;
	}

	/* Controls */
	.controls {
		position: fixed;
		bottom: var(--space-performance-lg);
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-full);
	}

	.control-btn {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border-radius: var(--radius-performance-scale-full);
		color: var(--color-performance-fg-secondary);
		font-size: var(--text-performance-body);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.control-btn:hover:not(:disabled) {
		border-color: var(--color-performance-border-emphasis);
		color: var(--color-performance-fg-primary);
	}

	.control-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.fullscreen-btn {
		margin-left: var(--space-performance-xs);
	}

	.slide-counter {
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		min-width: 4rem;
		text-align: center;
	}

	/* Progress Bar */
	.progress-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		height: 2px;
		width: var(--progress);
		background: var(--color-performance-fg-muted);
		transition: width var(--duration-performance-micro) var(--ease-performance-standard);
	}

	/* Hints */
	.hints {
		position: fixed;
		bottom: var(--space-performance-lg);
		right: var(--space-performance-lg);
		display: flex;
		gap: var(--space-performance-sm);
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-subtle);
		opacity: 0.5;
	}

	.hints span {
		font-family: var(--font-performance-mono);
	}

	.script-link {
		font-family: var(--font-performance-mono);
		color: var(--color-performance-fg-subtle);
		text-decoration: none;
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.script-link:hover {
		color: var(--color-performance-fg-primary);
	}

	/* ═══════════════════════════════════════════════════════════════════
	   Shared Content Styles (DRY - used by all presentations)
	   ═══════════════════════════════════════════════════════════════════ */

	/* Link styling */
	:global(.link) {
		color: var(--color-performance-fg-primary);
		text-decoration: underline;
		text-underline-offset: 4px;
	}

	:global(.link:hover) {
		color: var(--color-performance-fg-secondary);
	}

	/* Code in slide content */
	:global(.slide-content code) {
		font-family: var(--font-performance-mono);
		font-size: 0.9em;
		padding: 0.1em 0.3em;
		border-radius: var(--radius-performance-scale-sm);
	}

	/* Spaced elements - Canon compliant margin */
	:global(.spaced) {
		margin-top: var(--space-performance-md);
	}

	/* Split slide list styling */
	:global(.slide-split ul) {
		font-size: var(--text-performance-body-sm);
		line-height: 1.4;
	}

	:global(.slide-split li) {
		margin-bottom: var(--space-performance-xs);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.slide-container {
			padding: var(--space-performance-md);
		}

		.hints {
			display: none;
		}

		.controls {
			bottom: var(--space-performance-md);
		}
	}
</style>
