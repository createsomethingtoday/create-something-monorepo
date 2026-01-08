<script lang="ts">
	/**
	 * OUTERFIELDS Feature Comparison
	 *
	 * Comparison table showing OUTERFIELDS vs Uscreen
	 */
	import { Infinity, CheckCircle, XCircle, Rocket } from 'lucide-svelte';

	const features = [
		{ name: 'Custom Branding', outerfields: true, uscreen: 'Limited', description: 'Full white-label customization' },
		{ name: 'Advanced Analytics', outerfields: true, uscreen: 'Basic', description: 'Real-time engagement metrics' },
		{ name: 'Community Features', outerfields: true, uscreen: false, description: 'Built-in forums and comments' },
		{ name: 'AI Recommendations', outerfields: true, uscreen: false, description: 'Smart content suggestions' },
		{ name: 'Multi-tier Pricing', outerfields: true, uscreen: true, description: 'Flexible subscription tiers' },
		{ name: 'Live Streaming', outerfields: true, uscreen: true, description: 'Built-in live streaming' },
		{ name: 'Mobile Apps', outerfields: 'Coming Soon', uscreen: true, description: 'Native iOS/Android apps' },
		{ name: 'Creator Tools', outerfields: true, uscreen: 'Limited', description: 'Advanced content management' }
	] as const;
</script>

<section class="comparison-section" id="features">
	<div class="comparison-container">
		<div class="section-header">
			<span class="section-badge">Why Choose Us</span>
			<h2 class="section-title">Better Than the Competition</h2>
			<p class="section-description">
				See how OUTERFIELDS stacks up against Uscreen and other platforms.
			</p>
		</div>

		<div class="comparison-table-wrapper">
			<table class="comparison-table">
				<thead>
					<tr>
						<th class="feature-header">Feature</th>
						<th class="brand-header outerfields">
							<span class="brand-icon">
								<Infinity size={20} />
							</span>
							OUTERFIELDS
						</th>
						<th class="brand-header competitor">Uscreen</th>
					</tr>
				</thead>
				<tbody>
					{#each features as feature}
						<tr>
							<td class="feature-cell">
								<span class="feature-name">{feature.name}</span>
								<span class="feature-desc">{feature.description}</span>
							</td>
							<td class="value-cell">
								{#if feature.outerfields === true}
									<span class="check-icon success">
										<CheckCircle size={24} />
									</span>
								{:else if typeof feature.outerfields === 'string'}
									<span class="value-text coming">{feature.outerfields}</span>
								{:else}
									<span class="check-icon fail">
										<XCircle size={24} />
									</span>
								{/if}
							</td>
							<td class="value-cell">
								{#if feature.uscreen === true}
									<span class="check-icon neutral">
										<CheckCircle size={24} />
									</span>
								{:else if typeof feature.uscreen === 'string'}
									<span class="value-text limited">{feature.uscreen}</span>
								{:else}
									<span class="check-icon fail">
										<XCircle size={24} />
									</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="comparison-cta">
			<p class="cta-text">Ready to build a better content network?</p>
			<a href="/signup" class="btn-primary">
				<Rocket size={20} />
				Get Started Free
			</a>
		</div>
	</div>
</section>

<style>
	.comparison-section {
		padding: 6rem 1.5rem;
		background: var(--color-bg-pure);
	}

	.comparison-container {
		max-width: 56rem;
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.section-badge {
		display: inline-block;
		padding: 0.375rem 0.75rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1rem;
	}

	.section-title {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
	}

	.section-description {
		font-size: 1.125rem;
		color: var(--color-fg-muted);
		max-width: 32rem;
		margin: 0 auto;
	}

	.comparison-table-wrapper {
		overflow-x: auto;
		border-radius: 1rem;
		border: 1px solid var(--color-border-default);
		background: var(--glass-bg);
	}

	.comparison-table {
		width: 100%;
		border-collapse: collapse;
	}

	.comparison-table th,
	.comparison-table td {
		padding: 1rem 1.5rem;
		text-align: left;
	}

	.comparison-table thead tr {
		border-bottom: 1px solid var(--color-border-default);
	}

	.comparison-table tbody tr {
		border-bottom: 1px solid var(--color-border-default);
	}

	.comparison-table tbody tr:last-child {
		border-bottom: none;
	}

	.feature-header {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-fg-muted);
	}

	.brand-header {
		font-size: 0.875rem;
		font-weight: 600;
		text-align: center;
		white-space: nowrap;
	}

	.brand-header.outerfields {
		color: var(--color-fg-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.brand-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.brand-header.competitor {
		color: var(--color-fg-muted);
	}

	.feature-cell {
		min-width: 14rem;
	}

	.feature-name {
		display: block;
		font-weight: 500;
		color: var(--color-fg-primary);
		margin-bottom: 0.25rem;
	}

	.feature-desc {
		display: block;
		font-size: 0.75rem;
		color: var(--color-fg-subtle);
	}

	.value-cell {
		text-align: center;
		vertical-align: middle;
	}

	.check-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.check-icon.success {
		color: var(--color-success);
	}

	.check-icon.neutral {
		color: var(--color-fg-subtle);
	}

	.check-icon.fail {
		color: var(--color-fg-subtle);
		opacity: 0.5;
	}

	.value-text {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: 0.25rem;
	}

	.value-text.coming {
		color: var(--color-fg-secondary);
		background: var(--color-bg-surface);
	}

	.value-text.limited {
		color: var(--color-warning);
		background: var(--color-warning-muted);
	}

	.comparison-cta {
		text-align: center;
		margin-top: 3rem;
	}

	.cta-text {
		font-size: 1.125rem;
		color: var(--color-fg-muted);
		margin: 0 0 1.5rem;
	}

	@media (max-width: 640px) {
		.comparison-table th,
		.comparison-table td {
			padding: 0.75rem 1rem;
		}

		.feature-desc {
			display: none;
		}
	}
</style>
