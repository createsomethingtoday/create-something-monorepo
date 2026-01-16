<script lang="ts">
	/**
	 * LessonPhilosophy - Philosophy concept section with CanonReveal
	 * 
	 * Displays a key philosophical concept with:
	 * - CanonReveal for the main insight
	 * - Callout card explaining the concept
	 * - Optional concept name badge
	 */
	import { CanonReveal } from '@create-something/components/motion';

	type RevealStyle = 'decode' | 'unconcealment' | 'typewriter' | 'threshold' | 'mask';

	let {
		concept = '',
		text,
		explanation,
		reveal = 'unconcealment' as RevealStyle,
		duration = 2000,
		class: className = ''
	}: {
		concept?: string;
		text: string;
		explanation: string;
		reveal?: RevealStyle;
		duration?: number;
		class?: string;
	} = $props();
</script>

<section class="lesson-philosophy {className}">
	{#if concept}
		<div class="concept-badge">{concept}</div>
	{/if}
	
	<div class="philosophy-quote">
		<CanonReveal
			{text}
			{reveal}
			{duration}
			class="quote-text"
		/>
	</div>

	<div class="philosophy-explanation">
		<p>{explanation}</p>
	</div>
</section>

<style>
	.lesson-philosophy {
		padding: var(--space-2xl) var(--space-lg);
		max-width: 700px;
		margin: 0 auto;
	}

	.concept-badge {
		display: inline-block;
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-lg);
	}

	.philosophy-quote {
		margin-bottom: var(--space-xl);
	}

	:global(.quote-text) {
		font-size: var(--text-h2) !important;
		font-weight: var(--font-medium) !important;
		line-height: 1.4 !important;
		color: var(--color-fg-primary) !important;
	}

	.philosophy-explanation {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-left: 3px solid var(--color-fg-muted);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
	}

	.philosophy-explanation p {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
	}
</style>
