<script lang="ts">
	// Admin Insights Preview
	// Demonstrates AI-powered admin heuristics
	// Mock data shows the "invisible" work happening behind the scenes

	interface Insight {
		type: 'gap' | 'churn' | 'forecast';
		icon: string;
		title: string;
		detail: string;
		action?: string;
	}

	const insights: Insight[] = [
		{
			type: 'gap',
			icon: '◯',
			title: 'Tuesday 2–4pm: 3 empty courts',
			detail: '12 members typically book afternoons',
			action: 'Send reminder'
		},
		{
			type: 'churn',
			icon: '↓',
			title: 'Sarah hasn\'t booked in 14 days',
			detail: 'Usually plays Thu 6pm • 8 bookings total',
			action: 'Reach out'
		},
		{
			type: 'forecast',
			icon: '↗',
			title: 'Saturday: 94% capacity expected',
			detail: 'Based on 6-week pattern',
		}
	];
</script>

<div class="insights-preview">
	<div class="insights-header">
		<span class="label">Admin View</span>
		<h3 class="title">What CLEARWAY sees</h3>
	</div>

	<div class="insights-list">
		{#each insights as insight}
			<div class="insight-card" data-type={insight.type}>
				<span class="insight-icon">{insight.icon}</span>
				<div class="insight-content">
					<p class="insight-title">{insight.title}</p>
					<p class="insight-detail">{insight.detail}</p>
				</div>
				{#if insight.action}
					<button class="insight-action">{insight.action}</button>
				{/if}
			</div>
		{/each}
	</div>

	<p class="insights-note">
		No dashboards to check. Insights surface when they matter.
	</p>
</div>

<style>
	.insights-preview {
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
	}

	.insights-header {
		margin-bottom: var(--space-md);
	}

	.label {
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.title {
		font-size: var(--text-h3);
		font-weight: 500;
		color: var(--color-fg-primary);
		margin: var(--space-xs) 0 0;
	}

	.insights-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.insight-card {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
	}

	.insight-icon {
		font-size: var(--text-body-lg);
		line-height: 1;
		padding: var(--space-xs);
	}

	.insight-card[data-type='gap'] .insight-icon {
		color: var(--color-warning);
	}

	.insight-card[data-type='churn'] .insight-icon {
		color: var(--color-error);
	}

	.insight-card[data-type='forecast'] .insight-icon {
		color: var(--color-success);
	}

	.insight-content {
		flex: 1;
		min-width: 0;
	}

	.insight-title {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.insight-detail {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		margin: 2px 0 0;
	}

	.insight-action {
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-secondary);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		padding: 4px 8px;
		cursor: pointer;
		white-space: nowrap;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.insight-action:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.insights-note {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-align: center;
		margin: var(--space-md) 0 0;
		font-style: italic;
	}
</style>
