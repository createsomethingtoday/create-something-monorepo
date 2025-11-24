<script lang="ts">
	import { onMount } from 'svelte';

	let submissions: any[] = [];
	let loading = true;
	let filterStatus = 'all';
	let selectedSubmission: any = null;

	onMount(async () => {
		await loadSubmissions();
	});

	async function loadSubmissions() {
		loading = true;
		try {
			const response = await fetch('/api/admin/submissions');
			if (response.ok) {
				submissions = await response.json();
			}
		} catch (error) {
			console.error('Failed to load submissions:', error);
		} finally {
			loading = false;
		}
	}

	async function updateStatus(submissionId: string, newStatus: string) {
		try {
			const response = await fetch('/api/admin/submissions', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: submissionId,
					status: newStatus
				})
			});

			if (response.ok) {
				await loadSubmissions();
				selectedSubmission = null;
			}
		} catch (error) {
			console.error('Failed to update status:', error);
		}
	}

	async function deleteSubmission(submissionId: string) {
		if (!confirm('Are you sure you want to delete this submission?')) return;

		try {
			const response = await fetch('/api/admin/submissions', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: submissionId })
			});

			if (response.ok) {
				await loadSubmissions();
				selectedSubmission = null;
			}
		} catch (error) {
			console.error('Failed to delete submission:', error);
		}
	}

	$: filteredSubmissions = submissions.filter((sub) => {
		if (filterStatus === 'all') return true;
		return sub.status === filterStatus;
	});

	$: unreadCount = submissions.filter((s) => s.status === 'unread').length;
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-3xl font-bold mb-2">Contact Submissions</h2>
			<p class="text-white/60">Review and manage service inquiries</p>
		</div>
		{#if unreadCount > 0}
			<div class="px-4 py-2 bg-white/10 rounded-lg">
				<span class="font-semibold">{unreadCount}</span>
				<span class="text-white/60 ml-1">unread</span>
			</div>
		{/if}
	</div>

	<!-- Filter Tabs -->
	<div class="flex gap-2 border-b border-white/10">
		{#each ['all', 'unread', 'read', 'archived'] as status}
			<button
				onclick={() => (filterStatus = status)}
				class="px-4 py-2 border-b-2 transition-colors {filterStatus === status
					? 'border-white text-white'
					: 'border-transparent text-white/60 hover:text-white'}"
			>
				{status.charAt(0).toUpperCase() + status.slice(1)}
				{#if status === 'unread' && unreadCount > 0}
					<span class="ml-1 px-2 py-0.5 bg-white/10 rounded text-xs">{unreadCount}</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Submissions List -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Left Column: List -->
		<div class="space-y-3">
			{#if loading}
				{#each [1, 2, 3] as _}
					<div class="p-4 bg-white/5 border border-white/10 rounded-lg animate-pulse">
						<div class="h-5 bg-white/10 rounded w-1/2 mb-2"></div>
						<div class="h-4 bg-white/10 rounded w-3/4"></div>
					</div>
				{/each}
			{:else if filteredSubmissions.length === 0}
				<div class="text-center py-12 text-white/60">
					{#if filterStatus !== 'all'}
						No {filterStatus} submissions.
					{:else}
						No submissions yet.
					{/if}
				</div>
			{:else}
				{#each filteredSubmissions as submission}
					<button
						onclick={() => (selectedSubmission = submission)}
						class="w-full p-4 bg-white/5 border rounded-lg text-left transition-colors hover:border-white/30 {selectedSubmission?.id ===
						submission.id
							? 'border-white/30 bg-white/10'
							: 'border-white/10'}"
					>
						<div class="flex items-start justify-between mb-2">
							<div class="flex items-center gap-2">
								<h3 class="font-semibold">{submission.name}</h3>
								{#if submission.status === 'unread'}
									<span class="w-2 h-2 bg-blue-400 rounded-full"></span>
								{/if}
							</div>
							<span class="text-xs text-white/40">
								{new Date(submission.submitted_at || submission.created_at).toLocaleDateString()}
							</span>
						</div>
						<p class="text-sm text-white/60 mb-2">{submission.email}</p>
						<p class="text-sm text-white/80 line-clamp-2">{submission.message}</p>
					</button>
				{/each}
			{/if}
		</div>

		<!-- Right Column: Detail View -->
		<div class="lg:sticky lg:top-6 h-fit">
			{#if selectedSubmission}
				<div class="p-6 bg-white/5 border border-white/10 rounded-lg space-y-4">
					<div class="flex items-start justify-between">
						<div>
							<h3 class="text-xl font-bold mb-1">{selectedSubmission.name}</h3>
							<a
								href="mailto:{selectedSubmission.email}"
								class="text-white/60 hover:text-white text-sm"
							>
								{selectedSubmission.email}
							</a>
						</div>
						<button
							onclick={() => (selectedSubmission = null)}
							class="text-white/40 hover:text-white"
						>
							✕
						</button>
					</div>

					{#if selectedSubmission.company}
						<div>
							<div class="text-xs text-white/40 mb-1">Company</div>
							<div class="text-white">{selectedSubmission.company}</div>
						</div>
					{/if}

					<div>
						<div class="text-xs text-white/40 mb-1">Message</div>
						<div class="text-white whitespace-pre-wrap">{selectedSubmission.message}</div>
					</div>

					<div class="flex items-center gap-2 text-xs text-white/40">
						<span>Received {new Date(selectedSubmission.submitted_at || selectedSubmission.created_at).toLocaleString()}</span>
					</div>

					<div class="border-t border-white/10 pt-4 space-y-2">
						<div class="text-sm text-white/60 mb-2">Actions</div>
						<div class="flex flex-wrap gap-2">
							{#if selectedSubmission.status !== 'read'}
								<button
									onclick={() => updateStatus(selectedSubmission.id, 'read')}
									class="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
								>
									Mark as Read
								</button>
							{/if}
							{#if selectedSubmission.status !== 'archived'}
								<button
									onclick={() => updateStatus(selectedSubmission.id, 'archived')}
									class="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
								>
									Archive
								</button>
							{/if}
							{#if selectedSubmission.status === 'archived'}
								<button
									onclick={() => updateStatus(selectedSubmission.id, 'unread')}
									class="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
								>
									Unarchive
								</button>
							{/if}
							<a
								href="mailto:{selectedSubmission.email}?subject=Re: Your CREATE SOMETHING Inquiry"
								class="px-3 py-1.5 bg-white text-black hover:bg-white/90 rounded text-sm transition-colors font-semibold"
							>
								Reply via Email
							</a>
							<button
								onclick={() => deleteSubmission(selectedSubmission.id)}
								class="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors ml-auto"
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			{:else}
				<div
					class="p-12 bg-white/5 border border-white/10 border-dashed rounded-lg text-center text-white/40"
				>
					Select a submission to view details
				</div>
			{/if}
		</div>
	</div>

	<!-- Stats -->
	<div class="border-t border-white/10 pt-6">
		<div class="grid grid-cols-4 gap-4 text-center">
			<div>
				<div class="text-2xl font-bold">{submissions.length}</div>
				<div class="text-sm text-white/60">Total Submissions</div>
			</div>
			<div>
				<div class="text-2xl font-bold">{unreadCount}</div>
				<div class="text-sm text-white/60">Unread</div>
			</div>
			<div>
				<div class="text-2xl font-bold">
					{submissions.filter((s) => s.status === 'read').length}
				</div>
				<div class="text-sm text-white/60">Read</div>
			</div>
			<div>
				<div class="text-2xl font-bold">
					{submissions.filter((s) => s.status === 'archived').length}
				</div>
				<div class="text-sm text-white/60">Archived</div>
			</div>
		</div>
	</div>
</div>
