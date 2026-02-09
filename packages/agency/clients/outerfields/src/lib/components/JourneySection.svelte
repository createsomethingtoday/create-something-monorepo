<script lang="ts">
	/**
	 * OUTERFIELDS Journey Section
	 *
	 * Explains where we've been and where we're going using the
	 * Code + Media + Build + Sell formula
	 */

	import { Code2, Clapperboard, HardHat, TrendingUp } from 'lucide-svelte';
</script>

<section class="journey-section" id="journey">
	<div class="journey-container">
		<h2 class="journey-title">How OUTERFIELDS Works</h2>

		<p class="journey-intro">
			A premium content network is the product. OUTERFIELDS blends code, media, systems, and distribution
			into one subscriber experience.
		</p>

		<div class="pillars-row">
			<div class="pillar-card">
				<div class="pillar-icon" aria-hidden="true">
					<Code2 size={44} />
				</div>
				<h3 class="pillar-title">Code</h3>
				<p class="pillar-description">Data-driven actions, building strategies, and platform development</p>
			</div>
			<span class="plus-sign" aria-hidden="true">+</span>
			<div class="pillar-card">
				<div class="pillar-icon" aria-hidden="true">
					<Clapperboard size={44} />
				</div>
				<h3 class="pillar-title">Media</h3>
				<p class="pillar-description">Creating actual content that resonates and engages</p>
			</div>
			<span class="plus-sign" aria-hidden="true">+</span>
			<div class="pillar-card">
				<div class="pillar-icon" aria-hidden="true">
					<HardHat size={44} />
				</div>
				<h3 class="pillar-title">Build</h3>
				<p class="pillar-description">Systems, workflows, and infrastructure that scale</p>
			</div>
			<span class="plus-sign" aria-hidden="true">+</span>
			<div class="pillar-card">
				<div class="pillar-icon" aria-hidden="true">
					<TrendingUp size={44} />
				</div>
				<h3 class="pillar-title">Sell</h3>
				<p class="pillar-description">Marketing the networks and driving real growth</p>
			</div>
		</div>
		<p class="formula-result"><span class="formula-equals">=</span> <strong>Unstoppable</strong></p>
	</div>
</section>

<style>
	.journey-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-pure);
	}

	.journey-container {
		max-width: var(--container-max-width);
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

	.pillars-row {
		display: flex;
		align-items: stretch;
		justify-content: center;
		flex-wrap: wrap;
		gap: var(--space-md);
	}

	.plus-sign {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-sun);
		line-height: 1;
		flex-shrink: 0;
		user-select: none;
	}

	.formula-result {
		text-align: center;
		font-size: 1.5rem;
		font-weight: 500;
		color: var(--color-fg-secondary);
		margin: var(--space-lg) 0 0;
	}

	.formula-result strong {
		color: var(--color-sun);
		font-weight: 700;
	}

	.formula-equals {
		color: var(--color-fg-secondary);
	}

	.pillar-card {
		flex: 1;
		min-width: 180px;
		max-width: 260px;
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
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--color-fg-primary);
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

	/* Tablet: 2 per row, hide plus signs between wrapped rows */
	@media (max-width: 768px) {
		.journey-section {
			padding: var(--space-xl) var(--space-md);
		}

		.pillars-row {
			gap: var(--space-sm);
		}

		.pillar-card {
			flex: 1 1 calc(50% - 3rem);
			min-width: 160px;
			max-width: none;
			padding: var(--space-lg);
		}

		/* Hide the plus sign between the 2nd and 3rd card (the wrap point) */
		.plus-sign:nth-of-type(2) {
			display: none;
		}
	}

	/* Mobile: 1 column, hide all plus signs */
	@media (max-width: 480px) {
		.journey-section {
			padding: var(--space-lg) var(--space-sm);
		}

		.pillars-row {
			flex-direction: column;
			align-items: stretch;
			gap: var(--space-sm);
		}

		.plus-sign {
			display: none;
		}

		.pillar-card {
			flex: none;
			min-width: unset;
			max-width: none;
			padding: var(--space-md);
		}

		.pillar-icon {
			margin-bottom: var(--space-sm);
		}

		.journey-title {
			font-size: var(--text-h2);
		}

		.journey-intro {
			font-size: var(--text-body);
		}

		.formula-result {
			font-size: 1.25rem;
		}
	}
</style>
