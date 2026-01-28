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
		xs: 'var(--text-body-sm)',
		sm: 'var(--text-body)',
		md: 'var(--text-h3)',
		lg: 'var(--text-h2)',
		xl: 'var(--text-h1)',
		display: 'var(--text-display)',
		'display-xl': 'var(--text-display-xl)'
	};

	/**
	 * Tagline size relative to wordmark size
	 */
	const TAGLINE_SIZE: Record<WordmarkSize, string> = {
		xs: 'var(--text-caption)',
		sm: 'var(--text-caption)',
		md: 'var(--text-body-sm)',
		lg: 'var(--text-body-sm)',
		xl: 'var(--text-body)',
		display: 'var(--text-body-lg)',
		'display-xl': 'var(--text-h3)'
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
		gap: var(--space-xs);
		font-family: var(--font-sans);
	}

	.wordmark-text {
		font-size: var(--wordmark-size, var(--text-h3));
		font-weight: var(--font-bold);
		letter-spacing: var(--tracking-tight);
		line-height: var(--leading-tight);
		color: var(--color-fg-primary);
	}

	/* Word styling */
	.word {
		display: inline-block;
	}

	.word-create {
		color: var(--color-fg-primary);
	}

	.word-something {
		color: var(--color-fg-primary);
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
		font-size: var(--tagline-size, var(--text-body-sm));
		font-weight: var(--font-regular);
		color: var(--color-fg-secondary);
		letter-spacing: var(--tracking-wide);
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
		animation: word-reveal var(--duration-complex) var(--ease-standard) forwards;
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
		animation: wordmark-pulse var(--duration-complex) var(--ease-standard) infinite alternate;
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
		animation: word-assemble var(--duration-complex) var(--ease-standard) forwards;
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
		animation: word-reveal var(--duration-complex) var(--ease-standard) forwards;
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
