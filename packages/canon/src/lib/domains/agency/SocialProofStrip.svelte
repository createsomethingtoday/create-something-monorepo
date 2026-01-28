<script lang="ts">
	interface Metric {
		value: string;
		label: string;
		context: string;
		href: string;
	}

	const metrics: Metric[] = [
		{
			value: '92%',
			label: 'reduction',
			context: 'Scripts: 155 → 13',
			href: '/work/kickstand'
		},
		{
			value: '99.8%',
			label: 'cost savings',
			context: '$6.30 vs $3,750',
			href: '/work/arc-for-gmail'
		},
		{
			value: '100%',
			label: 'automated',
			context: 'Daily A&R discovery',
			href: '/work/viralytics'
		}
	];
</script>

<section class="social-proof-strip" aria-label="Client results">
	<div class="metrics-grid">
		{#each metrics as metric}
			<a href={metric.href} class="metric-card">
				<span class="metric-value">{metric.value}</span>
				<span class="metric-label">{metric.label}</span>
				<span class="metric-context">{metric.context}</span>
			</a>
		{/each}
	</div>
</section>

<style>
	.social-proof-strip {
		padding: var(--space-lg) var(--space-md);
		border-top: 1px solid var(--color-border-default);
		border-bottom: 1px solid var(--color-border-default);
		background: var(--color-bg-elevated);
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-md);
		max-width: 64rem;
		margin: 0 auto;
	}

	.metric-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.metric-card:hover {
		background: var(--color-hover);
	}

	.metric-card:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.metric-value {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		line-height: 1;
	}

	.metric-label {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-top: 0.25rem;
	}

	.metric-context {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: 0.5rem;
	}

	@media (max-width: 640px) {
		.metrics-grid {
			grid-template-columns: 1fr;
			gap: var(--space-sm);
		}

		.metric-card {
			flex-direction: row;
			justify-content: space-between;
			text-align: left;
			padding: var(--space-sm) var(--space-md);
			border: 1px solid var(--color-border-default);
		}

		.metric-value {
			font-size: 1.5rem;
			order: 1;
		}

		.metric-label {
			margin-top: 0;
			order: 2;
		}

		.metric-context {
			display: none;
		}
	}
</style>
