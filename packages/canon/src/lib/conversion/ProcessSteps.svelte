<script lang="ts">
	/**
	 * ProcessSteps Component
	 *
	 * Discloses the structure of engagement—reduces anxiety about the unknown.
	 * Each step understood in context of the whole journey.
	 *
	 * Canon principle: Clarity reduces friction.
	 *
	 * @example
	 * <ProcessSteps
	 *   headline="How We Work"
	 *   steps={[
	 *     { number: '01', title: 'Discover', description: 'We learn your context.' },
	 *     { number: '02', title: 'Design', description: 'We craft solutions.' },
	 *     { number: '03', title: 'Deliver', description: 'We execute with precision.' }
	 *   ]}
	 * />
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
		showConnectors?: boolean;
	}

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

	let {
		headline = 'How We Work',
		subheadline = 'A structured approach that builds clarity and confidence.',
		steps = defaultSteps,
		showConnectors = true
	}: Props = $props();
</script>

<section class="process-section">
	<div class="container">
		<div class="section-header">
			<h2 class="section-title">{headline}</h2>
			{#if subheadline}
				<p class="section-subtitle">{subheadline}</p>
			{/if}
		</div>

		<div class="process-grid">
			{#each steps as step, index}
				<div class="process-step">
					<div class="step-number">{step.number}</div>
					<div class="step-content">
						<h3 class="step-title">{step.title}</h3>
						<p class="step-description">{step.description}</p>
					</div>
					{#if showConnectors && index < steps.length - 1}
						<div class="step-connector" aria-hidden="true"></div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.process-section {
		padding: var(--space-performance-2xl, 6.854rem) 0;
		background: var(--color-performance-bg-pure, #000);
	}

	.container {
		max-width: 72rem;
		margin: 0 auto;
		padding: 0 var(--space-performance-md, 1.618rem);
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-performance-2xl, 6.854rem);
		max-width: 40rem;
		margin-left: auto;
		margin-right: auto;
	}

	.section-title {
		font-size: var(--text-performance-h1, clamp(2rem, 3vw + 1rem, 3.5rem));
		font-weight: 700;
		color: var(--color-performance-fg-primary, #fff);
		margin-bottom: var(--space-performance-sm, 1rem);
	}

	.section-subtitle {
		font-size: var(--text-performance-body-lg, 1.125rem);
		color: var(--color-performance-fg-secondary, rgba(255, 255, 255, 0.8));
		line-height: 1.6;
	}

	.process-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-performance-xl, 4.236rem);
	}

	@media (min-width: 768px) {
		.process-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: var(--space-performance-lg, 2.618rem);
		}
	}

	@media (min-width: 1024px) {
		.process-grid {
			grid-template-columns: repeat(3, 1fr);
			gap: var(--space-performance-lg, 2.618rem);
		}
	}

	.process-step {
		position: relative;
		text-align: center;
		padding: var(--space-performance-lg, 2.618rem) var(--space-performance-md, 1.618rem);
	}

	@media (min-width: 1024px) {
		.process-step {
			text-align: left;
		}
	}

	.step-number {
		font-size: var(--text-performance-display, clamp(2.5rem, 4vw + 1.5rem, 5rem));
		font-weight: 700;
		color: var(--color-performance-fg-subtle, rgba(255, 255, 255, 0.2));
		line-height: 1;
		margin-bottom: var(--space-performance-md, 1.618rem);
		letter-spacing: -0.02em;
	}

	.step-title {
		font-size: var(--text-performance-h3, clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem));
		font-weight: 600;
		color: var(--color-performance-fg-primary, #fff);
		margin-bottom: var(--space-performance-sm, 1rem);
	}

	.step-description {
		font-size: var(--text-performance-body-sm, 0.875rem);
		color: var(--color-performance-fg-tertiary, rgba(255, 255, 255, 0.6));
		line-height: 1.6;
	}

	/* Connector line between steps - desktop only */
	.step-connector {
		display: none;
	}

	@media (min-width: 1024px) {
		.step-connector {
			display: block;
			position: absolute;
			top: calc(var(--space-performance-lg, 2.618rem) + 2rem);
			right: 0;
			width: 100%;
			height: 1px;
			background: linear-gradient(
				to right,
				transparent 0%,
				var(--color-performance-border-default, rgba(255, 255, 255, 0.1)) 20%,
				var(--color-performance-border-default, rgba(255, 255, 255, 0.1)) 80%,
				transparent 100%
			);
			transform: translateX(50%);
		}
	}
</style>
