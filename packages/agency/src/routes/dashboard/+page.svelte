<script lang="ts">
	import { SEO } from '@create-something/canon';

	let { data } = $props();

	function formatDate(value: string | null | undefined): string {
		if (!value) return 'Not set';
		return new Date(value).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return 'Not set';
		return new Date(value).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		});
	}

	function statusLabel(value: boolean): string {
		return value ? 'Active' : 'Needs review';
	}

	function humanizeReason(reason: string): string {
		return reason
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (char) => char.toUpperCase());
	}

	function humanizeAction(category: string, action: string): string {
		return `${category}: ${action}`.replace(/_/g, ' ');
	}

	function pathFromUrl(input: string): string {
		try {
			const url = new URL(input);
			return url.pathname;
		} catch {
			return input;
		}
	}

	function barHeight(count: number, max: number): number {
		if (max <= 0) return 8;
		return Math.max(8, Math.round((count / max) * 100));
	}

	const maxDailyEvents = $derived.by(() =>
		Math.max(...(data.activity.daily.map((item: { events: number }) => item.events) || [0]))
	);
</script>

<SEO
	title="Dashboard | CREATE SOMETHING AGENCY"
	description="Live access, contract, connection, and usage state for your CREATE SOMETHING AGENCY account."
	propertyName="agency"
/>

<div class="dashboard">
	<header class="dashboard-header">
		<div>
			<p class="eyebrow">Live Account State</p>
			<h1 class="dashboard-title">Dashboard</h1>
			<p class="dashboard-subtitle">
				This view is now tied to your real `.agency` session, entitlement state, connected partner accounts,
				and property activity. Workflow execution telemetry is shown only when an integrated system actually
				emits it.
			</p>
		</div>
		<div class="identity-chip">
			<span class="identity-label">Signed in as</span>
			<strong>{data.user.email}</strong>
		</div>
	</header>

	<section class="summary-grid">
		<div class="summary-card summary-card-primary">
			<span class="summary-label">Access Status</span>
			<span class="summary-value">{statusLabel(data.overview.accessAllowed)}</span>
			<span class="summary-note">{humanizeReason(data.overview.accessReason)}</span>
		</div>

		<div class="summary-card">
			<span class="summary-label">Service Tier</span>
			<span class="summary-value">{data.overview.serviceTier}</span>
			<span class="summary-note">From entitlement + commercial state</span>
		</div>

		<div class="summary-card">
			<span class="summary-label">Connected Accounts</span>
			<span class="summary-value">{data.overview.connectedAccounts}</span>
			<span class="summary-note">Toolkit + Notion bindings</span>
		</div>

		<div class="summary-card">
			<span class="summary-label">Sessions · 30d</span>
			<span class="summary-value">{data.overview.totalSessions}</span>
			<span class="summary-note">{data.overview.totalPageViews} page views in `.agency`</span>
		</div>
	</section>

	<div class="content-grid">
		<section class="panel">
			<div class="panel-header">
				<h2>Entitlement Checks</h2>
				<span class="timestamp">Updated {formatDateTime(data.entitlement.updatedAt)}</span>
			</div>

			<div class="check-grid">
				{#each Object.entries(data.entitlement.decision.checks) as [key, value]}
					<div class="check-row">
						<span>{humanizeReason(key)}</span>
						<strong class:ok={value} class:bad={!value}>{value ? 'Pass' : 'Fail'}</strong>
					</div>
				{/each}
			</div>

			<div class="detail-grid">
				<div>
					<span class="detail-label">Account ID</span>
					<strong>{data.entitlement.accountId ?? 'Not linked'}</strong>
				</div>
				<div>
					<span class="detail-label">Tenant ID</span>
					<strong>{data.entitlement.tenantId ?? 'Not linked'}</strong>
				</div>
			</div>
		</section>

		<section class="panel">
			<div class="panel-header">
				<h2>Commercial State</h2>
			</div>

			{#if data.commercial || data.contract}
				<div class="detail-grid">
					<div>
						<span class="detail-label">Subscription</span>
						<strong>{data.commercial?.subscription_status ?? 'Not set'}</strong>
					</div>
					<div>
						<span class="detail-label">Billing</span>
						<strong>{data.commercial?.billing_active ? 'Active' : 'Inactive'}</strong>
					</div>
					<div>
						<span class="detail-label">Contract</span>
						<strong>{data.contract?.contract_status ?? 'Not set'}</strong>
					</div>
					<div>
						<span class="detail-label">Period End</span>
						<strong>{formatDate(data.commercial?.current_period_end)}</strong>
					</div>
					<div>
						<span class="detail-label">Policy Accepted</span>
						<strong>{data.entitlement.decision.checks.policy_accepted ? 'Yes' : 'No'}</strong>
					</div>
					<div>
						<span class="detail-label">Contract Ref</span>
						<strong>{data.contract?.contract_reference ?? 'Not set'}</strong>
					</div>
				</div>
			{:else}
				<p class="empty-state">
					No contract or billing record is linked to this identity yet. Access can still exist through the
					agency entitlement registry.
				</p>
			{/if}
		</section>

		<section class="panel">
			<div class="panel-header">
				<h2>Partner Connection</h2>
			</div>

			{#if data.partner}
				<div class="detail-grid">
					<div>
						<span class="detail-label">Client</span>
						<strong>{data.partner.slug}</strong>
					</div>
					<div>
						<span class="detail-label">Partner</span>
						<strong>{data.partner.partner_key}</strong>
					</div>
					<div>
						<span class="detail-label">Status</span>
						<strong>{data.partner.status}</strong>
					</div>
					<div>
						<span class="detail-label">Consent</span>
						<strong>{data.partner.consent_active ? 'Active' : 'Missing'}</strong>
					</div>
					<div>
						<span class="detail-label">Toolkit Accounts</span>
						<strong>{data.partner.toolkit_accounts}</strong>
					</div>
					<div>
						<span class="detail-label">Notion Accounts</span>
						<strong>{data.partner.notion_accounts}</strong>
					</div>
				</div>
			{:else}
				<p class="empty-state">
					No partner-managed client workspace is linked to this Auth0 identity yet.
				</p>
			{/if}
		</section>

		<section class="panel">
			<div class="panel-header">
				<h2>Recent Activity</h2>
				<span class="timestamp">Last 30 days</span>
			</div>

			{#if data.activity.recentEvents.length > 0}
				<div class="activity-list">
					{#each data.activity.recentEvents as event}
						<div class="activity-row">
							<div>
								<p class="activity-title">{humanizeAction(event.category, event.action)}</p>
								<p class="activity-meta">{pathFromUrl(event.url)}{event.target ? ` · ${event.target}` : ''}</p>
							</div>
							<span class="activity-time">{formatDateTime(event.created_at)}</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty-state">
					No `.agency` activity has been written for this account yet.
				</p>
			{/if}
		</section>
	</div>

	<div class="content-grid">
		<section class="panel">
			<div class="panel-header">
				<h2>Top Pages</h2>
			</div>

			{#if data.activity.topPages.length > 0}
				<div class="list-rows">
					{#each data.activity.topPages as page}
						<div class="list-row">
							<span>{pathFromUrl(page.url)}</span>
							<strong>{page.views} views</strong>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty-state">
					No page-view analytics are associated with this user yet.
				</p>
			{/if}
		</section>

		<section class="panel">
			<div class="panel-header">
				<h2>Usage Trend</h2>
				<span class="timestamp">{data.overview.totalInteractions} interactions · 30d</span>
			</div>

			{#if data.activity.daily.length > 0}
				<div class="trend-chart">
					{#each data.activity.daily as day}
						<div class="trend-column">
							<div
								class="trend-bar"
								style={`height:${barHeight(day.events, maxDailyEvents)}%`}
								title={`${day.date}: ${day.events} events`}
							></div>
							<span class="trend-label">{day.date.slice(5)}</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty-state">
					No daily activity has been recorded yet.
				</p>
			{/if}
		</section>
	</div>
</div>

<style>
	.dashboard {
		max-width: var(--content-width-xl);
		margin: 0 auto;
		padding: var(--space-xl);
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.eyebrow {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.dashboard-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs) 0;
	}

	.dashboard-subtitle {
		max-width: 48rem;
		color: var(--color-fg-muted);
		line-height: 1.7;
	}

	.identity-chip {
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		padding: var(--space-md) var(--space-lg);
		min-width: 14rem;
	}

	.identity-label,
	.detail-label,
	.summary-label,
	.timestamp {
		display: block;
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-fg-muted);
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-xl);
	}

	.summary-card {
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.summary-card-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-primary);
	}

	.summary-card-primary .summary-label,
	.summary-card-primary .summary-note {
		color: rgba(255, 255, 255, 0.72);
	}

	.summary-value {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
	}

	.summary-note {
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.content-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-lg);
		margin-bottom: var(--space-lg);
	}

	.panel {
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.panel-header h2 {
		margin: 0;
		font-size: var(--text-body-lg);
		color: var(--color-fg-primary);
	}

	.check-grid,
	.list-rows,
	.activity-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.check-row,
	.list-row,
	.activity-row {
		display: flex;
		justify-content: space-between;
		gap: var(--space-md);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.check-row:last-child,
	.list-row:last-child,
	.activity-row:last-child {
		border-bottom: none;
	}

	.ok {
		color: var(--color-success);
	}

	.bad {
		color: var(--color-error);
	}

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-md);
		margin-top: var(--space-md);
	}

	.detail-grid strong,
	.check-row strong,
	.list-row strong,
	.identity-chip strong {
		color: var(--color-fg-primary);
	}

	.empty-state {
		color: var(--color-fg-muted);
		line-height: 1.7;
	}

	.activity-title,
	.activity-meta {
		margin: 0;
	}

	.activity-title {
		color: var(--color-fg-primary);
		text-transform: capitalize;
	}

	.activity-meta,
	.activity-time {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.trend-chart {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(2.25rem, 1fr));
		gap: var(--space-sm);
		align-items: end;
		min-height: 15rem;
		padding-top: var(--space-md);
	}

	.trend-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		height: 100%;
		justify-content: end;
	}

	.trend-bar {
		width: 100%;
		background: var(--color-fg-primary);
		border-radius: var(--radius-sm);
		opacity: 0.92;
	}

	.trend-label {
		font-size: 0.7rem;
		color: var(--color-fg-muted);
	}

	@media (max-width: 960px) {
		.dashboard-header,
		.content-grid,
		.summary-grid,
		.detail-grid {
			grid-template-columns: 1fr;
			display: grid;
		}

		.dashboard-header {
			display: flex;
			flex-direction: column;
		}
	}
</style>
