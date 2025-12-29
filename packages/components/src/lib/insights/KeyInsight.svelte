<script lang="ts">
	/**
	 * KeyInsight - Full-Screen Shareable Insight Visual
	 *
	 * A 100vh insight display with:
	 * - Large statement typography
	 * - Optional bug/fix comparison
	 * - PNG export capability
	 * - Scroll or click-triggered animation
	 *
	 * "The infrastructure disappears; only the work remains."
	 */

	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import StatementText from './StatementText.svelte';
	import type {
		KeyInsightProps,
		RevelationPhase,
		ExportFormat,
		EXPORT_DIMENSIONS
	} from './types.js';

	// =============================================================================
	// PROPS
	// =============================================================================

	let {
		insight,
		property = 'io',
		animation = { enabled: true, trigger: 'click' },
		showExport = true,
		variant = 'fullscreen',
		direction = 'forward',
		class: className = ''
	}: KeyInsightProps = $props();

	// =============================================================================
	// STATE
	// =============================================================================

	let container: HTMLElement;
	let phase = $state<RevelationPhase>(animation.enabled ? 'reading' : 'complete');
	let progress = $state(animation.enabled ? 0 : 1);
	let isExporting = $state(false);
	let hasAnimated = $state(!animation.enabled);
	let showingOriginal = $state(false);
	let currentDirection = $state<'forward' | 'reverse'>(direction);

	// =============================================================================
	// ANIMATION LOGIC
	// =============================================================================

	function startAnimation() {
		if (hasAnimated || !animation.enabled) return;
		hasAnimated = true;

		const duration = 3000; // 3 seconds total
		const startTime = performance.now();

		function animate(currentTime: number) {
			const elapsed = currentTime - startTime;
			progress = Math.min(1, elapsed / duration);

			// Phase transitions based on progress
			if (progress < 0.2) {
				phase = 'reading';
			} else if (progress < 0.4) {
				phase = 'striking';
			} else if (progress < 0.6) {
				phase = 'fading';
			} else if (progress < 0.95) {
				phase = 'coalescing';
			} else {
				phase = 'complete';
			}

			if (progress < 1) {
				requestAnimationFrame(animate);
			}
		}

		requestAnimationFrame(animate);
	}

	function handleClick() {
		if (animation.trigger === 'click' && !hasAnimated) {
			startAnimation();
		}
	}

	function toggleOriginal() {
		if (!hasAnimated) return;

		showingOriginal = !showingOriginal;
		currentDirection = showingOriginal ? 'reverse' : 'forward';

		// Animate the toggle
		const duration = 2000;
		const startTime = performance.now();
		const startProgress = progress;
		const targetProgress = showingOriginal ? 0 : 1;

		function animateToggle(currentTime: number) {
			const elapsed = currentTime - startTime;
			const t = Math.min(1, elapsed / duration);
			// Ease out cubic
			const eased = 1 - Math.pow(1 - t, 3);
			progress = startProgress + (targetProgress - startProgress) * eased;

			// Update phase based on progress
			if (showingOriginal) {
				// Reverse: complete → reading
				if (progress > 0.8) phase = 'coalescing';
				else if (progress > 0.6) phase = 'fading';
				else if (progress > 0.4) phase = 'striking';
				else phase = 'reading';
			} else {
				// Forward: reading → complete
				if (progress < 0.2) phase = 'reading';
				else if (progress < 0.4) phase = 'striking';
				else if (progress < 0.6) phase = 'fading';
				else if (progress < 0.95) phase = 'coalescing';
				else phase = 'complete';
			}

			if (t < 1) {
				requestAnimationFrame(animateToggle);
			}
		}

		requestAnimationFrame(animateToggle);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClick();
		}
	}

	// =============================================================================
	// SCROLL ANIMATION
	// =============================================================================

	onMount(() => {
		if (!browser || animation.trigger !== 'scroll') return;

		let ticking = false;
		function handleScroll() {
			if (!ticking) {
				requestAnimationFrame(() => {
					const rect = container.getBoundingClientRect();
					const viewportHeight = window.innerHeight;

					// Trigger when element is 50% visible
					if (rect.top < viewportHeight * 0.5 && !hasAnimated) {
						startAnimation();
					}

					ticking = false;
				});
				ticking = true;
			}
		}

		window.addEventListener('scroll', handleScroll, { passive: true });
		handleScroll();

		return () => window.removeEventListener('scroll', handleScroll);
	});

	// Auto animation
	onMount(() => {
		if (!browser || animation.trigger !== 'auto') return;

		const delay = animation.autoDelay ?? 1000;
		const timeout = setTimeout(startAnimation, delay);

		return () => clearTimeout(timeout);
	});

	// =============================================================================
	// EXPORT FUNCTIONALITY
	// =============================================================================

	async function exportAsPNG(format: ExportFormat = 'og') {
		if (!browser || isExporting) return;

		isExporting = true;

		try {
			// Dynamic import html2canvas
			const { default: html2canvas } = await import('html2canvas');

			// Wait for fonts to be ready
			await document.fonts.ready;

			// Temporarily set complete state for export
			const originalPhase = phase;
			phase = 'complete';

			await new Promise((resolve) => setTimeout(resolve, 200));

			const canvas = await html2canvas(container, {
				backgroundColor: '#000000',
				scale: 2,
				logging: false,
				useCORS: true,
				allowTaint: true,
				// Force system font stack in cloned element for reliable rendering
				onclone: (clonedDoc) => {
					const clonedContainer = clonedDoc.body.querySelector('.key-insight');
					if (clonedContainer) {
						// Apply system font stack that html2canvas can render reliably
						const style = clonedDoc.createElement('style');
						style.textContent = `
							.key-insight, .key-insight * {
								font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
							}
							.key-insight code, .key-insight .comparison-code {
								font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace !important;
							}
						`;
						clonedDoc.head.appendChild(style);
					}
				}
			});

			// Restore phase
			phase = originalPhase;

			// Download
			const link = document.createElement('a');
			link.download = `${insight.id}-insight.png`;
			link.href = canvas.toDataURL('image/png');
			link.click();
		} catch (error) {
			console.error('Export failed:', error);
		} finally {
			isExporting = false;
		}
	}

	// =============================================================================
	// DERIVED
	// =============================================================================

	const containerClass = $derived(
		variant === 'fullscreen' ? 'insight-fullscreen' :
		variant === 'inline' ? 'insight-inline' :
		'insight-card'
	);

	const showClickHint = $derived(
		animation.enabled &&
		animation.trigger === 'click' &&
		!hasAnimated
	);
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<article
	bind:this={container}
	class="key-insight {containerClass} {className}"
	class:exporting={isExporting}
	onclick={handleClick}
	onkeydown={handleKeydown}
	role={animation.trigger === 'click' ? 'button' : undefined}
	tabindex={animation.trigger === 'click' ? 0 : undefined}
	aria-label="Key Insight: {insight.principle}"
>

	<!-- Main content -->
	<div class="insight-content">
		<!-- Comparison (bug/fix pattern) -->
		{#if insight.comparison}
			<div class="comparison">
				{#each insight.comparison as row}
					<div class="comparison-row comparison-{row.type}">
						<span class="comparison-label">{row.label}</span>
						<code class="comparison-code">{row.code}</code>
						<span class="comparison-result">{row.result}</span>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Statement text (animated or static) -->
		{#if insight.statement}
			<StatementText
				statement={insight.statement}
				{phase}
				{progress}
				direction={currentDirection}
				size="display"
			/>
		{:else}
			<p class="principle-text">{insight.principle}</p>
		{/if}

		<!-- Click hint or toggle -->
		{#if showClickHint}
			<p class="click-hint">Click to reveal</p>
		{:else if hasAnimated && animation.enabled}
			<button
				class="toggle-btn"
				onclick={(e) => { e.stopPropagation(); toggleOriginal(); }}
			>
				{showingOriginal ? '← Back to insight' : 'Show original →'}
			</button>
		{/if}
	</div>

	<!-- Footer: Source & export -->
	<footer class="insight-footer">
		{#if insight.source}
			<a href={insight.source.url} class="source-link">
				{insight.source.title}
			</a>
		{:else if insight.paperId}
			<span class="paper-id">{insight.paperId}</span>
		{/if}

		{#if showExport}
			<button
				class="export-btn"
				onclick={(e) => { e.stopPropagation(); exportAsPNG('og'); }}
				disabled={isExporting}
				aria-label="Export as PNG"
			>
				{isExporting ? 'Exporting...' : 'Export PNG'}
			</button>
		{/if}
	</footer>
</article>

<style>
	/* ==========================================================================
	   Container Variants
	   ========================================================================== */

	.key-insight {
		display: flex;
		flex-direction: column;
		background: var(--color-bg-pure, #000);
		color: var(--color-fg-primary, #fff);
		position: relative;
		overflow: hidden;
	}

	.insight-fullscreen {
		min-height: 100vh;
		min-height: 100dvh;
		padding: var(--space-xl, 4rem);
	}

	.insight-inline {
		min-height: 80vh;
		padding: var(--space-lg, 2.5rem);
		border-radius: var(--radius-xl, 16px);
		border: 1px solid var(--color-border-default, rgba(255,255,255,0.1));
	}

	.insight-card {
		padding: var(--space-lg, 2.5rem);
		border-radius: var(--radius-xl, 16px);
		border: 2px solid var(--color-border-emphasis, rgba(255,255,255,0.2));
	}

	.key-insight.exporting {
		cursor: wait;
	}

	.key-insight[role="button"] {
		cursor: pointer;
	}

	.key-insight[role="button"]:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255,255,255,0.5));
		outline-offset: 4px;
	}

	/* ==========================================================================
	   Content
	   ========================================================================== */

	.insight-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-lg, 2.5rem);
		padding: var(--space-xl, 4rem) 0;
	}

	/* Comparison rows */
	.comparison {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm, 1rem);
		width: 100%;
		max-width: 600px;
	}

	.comparison-row {
		display: grid;
		grid-template-columns: 60px 1fr auto;
		gap: var(--space-sm, 1rem);
		align-items: center;
		padding: var(--space-sm, 1rem);
		border-radius: var(--radius-md, 8px);
	}

	.comparison-negative {
		background: var(--color-error-muted, rgba(212, 77, 77, 0.2));
		border: 1px solid var(--color-error-border, rgba(212, 77, 77, 0.3));
	}

	.comparison-positive {
		background: var(--color-success-muted, rgba(68, 170, 68, 0.2));
		border: 1px solid var(--color-success-border, rgba(68, 170, 68, 0.3));
	}

	.comparison-neutral {
		background: var(--color-bg-surface, #111);
		border: 1px solid var(--color-border-default, rgba(255,255,255,0.1));
	}

	.comparison-label {
		font-size: var(--text-body-sm, 0.875rem);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.comparison-negative .comparison-label {
		color: var(--color-error, #d44d4d);
	}

	.comparison-positive .comparison-label {
		color: var(--color-success, #44aa44);
	}

	.comparison-code {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-primary);
		background: var(--color-bg-pure, #000);
		padding: 0.25rem 0.75rem;
		border-radius: var(--radius-sm, 6px);
	}

	.comparison-result {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-tertiary, rgba(255,255,255,0.6));
		text-align: right;
	}

	/* Principle text (static) */
	.principle-text {
		font-size: var(--text-display, clamp(2.5rem, 4vw + 1.5rem, 5rem));
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: -0.02em;
		text-align: center;
		max-width: 900px;
		color: var(--color-fg-primary);
	}

	/* Click hint */
	.click-hint {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-muted, rgba(255,255,255,0.46));
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.46; }
		50% { opacity: 0.8; }
	}

	/* Toggle button */
	.toggle-btn {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-tertiary, rgba(255,255,255,0.6));
		background: transparent;
		border: 1px solid var(--color-border-default, rgba(255,255,255,0.1));
		border-radius: var(--radius-md, 8px);
		padding: 0.5rem 1rem;
		cursor: pointer;
		transition: all var(--duration-micro, 200ms) var(--ease-standard);
	}

	.toggle-btn:hover {
		color: var(--color-fg-primary);
		border-color: var(--color-border-emphasis, rgba(255,255,255,0.2));
		background: var(--color-hover, rgba(255,255,255,0.05));
	}

	/* ==========================================================================
	   Footer
	   ========================================================================== */

	.insight-footer {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		margin-top: auto;
	}

	.source-link {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-tertiary, rgba(255,255,255,0.6));
		text-decoration: none;
		transition: color var(--duration-micro, 200ms) var(--ease-standard);
	}

	.source-link:hover {
		color: var(--color-fg-primary);
	}

	.paper-id {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-muted, rgba(255,255,255,0.46));
	}

	.export-btn {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-tertiary, rgba(255,255,255,0.6));
		background: transparent;
		border: 1px solid var(--color-border-default, rgba(255,255,255,0.1));
		border-radius: var(--radius-md, 8px);
		padding: 0.5rem 1rem;
		cursor: pointer;
		transition: all var(--duration-micro, 200ms) var(--ease-standard);
	}

	.export-btn:hover:not(:disabled) {
		color: var(--color-fg-primary);
		border-color: var(--color-border-emphasis, rgba(255,255,255,0.2));
		background: var(--color-hover, rgba(255,255,255,0.05));
	}

	.export-btn:disabled {
		opacity: 0.5;
		cursor: wait;
	}

	/* ==========================================================================
	   Responsive
	   ========================================================================== */

	@media (max-width: 768px) {
		.insight-fullscreen {
			padding: var(--space-lg, 2.5rem);
		}

		.comparison-row {
			grid-template-columns: 50px 1fr;
		}

		.comparison-result {
			grid-column: 1 / -1;
			text-align: left;
			padding-left: 50px;
		}

		.insight-footer {
			flex-direction: column;
			gap: var(--space-md, 1.5rem);
			align-items: stretch;
		}

		.principle-text {
			font-size: var(--text-h1, 2.5rem);
		}
	}

	/* ==========================================================================
	   Reduced Motion
	   ========================================================================== */

	@media (prefers-reduced-motion: reduce) {
		.click-hint {
			animation: none;
			opacity: 0.6;
		}
	}
</style>
