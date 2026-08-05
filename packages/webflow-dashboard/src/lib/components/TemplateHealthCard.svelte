<script lang="ts">
	import type { Asset } from '$lib/server/airtable';
	import { VIEWER_DATA_AVAILABLE } from '$lib/config/viewer-data';
	import {
		computeTemplateHealth,
		type TemplateHealthTone
	} from '$lib/utils/template-health';
	import { Card, CardContent, CardHeader, CardTitle, Badge } from './ui';
	import { formatWholeNumber } from '$lib/utils/format';
	import {
		Activity,
		AlertTriangle,
		CheckCircle2,
		Clock3,
		Target,
		TrendingUp
	} from 'lucide-svelte';

	interface Props {
		asset: Asset;
	}

	let { asset }: Props = $props();

	const health = $derived(computeTemplateHealth(asset));

	function badgeVariant(tone: TemplateHealthTone): 'success' | 'secondary' | 'warning' | 'error' {
		if (tone === 'positive') return 'success';
		if (tone === 'warning') return 'warning';
		if (tone === 'critical') return 'error';
		return 'secondary';
	}

	function statusIcon(tone: TemplateHealthTone) {
		if (tone === 'positive') return CheckCircle2;
		if (tone === 'critical') return AlertTriangle;
		if (tone === 'warning') return TrendingUp;
		return Activity;
	}

	function priorityLabel(priority: 'high' | 'medium' | 'low'): string {
		if (priority === 'high') return 'High priority';
		if (priority === 'medium') return 'Medium priority';
		return 'Maintenance';
	}

	const StatusIcon = $derived(statusIcon(health.tone));
</script>

<div class="health-stack">
	<Card>
		<CardHeader>
			<div class="health-header">
				<div class="health-title-group">
					<div class="health-icon" data-tone={health.tone}>
						<StatusIcon size={18} />
					</div>
					<div>
						<CardTitle>Template Health</CardTitle>
						<p class="health-subtitle">Quality and buyer-performance guidance for this template.</p>
					</div>
				</div>
				<Badge variant={badgeVariant(health.tone)}>{health.label}</Badge>
			</div>
		</CardHeader>
		<CardContent>
			<p class="health-summary">{health.summary}</p>

			<div class="health-metrics" aria-label="Template health summary">
				{#if VIEWER_DATA_AVAILABLE}
					<div class="metric">
						<span class="metric-label">Viewers</span>
						<span class="metric-value">{formatWholeNumber(asset.uniqueViewers, '0')}</span>
					</div>
				{/if}
				<div class="metric">
					<span class="metric-label">Purchases</span>
					<span class="metric-value">{formatWholeNumber(asset.cumulativePurchases, '0')}</span>
				</div>
				<div class="metric">
					<span class="metric-label">Conversion</span>
					<span class="metric-value">
						{health.conversionRate === null ? 'N/A' : `${health.conversionRate.toFixed(1)}%`}
					</span>
				</div>
				<div class="metric">
					<span class="metric-label">Days live</span>
					<span class="metric-value">{health.daysLive === null ? 'N/A' : health.daysLive}</span>
				</div>
				<div class="metric">
					<span class="metric-label">Discovery</span>
					<span class="metric-value">{health.searchVisibilitySuppressed ? 'Detail only' : 'Searchable'}</span>
				</div>
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Signals</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="signals-grid">
				{#each health.signals as signal}
					<div class="signal" data-tone={signal.tone}>
						<div class="signal-topline">
							<span class="signal-label">{signal.label}</span>
							<Badge variant={badgeVariant(signal.tone)}>{signal.value}</Badge>
						</div>
						<p class="signal-description">{signal.description}</p>
					</div>
				{/each}
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<div class="actions-header">
				<Target size={16} />
				<CardTitle>Recommended Next Steps</CardTitle>
			</div>
		</CardHeader>
		<CardContent>
			<div class="actions-list">
				{#each health.actions as action}
					<div class="action-row" data-priority={action.priority}>
						<div class="action-priority">
							<Clock3 size={14} />
							<span>{priorityLabel(action.priority)}</span>
						</div>
						<div class="action-copy">
							<h3>{action.title}</h3>
							<p>{action.description}</p>
						</div>
					</div>
				{/each}
			</div>
		</CardContent>
	</Card>
</div>

<style>
	.health-stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	:global(.health-stack .card) {
		border-radius: var(--radius-sm);
		border-color: color-mix(in srgb, var(--color-shell-border-default) 74%, transparent);
	}

	:global(.health-stack .card-header) {
		padding: 0.82rem 0.95rem 0.62rem;
	}

	:global(.health-stack .card-content) {
		padding: 0 0.95rem 0.95rem;
	}

	.health-header,
	.health-title-group,
	.actions-header,
	.signal-topline,
	.action-priority {
		display: flex;
		align-items: center;
	}

	.health-header {
		justify-content: space-between;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.health-title-group {
		gap: var(--space-sm);
		min-width: 0;
	}

	.health-icon {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		flex: 0 0 auto;
	}

	.health-icon[data-tone='positive'] {
		color: var(--color-success-ink);
		background: color-mix(in srgb, var(--color-success-muted) 35%, transparent);
		border-color: var(--color-success-border);
	}

	.health-icon[data-tone='warning'] {
		color: var(--color-warning-ink);
		background: color-mix(in srgb, var(--color-warning-muted) 35%, transparent);
		border-color: var(--color-warning-border);
	}

	.health-icon[data-tone='critical'] {
		color: var(--color-error-ink);
		background: color-mix(in srgb, var(--color-error-muted) 35%, transparent);
		border-color: var(--color-error-border);
	}

	.health-subtitle,
	.health-summary,
	.signal-description,
	.action-copy p {
		margin: 0;
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		line-height: 1.5;
	}

	.health-summary {
		max-width: 68ch;
	}

	.health-metrics {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 0;
		margin-top: var(--space-md);
		border-top: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
		border-bottom: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
	}

	.metric {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.62rem 0.7rem;
		border-right: 1px solid color-mix(in srgb, var(--color-border-default) 68%, transparent);
		min-width: 0;
	}

	.metric:last-child {
		border-right: none;
	}

	.metric-label,
	.signal-label {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0;
	}

	.metric-value {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.signals-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-sm);
	}

	.signal {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		padding: 0.72rem;
		border: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
		border-radius: var(--radius-sm);
		background: var(--color-bg-subtle);
		min-width: 0;
	}

	.signal-topline {
		justify-content: space-between;
		gap: var(--space-sm);
	}

	.actions-header {
		gap: var(--space-xs);
	}

	.actions-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.action-row {
		display: grid;
		grid-template-columns: minmax(8rem, 0.32fr) minmax(0, 1fr);
		gap: var(--space-md);
		padding: 0.72rem;
		border: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
		border-radius: var(--radius-sm);
		background: var(--color-bg-subtle);
	}

	.action-priority {
		align-self: start;
		gap: 0.35rem;
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0;
	}

	.action-copy {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.action-copy h3 {
		margin: 0;
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.action-row[data-priority='high'] {
		border-color: color-mix(in srgb, var(--color-warning-border) 64%, var(--color-border-default));
	}

	@media (max-width: 780px) {
		.health-metrics,
		.signals-grid,
		.action-row {
			grid-template-columns: 1fr;
		}

		.metric {
			border-right: none;
			border-bottom: 1px solid color-mix(in srgb, var(--color-border-default) 68%, transparent);
		}

		.metric:last-child {
			border-bottom: none;
		}
	}
</style>
