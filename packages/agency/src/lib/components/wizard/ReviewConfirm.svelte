<script lang="ts">
	/**
	 * Review & Confirm - Step 5
	 *
	 * Summary of configuration with tier selection.
	 */

	import { wizardState, TEMPLATES, PRICING } from '$lib/stores/wizardState';

	$: template = TEMPLATES.find((t) => t.id === $wizardState.templateId);
	$: selectedTier = $wizardState.tier;
</script>

<div class="review-confirm">
	<h2 class="step-title">Review your configuration</h2>
	<p class="step-description">Make sure everything looks right</p>

	<!-- Summary -->
	<div class="summary">
		<div class="summary-section">
			<h3 class="section-title">Template</h3>
			<div class="section-content">
				<span class="value">{template?.name || 'Unknown'}</span>
				<button class="edit-btn" onclick={() => wizardState.goToStep(1)}>Edit</button>
			</div>
		</div>

		<div class="summary-section">
			<h3 class="section-title">Subdomain</h3>
			<div class="section-content">
				<span class="value">{$wizardState.subdomain}.createsomething.space</span>
				<button class="edit-btn" onclick={() => wizardState.goToStep(2)}>Edit</button>
			</div>
		</div>

		<div class="summary-section">
			<h3 class="section-title">Business</h3>
			<div class="section-content">
				<span class="value">{$wizardState.config.name || 'Not set'}</span>
				<button class="edit-btn" onclick={() => wizardState.goToStep(3)}>Edit</button>
			</div>
		</div>
	</div>

	<!-- Tier Selection -->
	<div class="tier-selection">
		<h3 class="tier-title">Select your plan</h3>

		<div class="tier-options">
			{#each Object.entries(PRICING) as [key, tier]}
				<button
					class="tier-card"
					class:selected={selectedTier === key}
					onclick={() => wizardState.setTier(key as 'solo' | 'team')}
				>
					<div class="tier-header">
						<span class="tier-name">{tier.label}</span>
						{#if key === 'solo'}
							<span class="tier-badge">Popular</span>
						{/if}
					</div>
					<div class="tier-price">
						<span class="amount">${tier.monthly}</span>
						<span class="period">/month</span>
					</div>
					<p class="tier-description">{tier.description}</p>
					{#if selectedTier === key}
						<div class="selected-check">✓</div>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<div class="terms">
		<p>
			By subscribing, you agree to our
			<a href="/terms" target="_blank">Terms of Service</a>
			and
			<a href="/privacy" target="_blank">Privacy Policy</a>.
		</p>
	</div>
</div>

<style>
	.review-confirm {
		max-width: 600px;
		margin: 0 auto;
	}

	.step-title {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
		text-align: center;
	}

	.step-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xl);
		text-align: center;
	}

	/* Summary */
	.summary {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-xl);
		overflow: hidden;
	}

	.summary-section {
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.summary-section:last-child {
		border-bottom: none;
	}

	.section-title {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-xs);
	}

	.section-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.value {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
	}

	.edit-btn {
		background: none;
		border: none;
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		cursor: pointer;
		text-decoration: underline;
	}

	.edit-btn:hover {
		color: var(--color-fg-primary);
	}

	/* Tier Selection */
	.tier-selection {
		margin-bottom: var(--space-xl);
	}

	.tier-title {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		text-align: center;
	}

	.tier-options {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	@media (max-width: 480px) {
		.tier-options {
			grid-template-columns: 1fr;
		}
	}

	.tier-card {
		position: relative;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-align: left;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.tier-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.tier-card.selected {
		border-color: var(--color-fg-primary);
		border-width: 2px;
	}

	.tier-header {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
	}

	.tier-name {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		font-weight: 500;
	}

	.tier-badge {
		font-size: var(--text-caption);
		padding: 2px var(--space-xs);
		background: var(--color-success-muted);
		color: var(--color-success);
		border-radius: var(--radius-sm);
	}

	.tier-price {
		margin-bottom: var(--space-sm);
	}

	.amount {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
	}

	.period {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.tier-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.selected-check {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		width: 24px;
		height: 24px;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-caption);
	}

	/* Terms */
	.terms {
		text-align: center;
	}

	.terms p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.terms a {
		color: var(--color-fg-secondary);
		text-decoration: underline;
	}

	.terms a:hover {
		color: var(--color-fg-primary);
	}
</style>
