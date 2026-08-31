<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { onMount } from 'svelte';

	let subscribers: any[] = [];
	let loading = true;
	let searchQuery = '';
	let filterStatus = 'all';
	let filterSource = 'all';
	let sortBy = 'newest';
	let requestingConfirmationId: number | null = null;
	let confirmationNotice = '';

	onMount(async () => {
		await loadSubscribers();
	});

	async function loadSubscribers() {
		loading = true;
		try {
			const response = await fetch('/api/admin/subscribers');
			if (response.ok) {
				subscribers = await response.json();
			}
		} catch (error) {
			console.error('Failed to load subscribers:', error);
		} finally {
			loading = false;
		}
	}

	async function updateSubscriberStatus(subscriberId: string, newStatus: string) {
		try {
			const response = await fetch('/api/admin/subscribers', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: subscriberId,
					status: newStatus
				})
			});

			if (response.ok) {
				await loadSubscribers();
			}
		} catch (error) {
			console.error('Failed to update subscriber:', error);
		}
	}

	async function deleteSubscriber(subscriberId: string) {
		if (!confirm('Are you sure you want to delete this subscriber?')) return;

		try {
			const response = await fetch('/api/admin/subscribers', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: subscriberId })
			});

			if (response.ok) {
				await loadSubscribers();
			}
		} catch (error) {
			console.error('Failed to delete subscriber:', error);
		}
	}

	async function requestDoubleOptIn(subscriberId: number) {
		if (!confirm('Send this subscriber a fresh double-opt-in confirmation request?')) return;

		requestingConfirmationId = subscriberId;
		confirmationNotice = '';
		try {
			const response = await fetch('/api/admin/subscribers', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: subscriberId, action: 'request_confirmation' })
			});
			const result = (await response.json()) as { error?: string };
			if (!response.ok) throw new Error(result.error || 'Confirmation request failed');
			confirmationNotice =
				'Confirmation request sent. The subscriber remains pending until they click the link.';
			await loadSubscribers();
		} catch (error) {
			confirmationNotice = error instanceof Error ? error.message : 'Confirmation request failed';
		} finally {
			requestingConfirmationId = null;
		}
	}

	async function exportSubscribers() {
		const csv = [
			['Email', 'Status', 'Source', 'Subscribed At'].join(','),
			...filteredSubscribers.map((sub) =>
				[
					sub.email,
					sub.status || 'active',
					sub.source || 'unknown',
					new Date(sub.created_at).toISOString()
				].join(',')
			)
		].join('\n');

		const blob = new Blob([csv], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
	}

	$: filteredSubscribers = subscribers
		.filter((sub) => {
			const matchesSearch =
				searchQuery === '' || sub.email?.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
			const matchesSource = filterSource === 'all' || sub.source === filterSource;
			return matchesSearch && matchesStatus && matchesSource;
		})
		.sort((a, b) => {
			if (sortBy === 'newest') {
				return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
			} else if (sortBy === 'oldest') {
				return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
			} else {
				return a.email.localeCompare(b.email);
			}
		});

	$: activeCount = subscribers.filter((s) => s.status === 'active' || !s.status).length;
</script>

<SEO
	title="Admin - Subscribers"
	description="Administrative dashboard"
	propertyName="io"
	noindex={true}
/>

<div class="space-y-6">
	<div class="page-header">
		<div>
			<h2 class="page-title mb-2">Newsletter Subscribers</h2>
			<p class="page-description">Manage your email list</p>
		</div>
		<button
			onclick={exportSubscribers}
			class="btn-secondary px-4 py-2"
		>
			Export CSV
		</button>
	</div>

	<!-- Filters & Search -->
	<div class="filters-container">
		<input
			type="email"
			bind:value={searchQuery}
			placeholder="Search by email..."
			class="input-field flex-1 px-4 py-2"
		/>

		<select
			bind:value={filterStatus}
			class="select-field px-4 py-2"
		>
			<option value="all">All Status</option>
			<option value="active">Active</option>
			<option value="unsubscribed">Unsubscribed</option>
		</select>

		<select
			bind:value={filterSource}
			class="select-field px-4 py-2"
		>
			<option value="all">All Sources</option>
			<option value="io">.io</option>
			<option value="space">.space</option>
			<option value="agency">.agency</option>
			<option value="ltd">.ltd</option>
		</select>

		<select
			bind:value={sortBy}
			class="select-field px-4 py-2"
		>
			<option value="newest">Newest First</option>
			<option value="oldest">Oldest First</option>
			<option value="alpha">Alphabetical</option>
		</select>
	</div>

	{#if confirmationNotice}
		<div class="confirmation-notice p-4" role="status">{confirmationNotice}</div>
	{/if}

	<!-- Subscribers Table -->
	{#if loading}
		<div class="space-y-3">
			{#each [1, 2, 3, 4, 5] as _}
				<div class="skeleton-card p-4">
					<div class="skeleton-line"></div>
				</div>
			{/each}
		</div>
	{:else if filteredSubscribers.length === 0}
		<div class="empty-state-container">
			{#if searchQuery || filterStatus !== 'all'}
				No subscribers match your filters.
			{:else}
				No subscribers yet.
			{/if}
		</div>
	{:else}
		<!-- Mobile: Card layout -->
		<div class="responsive-table-cards">
			{#each filteredSubscribers as subscriber}
				<div class="responsive-table-card">
					<div class="responsive-table-card-header">
						<div class="card-header-content">
							<span class="responsive-table-card-title">{subscriber.email}</span>
							<span
								class="status-badge {subscriber.status === 'unsubscribed'
									? 'status-unsubscribed'
									: 'status-active'}"
							>
								{subscriber.status || 'active'}
							</span>
						</div>
					</div>
					<div class="responsive-table-card-body">
						<div class="responsive-table-card-row">
							<span class="responsive-table-card-label">Source</span>
							<span class="responsive-table-card-value source-badge">.{subscriber.source || 'unknown'}</span>
						</div>
						<div class="responsive-table-card-row">
							<span class="responsive-table-card-label">Subscribed</span>
							<span class="responsive-table-card-value">{new Date(subscriber.created_at).toLocaleDateString()}</span>
						</div>
					</div>
					<div class="card-actions-mobile">
						{#if subscriber.status === 'active' && (subscriber.consent_method !== 'double_opt_in' || subscriber.consent_evidence !== 'confirmation_link')}
							<button
								onclick={() => requestDoubleOptIn(subscriber.id)}
								disabled={requestingConfirmationId === subscriber.id}
								class="btn-small-mobile"
							>
								{requestingConfirmationId === subscriber.id ? 'Sending…' : 'Request double opt-in'}
							</button>
						{/if}
						{#if subscriber.status === 'unsubscribed'}
							<button
								onclick={() => updateSubscriberStatus(subscriber.id, 'active')}
								class="btn-small-mobile"
							>
								Reactivate
							</button>
						{:else}
							<button
								onclick={() => updateSubscriberStatus(subscriber.id, 'unsubscribed')}
								class="btn-small-mobile"
							>
								Unsubscribe
							</button>
						{/if}
						<button
							onclick={() => deleteSubscriber(subscriber.id)}
							class="btn-danger-mobile"
						>
							Delete
						</button>
					</div>
				</div>
			{/each}
		</div>

		<!-- Desktop: Table layout -->
		<div class="responsive-table-wrapper">
			<div class="table-container">
				<table class="responsive-table">
					<thead class="table-header">
						<tr>
							<th class="table-header-cell px-6 py-3">
								Email
							</th>
							<th class="table-header-cell px-6 py-3">
								Status
							</th>
							<th class="table-header-cell px-6 py-3">
								Source
							</th>
							<th class="table-header-cell px-6 py-3">
								Subscribed
							</th>
							<th class="table-header-cell-right px-6 py-3">
								Actions
							</th>
						</tr>
					</thead>
					<tbody class="table-body">
						{#each filteredSubscribers as subscriber}
							<tr class="table-row">
								<td class="table-cell px-6 py-4">
									{subscriber.email}
								</td>
								<td class="px-6 py-4">
									<span
										class="status-badge {subscriber.status === 'unsubscribed'
											? 'status-unsubscribed'
											: 'status-active'}"
									>
										{subscriber.status || 'active'}
									</span>
								</td>
								<td class="table-cell-secondary px-6 py-4">
									<span class="source-badge">.{subscriber.source || 'unknown'}</span>
								</td>
								<td class="table-cell-secondary px-6 py-4">
									{new Date(subscriber.created_at).toLocaleDateString()}
								</td>
								<td class="px-6 py-4">
									<div class="flex justify-end gap-2">
										{#if subscriber.status === 'active' && (subscriber.consent_method !== 'double_opt_in' || subscriber.consent_evidence !== 'confirmation_link')}
											<button
												onclick={() => requestDoubleOptIn(subscriber.id)}
												disabled={requestingConfirmationId === subscriber.id}
												class="btn-small"
											>
												{requestingConfirmationId === subscriber.id
													? 'Sending…'
													: 'Request double opt-in'}
											</button>
										{/if}
										{#if subscriber.status === 'unsubscribed'}
											<button
												onclick={() => updateSubscriberStatus(subscriber.id, 'active')}
												class="btn-small"
											>
												Reactivate
											</button>
										{:else}
											<button
												onclick={() => updateSubscriberStatus(subscriber.id, 'unsubscribed')}
												class="btn-small"
											>
												Unsubscribe
											</button>
										{/if}
										<button
											onclick={() => deleteSubscriber(subscriber.id)}
											class="btn-danger"
										>
											Delete
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Pagination Info -->
		<div class="pagination-info">
			Showing {filteredSubscribers.length} of {subscribers.length} subscribers
		</div>
	{/if}

	<!-- Stats -->
	<div class="stats-section pt-6">
		<div class="stats-grid">
			<div class="stat-item">
				<div class="stat-value">{subscribers.length}</div>
				<div class="stat-label">Total Subscribers</div>
			</div>
			<div class="stat-item">
				<div class="stat-value">{activeCount}</div>
				<div class="stat-label">Active</div>
			</div>
			<div class="stat-item">
				<div class="stat-value">
					{subscribers.filter((s) => s.status === 'unsubscribed').length}
				</div>
				<div class="stat-label">Unsubscribed</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Page Header - Responsive */
	.page-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-md);
	}

	@media (min-width: 768px) {
		.page-header {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
	}

	.page-title {
		font-size: var(--text-performance-h1);
		font-weight: 700;
	}

	.page-description {
		color: var(--color-performance-fg-tertiary);
	}

	.btn-secondary {
		border-radius: var(--radius-performance-scale-lg);
		transition: background var(--duration-performance-micro) var(--ease-performance-standard);
		width: 100%;
	}

	@media (min-width: 768px) {
		.btn-secondary {
			width: auto;
		}
	}

	.btn-secondary:hover {
		background: var(--color-performance-hover);
	}

	/* Filters - Responsive */
	.filters-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-sm);
	}

	@media (min-width: 768px) {
		.filters-container {
			flex-direction: row;
			gap: var(--space-performance-md);
			align-items: center;
		}
	}

	.input-field {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		color: var(--color-performance-fg-primary);
		transition: border-color var(--duration-performance-micro) var(--ease-performance-standard);
		width: 100%;
	}

	.input-field::placeholder {
		color: var(--color-performance-fg-muted);
	}

	.input-field:focus {
		outline: none;
		border-color: var(--color-performance-border-emphasis);
	}

	.select-field {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		color: var(--color-performance-fg-primary);
		transition: border-color var(--duration-performance-micro) var(--ease-performance-standard);
		width: 100%;
	}

	@media (min-width: 768px) {
		.select-field {
			width: auto;
		}
	}

	.select-field:focus {
		outline: none;
		border-color: var(--color-performance-border-emphasis);
	}

	.skeleton-card {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	.skeleton-line {
		height: 1.25rem;
		border-radius: var(--radius-performance-scale-sm);
		width: 33%;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.empty-state-container {
		text-align: center;
		padding: 3rem 0;
		color: var(--color-performance-fg-tertiary);
	}

	.confirmation-notice {
		background: var(--color-performance-bg-surface);
		border: 1px solid var(--color-performance-border-emphasis);
		border-radius: var(--radius-performance-scale-lg);
		color: var(--color-performance-fg-primary);
		font-size: var(--text-performance-body-sm);
	}

	/* Mobile Card Layout Overrides */
	.card-header-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.card-actions-mobile {
		display: flex;
		gap: var(--space-performance-sm);
		margin-top: var(--space-performance-md);
		padding-top: var(--space-performance-sm);
	}

	.btn-small-mobile {
		flex: 1;
		padding: var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-md);
		font-size: var(--text-performance-body-sm);
		text-align: center;
		transition: background var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.btn-small-mobile:hover {
		background: var(--color-performance-hover);
	}

	.btn-danger-mobile {
		flex: 1;
		padding: var(--space-performance-sm);
		background: var(--color-performance-error-muted);
		color: var(--color-performance-error);
		border-radius: var(--radius-performance-scale-md);
		font-size: var(--text-performance-body-sm);
		text-align: center;
		transition: background var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.btn-danger-mobile:hover {
		background: var(--color-performance-error-border);
	}

	/* Desktop Table */
	.table-container {
		border-radius: var(--radius-performance-scale-lg);
		overflow: hidden;
	}

	.table-header {
		background: var(--color-performance-bg-surface);
	}

	.table-header-cell {
		text-align: left;
		font-size: var(--text-performance-caption);
		font-weight: 600;
		color: var(--color-performance-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.table-header-cell-right {
		text-align: right;
		font-size: var(--text-performance-caption);
		font-weight: 600;
		color: var(--color-performance-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}



	.table-row {
		transition: background var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.table-row:hover {
		background: var(--color-performance-hover);
	}

	.table-cell {
		color: var(--color-performance-fg-primary);
	}

	.table-cell-secondary {
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-body-sm);
	}

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-caption);
	}

	.status-unsubscribed {
		background: var(--color-performance-error-muted);
		color: var(--color-performance-error);
	}

	.status-active {
		background: var(--color-performance-success-muted);
		color: var(--color-performance-success);
	}

	.source-badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		background: var(--color-performance-info-muted);
		color: var(--color-performance-info);
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-caption);
		font-family: monospace;
	}

	.btn-small {
		padding: 0.25rem 0.75rem;
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-caption);
		transition: background var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.btn-small:hover {
		background: var(--color-performance-hover);
	}

	.btn-danger {
		padding: 0.25rem 0.75rem;
		background: var(--color-performance-error-muted);
		color: var(--color-performance-error);
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-caption);
		transition: background var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.btn-danger:hover {
		background: var(--color-performance-error-border);
	}

	.pagination-info {
		text-align: center;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
	}

	/* Stats Grid - Responsive */

	.stats-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-performance-md);
	}

	@media (min-width: 768px) {
		.stats-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.stat-item {
		text-align: center;
		padding: var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
	}

	@media (min-width: 768px) {
		.stat-item {
			background: transparent;
			padding: 0;
		}
	}

	.stat-value {
		font-size: var(--text-performance-h2);
		font-weight: 700;
	}

	.stat-label {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
	}
</style>
