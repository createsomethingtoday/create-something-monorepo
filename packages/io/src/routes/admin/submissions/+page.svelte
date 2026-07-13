<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { fetchAdminJson, type AdminRequestError } from '$lib/admin/client';

	type SubmissionStatus =
		| 'unread'
		| 'new'
		| 'read'
		| 'archived'
		| 'in_progress'
		| 'escalated'
		| 'responded';

	interface SubmissionRecord {
		id: string;
		name?: string;
		email?: string;
		company?: string;
		message?: string;
		status?: SubmissionStatus | string | null;
		submitted_at?: string;
		created_at?: string;
	}

	let submissions: SubmissionRecord[] = [];
	let loading = true;
	let filterStatus = 'all';
	let selectedSubmission: SubmissionRecord | null = null;
	let loadError: AdminRequestError | null = null;

	const statusFilters = ['all', 'unread', 'in_progress', 'escalated', 'responded', 'read', 'archived'];

	onMount(async () => {
		const requestedFilter = $page.url.searchParams.get('filter');
		if (requestedFilter && statusFilters.includes(requestedFilter)) {
			filterStatus = requestedFilter;
		}
		await loadSubmissions();
	});

	async function loadSubmissions() {
		loading = true;
		loadError = null;
		try {
			const result = await fetchAdminJson<SubmissionRecord[]>('/api/admin/submissions');
			if (result.ok) {
				submissions = result.data;
			} else {
				loadError = result.error;
				submissions = [];
			}
		} catch (error) {
			console.error('Failed to load submissions:', error);
		} finally {
			loading = false;
		}
	}

	async function updateStatus(submissionId: string, newStatus: string) {
		try {
			const result = await fetchAdminJson<{ success: boolean }>('/api/admin/submissions', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: submissionId,
					status: newStatus
				})
			});

			if (result.ok) {
				await loadSubmissions();
				selectedSubmission = null;
			} else {
				loadError = result.error;
			}
		} catch (error) {
			console.error('Failed to update status:', error);
		}
	}

	async function deleteSubmission(submissionId: string) {
		if (!confirm('Are you sure you want to delete this submission?')) return;

		try {
			const result = await fetchAdminJson<{ success: boolean }>('/api/admin/submissions', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: submissionId })
			});

			if (result.ok) {
				await loadSubmissions();
				selectedSubmission = null;
			} else {
				loadError = result.error;
			}
		} catch (error) {
			console.error('Failed to delete submission:', error);
		}
	}

	function updateSelectedStatus(newStatus: string) {
		if (!selectedSubmission) return;
		updateStatus(selectedSubmission.id, newStatus);
	}

	function deleteSelectedSubmission() {
		if (!selectedSubmission) return;
		deleteSubmission(selectedSubmission.id);
	}

	$: filteredSubmissions = submissions.filter((sub) => {
		if (filterStatus === 'all') return true;
		return normalizeStatus(sub.status) === filterStatus;
	});

	$: unreadCount = submissions.filter((s) => normalizeStatus(s.status) === 'unread').length;

	function normalizeStatus(status: SubmissionRecord['status']) {
		if (!status || status === 'new') return 'unread';
		return status;
	}

	function statusLabel(status: string) {
		return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
	}

	function formatDate(value?: string) {
		if (!value) return 'Unknown date';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return 'Unknown date';
		return date.toLocaleDateString();
	}

	function formatDateTime(value?: string) {
		if (!value) return 'Unknown date';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return 'Unknown date';
		return date.toLocaleString();
	}

	function errorTitle(error: AdminRequestError) {
		if (error.kind === 'unauthorized') return 'Sign in required';
		if (error.kind === 'forbidden') return 'Admin access required';
		if (error.kind === 'unavailable') return 'Admin data unavailable';
		return 'Unable to load submissions';
	}
</script>

<SEO
	title="Admin - Submissions"
	description="Administrative dashboard"
	propertyName="io"
	noindex={true}
/>

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
		{#each statusFilters as status}
			<button
				onclick={() => (filterStatus = status)}
				class="tab {filterStatus === status ? 'tab--active' : ''}"
			>
				{statusLabel(status)}
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
			{:else if loadError}
				<div class="empty-state error-state">
					<strong>{errorTitle(loadError)}</strong>
					<span>{loadError.message}</span>
				</div>
			{:else if filteredSubmissions.length === 0}
				<div class="empty-state">
					{#if filterStatus !== 'all'}
						No {statusLabel(filterStatus).toLowerCase()} submissions.
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
								<h3 class="submission-name">{submission.name || 'Unnamed submission'}</h3>
								{#if normalizeStatus(submission.status) === 'unread'}
									<span class="unread-dot"></span>
								{/if}
							</div>
							<span class="submission-date">
								{formatDate(submission.submitted_at || submission.created_at)}
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
							<h3 class="detail-title">{selectedSubmission.name || 'Unnamed submission'}</h3>
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
							aria-label="Close detail view"
						>
							<span aria-hidden="true">✕</span>
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
						<span class="meta-text">Received {formatDateTime(selectedSubmission.submitted_at || selectedSubmission.created_at)}</span>
					</div>

					<div class="actions-section">
						<div class="actions-label">Actions</div>
						<div class="flex flex-wrap gap-2">
							{#if normalizeStatus(selectedSubmission.status) !== 'read'}
								<button
									onclick={() => updateSelectedStatus('read')}
									class="action-btn"
								>
									Mark as Read
								</button>
							{/if}
							{#if normalizeStatus(selectedSubmission.status) !== 'archived'}
								<button
									onclick={() => updateSelectedStatus('archived')}
									class="action-btn"
								>
									Archive
								</button>
							{/if}
							{#if normalizeStatus(selectedSubmission.status) === 'archived'}
								<button
									onclick={() => updateSelectedStatus('unread')}
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
								onclick={deleteSelectedSubmission}
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
					{submissions.filter((s) => normalizeStatus(s.status) === 'read').length}
				</div>
				<div class="stat-label">Read</div>
			</div>
			<div class="stat-item">
				<div class="stat-value">
					{submissions.filter((s) => normalizeStatus(s.status) === 'archived').length}
				</div>
				<div class="stat-label">Archived</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Typography */
	.page-title {
		font-size: var(--text-performance-h1);
		font-weight: 700;
		margin-bottom: var(--space-performance-sm);
		color: var(--color-performance-fg-primary);
	}

	.page-subtitle {
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-body);
	}

	/* Unread Badge */
	.unread-badge {
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
	}

	.unread-count {
		font-weight: 600;
		color: var(--color-performance-fg-primary);
	}

	.unread-label {
		color: var(--color-performance-fg-tertiary);
		margin-left: var(--space-performance-xs);
	}

	/* Tabs */
	.tabs {
		display: flex;
		gap: var(--space-performance-sm);
	}

	.tab {
		padding: var(--space-performance-sm) var(--space-performance-md);
		border-bottom: 2px solid transparent;
		transition: all var(--duration-performance-standard) var(--ease-performance-standard);
		background: none;
		border-top: none;
		border-left: none;
		border-right: none;
		color: var(--color-performance-fg-tertiary);
		cursor: pointer;
	}

	.tab:hover {
		color: var(--color-performance-fg-primary);
	}

	.tab--active {
		border-bottom-color: var(--color-performance-fg-primary);
		color: var(--color-performance-fg-primary);
	}

	.tab-badge {
		margin-left: var(--space-performance-xs);
		padding: 0.125rem var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-caption);
	}

	/* Skeleton Loading */
	.skeleton-card {
		padding: var(--space-performance-md);
		border-radius: var(--radius-performance-scale-lg);
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	.skeleton-title {
		height: 1.25rem;
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-sm);
		width: 50%;
		margin-bottom: var(--space-performance-sm);
	}

	.skeleton-text {
		height: 1rem;
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-sm);
		width: 75%;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: var(--space-performance-2xl);
		color: var(--color-performance-fg-tertiary);
	}

	.error-state {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
		color: var(--color-performance-error);
	}

	/* Submission Cards */
	.submission-card {
		width: 100%;
		padding: var(--space-performance-md);
		border-radius: var(--radius-performance-scale-lg);
		text-align: left;
		transition: all var(--duration-performance-standard) var(--ease-performance-standard);
		cursor: pointer;
	}

	.submission-card:hover {
		border-color: var(--color-performance-border-emphasis);
	}

	.submission-card--active {
		border-color: var(--color-performance-border-emphasis);
		background: var(--color-performance-bg-surface);
	}

	.submission-name {
		font-weight: 600;
		color: var(--color-performance-fg-primary);
	}

	.unread-dot {
		width: 0.5rem;
		height: 0.5rem;
		background: var(--color-performance-info);
		border-radius: var(--radius-performance-scale-full);
		display: inline-block;
	}

	.submission-date {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.submission-email {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		margin-bottom: var(--space-performance-sm);
	}

	.submission-message {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* Detail Card */
	.detail-card {
		padding: var(--space-performance-lg);
		border-radius: var(--radius-performance-scale-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-md);
	}

	.detail-title {
		font-size: var(--text-performance-h3);
		font-weight: 700;
		margin-bottom: var(--space-performance-xs);
		color: var(--color-performance-fg-primary);
	}

	.detail-link {
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-body-sm);
		text-decoration: none;
		transition: color var(--duration-performance-standard) var(--ease-performance-standard);
	}

	.detail-link:hover {
		color: var(--color-performance-fg-primary);
	}

	.close-btn {
		color: var(--color-performance-fg-muted);
		background: none;
		border: none;
		font-size: var(--text-performance-body-lg);
		cursor: pointer;
		transition: color var(--duration-performance-standard) var(--ease-performance-standard);
	}

	.close-btn:hover {
		color: var(--color-performance-fg-primary);
	}

	.field-label {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		margin-bottom: var(--space-performance-xs);
	}

	.field-value {
		color: var(--color-performance-fg-primary);
	}

	.field-value--message {
		white-space: pre-wrap;
	}

	.meta-text {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.actions-section {
		padding-top: var(--space-performance-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-sm);
	}

	.actions-label {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		margin-bottom: var(--space-performance-sm);
	}

	.action-btn {
		padding: 0.375rem var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
		border: none;
		border-radius: var(--radius-performance-scale-md);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-primary);
		transition: all var(--duration-performance-standard) var(--ease-performance-standard);
		cursor: pointer;
		text-decoration: none;
		display: inline-block;
	}

	.action-btn:hover {
		background: var(--color-performance-hover);
	}

	.action-btn--primary {
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-pure);
		font-weight: 600;
	}

	.action-btn--primary:hover {
		background: var(--color-performance-fg-secondary);
	}

	.action-btn--danger {
		background: var(--color-performance-error-muted);
		color: var(--color-performance-error);
	}

	.action-btn--danger:hover {
		background: var(--color-performance-error-border);
	}

	/* Empty Detail */
	.empty-detail {
		padding: var(--space-performance-2xl);
		border: 1px dashed var(--color-performance-border-default);
		border-radius: var(--radius-performance-scale-lg);
		text-align: center;
		color: var(--color-performance-fg-muted);
	}

	/* Stats Section */
	.stats-section {
		padding-top: var(--space-performance-lg);
	}

	.stat-item {
		text-align: center;
	}

	.stat-value {
		font-size: var(--text-performance-h1);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
	}

	.stat-label {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		margin-top: var(--space-performance-xs);
	}
</style>
