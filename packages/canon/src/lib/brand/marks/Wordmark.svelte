<script lang="ts">
	/**
	 * Wordmark - CREATE SOMETHING Text Mark
	 *
	 * The brand wordmark with support for multiple sizes, layouts,
	 * taglines, and reveal animations with word stagger.
	 *
	 * "Weniger, aber besser" - Dieter Rams
	 *
	 * @example
	 * <Wordmark />
	 * <Wordmark size="xl" tagline="Research & Tools" />
	 * <Wordmark layout="split" animate />
	 */

	import type { WordmarkProps, WordmarkSize } from '../types.js';

	// =============================================================================
	// PROPS
	// =============================================================================

	interface Props extends WordmarkProps {}

	let {
		size = 'md',
		tagline = '',
		layout = 'inline',
		animate = false,
		animationType = 'reveal',
		staggerDelay = 100,
		class: className = ''
	}: Props = $props();

	// =============================================================================
	// SIZE MAPPING
	// =============================================================================

	/**
	 * Map sizes to Canon typography tokens
	 */
	const SIZE_TO_TOKEN: Record<WordmarkSize, string> = {
		xs: 'var(--text-performance-body-sm)',
		sm: 'var(--text-performance-body)',
		md: 'var(--text-performance-h3)',
		lg: 'var(--text-performance-h2)',
		xl: 'var(--text-performance-h1)',
		display: 'var(--text-performance-display)',
		'display-xl': 'var(--text-performance-display-xl)'
	};

	/**
	 * Tagline size relative to wordmark size
	 */
	const TAGLINE_SIZE: Record<WordmarkSize, string> = {
		xs: 'var(--text-performance-caption)',
		sm: 'var(--text-performance-caption)',
		md: 'var(--text-performance-body-sm)',
		lg: 'var(--text-performance-body-sm)',
		xl: 'var(--text-performance-body)',
		display: 'var(--text-performance-body-lg)',
		'display-xl': 'var(--text-performance-h3)'
	};

	const fontSize = $derived(SIZE_TO_TOKEN[size]);
	const taglineSize = $derived(TAGLINE_SIZE[size]);

	// Animation class
	const animationClass = $derived(
		animate && animationType !== 'none' ? `wordmark-${animationType}` : ''
	);
</script>

<div
	class="wordmark layout-{layout} {animationClass} {className}"
	style="--wordmark-size: {fontSize}; --tagline-size: {taglineSize}; --stagger-delay: {staggerDelay}ms"
>
	<span class="wordmark-text" aria-label="CREATE SOMETHING">
		{#if layout === 'split'}
			<!-- Split layout: CREATE on one line, SOMETHING on next -->
			<span class="word word-create" style="--word-index: 0">CREATE</span>
			<br />
			<span class="word word-something" style="--word-index: 1">SOMETHING</span>
		{:else}
			<!-- Inline and stacked: both words on same line -->
			<span class="word word-create" style="--word-index: 0">CREATE</span>
			<span class="word-space">&nbsp;</span>
			<span class="word word-something" style="--word-index: 1">SOMETHING</span>
		{/if}
	</span>

	{#if tagline}
		<span class="tagline" style="--word-index: 2">{tagline}</span>
	{/if}
</div>

<style>
	.wordmark {
		display: inline-flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
		font-family: var(--font-performance-sans);
	}

	.wordmark-text {
		font-size: var(--wordmark-size, var(--text-performance-h3));
		font-weight: var(--font-performance-bold);
		letter-spacing: var(--tracking-performance-tight);
		line-height: var(--leading-performance-tight);
		color: var(--color-performance-fg-primary);
	}

	/* Word styling */
	.word {
		display: inline-block;
	}

	.word-create {
		color: var(--color-performance-fg-primary);
	}

	.word-something {
		color: var(--color-performance-fg-primary);
	}

	/* Layout variants */
	.layout-inline .wordmark-text {
		display: inline;
	}

	.layout-stacked {
		text-align: center;
	}

	.layout-split .wordmark-text {
		display: block;
		line-height: 1.1;
	}

	/* Tagline */
	.tagline {
		font-size: var(--tagline-size, var(--text-performance-body-sm));
		font-weight: var(--font-performance-regular);
		color: var(--color-performance-fg-secondary);
		letter-spacing: var(--tracking-performance-wide);
		text-transform: uppercase;
	}

	.layout-stacked .tagline,
	.layout-split .tagline {
		text-align: center;
	}

	/* ==========================================================================
	   Reveal Animation
	   Words appear sequentially with stagger
	   ========================================================================== */

	.wordmark-reveal .word,
	.wordmark-reveal .tagline {
		opacity: 0;
		transform: translateY(0.5em);
		animation: word-reveal var(--duration-performance-complex) var(--ease-performance-standard) forwards;
		animation-delay: calc(var(--word-index, 0) * var(--stagger-delay, 100ms));
	}

	@keyframes word-reveal {
		from {
			opacity: 0;
			transform: translateY(0.5em);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ==========================================================================
	   Pulse Animation
	   Subtle breathing effect
	   ========================================================================== */

	.wordmark-pulse .wordmark-text {
		animation: wordmark-pulse var(--duration-performance-complex) var(--ease-performance-standard) infinite alternate;
	}

	@keyframes wordmark-pulse {
		from {
			opacity: 0.8;
		}
		to {
			opacity: 1;
		}
	}

	/* ==========================================================================
	   Assemble Animation
	   Words assemble from scattered positions
	   ========================================================================== */

	.wordmark-assemble .word {
		opacity: 0;
		animation: word-assemble var(--duration-performance-complex) var(--ease-performance-standard) forwards;
	}

	.wordmark-assemble .word-create {
		transform: translateX(-1em);
		animation-delay: 0ms;
	}

	.wordmark-assemble .word-something {
		transform: translateX(1em);
		animation-delay: 150ms;
	}

	.wordmark-assemble .tagline {
		opacity: 0;
		transform: translateY(0.5em);
		animation: word-reveal var(--duration-performance-complex) var(--ease-performance-standard) forwards;
		animation-delay: 300ms;
	}

	@keyframes word-assemble {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	/* ==========================================================================
	   Reduced Motion
	   ========================================================================== */

	@media (prefers-reduced-motion: reduce) {
		.wordmark-reveal .word,
		.wordmark-reveal .tagline,
		.wordmark-pulse .wordmark-text,
		.wordmark-assemble .word,
		.wordmark-assemble .tagline {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
