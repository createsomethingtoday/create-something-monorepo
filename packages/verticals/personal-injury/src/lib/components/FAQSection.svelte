<script lang="ts">
	/**
	 * FAQSection - Accordion FAQ
	 *
	 * Premium feature: Expanding FAQ items with smooth animation.
	 * Philosophy: Answer questions before they're asked.
	 * Canon: Expand/collapse reveals hidden content (functional motion).
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';
	import { ChevronDown } from 'lucide-svelte';

	const siteConfig = getSiteConfigFromContext();
	const { faq } = siteConfig;

	let openIndex = $state<number | null>(null);

	function toggle(index: number) {
		openIndex = openIndex === index ? null : index;
	}

	function handleKeydown(event: KeyboardEvent, index: number) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggle(index);
		}
	}
</script>

<section class="faq-section">
	<div class="faq-container">
		<div class="section-header">
			<h2 class="section-title">Frequently Asked Questions</h2>
			<p class="section-subtitle">Common questions about working with our firm</p>
		</div>

		<div class="faq-list" role="region" aria-label="Frequently asked questions">
			{#each faq as item, index}
				<div class="faq-item" class:open={openIndex === index}>
					<button
						class="faq-question"
						onclick={() => toggle(index)}
						onkeydown={(e) => handleKeydown(e, index)}
						aria-expanded={openIndex === index}
						aria-controls={`faq-answer-${index}`}
					>
						<span class="question-text">{item.question}</span>
						<span class="question-icon" class:rotated={openIndex === index}>
							<ChevronDown size={20} strokeWidth={2} />
						</span>
					</button>
					<div
						id={`faq-answer-${index}`}
						class="faq-answer"
						class:visible={openIndex === index}
						role="region"
						aria-hidden={openIndex !== index}
					>
						<div class="answer-inner">
							<p class="answer-text">{item.answer}</p>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<div class="faq-cta">
			<p class="cta-text">Still have questions?</p>
			<a href="/contact" class="cta-button">Contact Us</a>
		</div>
	</div>
</section>

<style>
	.faq-section {
		padding: var(--space-3xl) var(--space-lg);
		background: var(--color-bg-elevated);
	}

	.faq-container {
		max-width: 800px;
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.section-title {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.section-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.faq-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.faq-item {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.faq-item.open {
		border-color: var(--color-border-emphasis);
	}

	.faq-item:hover:not(.open) {
		border-color: var(--color-border-emphasis);
	}

	.faq-question {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-md) var(--space-lg);
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		color: var(--color-fg-primary);
	}

	.question-text {
		font-size: var(--text-body-lg);
		font-weight: var(--font-medium);
		line-height: var(--leading-snug);
		padding-right: var(--space-md);
	}

	.question-icon {
		flex-shrink: 0;
		color: var(--color-fg-tertiary);
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.question-icon.rotated {
		transform: rotate(180deg);
	}

	.faq-answer {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows var(--duration-standard) var(--ease-standard);
	}

	.faq-answer.visible {
		grid-template-rows: 1fr;
	}

	.answer-inner {
		overflow: hidden;
	}

	.answer-text {
		padding: 0 var(--space-lg) var(--space-lg);
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
	}

	/* CTA */
	.faq-cta {
		text-align: center;
		margin-top: var(--space-xl);
		padding-top: var(--space-xl);
		border-top: 1px solid var(--color-border-default);
	}

	.cta-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-md);
	}

	.cta-button {
		display: inline-block;
		padding: var(--space-sm) var(--space-xl);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-bg-pure);
		background: var(--color-fg-primary);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.cta-button:hover {
		background: var(--color-fg-secondary);
		transform: translateY(-1px);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.faq-section {
			padding: var(--space-2xl) var(--space-md);
		}

		.faq-question {
			padding: var(--space-md);
		}

		.question-text {
			font-size: var(--text-body);
		}

		.answer-text {
			padding: 0 var(--space-md) var(--space-md);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.question-icon {
			transition: none;
		}

		.faq-answer {
			transition: none;
		}
	}
</style>
