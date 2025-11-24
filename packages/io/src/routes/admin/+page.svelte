<script lang="ts">
	import { onMount } from 'svelte';

	let stats = {
		experiments: 0,
		submissions: 0,
		subscribers: 0,
		executions: 0
	};
	let loading = true;

	onMount(async () => {
		try {
			const response = await fetch('/api/admin/stats');
			if (response.ok) {
				stats = await response.json();
			}
		} catch (error) {
			console.error('Failed to load stats:', error);
		} finally {
			loading = false;
		}
	});
</script>

<div class="space-y-8">
	<div>
		<h2 class="text-3xl font-bold mb-2">Dashboard</h2>
		<p class="text-white/60">Overview of CREATE SOMETHING systems</p>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
			<div class="text-white/60 text-sm mb-2">Total Experiments</div>
			<div class="text-4xl font-bold">
				{#if loading}
					<div class="animate-pulse bg-white/10 h-10 w-20 rounded"></div>
				{:else}
					{stats.experiments}
				{/if}
			</div>
			<a href="/admin/experiments" class="text-sm text-white/60 hover:text-white mt-2 inline-block"
				>Manage →</a
			>
		</div>

		<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
			<div class="text-white/60 text-sm mb-2">Contact Submissions</div>
			<div class="text-4xl font-bold">
				{#if loading}
					<div class="animate-pulse bg-white/10 h-10 w-20 rounded"></div>
				{:else}
					{stats.submissions}
				{/if}
			</div>
			<a href="/admin/submissions" class="text-sm text-white/60 hover:text-white mt-2 inline-block"
				>Review →</a
			>
		</div>

		<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
			<div class="text-white/60 text-sm mb-2">Newsletter Subscribers</div>
			<div class="text-4xl font-bold">
				{#if loading}
					<div class="animate-pulse bg-white/10 h-10 w-20 rounded"></div>
				{:else}
					{stats.subscribers}
				{/if}
			</div>
			<a href="/admin/subscribers" class="text-sm text-white/60 hover:text-white mt-2 inline-block"
				>View →</a
			>
		</div>

		<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
			<div class="text-white/60 text-sm mb-2">Code Executions (.space)</div>
			<div class="text-4xl font-bold">
				{#if loading}
					<div class="animate-pulse bg-white/10 h-10 w-20 rounded"></div>
				{:else}
					{stats.executions}
				{/if}
			</div>
			<div class="text-sm text-white/60 mt-2">Last 30 days</div>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="border-t border-white/10 pt-8">
		<h3 class="text-xl font-semibold mb-4">Quick Actions</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<a
				href="/admin/experiments?action=feature"
				class="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-white/30 transition-colors group"
			>
				<div class="font-semibold group-hover:text-white">Feature an Experiment</div>
				<div class="text-sm text-white/60">Promote experiment to homepage</div>
			</a>

			<a
				href="/admin/submissions?filter=unread"
				class="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-white/30 transition-colors group"
			>
				<div class="font-semibold group-hover:text-white">Review New Submissions</div>
				<div class="text-sm text-white/60">Check recent service inquiries</div>
			</a>
		</div>
	</div>

	<!-- System Info -->
	<div class="border-t border-white/10 pt-8">
		<h3 class="text-xl font-semibold mb-4">System Status</h3>
		<div class="space-y-2 text-sm">
			<div class="flex justify-between">
				<span class="text-white/60">Database</span>
				<span class="text-green-400">● create-something-db (Cloudflare D1)</span>
			</div>
			<div class="flex justify-between">
				<span class="text-white/60">Properties</span>
				<span class="text-white">.agency • .io • .space</span>
			</div>
			<div class="flex justify-between">
				<span class="text-white/60">Admin Access</span>
				<span class="text-white">Human-in-the-loop oversight</span>
			</div>
		</div>
	</div>
</div>
