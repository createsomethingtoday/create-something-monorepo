<script lang="ts">
	import { onMount } from 'svelte';

	let subscribers: any[] = [];
	let loading = true;
	let searchQuery = '';
	let filterStatus = 'all';
	let sortBy = 'newest';

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

	async function exportSubscribers() {
		const csv = [
			['Email', 'Status', 'Subscribed At'].join(','),
			...filteredSubscribers.map((sub) =>
				[
					sub.email,
					sub.status || 'active',
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
			return matchesSearch && matchesStatus;
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

<div class="space-y-6">
	<div class="flex items-center justify-between">
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
	<div class="flex gap-4 items-center">
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
			bind:value={sortBy}
			class="select-field px-4 py-2"
		>
			<option value="newest">Newest First</option>
			<option value="oldest">Oldest First</option>
			<option value="alpha">Alphabetical</option>
		</select>
	</div>

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
		<div class="table-container">
			<table class="w-full">
				<thead class="table-header">
					<tr>
						<th class="table-header-cell px-6 py-3">
							Email
						</th>
						<th class="table-header-cell px-6 py-3">
							Status
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
								{new Date(subscriber.created_at).toLocaleDateString()}
							</td>
							<td class="px-6 py-4">
								<div class="flex justify-end gap-2">
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

		<!-- Pagination Info -->
		<div class="pagination-info">
			Showing {filteredSubscribers.length} of {subscribers.length} subscribers
		</div>
	{/if}

	<!-- Stats -->
	<div class="stats-section pt-6">
		<div class="grid grid-cols-3 gap-4">
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
	.page-title {
		font-size: var(--text-h1);
		font-weight: 700;
	}

	.page-description {
		color: var(--color-fg-tertiary);
	}

	.btn-secondary {
		background: var(--color-bg-elevated);
		border-radius: var(--radius-lg);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.btn-secondary:hover {
		background: var(--color-hover);
	}

	.input-field {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.input-field::placeholder {
		color: var(--color-fg-muted);
	}

	.input-field:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.select-field {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.select-field:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.skeleton-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	.skeleton-line {
		height: 1.25rem;
		background: var(--color-bg-elevated);
		border-radius: var(--radius-sm);
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
		color: var(--color-fg-tertiary);
	}

	.table-container {
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.table-header {
		background: var(--color-bg-surface);
		border-bottom: 1px solid var(--color-border-default);
	}

	.table-header-cell {
		text-align: left;
		font-size: var(--text-caption);
		font-weight: 600;
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.table-header-cell-right {
		text-align: right;
		font-size: var(--text-caption);
		font-weight: 600;
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.table-body {
		border-top: 1px solid var(--color-border-default);
	}

	.table-body > * + * {
		border-top: 1px solid var(--color-border-default);
	}

	.table-row {
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.table-row:hover {
		background: var(--color-hover);
	}

	.table-cell {
		color: var(--color-fg-primary);
	}

	.table-cell-secondary {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
	}

	.status-unsubscribed {
		background: rgba(239, 68, 68, 0.2);
		color: #fca5a5;
	}

	.status-active {
		background: rgba(74, 222, 128, 0.2);
		color: #86efac;
	}

	.btn-small {
		padding: 0.25rem 0.75rem;
		background: var(--color-bg-elevated);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.btn-small:hover {
		background: var(--color-hover);
	}

	.btn-danger {
		padding: 0.25rem 0.75rem;
		background: rgba(239, 68, 68, 0.2);
		color: #fca5a5;
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.btn-danger:hover {
		background: rgba(239, 68, 68, 0.3);
	}

	.pagination-info {
		text-align: center;
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.stats-section {
		border-top: 1px solid var(--color-border-default);
	}

	.stat-item {
		text-align: center;
	}

	.stat-value {
		font-size: var(--text-h2);
		font-weight: 700;
	}

	.stat-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}
</style>
