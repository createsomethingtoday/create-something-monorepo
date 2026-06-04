<script lang="ts">
	import type { Asset } from '$lib/server/airtable';
	import {
		computeTemplateHealth,
		type TemplateHealthTone
	} from '$lib/utils/template-health';
	import { Card, CardContent, CardHeader, CardTitle, Badge } from './ui';
	import { formatCompactCurrency, formatLongDate, formatWholeNumber } from '$lib/utils/format';
	import {
		Activity,
		AlertTriangle,
		CalendarClock,
		CheckCircle2,
		Clock3,
		ExternalLink,
		Tag,
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

	function formatOfferPrice(price: number | null): string {
		if (price === null) return 'Not set';
		return formatCompactCurrency(price);
	}

	function formatDate(value: Date | null): string {
		return value ? formatLongDate(value) : 'Not set';
	}

	function formatRelativeDays(days: number | null): string {
		if (days === null) return '';
		if (days < 0) return `${Math.abs(days)}d overdue`;
		if (days === 0) return 'today';
		if (days === 1) return '1 day';
		return `${days} days`;
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
				<div class="metric">
					<span class="metric-label">Viewers</span>
					<span class="metric-value">{formatWholeNumber(asset.uniqueViewers, '0')}</span>
				</div>
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
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<div class="offer-header">
				<div class="actions-header">
					<Tag size={16} />
					<CardTitle>Offer Lifecycle</CardTitle>
				</div>
				<Badge variant={badgeVariant(health.offer.tone)}>{health.offer.label}</Badge>
			</div>
		</CardHeader>
		<CardContent>
			<p class="health-summary">{health.offer.summary}</p>

			{#if health.offer.hasOffer}
				<div class="offer-grid" aria-label="Active offer details">
					<div class="offer-item">
						<span class="metric-label">Offer price</span>
						<span class="metric-value">{formatOfferPrice(health.offer.price)}</span>
					</div>
					<div class="offer-item">
						<span class="metric-label">Visibility</span>
						<span class="metric-value">{health.offer.visibility || 'Not set'}</span>
					</div>
					<div class="offer-item">
						<span class="metric-label">Ends</span>
						<span class="metric-value">{formatDate(health.offer.endsAt)}</span>
						{#if health.offer.daysUntilEnd !== null}
							<span class="offer-meta">{formatRelativeDays(health.offer.daysUntilEnd)}</span>
						{/if}
					</div>
					<div class="offer-item">
						<span class="metric-label">Marketplace review</span>
						<span class="metric-value">{formatDate(health.offer.pruneReviewAt)}</span>
						{#if health.offer.daysUntilReview !== null}
							<span class="offer-meta">{formatRelativeDays(health.offer.daysUntilReview)}</span>
						{/if}
					</div>
					<div class="offer-item">
						<span class="metric-label">Strategy</span>
						<span class="metric-value">{health.offer.strategy || 'Not set'}</span>
					</div>
					<div class="offer-item">
						<span class="metric-label">Post-offer action</span>
						<span class="metric-value">{health.offer.postOfferAction || 'Not set'}</span>
					</div>
				</div>

				{#if health.offer.ctaUrl}
					<a class="offer-link" href={health.offer.ctaUrl} target="_blank" rel="noreferrer">
						<ExternalLink size={14} />
						<span>Open offer CTA</span>
					</a>
				{/if}
			{:else if health.status === 'needs_attention'}
				<div class="offer-empty" data-tone="warning">
					<CalendarClock size={16} />
					<p>
						A time-boxed creator-managed offer can be used after listing fixes to test buyer response
						before any marketplace visibility review.
					</p>
				</div>
			{/if}
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
	.offer-header,
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

	.offer-header {
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
		grid-template-columns: repeat(4, minmax(0, 1fr));
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

	.offer-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-sm);
		margin-top: var(--space-md);
	}

	.offer-item,
	.offer-empty {
		border: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
		border-radius: var(--radius-sm);
		background: var(--color-bg-subtle);
	}

	.offer-item {
		display: grid;
		gap: 0.2rem;
		padding: 0.72rem;
		min-width: 0;
	}

	.offer-meta {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		font-variant-numeric: tabular-nums;
	}

	.offer-link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin-top: var(--space-sm);
		color: var(--color-info);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		text-decoration: none;
	}

	.offer-link:hover {
		text-decoration: underline;
	}

	.offer-empty {
		display: flex;
		gap: var(--space-sm);
		align-items: flex-start;
		margin-top: var(--space-md);
		padding: 0.72rem;
		color: var(--color-fg-secondary);
	}

	.offer-empty[data-tone='warning'] {
		border-color: color-mix(in srgb, var(--color-warning-border) 64%, var(--color-border-default));
		background: color-mix(in srgb, var(--color-warning-muted) 18%, var(--color-bg-subtle));
	}

	.offer-empty p {
		margin: 0;
		font-size: var(--text-body-sm);
		line-height: 1.5;
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
		.offer-grid,
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
