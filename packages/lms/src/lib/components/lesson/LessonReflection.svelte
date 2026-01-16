<script lang="ts">
	/**
	 * LessonReflection - Interactive reflection prompts
	 * 
	 * Displays a question with a hidden answer that reveals on click.
	 * Uses CanonReveal for the answer reveal.
	 */
	import { CanonReveal } from '@create-something/components/motion';
	import { ChevronDown } from 'lucide-svelte';

	type RevealStyle = 'decode' | 'unconcealment' | 'typewriter' | 'threshold' | 'mask';

	let {
		prompt,
		answer,
		reveal = 'threshold' as RevealStyle,
		class: className = ''
	}: {
		prompt: string;
		answer: string;
		reveal?: RevealStyle;
		class?: string;
	} = $props();

	let revealed = $state(false);
	let answerKey = $state(0);

	function revealAnswer() {
		if (!revealed) {
			revealed = true;
			answerKey++; // Force re-mount to trigger animation
		}
	}
</script>

<section class="lesson-reflection {className}">
	<div class="reflection-label">Reflection</div>
	
	<div class="reflection-card">
		<p class="reflection-prompt">{prompt}</p>
		
		{#if !revealed}
			<button class="reveal-btn" onclick={revealAnswer}>
				<span>Reveal answer</span>
				<ChevronDown size={18} />
			</button>
		{:else}
			<div class="reflection-answer">
				{#key answerKey}
					<CanonReveal
						text={answer}
						{reveal}
						duration={1000}
						class="answer-text"
					/>
				{/key}
			</div>
		{/if}
	</div>
</section>

<style>
	.lesson-reflection {
		padding: var(--space-xl);
		max-width: 700px;
		margin: var(--space-2xl) auto;
	}

	.reflection-label {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-md);
	}

	.reflection-card {
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-lg);
		text-align: center;
	}

	.reflection-prompt {
		font-size: var(--text-h3);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		line-height: var(--leading-snug);
		margin: 0 0 var(--space-lg);
	}

	.reveal-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.reveal-btn:hover {
		background: var(--color-bg-base);
		color: var(--color-fg-primary);
		border-color: var(--color-border-emphasis);
	}

	.reflection-answer {
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-subtle);
		margin-top: var(--space-lg);
	}

	:global(.answer-text) {
		font-size: var(--text-body-lg) !important;
		color: var(--color-fg-secondary) !important;
		font-style: italic;
	}
</style>
