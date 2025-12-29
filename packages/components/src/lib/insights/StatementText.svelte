<script lang="ts">
	/**
	 * StatementText - Animated Typography for Insights
	 *
	 * Large statement text that reveals its essence through subtraction.
	 * Words marked as "keep" survive; others strike through and fade.
	 *
	 * Inspired by TextRevelation, adapted for reusable insight display.
	 *
	 * "Good design is as little design as possible" - Dieter Rams
	 */

	import type { Statement, RevelationPhase, StatementTextProps } from './types.js';

	// =============================================================================
	// PROPS
	// =============================================================================

	let {
		statement,
		phase = 'complete',
		progress = 1,
		size = 'display',
		direction = 'forward',
		class: className = ''
	}: StatementTextProps = $props();

	// Reverse mode: start coalesced, expand to full
	const isReverse = $derived(direction === 'reverse');

	// =============================================================================
	// DERIVED STATE
	// =============================================================================

	// Phase-based progress values (reversed for reverse mode)
	const strikeProgress = $derived(
		isReverse
			? (phase === 'complete' ? 0 : phase === 'fading' ? 1 - progress : 1)
			: (phase === 'reading' ? 0 : phase === 'striking' ? progress : 1)
	);

	const fadeProgress = $derived(
		isReverse
			? (phase === 'reading' ? 1 : phase === 'striking' ? 1 - progress : 0)
			: (phase === 'reading' || phase === 'striking' ? 0 : phase === 'fading' ? progress : 1)
	);

	const coalesceProgress = $derived(
		isReverse
			? (phase === 'reading' || phase === 'striking' ? 1 : 1 - progress)
			: (phase === 'coalescing' || phase === 'complete' ? progress : 0)
	);

	// Text is coalesced (larger, bolder) at coalescing/complete phases
	// Works for both directions: forward ends here, reverse starts here
	const isCoalesced = $derived(
		phase === 'coalescing' || phase === 'complete'
	);

	// Hidden state: words collapse at coalescing/complete phases
	// Works for both directions: forward collapses at end, reverse starts collapsed
	const shouldHide = $derived(
		phase === 'coalescing' || phase === 'complete'
	);

	// Size classes
	const sizeClass = $derived(
		size === 'display' ? 'size-display' :
		size === 'headline' ? 'size-headline' :
		'size-body'
	);
</script>

<p class="statement-text {sizeClass} {className}" class:coalesced={isCoalesced} class:reverse={isReverse}>
	{#each statement.words as word, i}
		{@const wordStrike = isReverse
			? Math.max(0, Math.min(1, strikeProgress - (statement.words.length - i - 1) * 0.03))
			: Math.max(0, Math.min(1, (strikeProgress - i * 0.03) / 0.3))}
		{@const wordFade = word.keep ? 1 : (isReverse ? fadeProgress : 1 - fadeProgress)}
		<span
			class="word"
			class:keep={word.keep}
			class:emphasis={word.emphasis}
			class:removing={!word.keep && (isReverse ? phase !== 'complete' : phase !== 'reading')}
			class:hidden={!word.keep && shouldHide}
			style="--strike: {wordStrike}; --fade: {wordFade};"
		>
			{word.text}
			{#if !word.keep}
				<span class="strike"></span>
			{/if}
		</span>
	{/each}
</p>

<style>
	.statement-text {
		font-weight: var(--font-medium, 500);
		line-height: var(--leading-tight, 1.25);
		letter-spacing: var(--tracking-tight, -0.02em);
		color: var(--color-fg-primary);
		text-align: center;
		transition: font-size 0.8s cubic-bezier(0.4, 0, 0.2, 1),
					font-weight 0.8s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Size variants */
	.size-display {
		font-size: var(--text-h1, 2.5rem);
	}

	.size-display.coalesced {
		font-size: var(--text-display, clamp(2.5rem, 4vw + 1.5rem, 5rem));
		font-weight: var(--font-bold, 700);
	}

	.size-headline {
		font-size: var(--text-h2, 1.875rem);
	}

	.size-headline.coalesced {
		font-size: var(--text-h1, 2.5rem);
		font-weight: var(--font-bold, 700);
	}

	.size-body {
		font-size: var(--text-body-lg, 1.125rem);
	}

	.size-body.coalesced {
		font-size: var(--text-h3, 1.5rem);
		font-weight: var(--font-semibold, 600);
	}

	/* Word styling */
	.word {
		position: relative;
		display: inline-block;
		margin-right: 0.3em;
		opacity: var(--fade, 1);
		max-width: 30ch;
		overflow: hidden;
		vertical-align: bottom;
		transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
					max-width 0.8s cubic-bezier(0.4, 0, 0.2, 1),
					margin 0.8s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.word.keep {
		font-weight: var(--font-semibold, 600);
	}

	.word.emphasis {
		font-weight: var(--font-bold, 700);
	}

	.word.hidden {
		max-width: 0;
		margin-right: 0;
		opacity: 0;
	}

	/* Strikethrough effect */
	.strike {
		position: absolute;
		left: 0;
		top: 55%;
		height: 0.12em;
		width: calc(var(--strike, 0) * 100%);
		background: var(--color-fg-primary);
		transform: translateY(-50%);
		pointer-events: none;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.statement-text,
		.word {
			transition: none !important;
		}

		.word.removing {
			opacity: 0.3;
		}

		.word.hidden {
			display: none;
		}
	}

	/* Responsive */
	@media (max-width: 768px) {
		.size-display {
			font-size: var(--text-h2, 1.875rem);
		}

		.size-display.coalesced {
			font-size: var(--text-h1, 2.5rem);
		}

		.word {
			max-width: 20ch;
		}
	}
</style>
