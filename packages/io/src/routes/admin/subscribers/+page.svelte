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
			<h2 class="text-3xl font-bold mb-2">Newsletter Subscribers</h2>
			<p class="text-white/60">Manage your email list</p>
		</div>
		<button
			onclick={exportSubscribers}
			class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
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
			class="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
		/>

		<select
			bind:value={filterStatus}
			class="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
		>
			<option value="all">All Status</option>
			<option value="active">Active</option>
			<option value="unsubscribed">Unsubscribed</option>
		</select>

		<select
			bind:value={sortBy}
			class="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
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
				<div class="p-4 bg-white/5 border border-white/10 rounded-lg animate-pulse">
					<div class="h-5 bg-white/10 rounded w-1/3"></div>
				</div>
			{/each}
		</div>
	{:else if filteredSubscribers.length === 0}
		<div class="text-center py-12 text-white/60">
			{#if searchQuery || filterStatus !== 'all'}
				No subscribers match your filters.
			{:else}
				No subscribers yet.
			{/if}
		</div>
	{:else}
		<div class="border border-white/10 rounded-lg overflow-hidden">
			<table class="w-full">
				<thead class="bg-white/5 border-b border-white/10">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
							Email
						</th>
						<th class="px-6 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
							Status
						</th>
						<th class="px-6 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
							Subscribed
						</th>
						<th class="px-6 py-3 text-right text-xs font-semibold text-white/60 uppercase tracking-wider">
							Actions
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-white/10">
					{#each filteredSubscribers as subscriber}
						<tr class="hover:bg-white/5 transition-colors">
							<td class="px-6 py-4 text-white">
								{subscriber.email}
							</td>
							<td class="px-6 py-4">
								<span
									class="px-2 py-1 rounded text-xs {subscriber.status === 'unsubscribed'
										? 'bg-red-500/20 text-red-400'
										: 'bg-green-500/20 text-green-400'}"
								>
									{subscriber.status || 'active'}
								</span>
							</td>
							<td class="px-6 py-4 text-white/60 text-sm">
								{new Date(subscriber.created_at).toLocaleDateString()}
							</td>
							<td class="px-6 py-4 text-right">
								<div class="flex justify-end gap-2">
									{#if subscriber.status === 'unsubscribed'}
										<button
											onclick={() => updateSubscriberStatus(subscriber.id, 'active')}
											class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
										>
											Reactivate
										</button>
									{:else}
										<button
											onclick={() => updateSubscriberStatus(subscriber.id, 'unsubscribed')}
											class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
										>
											Unsubscribe
										</button>
									{/if}
									<button
										onclick={() => deleteSubscriber(subscriber.id)}
										class="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs transition-colors"
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
		<div class="text-sm text-white/60 text-center">
			Showing {filteredSubscribers.length} of {subscribers.length} subscribers
		</div>
	{/if}

	<!-- Stats -->
	<div class="border-t border-white/10 pt-6">
		<div class="grid grid-cols-3 gap-4 text-center">
			<div>
				<div class="text-2xl font-bold">{subscribers.length}</div>
				<div class="text-sm text-white/60">Total Subscribers</div>
			</div>
			<div>
				<div class="text-2xl font-bold">{activeCount}</div>
				<div class="text-sm text-white/60">Active</div>
			</div>
			<div>
				<div class="text-2xl font-bold">
					{subscribers.filter((s) => s.status === 'unsubscribed').length}
				</div>
				<div class="text-sm text-white/60">Unsubscribed</div>
			</div>
		</div>
	</div>
</div>
