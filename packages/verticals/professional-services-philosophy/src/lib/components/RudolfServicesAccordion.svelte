<script lang="ts">
	/**
	 * RudolfServicesAccordion - Replicates Rudolf template services section
	 *
	 * Layout: Expandable accordion pattern
	 * Interaction: Smooth expand/collapse with icon rotation
	 */

	import { siteConfig } from '$lib/config/context';

	let expandedIndex = $state<number | null>(null);

	function toggle(index: number) {
		expandedIndex = expandedIndex === index ? null : index;
	}
</script>

<section id="services" class="section-services">
	<div class="container">
		<div class="section-header">
			<h2 class="section-heading">Practice Areas</h2>
			<p class="section-subheading">
				Purposeful disclosure. Each area demonstrates philosophy in action.
			</p>
		</div>
		<div class="services-accordion">
			{#each $siteConfig.practiceAreas as area, index}
				<div class="accordion-item" class:expanded={expandedIndex === index}>
					<button
						class="accordion-header"
						onclick={() => toggle(index)}
						aria-expanded={expandedIndex === index}
					>
						<h3 class="accordion-title">{area.title}</h3>
						<div class="accordion-icon">
							<svg
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<line x1="12" y1="5" x2="12" y2="19"></line>
								<line x1="5" y1="12" x2="19" y2="12"></line>
							</svg>
						</div>
					</button>
					<div class="accordion-content">
						<div class="accordion-inner">
							<p class="accordion-summary">{area.summary}</p>
							<p class="accordion-details">{area.details}</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.section-services {
		padding: var(--section-padding) 0;
		background: var(--color-bg-elevated);
	}

	.container {
		max-width: 1000px;
		margin: 0 auto;
		padding: 0 var(--space-lg);
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-4xl);
	}

	.section-heading {
		font-size: clamp(2.5rem, 5vw, 4rem);
		font-weight: 700;
		line-height: 1.2;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md);
		letter-spacing: -0.02em;
	}

	.section-subheading {
		font-size: var(--text-body-lg);
		line-height: 1.6;
		color: var(--color-fg-secondary);
		max-width: 600px;
		margin: 0 auto;
	}

	.services-accordion {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.accordion-item {
		border-bottom: 1px solid var(--color-border-default);
	}

	.accordion-item:first-child {
		border-top: 1px solid var(--color-border-default);
	}

	.accordion-header {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-xl) 0;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: padding var(--duration-standard) var(--ease-standard);
	}

	.accordion-header:hover {
		padding-left: var(--space-sm);
	}

	.accordion-title {
		font-size: clamp(1.5rem, 3vw, 2rem);
		font-weight: 700;
		line-height: 1.3;
		color: var(--color-fg-primary);
		margin: 0;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.accordion-header:hover .accordion-title {
		color: var(--color-fg-secondary);
	}

	.accordion-icon {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-fg-primary);
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.accordion-item.expanded .accordion-icon {
		transform: rotate(45deg);
	}

	.accordion-content {
		max-height: 0;
		overflow: hidden;
		transition: max-height var(--duration-complex) var(--ease-standard);
	}

	.accordion-item.expanded .accordion-content {
		max-height: 500px;
	}

	.accordion-inner {
		padding: 0 0 var(--space-xl);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.accordion-summary {
		font-size: var(--text-body-lg);
		line-height: 1.6;
		color: var(--color-fg-primary);
		margin: 0;
		font-weight: 500;
	}

	.accordion-details {
		font-size: var(--text-body);
		line-height: 1.7;
		color: var(--color-fg-tertiary);
		margin: 0;
	}
</style>
