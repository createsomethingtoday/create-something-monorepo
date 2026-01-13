<script lang="ts">
	/**
	 * Presentation Component - OUTERFIELDS
	 *
	 * A minimal slide deck for investor/client presentations.
	 * - Keyboard navigation (←, →, Space, Escape)
	 * - Fullscreen mode
	 * - Progress tracking
	 *
	 * Adapted from CREATE SOMETHING monorepo presentation system.
	 */
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-svelte';

	interface Props {
		title: string;
		subtitle?: string;
		children?: import('svelte').Snippet;
	}

	let { title, subtitle, children }: Props = $props();

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
		if (containerRef) {
			slideElements = Array.from(containerRef.querySelectorAll('[data-slide]'));
			totalSlides = slideElements.length;
		}

		const handleFullscreenChange = () => {
			isFullscreen = !!document.fullscreenElement;
		};
		document.addEventListener('fullscreenchange', handleFullscreenChange);

		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
		};
	});

	$effect(() => {
		slideElements.forEach((el, index) => {
			el.style.display = index === currentSlide ? 'flex' : 'none';
		});
	});
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="presentation"
	class:fullscreen={isFullscreen}
	bind:this={containerRef}
	tabindex="0"
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
			<ChevronLeft size={20} />
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
			<ChevronRight size={20} />
		</button>

		<button
			class="control-btn fullscreen-btn"
			onclick={toggleFullscreen}
			aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
		>
			{#if isFullscreen}
				<Minimize2 size={18} />
			{:else}
				<Maximize2 size={18} />
			{/if}
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

	<!-- Keyboard Hints -->
	<div class="hints">
		<span>← → navigate</span>
		<span>f fullscreen</span>
	</div>
</div>

<style>
	.presentation {
		position: relative;
		width: 100%;
		min-height: 100vh;
		background: var(--color-bg-pure);
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
		z-index: 9999;
	}

	.slide-container {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-xl, 2rem);
	}

	:global([data-slide]) {
		display: none;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		max-width: 1000px;
		min-height: 60vh;
		text-align: center;
		gap: var(--space-xl, 2rem);
	}

	:global([data-slide].active) {
		display: flex;
	}

	/* Controls */
	.controls {
		position: fixed;
		bottom: var(--space-lg, 1.5rem);
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: var(--space-sm, 0.75rem);
		padding: var(--space-xs, 0.5rem) var(--space-sm, 0.75rem);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full, 9999px);
	}

	.control-btn {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full, 9999px);
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro, 200ms) var(--ease-standard, ease);
	}

	.control-btn:hover:not(:disabled) {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.control-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.fullscreen-btn {
		margin-left: var(--space-xs, 0.5rem);
	}

	.slide-counter {
		font-family: var(--font-mono);
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-muted);
		min-width: 4rem;
		text-align: center;
	}

	/* Progress Bar */
	.progress-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		height: 3px;
		width: var(--progress);
		background: var(--color-brand, #7c2bee);
		transition: width var(--duration-micro, 200ms) var(--ease-standard, ease);
	}

	/* Hints */
	.hints {
		position: fixed;
		bottom: var(--space-lg, 1.5rem);
		right: var(--space-lg, 1.5rem);
		display: flex;
		gap: var(--space-sm, 0.75rem);
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-subtle);
		opacity: 0.5;
	}

	.hints span {
		font-family: var(--font-mono);
	}

	@media (max-width: 768px) {
		.slide-container {
			padding: var(--space-md, 1rem);
		}

		.hints {
			display: none;
		}

		.controls {
			bottom: var(--space-md, 1rem);
		}
	}

	/* ═══════════════════════════════════════════════════════════════════
	   Shared Content Styles
	   ═══════════════════════════════════════════════════════════════════ */

	:global(.slide-content code) {
		font-family: var(--font-mono);
		font-size: 0.9em;
		background: var(--color-bg-elevated);
		padding: 0.1em 0.3em;
		border-radius: var(--radius-sm, 0.5rem);
	}
</style>
