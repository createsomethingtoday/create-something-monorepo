<script lang="ts">
	/**
	 * ProcessSection Component
	 *
	 * Discloses the structure of engagement—the hermeneutic circle in action.
	 * Each step understood in context of the whole journey.
	 * Reduces client anxiety about the unknown.
	 */

	interface ProcessStep {
		number: string;
		title: string;
		description: string;
	}

	interface Props {
		headline?: string;
		subheadline?: string;
		steps?: ProcessStep[];
	}

	// 3 steps (Fibonacci), titles 1 word, descriptions ~13 words each
	const defaultSteps: ProcessStep[] = [
		{
			number: '01',
			title: 'Understand',
			description: 'We listen to your challenges, goals, and context before proposing any solutions.'
		},
		{
			number: '02',
			title: 'Design',
			description: 'We craft a strategic path forward aligned with your resources and objectives.'
		},
		{
			number: '03',
			title: 'Deliver',
			description: 'We execute with precision and remain partners as your situation evolves.'
		}
	];

	// Headline: 3 words (Fibonacci), Subheadline: 13 words (Fibonacci)
	let {
		headline = 'How We Work',
		subheadline = 'A structured approach through three stages that builds clarity and confidence.',
		steps = defaultSteps
	}: Props = $props();
</script>

<section class="process-section">
	<div class="container">
		<div class="section-header">
			<h2 class="section-title">{headline}</h2>
			<p class="section-subtitle">{subheadline}</p>
		</div>

		<div class="process-grid stagger-children">
			{#each steps as step, index}
				<div class="process-step stagger-item">
					<div class="step-number">{step.number}</div>
					<div class="step-content">
						<h3 class="step-title">{step.title}</h3>
						<p class="step-description">{step.description}</p>
					</div>
					{#if index < steps.length - 1}
						<div class="step-connector" aria-hidden="true"></div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.process-section {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-pure);
	}

	.container {
		max-width: var(--container-xl);
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-2xl);
		max-width: var(--width-prose);
		margin-left: auto;
		margin-right: auto;
	}

	.section-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.section-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.process-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-xl);
	}

	@media (min-width: 768px) {
		.process-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: var(--space-lg);
		}
	}

	@media (min-width: 1024px) {
		.process-grid {
			grid-template-columns: repeat(3, 1fr);
			gap: var(--space-lg);
		}
	}

	.process-step {
		position: relative;
		text-align: center;
		padding: var(--space-lg) var(--space-md);
	}

	@media (min-width: 1024px) {
		.process-step {
			text-align: left;
		}
	}

	.step-number {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-subtle);
		line-height: 1;
		margin-bottom: var(--space-md);
		letter-spacing: var(--tracking-tight);
	}

	.step-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.step-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	/* Connector line between steps - desktop only */
	.step-connector {
		display: none;
	}

	@media (min-width: 1024px) {
		.step-connector {
			display: block;
			position: absolute;
			top: calc(var(--space-lg) + 2rem);
			right: 0;
			width: 100%;
			height: 1px;
			background: linear-gradient(
				to right,
				transparent 0%,
				var(--color-border-default) 20%,
				var(--color-border-default) 80%,
				transparent 100%
			);
			transform: translateX(50%);
		}
	}
</style>
