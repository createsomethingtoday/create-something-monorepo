<script lang="ts">
	/**
	 * TimelineCard - Visual submission journey and review history
	 * 
	 * Shows the progression of an asset through the submission process:
	 * Submitted → In Review → Decision → Published/Rejected
	 */
	import type { Asset } from '$lib/server/airtable';
	import { Card, CardHeader, CardTitle, CardContent } from './ui';
	import {
		Clock,
		CheckCircle2,
		XCircle,
		Circle,
		AlertTriangle,
		CalendarDays,
		Timer,
		FileCheck
	} from 'lucide-svelte';

	interface Props {
		asset: Asset;
	}

	let { asset }: Props = $props();

	// Format date for display
	function formatDate(dateStr?: string): string {
		if (!dateStr) return 'Pending';
		try {
			return new Date(dateStr).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		} catch {
			return 'Invalid date';
		}
	}

	// Format relative time (e.g., "5 days ago")
	function formatRelativeTime(dateStr?: string): string {
		if (!dateStr) return '';
		try {
			const date = new Date(dateStr);
			const now = new Date();
			const diffMs = now.getTime() - date.getTime();
			const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
			
			if (diffDays === 0) return 'Today';
			if (diffDays === 1) return 'Yesterday';
			if (diffDays < 7) return `${diffDays} days ago`;
			if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
			if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
			return `${Math.floor(diffDays / 365)} years ago`;
		} catch {
			return '';
		}
	}

	// Calculate days between two dates
	function daysBetween(start?: string, end?: string): number | null {
		if (!start) return null;
		const startDate = new Date(start);
		const endDate = end ? new Date(end) : new Date();
		const diffMs = endDate.getTime() - startDate.getTime();
		return Math.floor(diffMs / (1000 * 60 * 60 * 24));
	}

	// Determine milestone status
	type MilestoneStatus = 'completed' | 'current' | 'pending' | 'rejected';

	interface Milestone {
		id: string;
		label: string;
		date?: string;
		status: MilestoneStatus;
		description?: string;
	}

	// Build milestones based on asset status
	const milestones = $derived<Milestone[]>(() => {
		const items: Milestone[] = [];

		// 1. Submitted
		items.push({
			id: 'submitted',
			label: 'Submitted',
			date: asset.submittedDate,
			status: asset.submittedDate ? 'completed' : 'pending',
			description: asset.submittedDate ? formatRelativeTime(asset.submittedDate) : 'Not yet submitted'
		});

		// 2. In Review
		const isInReview = ['Upcoming', 'Scheduled'].includes(asset.status);
		const pastReview = ['Published', 'Rejected', 'Delisted'].includes(asset.status);
		items.push({
			id: 'review',
			label: 'In Review',
			date: asset.latestReviewDate,
			status: pastReview ? 'completed' : isInReview ? 'current' : 'pending',
			description: isInReview ? 'Currently under review' : asset.latestReviewDate ? formatRelativeTime(asset.latestReviewDate) : undefined
		});

		// 3. Decision
		const hasDecision = ['Published', 'Rejected', 'Delisted'].includes(asset.status);
		const isRejected = asset.status === 'Rejected';
		items.push({
			id: 'decision',
			label: isRejected ? 'Rejected' : 'Approved',
			date: asset.decisionDate,
			status: isRejected ? 'rejected' : hasDecision ? 'completed' : 'pending',
			description: asset.decisionDate ? formatRelativeTime(asset.decisionDate) : undefined
		});

		// 4. Published (only if not rejected)
		if (!isRejected) {
			const isPublished = asset.status === 'Published' || asset.status === 'Delisted';
			// Use publishedDate if available, otherwise fall back to decisionDate for published assets
			const publishDate = asset.publishedDate || (isPublished ? asset.decisionDate : undefined);
			items.push({
				id: 'published',
				label: 'Published',
				date: publishDate,
				status: isPublished ? 'completed' : 'pending',
				description: publishDate ? formatRelativeTime(publishDate) : undefined
			});
		}

		return items;
	});

	// Calculate time metrics
	const timeToReview = $derived(daysBetween(asset.submittedDate, asset.latestReviewDate || asset.decisionDate));
	// For time to publish, use publishedDate if available, otherwise use decisionDate for approved assets
	const effectivePublishDate = $derived(asset.publishedDate || (asset.status === 'Published' ? asset.decisionDate : undefined));
	const timeToPublish = $derived(daysBetween(asset.submittedDate, effectivePublishDate));
	// Days live: if published, calculate from publish date (or decision date as fallback)
	const daysLive = $derived(
		asset.status === 'Published' || asset.status === 'Delisted'
			? daysBetween(effectivePublishDate, undefined)
			: null
	);
</script>

<div class="timeline-container">
	<!-- Visual Timeline -->
	<Card>
		<CardHeader>
			<CardTitle>Submission Journey</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="timeline">
				{#each milestones() as milestone, index}
					<div class="milestone" class:completed={milestone.status === 'completed'} class:current={milestone.status === 'current'} class:rejected={milestone.status === 'rejected'}>
						<!-- Icon -->
						<div class="milestone-icon">
							{#if milestone.status === 'completed'}
								<CheckCircle2 size={20} />
							{:else if milestone.status === 'rejected'}
								<XCircle size={20} />
							{:else if milestone.status === 'current'}
								<Clock size={20} />
							{:else}
								<Circle size={20} />
							{/if}
						</div>

						<!-- Content -->
						<div class="milestone-content">
							<span class="milestone-label">{milestone.label}</span>
							{#if milestone.date}
								<span class="milestone-date">{formatDate(milestone.date)}</span>
							{/if}
							{#if milestone.description}
								<span class="milestone-description">{milestone.description}</span>
							{/if}
						</div>

						<!-- Connector line -->
						{#if index < milestones().length - 1}
							<div class="connector" class:active={milestone.status === 'completed' || milestone.status === 'rejected'}></div>
						{/if}
					</div>
				{/each}
			</div>
		</CardContent>
	</Card>

	<!-- Time Metrics -->
	<Card>
		<CardHeader>
			<CardTitle>Time Metrics</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="metrics-grid">
				<div class="metric">
					<div class="metric-icon">
						<Timer size={16} />
					</div>
					<div class="metric-content">
						<span class="metric-value">{timeToReview !== null ? `${timeToReview} days` : '—'}</span>
						<span class="metric-label">Time to Review</span>
					</div>
				</div>

				<div class="metric">
					<div class="metric-icon">
						<FileCheck size={16} />
					</div>
					<div class="metric-content">
						<span class="metric-value">{timeToPublish !== null ? `${timeToPublish} days` : '—'}</span>
						<span class="metric-label">Time to Publish</span>
					</div>
				</div>

				<div class="metric">
					<div class="metric-icon">
						<CalendarDays size={16} />
					</div>
					<div class="metric-content">
						<span class="metric-value">{daysLive !== null ? `${daysLive} days` : '—'}</span>
						<span class="metric-label">Days Live</span>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Review Feedback (if rejected) -->
	{#if asset.status === 'Rejected' && (asset.rejectionFeedback || asset.rejectionFeedbackHtml)}
		<Card class="rejection-card">
			<CardHeader>
				<div class="rejection-header">
					<AlertTriangle size={18} />
					<CardTitle>Rejection Feedback</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				{#if asset.rejectionFeedbackHtml}
					<div class="rejection-content">
						{@html asset.rejectionFeedbackHtml}
					</div>
				{:else}
					<p class="rejection-text">{asset.rejectionFeedback}</p>
				{/if}
			</CardContent>
		</Card>
	{/if}

	<!-- Latest Review Status -->
	{#if asset.latestReviewStatus && asset.status !== 'Rejected'}
		<Card>
			<CardHeader>
				<CardTitle>Latest Review</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="review-info">
					<div class="review-status">
						<span class="review-label">Status:</span>
						<span class="review-value">{asset.latestReviewStatus}</span>
					</div>
					{#if asset.latestReviewDate}
						<div class="review-date">
							<span class="review-label">Date:</span>
							<span class="review-value">{formatDate(asset.latestReviewDate)}</span>
						</div>
					{/if}
				</div>
			</CardContent>
		</Card>
	{/if}
</div>

<style>
	.timeline-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	/* Timeline Styles */
	.timeline {
		display: flex;
		justify-content: space-between;
		position: relative;
		padding: var(--space-md) 0;
	}

	.milestone {
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
		flex: 1;
		text-align: center;
	}

	.milestone-icon {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-elevated);
		border: 2px solid var(--color-border-default);
		color: var(--color-fg-muted);
		z-index: 1;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.milestone.completed .milestone-icon {
		background: var(--color-success-subtle);
		border-color: var(--color-success);
		color: var(--color-success);
	}

	.milestone.current .milestone-icon {
		background: var(--color-info-subtle);
		border-color: var(--color-info);
		color: var(--color-info);
		animation: pulse 2s infinite;
	}

	.milestone.rejected .milestone-icon {
		background: var(--color-error-subtle);
		border-color: var(--color-error);
		color: var(--color-error);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}

	.milestone-content {
		margin-top: var(--space-sm);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.milestone-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.milestone-date {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}

	.milestone-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Connector line between milestones */
	.connector {
		position: absolute;
		top: 20px;
		left: calc(50% + 24px);
		width: calc(100% - 48px);
		height: 2px;
		background: var(--color-border-default);
	}

	.connector.active {
		background: var(--color-success);
	}

	/* Metrics Grid */
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-md);
	}

	.metric {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
	}

	.metric-icon {
		color: var(--color-fg-muted);
		margin-top: 2px;
	}

	.metric-content {
		display: flex;
		flex-direction: column;
	}

	.metric-value {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.metric-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Rejection Card */
	.rejection-card {
		border-color: var(--color-error-border);
	}

	.rejection-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--color-error);
	}

	.rejection-content,
	.rejection-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	/* Review Info */
	.review-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.review-status,
	.review-date {
		display: flex;
		gap: var(--space-sm);
	}

	.review-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		min-width: 60px;
	}

	.review-value {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
	}

	/* Responsive */
	@media (max-width: 640px) {
		.timeline {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-md);
		}

		.milestone {
			flex-direction: row;
			text-align: left;
			gap: var(--space-md);
		}

		.milestone-content {
			margin-top: 0;
		}

		.connector {
			left: 19px;
			top: 44px;
			width: 2px;
			height: calc(100% - 8px);
		}

		.metrics-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
