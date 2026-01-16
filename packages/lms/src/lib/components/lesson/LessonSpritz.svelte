<script lang="ts">
	/**
	 * LessonSpritz - Spritz RSVP wrapper for mantras
	 * 
	 * Displays key phrases using Spritz speed reading.
	 * Perfect for memorable quotes and mantras.
	 */
	import { Spritz } from '@create-something/spritz';

	let {
		messages,
		wpm = 250,
		showControls = true,
		class: className = '',
		onComplete
	}: {
		messages: string[] | { label?: string; text: string }[];
		wpm?: number;
		showControls?: boolean;
		class?: string;
		onComplete?: () => void;
	} = $props();

	// Normalize messages to content format
	const content = $derived(
		messages.map((msg, i) => {
			if (typeof msg === 'string') {
				return { label: `${i + 1}`, text: msg };
			}
			return msg;
		})
	);
</script>

<section class="lesson-spritz {className}">
	<div class="spritz-label">
		<span class="label-icon">◉</span>
		<span>Focus Mode</span>
	</div>
	
	<div class="spritz-container">
		<Spritz 
			{content}
			{wpm}
			{showControls}
			showProgress
			showWpmControl
			on:complete={onComplete}
		/>
	</div>
	
	<p class="spritz-hint">
		Press play. Let the words come to you.
	</p>
</section>

<style>
	.lesson-spritz {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-lg);
		max-width: 700px;
		margin: var(--space-xl) auto;
	}

	.spritz-label {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-lg);
	}

	.label-icon {
		color: var(--color-success);
	}

	.spritz-container {
		min-height: 200px;
	}

	.spritz-hint {
		text-align: center;
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-top: var(--space-lg);
		margin-bottom: 0;
	}
</style>
