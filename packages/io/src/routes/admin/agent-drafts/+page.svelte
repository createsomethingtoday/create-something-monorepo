<script lang="ts">
	/**
	 * PM Agent Draft Review Interface
	 *
	 * Allows human reviewers to:
	 * - View pending drafts
	 * - See agent's reasoning
	 * - Approve or reject drafts
	 * - View escalations
	 * - Track metrics
	 */

	import { SEO } from '@create-something/canon';
	import { onMount } from 'svelte';

	interface Draft {
		contact_id: number;
		to_email: string;
		to_name: string;
		subject: string;
		body: string;
		reasoning: string;
		created_at: string;
		status: string;
	}

	interface ContactSubmission {
		id: number;
		name: string;
		email: string;
		message: string;
		submitted_at: string;
		status: string;
	}

	interface ContactWithDraft {
		contact: ContactSubmission;
		draft?: Draft;
		escalation?: any;
	}

	let contacts: ContactWithDraft[] = [];
	let loading = true;
	let error = '';
	let metrics = {
		approval_rate: 0,
		total_decisions: 0,
		escalation_rate: 0
	};

	onMount(async () => {
		await loadPendingReviews();
		await loadMetrics();
	});

	async function loadPendingReviews() {
		loading = true;
		error = '';

		try {
			// Get all contacts that need review (in_progress or escalated)
			const response = await fetch('/api/admin/agent-reviews');
			const data = await response.json();

			if (data.success) {
				contacts = data.contacts;
			} else {
				error = data.error || 'Failed to load reviews';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error loading reviews';
		} finally {
			loading = false;
		}
	}

	async function loadMetrics() {
		try {
			const response = await fetch('/api/admin/agent-metrics');
			const data = await response.json();

			if (data.success) {
				metrics = data.metrics;
			}
		} catch (err) {
			console.error('Failed to load metrics:', err);
		}
	}

	async function approveDraft(contactId: number) {
		try {
			const response = await fetch('/api/agent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'approve_draft',
					contact_id: contactId,
					approved: true
				})
			});

			const data = await response.json();

			if (data.success) {
				alert('Draft approved! Remember to actually send the email.');
				await loadPendingReviews();
				await loadMetrics();
			} else {
				alert(`Error: ${data.error || 'Failed to approve draft'}`);
			}
		} catch (err) {
			alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}

	async function rejectDraft(contactId: number) {
		try {
			const response = await fetch('/api/agent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'approve_draft',
					contact_id: contactId,
					approved: false
				})
			});

			const data = await response.json();

			if (data.success) {
				alert('Draft rejected. You can manually respond to this contact.');
				await loadPendingReviews();
				await loadMetrics();
			} else {
				alert(`Error: ${data.error || 'Failed to reject draft'}`);
			}
		} catch (err) {
			alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}

	async function triggerTriage() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/agent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'triage' })
			});

			const data = await response.json();

			if (data.success) {
				alert('Triage completed! Check results below.');
				await loadPendingReviews();
			} else {
				error = data.error || 'Triage failed';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error during triage';
		} finally {
			loading = false;
		}
	}

	function formatDate(isoString: string): string {
		return new Date(isoString).toLocaleString();
	}
</script>

<SEO
	title="Admin - Agent Drafts"
	description="Administrative dashboard"
	propertyName="io"
	noindex={true}
/>

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<header class="mb-8">
		<h1 class="page-title">PM Agent Draft Review</h1>
		<p class="page-subtitle">Experiment #3: AI PM Agent</p>
	</header>

	<!-- Metrics -->
	<div class="grid grid-cols-3 gap-4 mb-8">
		<div class="metric-card">
			<div class="metric-value metric-value--approval">{metrics.approval_rate.toFixed(1)}%</div>
			<div class="metric-label">Approval Rate</div>
			<div class="metric-subtext">{metrics.total_decisions} total decisions</div>
		</div>

		<div class="metric-card">
			<div class="metric-value metric-value--escalation">{metrics.escalation_rate.toFixed(1)}%</div>
			<div class="metric-label">Escalation Rate</div>
		</div>

		<div class="metric-card">
			<div class="metric-value metric-value--pending">{contacts.length}</div>
			<div class="metric-label">Pending Reviews</div>
		</div>
	</div>

	<!-- Actions -->
	<div class="mb-8 flex gap-4">
		<button
			on:click={triggerTriage}
			disabled={loading}
			class="btn btn--primary"
		>
			{loading ? 'Processing...' : 'Trigger Triage (Process New Submissions)'}
		</button>

		<button
			on:click={loadPendingReviews}
			disabled={loading}
			class="btn btn--secondary"
		>
			Refresh
		</button>
	</div>

	{#if error}
		<div class="alert alert--error mb-6">
			{error}
		</div>
	{/if}

	<!-- Pending Reviews -->
	{#if loading}
		<div class="empty-state">Loading reviews...</div>
	{:else if contacts.length === 0}
		<div class="empty-state empty-state--bordered">
			<p class="empty-state__title">No pending reviews</p>
			<p class="empty-state__subtitle">Trigger triage to process new contact submissions</p>
		</div>
	{:else}
		<div class="space-y-6">
			{#each contacts as { contact, draft, escalation }}
				<div class="review-card">
					<!-- Contact Info Header -->
					<div class="review-card__header">
						<div class="flex justify-between items-start">
							<div>
								<h3 class="review-card__title">{contact.name}</h3>
								<p class="review-card__email">{contact.email}</p>
								<p class="review-card__meta">
									Submitted: {formatDate(contact.submitted_at)}
								</p>
							</div>
							<div class="text-right">
								<span
									class="status-badge"
									class:status-badge--in-progress={contact.status === 'in_progress'}
									class:status-badge--escalated={contact.status === 'escalated'}
								>
									{contact.status}
								</span>
							</div>
						</div>
					</div>

					<!-- Original Message -->
					<div class="review-card__section">
						<h4 class="section-label">Original Inquiry:</h4>
						<p class="message-text">{contact.message}</p>
					</div>

					{#if draft}
						<!-- Agent Draft -->
						<div class="review-card__body">
							<h4 class="section-label">Agent's Draft Response:</h4>

							<div class="draft-preview">
								<p class="draft-meta"><strong>To:</strong> {draft.to_email}</p>
								<p class="draft-meta"><strong>Subject:</strong> {draft.subject}</p>
								<div class="prose">
									<pre class="draft-body">{draft.body}</pre>
								</div>
							</div>

							<div class="reasoning-box">
								<h5 class="reasoning-label">Agent's Reasoning:</h5>
								<p class="reasoning-text">{draft.reasoning}</p>
							</div>

							<div class="flex gap-3">
								<button
									on:click={() => approveDraft(contact.id)}
									class="btn btn--approve"
								>
									✓ Approve & Send
								</button>
								<button
									on:click={() => rejectDraft(contact.id)}
									class="btn btn--reject"
								>
									✗ Reject (Handle Manually)
								</button>
							</div>
						</div>
					{:else if escalation}
						<!-- Escalation -->
						<div class="review-card__body">
							<h4 class="section-label section-label--error">Escalated to Human:</h4>

							<div class="escalation-box">
								<p class="escalation-text">
									<strong>Reason:</strong>
									{escalation.reason}
								</p>
								<p class="escalation-text">
									<strong>Context:</strong>
									{escalation.context}
								</p>
								<p class="escalation-meta">
									<strong>Urgency:</strong>
									<span
										class="urgency-badge"
										class:urgency-badge--medium={escalation.urgency === 'medium'}
										class:urgency-badge--high={escalation.urgency === 'high'}
										class:urgency-badge--low={escalation.urgency === 'low'}
									>
										{escalation.urgency}
									</span>
								</p>
							</div>

							<p class="escalation-notice">
								This inquiry requires human attention. Handle manually.
							</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* Typography */
	.page-title {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.page-subtitle {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body);
	}

	/* Metric Cards */
	.metric-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
	}

	.metric-value {
		font-size: var(--text-h1);
		font-weight: 700;
	}

	.metric-value--approval {
		color: var(--color-info);
	}

	.metric-value--escalation {
		color: var(--color-warning);
	}

	.metric-value--pending {
		color: var(--color-success);
	}

	.metric-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-top: var(--space-xs);
	}

	.metric-subtext {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: var(--space-xs);
	}

	/* Buttons */
	.btn {
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-md);
		font-weight: 600;
		transition: all var(--duration-standard) var(--ease-standard);
		border: none;
		cursor: pointer;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn--primary {
		background: var(--color-info);
		color: var(--color-fg-primary);
	}

	.btn--primary:hover:not(:disabled) {
		background: var(--color-info);
		opacity: 0.8;
	}

	.btn--secondary {
		background: var(--color-bg-subtle);
		color: var(--color-fg-primary);
	}

	.btn--secondary:hover:not(:disabled) {
		background: var(--color-hover);
	}

	.btn--approve {
		background: var(--color-success);
		color: var(--color-fg-primary);
	}

	.btn--approve:hover {
		background: var(--color-success);
		opacity: 0.8;
	}

	.btn--reject {
		background: var(--color-error);
		color: var(--color-fg-primary);
	}

	.btn--reject:hover {
		background: var(--color-error);
		opacity: 0.8;
	}

	/* Alerts */
	.alert {
		padding: var(--space-md) var(--space-lg);
		border-radius: var(--radius-md);
	}

	.alert--error {
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		color: var(--color-error);
	}

	/* Empty States */
	.empty-state {
		text-align: center;
		padding: var(--space-2xl);
		color: var(--color-fg-muted);
	}

	.empty-state--bordered {
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.empty-state__title {
		font-size: var(--text-body-lg);
		margin-bottom: var(--space-sm);
	}

	.empty-state__subtitle {
		font-size: var(--text-body-sm);
	}

	/* Review Cards */
	.review-card {
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
	}

	.review-card__header {
		background: var(--color-bg-elevated);
		padding: var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.review-card__title {
		font-size: var(--text-body-lg);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.review-card__email {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-top: var(--space-xs);
	}

	.review-card__meta {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: var(--space-xs);
	}

	.review-card__section {
		padding: var(--space-lg);
		background: var(--color-bg-elevated);
		border-bottom: 1px solid var(--color-border-default);
	}

	.review-card__body {
		padding: var(--space-lg);
	}

	/* Status Badges */
	.status-badge {
		display: inline-block;
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-full);
		font-size: var(--text-body-sm);
		font-weight: 500;
	}

	.status-badge--in-progress {
		background: var(--color-warning-muted);
		color: var(--color-warning);
	}

	.status-badge--escalated {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	/* Section Labels */
	.section-label {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.section-label--error {
		color: var(--color-error);
	}

	.message-text {
		color: var(--color-fg-primary);
		white-space: pre-wrap;
	}

	/* Draft Preview */
	.draft-preview {
		margin-bottom: var(--space-md);
		padding: var(--space-md);
		background: var(--color-info-muted);
		border-radius: var(--radius-md);
	}

	.draft-meta {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-xs);
	}

	.draft-body {
		white-space: pre-wrap;
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		background: transparent;
		padding: 0;
		margin: 0;
		border: none;
	}

	/* Reasoning Box */
	.reasoning-box {
		margin-bottom: var(--space-md);
		padding: var(--space-md);
		background: var(--color-warning-muted);
		border-radius: var(--radius-md);
	}

	.reasoning-label {
		font-size: var(--text-caption);
		font-weight: 600;
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.reasoning-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Escalation Box */
	.escalation-box {
		padding: var(--space-md);
		background: var(--color-error-muted);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-md);
	}

	.escalation-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.escalation-meta {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	.escalation-notice {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Urgency Badges */
	.urgency-badge {
		display: inline-block;
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
	}

	.urgency-badge--low {
		background: var(--color-bg-subtle);
		color: var(--color-fg-secondary);
	}

	.urgency-badge--medium {
		background: var(--color-warning-muted);
		color: var(--color-warning);
	}

	.urgency-badge--high {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	.prose pre {
		background: transparent;
		padding: 0;
		margin: 0;
		border: none;
	}
</style>
