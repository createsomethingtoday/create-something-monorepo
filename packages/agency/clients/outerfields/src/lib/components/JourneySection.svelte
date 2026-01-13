<script lang="ts">
	/**
	 * OUTERFIELDS Journey Section
	 *
	 * Explains where we've been and where we're going using the
	 * Code + Media + Build + Sell formula
	 */

	interface JourneyPillar {
		icon: string;
		title: string;
		description: string;
	}

	const pillars: JourneyPillar[] = [
		{
			icon: '💻',
			title: 'Code',
			description: 'Data-driven actions, building scripts, and platform development'
		},
		{
			icon: '🎬',
			title: 'Media',
			description: 'Creating actual content that resonates and engages'
		},
		{
			icon: '🏗️',
			title: 'Build',
			description: 'Systems, workflows, and infrastructure that scale'
		},
		{
			icon: '📈',
			title: 'Sell',
			description: 'Marketing the networks and driving real growth'
		}
	];
</script>

<section class="journey-section">
	<div class="journey-container">
		<h2 class="journey-title">Where We've Been and Where We're Going</h2>

		<p class="journey-intro">
			Building OUTERFIELDS is more than just code—it's a complete formula for creating
			sustainable content networks. Here's our approach:
		</p>

		<div class="pillars-grid">
			{#each pillars as pillar}
				<div class="pillar-card">
					<div class="pillar-icon">{pillar.icon}</div>
					<h3 class="pillar-title">{pillar.title}</h3>
					<p class="pillar-description">{pillar.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.journey-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-pure);
	}

	.journey-container {
		max-width: 75rem;
		margin: 0 auto;
	}

	.journey-title {
		font-size: var(--text-h1);
		font-weight: 800;
		line-height: 1.2;
		letter-spacing: -0.02em;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-lg);
		text-align: center;
	}

	.journey-intro {
		font-size: var(--text-body-lg);
		line-height: 1.7;
		color: var(--color-fg-secondary);
		max-width: 48rem;
		margin: 0 auto var(--space-2xl);
		text-align: center;
	}

	.pillars-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-lg);
	}

	.pillar-card {
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.pillar-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-4px);
	}

	.pillar-icon {
		font-size: 3rem;
		margin-bottom: var(--space-md);
	}

	.pillar-title {
		font-size: var(--text-h3);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.pillar-description {
		font-size: var(--text-body);
		line-height: 1.6;
		color: var(--color-fg-tertiary);
		margin: 0;
	}

	/* Tablet: 2 columns */
	@media (max-width: 768px) {
		.journey-section {
			padding: var(--space-xl) var(--space-md);
		}

		.pillars-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: var(--space-md);
		}

		.pillar-card {
			padding: var(--space-lg);
		}

		.pillar-icon {
			font-size: 2.5rem;
		}
	}

	/* Mobile: 1 column */
	@media (max-width: 480px) {
		.journey-section {
			padding: var(--space-lg) var(--space-sm);
		}

		.pillars-grid {
			grid-template-columns: 1fr;
			gap: var(--space-sm);
		}

		.pillar-card {
			padding: var(--space-md);
		}

		.pillar-icon {
			font-size: 2rem;
			margin-bottom: var(--space-sm);
		}

		.journey-title {
			font-size: var(--text-h2);
		}

		.journey-intro {
			font-size: var(--text-body);
		}
	}
</style>
