<script lang="ts">
	// Pricing Section - "Pay When Courts Fill"
	// Outcome-aligned pricing model
</script>

<section class="pricing">
	<div class="container">
		<h2 class="section-title">Pay When Courts Fill</h2>
		<p class="section-subtitle">
			We don't charge for features. We charge for filled courts.
		</p>
		<p class="section-philosophy">
			5% of bookings. No monthly fees. Our success is your success.
		</p>

		<div class="pricing-example">
			<div class="example-card">
				<h3>Example</h3>
				<div class="example-row">
					<span class="example-label">Court booking</span>
					<span class="example-value">$40.00</span>
				</div>
				<div class="example-row highlight">
					<span class="example-label">CLEARWAY fee (5%)</span>
					<span class="example-value">-$2.00</span>
				</div>
				<div class="example-row total">
					<span class="example-label">You receive</span>
					<span class="example-value">$38.00</span>
				</div>
			</div>
		</div>

		<div class="pricing-notes">
			<div class="note">
				<strong>No upfront costs</strong>
				<span>Start accepting bookings immediately</span>
			</div>
			<div class="note">
				<strong>Stripe Connect</strong>
				<span>Funds go directly to your account</span>
			</div>
			<div class="note">
				<strong>Scale with you</strong>
				<span>Volume discounts available</span>
			</div>
		</div>

		<p class="pricing-cta">
			<a href="/onboard">Get started free</a> &mdash; only pay when you earn
		</p>
	</div>
</section>

<style>
	.pricing {
		padding: var(--space-2xl) var(--space-md);
		background: var(--color-bg-elevated);
	}

	.container {
		max-width: 40rem;
		margin: 0 auto;
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 600;
		text-align: center;
		margin: 0 0 var(--space-xs);
		color: var(--color-fg-primary);
	}

	.section-subtitle {
		font-size: var(--text-body-lg);
		text-align: center;
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-sm);
	}

	.section-philosophy {
		font-size: var(--text-body);
		text-align: center;
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-xl);
	}

	.pricing-example {
		margin-bottom: var(--space-xl);
	}

	.example-card {
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
	}

	.example-card h3 {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 var(--space-md);
	}

	.example-row {
		display: flex;
		justify-content: space-between;
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.example-row:last-child {
		border-bottom: none;
	}

	.example-label {
		color: var(--color-fg-secondary);
	}

	.example-value {
		font-weight: 500;
		color: var(--color-fg-primary);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	.example-row.highlight {
		color: var(--color-fg-tertiary);
	}

	.example-row.highlight .example-value {
		color: var(--color-fg-tertiary);
	}

	.example-row.total {
		padding-top: var(--space-sm);
		margin-top: var(--space-xs);
		border-top: 2px solid var(--color-border-emphasis);
	}

	.example-row.total .example-label,
	.example-row.total .example-value {
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.pricing-notes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-xl);
	}

	.note {
		text-align: center;
	}

	.note strong {
		display: block;
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		margin-bottom: 0.25rem;
	}

	.note span {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.pricing-cta {
		text-align: center;
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.pricing-cta a {
		color: var(--color-fg-primary);
		text-decoration: none;
		font-weight: 500;
		border-bottom: 1px solid var(--color-border-emphasis);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.pricing-cta a:hover {
		border-color: var(--color-fg-primary);
	}
</style>
