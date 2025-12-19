<script lang="ts">
	/**
	 * LiveDatabase - Real-time visualization of all entries
	 *
	 * Philosophy: Making the database visible demonstrates
	 * transparency—the opposite of dark patterns that hide data use.
	 *
	 * Public demo mode: Anyone can delete any entry.
	 */

	import { onMount, onDestroy } from 'svelte';
	import type { ServiceConfiguration } from './types';
	import { serviceConfig, pricingTiers, getFeatureLabelsByIds } from './config';

	interface Props {
		onDelete?: (id: string) => void;
	}

	let { onDelete }: Props = $props();

	let entries = $state<ServiceConfiguration[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let pollInterval: ReturnType<typeof setInterval>;

	async function fetchEntries() {
		try {
			const res = await fetch('/api/experiments/heideggerian-form');
			if (!res.ok) throw new Error('Failed to fetch');
			const data = await res.json();
			entries = data.entries || [];
			error = null;
		} catch (e) {
			error = 'Unable to load entries';
			console.error('Fetch error:', e);
		} finally {
			loading = false;
		}
	}

	async function handleDelete(id: string) {
		try {
			const res = await fetch('/api/experiments/heideggerian-form', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});

			if (res.ok) {
				entries = entries.filter((e) => e.id !== id);
				onDelete?.(id);
			}
		} catch (e) {
			console.error('Delete error:', e);
		}
	}

	function formatRelativeTime(dateStr: string): string {
		const date = new Date(dateStr + 'Z'); // Assume UTC
		const now = new Date();
		const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (seconds < 60) return 'just now';
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		return `${Math.floor(seconds / 86400)}d ago`;
	}

	function getServiceLabel(type: string): string {
		return serviceConfig[type]?.label || type;
	}

	function getScopeLabel(serviceType: string, scope: string): string {
		return serviceConfig[serviceType]?.scopes[scope]?.label || scope;
	}

	onMount(() => {
		fetchEntries();
		// Poll every 3 seconds for updates
		pollInterval = setInterval(fetchEntries, 3000);
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});
</script>

<div class="live-database">
	<div class="database-header">
		<h3 class="database-title">Live Database</h3>
		<span class="database-count">{entries.length} entries</span>
	</div>

	{#if loading}
		<div class="loading-state">
			<div class="loading-spinner"></div>
			<p>Loading entries...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<p>{error}</p>
			<button onclick={fetchEntries} class="retry-button">Retry</button>
		</div>
	{:else if entries.length === 0}
		<div class="empty-state">
			<p class="empty-title">No configurations yet</p>
			<p class="empty-description">Submit the form to see entries appear here in real-time.</p>
		</div>
	{:else}
		<div class="entries-list">
			{#each entries as entry (entry.id)}
				<article class="entry-card">
					<div class="entry-header">
						<span class="entry-type">{getServiceLabel(entry.service_type)}</span>
						<span class="entry-scope">{getScopeLabel(entry.service_type, entry.scope)}</span>
					</div>

					<div class="entry-details">
						<span class="entry-features">
							{entry.features.length} feature{entry.features.length !== 1 ? 's' : ''}
						</span>
						<span class="entry-tier">{pricingTiers[entry.pricing_tier]?.label || entry.pricing_tier}</span>
					</div>

					<div class="entry-footer">
						<span class="entry-time">{formatRelativeTime(entry.created_at)}</span>
						<button class="delete-button" onclick={() => handleDelete(entry.id)} aria-label="Delete entry">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
							</svg>
						</button>
					</div>
				</article>
			{/each}
		</div>
	{/if}

	<div class="database-footer">
		<p class="demo-notice">Public demo: All entries visible. Anyone can delete.</p>
	</div>
</div>

<style>
	.live-database {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.database-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-md);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.database-title {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.database-count {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.loading-state,
	.error-state,
	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		color: var(--color-fg-muted);
		padding: var(--space-lg);
	}

	.loading-spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--color-border-default);
		border-top-color: var(--color-fg-secondary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: var(--space-sm);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.retry-button {
		margin-top: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		cursor: pointer;
		font-size: var(--text-body-sm);
	}

	.empty-title {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.empty-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.entries-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.entry-card {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.entry-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.entry-header {
		display: flex;
		gap: var(--space-xs);
		margin-bottom: var(--space-xs);
	}

	.entry-type {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
	}

	.entry-scope {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.entry-scope::before {
		content: '/';
		margin-right: var(--space-xs);
		color: var(--color-fg-subtle);
	}

	.entry-details {
		display: flex;
		gap: var(--space-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.entry-tier {
		text-transform: capitalize;
	}

	.entry-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.entry-time {
		font-size: var(--text-caption);
		color: var(--color-fg-subtle);
	}

	.delete-button {
		background: none;
		border: none;
		color: var(--color-fg-subtle);
		cursor: pointer;
		padding: 4px;
		border-radius: var(--radius-sm);
		transition: color var(--duration-micro) var(--ease-standard);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.delete-button:hover {
		color: var(--color-error);
	}

	.database-footer {
		margin-top: var(--space-md);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.demo-notice {
		font-size: var(--text-caption);
		color: var(--color-fg-subtle);
		text-align: center;
		margin: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.loading-spinner {
			animation: none;
		}
	}
</style>
