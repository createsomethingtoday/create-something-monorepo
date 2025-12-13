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
			<h2 class="page-title">Contact Submissions</h2>
			<p class="page-subtitle">Review and manage service inquiries</p>
		</div>
		{#if unreadCount > 0}
			<div class="unread-badge">
				<span class="unread-count">{unreadCount}</span>
				<span class="unread-label">unread</span>
			</div>
		{/if}
	</div>

	<!-- Filter Tabs -->
	<div class="tabs">
		{#each ['all', 'unread', 'read', 'archived'] as status}
			<button
				onclick={() => (filterStatus = status)}
				class="tab {filterStatus === status ? 'tab--active' : ''}"
			>
				{status.charAt(0).toUpperCase() + status.slice(1)}
				{#if status === 'unread' && unreadCount > 0}
					<span class="tab-badge">{unreadCount}</span>
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
					<div class="skeleton-card">
						<div class="skeleton-title"></div>
						<div class="skeleton-text"></div>
					</div>
				{/each}
			{:else if filteredSubmissions.length === 0}
				<div class="empty-state">
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
						class="submission-card {selectedSubmission?.id === submission.id ? 'submission-card--active' : ''}"
					>
						<div class="flex items-start justify-between mb-2">
							<div class="flex items-center gap-2">
								<h3 class="submission-name">{submission.name}</h3>
								{#if submission.status === 'unread'}
									<span class="unread-dot"></span>
								{/if}
							</div>
							<span class="submission-date">
								{new Date(submission.submitted_at || submission.created_at).toLocaleDateString()}
							</span>
						</div>
						<p class="submission-email">{submission.email}</p>
						<p class="submission-message">{submission.message}</p>
					</button>
				{/each}
			{/if}
		</div>

		<!-- Right Column: Detail View -->
		<div class="lg:sticky lg:top-6 h-fit">
			{#if selectedSubmission}
				<div class="detail-card">
					<div class="flex items-start justify-between">
						<div>
							<h3 class="detail-title">{selectedSubmission.name}</h3>
							<a
								href="mailto:{selectedSubmission.email}"
								class="detail-link"
							>
								{selectedSubmission.email}
							</a>
						</div>
						<button
							onclick={() => (selectedSubmission = null)}
							class="close-btn"
						>
							✕
						</button>
					</div>

					{#if selectedSubmission.company}
						<div>
							<div class="field-label">Company</div>
							<div class="field-value">{selectedSubmission.company}</div>
						</div>
					{/if}

					<div>
						<div class="field-label">Message</div>
						<div class="field-value field-value--message">{selectedSubmission.message}</div>
					</div>

					<div class="flex items-center gap-2">
						<span class="meta-text">Received {new Date(selectedSubmission.submitted_at || selectedSubmission.created_at).toLocaleString()}</span>
					</div>

					<div class="actions-section">
						<div class="actions-label">Actions</div>
						<div class="flex flex-wrap gap-2">
							{#if selectedSubmission.status !== 'read'}
								<button
									onclick={() => updateStatus(selectedSubmission.id, 'read')}
									class="action-btn"
								>
									Mark as Read
								</button>
							{/if}
							{#if selectedSubmission.status !== 'archived'}
								<button
									onclick={() => updateStatus(selectedSubmission.id, 'archived')}
									class="action-btn"
								>
									Archive
								</button>
							{/if}
							{#if selectedSubmission.status === 'archived'}
								<button
									onclick={() => updateStatus(selectedSubmission.id, 'unread')}
									class="action-btn"
								>
									Unarchive
								</button>
							{/if}
							<a
								href="mailto:{selectedSubmission.email}?subject=Re: Your CREATE SOMETHING Inquiry"
								class="action-btn action-btn--primary"
							>
								Reply via Email
							</a>
							<button
								onclick={() => deleteSubmission(selectedSubmission.id)}
								class="action-btn action-btn--danger ml-auto"
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			{:else}
				<div class="empty-detail">
					Select a submission to view details
				</div>
			{/if}
		</div>
	</div>

	<!-- Stats -->
	<div class="stats-section">
		<div class="grid grid-cols-4 gap-4">
			<div class="stat-item">
				<div class="stat-value">{submissions.length}</div>
				<div class="stat-label">Total Submissions</div>
			</div>
			<div class="stat-item">
				<div class="stat-value">{unreadCount}</div>
				<div class="stat-label">Unread</div>
			</div>
			<div class="stat-item">
				<div class="stat-value">
					{submissions.filter((s) => s.status === 'read').length}
				</div>
				<div class="stat-label">Read</div>
			</div>
			<div class="stat-item">
				<div class="stat-value">
					{submissions.filter((s) => s.status === 'archived').length}
				</div>
				<div class="stat-label">Archived</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Typography */
	.page-title {
		font-size: var(--text-h1);
		font-weight: 700;
		margin-bottom: var(--space-sm);
		color: var(--color-fg-primary);
	}

	.page-subtitle {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body);
	}

	/* Unread Badge */
	.unread-badge {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.unread-count {
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.unread-label {
		color: var(--color-fg-tertiary);
		margin-left: var(--space-xs);
	}

	/* Tabs */
	.tabs {
		display: flex;
		gap: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.tab {
		padding: var(--space-sm) var(--space-md);
		border-bottom: 2px solid transparent;
		transition: all var(--duration-standard) var(--ease-standard);
		background: none;
		border-top: none;
		border-left: none;
		border-right: none;
		color: var(--color-fg-tertiary);
		cursor: pointer;
	}

	.tab:hover {
		color: var(--color-fg-primary);
	}

	.tab--active {
		border-bottom-color: var(--color-fg-primary);
		color: var(--color-fg-primary);
	}

	.tab-badge {
		margin-left: var(--space-xs);
		padding: 0.125rem var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
	}

	/* Skeleton Loading */
	.skeleton-card {
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	.skeleton-title {
		height: 1.25rem;
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
		width: 50%;
		margin-bottom: var(--space-sm);
	}

	.skeleton-text {
		height: 1rem;
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
		width: 75%;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: var(--space-2xl);
		color: var(--color-fg-tertiary);
	}

	/* Submission Cards */
	.submission-card {
		width: 100%;
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-align: left;
		transition: all var(--duration-standard) var(--ease-standard);
		cursor: pointer;
	}

	.submission-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.submission-card--active {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-surface);
	}

	.submission-name {
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.unread-dot {
		width: 0.5rem;
		height: 0.5rem;
		background: #60a5fa;
		border-radius: var(--radius-full);
		display: inline-block;
	}

	.submission-date {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.submission-email {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-sm);
	}

	.submission-message {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* Detail Card */
	.detail-card {
		padding: var(--space-lg);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.detail-title {
		font-size: var(--text-h3);
		font-weight: 700;
		margin-bottom: var(--space-xs);
		color: var(--color-fg-primary);
	}

	.detail-link {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		text-decoration: none;
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.detail-link:hover {
		color: var(--color-fg-primary);
	}

	.close-btn {
		color: var(--color-fg-muted);
		background: none;
		border: none;
		font-size: var(--text-body-lg);
		cursor: pointer;
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.close-btn:hover {
		color: var(--color-fg-primary);
	}

	.field-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.field-value {
		color: var(--color-fg-primary);
	}

	.field-value--message {
		white-space: pre-wrap;
	}

	.meta-text {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.actions-section {
		border-top: 1px solid var(--color-border-default);
		padding-top: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.actions-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-sm);
	}

	.action-btn {
		padding: 0.375rem var(--space-sm);
		background: var(--color-bg-surface);
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		transition: all var(--duration-standard) var(--ease-standard);
		cursor: pointer;
		text-decoration: none;
		display: inline-block;
	}

	.action-btn:hover {
		background: var(--color-hover);
	}

	.action-btn--primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-weight: 600;
	}

	.action-btn--primary:hover {
		background: var(--color-fg-secondary);
	}

	.action-btn--danger {
		background: rgba(239, 68, 68, 0.2);
		color: #f87171;
	}

	.action-btn--danger:hover {
		background: rgba(239, 68, 68, 0.3);
	}

	/* Empty Detail */
	.empty-detail {
		padding: var(--space-2xl);
		background: var(--color-bg-elevated);
		border: 1px dashed var(--color-border-default);
		border-radius: var(--radius-lg);
		text-align: center;
		color: var(--color-fg-muted);
	}

	/* Stats Section */
	.stats-section {
		border-top: 1px solid var(--color-border-default);
		padding-top: var(--space-lg);
	}

	.stat-item {
		text-align: center;
	}

	.stat-value {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.stat-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-top: var(--space-xs);
	}
</style>
