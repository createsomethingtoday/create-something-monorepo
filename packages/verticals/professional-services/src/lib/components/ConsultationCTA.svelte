<script lang="ts">
	interface Props {
		headline?: string;
		description?: string;
		ctaText?: string;
		ctaHref?: string;
	}

	// Headline: 5 words (Fibonacci), Description: ~13 words (Fibonacci), CTA: 3 words (Fibonacci)
	let {
		headline = "Let's Build Something Together",
		description = "Schedule a conversation to explore how strategic partnership can move your business forward.",
		ctaText = "Start a Conversation",
		ctaHref = "/contact"
	}: Props = $props();
</script>

<section class="cta-section">
	<div class="container">
		<div class="cta-content card-interactive stagger-children">
			<h2 class="cta-headline stagger-item">{headline}</h2>
			<p class="cta-description stagger-item">{description}</p>
			<a href={ctaHref} class="cta-primary btn-canon cta-button stagger-item">{ctaText}</a>
		</div>
	</div>
</section>

<style>
	.cta-section {
		padding: var(--space-3xl) 0;
		background: var(--color-bg-pure);
	}

	.container {
		max-width: var(--container-xl);
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	.cta-content {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		padding: var(--space-2xl) var(--space-xl);
		text-align: center;
		max-width: var(--width-prose);
		margin: 0 auto;
	}

	.cta-headline {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.cta-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-lg);
	}

	.cta-button {
		display: inline-block;
		font-size: var(--text-body);
	}
</style>
