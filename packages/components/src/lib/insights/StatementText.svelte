<script lang="ts">
	/**
	 * StatementText - Animated Typography for Insights
	 *
	 * Large statement text that reveals its essence through subtraction.
	 * Words marked as "keep" survive; others strike through and become ghosted.
	 *
	 * Palimpsest mode (default): Struck words remain visible but faded,
	 * creating an erasure poetry aesthetic. The archaeology of thought
	 * stays visible—you see what was removed to arrive at truth.
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
		variant = 'palimpsest',
		class: className = ''
	}: StatementTextProps = $props();

	// Palimpsest: struck words remain visible but ghosted
	// Collapse: struck words shrink to nothing (original behavior)
	const isPalimpsest = $derived(variant === 'palimpsest');

	// Reverse mode: start coalesced, expand to full
	const isReverse = $derived(direction === 'reverse');

	// =============================================================================
	// DERIVED STATE
	// =============================================================================

	// Phase-based progress values (reversed for reverse mode)
	// In reverse mode, strikeProgress mirrors progress (1→0) for smooth fade-out
	const strikeProgress = $derived(
		isReverse
			? progress  // Smooth fade: as progress goes 1→0, strike fades out
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

	// Ghost state: struck words fade to low opacity at coalescing/complete phases
	// Palimpsest keeps them visible; collapse hides them entirely
	const shouldGhost = $derived(
		phase === 'coalescing' || phase === 'complete'
	);

	// Size classes
	const sizeClass = $derived(
		size === 'display' ? 'size-display' :
		size === 'headline' ? 'size-headline' :
		'size-body'
	);
</script>

<p class="statement-text {sizeClass} {className}" class:coalesced={isCoalesced} class:reverse={isReverse} class:palimpsest={isPalimpsest}>
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
			class:ghosted={!word.keep && shouldGhost}
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

	/* Palimpsest: ghosted words remain visible but faded */
	.word.ghosted {
		opacity: 0.18;
		font-weight: var(--font-normal, 400);
	}

	/* Palimpsest: strikethrough stays visible on ghosted words */
	.palimpsest .word.ghosted .strike {
		width: 100%;
		opacity: 0.4;
	}

	/* Collapse variant: ghosted words shrink to nothing */
	.statement-text:not(.palimpsest) .word.ghosted {
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

		/* Palimpsest: instant ghost state */
		.palimpsest .word.ghosted {
			opacity: 0.18;
		}

		/* Collapse: instant hide */
		.statement-text:not(.palimpsest) .word.ghosted {
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
