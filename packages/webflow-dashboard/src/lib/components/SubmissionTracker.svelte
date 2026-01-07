<script lang="ts">
	import { Badge, Card, CardHeader, CardTitle, CardContent, Button } from './ui';
	import type { Asset } from '$lib/server/airtable';
	import {
		submissionStore,
		SUBMISSION_LIMIT,
		formatTimeUntil,
		getStatusMessage,
		type SubmissionState
	} from '$lib/stores/submission';
	import { onMount, onDestroy } from 'svelte';
	import { toast } from '$lib/stores/toast';

	interface Props {
		assets: Asset[];
		variant?: 'default' | 'compact';
		userEmail?: string;
	}

	let { assets, variant = 'default', userEmail }: Props = $props();

	let isTooltipOpen = $state(false);
	let storeData = $state<SubmissionState | null>(null);
	let countdownInterval: ReturnType<typeof setInterval> | null = null;
	let displayedTimeUntilSlot = $state<string>('');

	// Initialize store with assets and optionally fetch external data
	onMount(() => {
		submissionStore.setAssets(assets);
		if (userEmail) {
			submissionStore.refresh(userEmail);
		}

		// Subscribe to store updates
		const unsubscribe = submissionStore.subscribe((data) => {
			storeData = data;
			// Update countdown display
			if (data.timeUntilNextSlot !== null && data.timeUntilNextSlot > 0) {
				displayedTimeUntilSlot = formatTimeUntil(data.timeUntilNextSlot);
			}
		});

		// Start countdown interval for real-time updates
		countdownInterval = setInterval(() => {
			const currentData = storeData;
			if (currentData && currentData.timeUntilNextSlot !== null && currentData.timeUntilNextSlot > 0) {
				const newTime = Math.max(0, currentData.timeUntilNextSlot - 1000);
				displayedTimeUntilSlot = formatTimeUntil(newTime);
			}
		}, 60000); // Update every minute

		return unsubscribe;
	});

	onDestroy(() => {
		if (countdownInterval) {
			clearInterval(countdownInterval);
		}
	});

	// Update store when assets change
	$effect(() => {
		submissionStore.setAssets(assets);
	});

	// Get submission data from store with fallback
	const submissionData = $derived(() => {
		if (!storeData) {
			return {
				submissions: [],
				remainingSubmissions: SUBMISSION_LIMIT,
				isAtLimit: false,
				nextExpiryDate: null,
				publishedCount: 0,
				totalSubmitted: 0,
				assetsSubmitted30: 0,
				isWhitelisted: false,
				isLoading: true,
				isDevMode: false,
				hasError: false,
				errorMessage: '',
				warningLevel: 'none' as const,
				showWarning: false,
				dataSource: 'local' as const,
				timeUntilNextSlot: null,
				message: ''
			};
		}

		return {
			submissions: storeData.submissions,
			remainingSubmissions: storeData.remainingSubmissions,
			isAtLimit: storeData.isAtLimit,
			nextExpiryDate: storeData.nextExpiryDate,
			publishedCount: storeData.publishedTemplates,
			totalSubmitted: storeData.submittedTemplates,
			assetsSubmitted30: storeData.assetsSubmitted30,
			isWhitelisted: storeData.isWhitelisted,
			isLoading: storeData.isLoading,
			isDevMode: storeData.isDevMode,
			hasError: storeData.hasError,
			errorMessage: storeData.errorMessage,
			warningLevel: storeData.warningLevel,
			showWarning: storeData.showWarning,
			dataSource: storeData.dataSource,
			timeUntilNextSlot: storeData.timeUntilNextSlot,
			message: storeData.message
		};
	});

	function formatDate(date: Date | null): string {
		if (!date) return '';
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function toggleTooltip() {
		isTooltipOpen = !isTooltipOpen;
	}

	async function handleRefresh() {
		if (userEmail) {
			await submissionStore.forceRefresh(userEmail);
			toast.info('Refreshed submission status');
		}
	}

	function getBadgeVariant(): 'success' | 'warning' | 'error' | 'default' {
		const data = submissionData();
		if (data.isWhitelisted) return 'default';
		if (data.isAtLimit) return 'error';
		if (data.warningLevel === 'caution') return 'warning';
		return 'success';
	}

	function getStatusText(): string {
		const data = submissionData();
		if (data.isWhitelisted) return 'Unlimited';
		if (data.isAtLimit) return 'Limit Reached';
		if (data.warningLevel === 'caution') return 'Near Limit';
		return 'Can Submit';
	}
</script>

{#if variant === 'compact'}
	<div class="compact-tracker">
		<button type="button" class="tracker-button" onclick={toggleTooltip}>
			{#if submissionData().isLoading}
				<Badge variant="default">
					<span class="loading-pulse">Loading...</span>
				</Badge>
			{:else}
				<Badge variant={getBadgeVariant()}>
					{#if submissionData().isWhitelisted}
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="whitelist-icon">
							<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
							<polyline points="22 4 12 14.01 9 11.01" />
						</svg>
						Unlimited
					{:else}
						{submissionData().assetsSubmitted30}/{SUBMISSION_LIMIT} this month
					{/if}
				</Badge>
			{/if}
			{#if submissionData().isAtLimit && submissionData().nextExpiryDate && !submissionData().isWhitelisted}
				<span class="next-date">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<polyline points="12 6 12 12 16 14" />
					</svg>
					{displayedTimeUntilSlot || formatTimeUntil(submissionData().timeUntilNextSlot)}
				</span>
			{/if}
			{#if submissionData().isDevMode}
				<span class="dev-indicator" title="Development mode - using local calculation">DEV</span>
			{/if}
		</button>

		{#if isTooltipOpen}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="tooltip-overlay" onclick={() => (isTooltipOpen = false)}></div>
			<div class="tooltip-content" class:warning={submissionData().warningLevel === 'caution'} class:critical={submissionData().isAtLimit && !submissionData().isWhitelisted}>
				<div class="tooltip-header">
					<h4>Submission Status</h4>
					<Badge variant={getBadgeVariant()}>
						{getStatusText()}
					</Badge>
				</div>

				{#if submissionData().isDevMode}
					<div class="dev-mode-banner">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
						</svg>
						Development mode - external API skipped due to CORS
					</div>
				{/if}

				{#if submissionData().hasError}
					<div class="error-banner">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="12" />
							<line x1="12" y1="16" x2="12.01" y2="16" />
						</svg>
						{submissionData().message || 'Server unavailable'}
						<button type="button" class="retry-button" onclick={handleRefresh}>Retry</button>
					</div>
				{/if}

				{#if submissionData().isWhitelisted}
					<div class="whitelist-banner">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
							<polyline points="22 4 12 14.01 9 11.01" />
						</svg>
						Whitelisted account - no submission limits
					</div>
				{/if}

				<div class="tooltip-stats">
					<div class="stat-row">
						<span>Published:</span>
						<span class="stat-value">{submissionData().publishedCount}</span>
					</div>
					<div class="stat-row">
						<span>Total Submitted:</span>
						<span class="stat-value">{submissionData().totalSubmitted}</span>
					</div>
					<div class="stat-row">
						<span>This Month:</span>
						<span class="stat-value" class:warning={submissionData().warningLevel === 'caution'} class:critical={submissionData().isAtLimit}>
							{submissionData().assetsSubmitted30}/{SUBMISSION_LIMIT}
						</span>
					</div>
					<div class="stat-row">
						<span>Remaining:</span>
						<span class="stat-value" class:warning={submissionData().warningLevel === 'caution'} class:critical={submissionData().isAtLimit}>
							{submissionData().isWhitelisted ? '∞' : submissionData().remainingSubmissions}
						</span>
					</div>
				</div>

				{#if submissionData().submissions.length > 0}
					<div class="submissions-list">
						<h5>Active Submissions</h5>
						<div class="submissions-scroll">
							{#each submissionData().submissions.slice(0, 6) as submission}
								<div class="submission-item">
									<div class="submission-name">
										<div class="submission-dot" style="background: {submission.daysUntilExpiry <= 7 ? 'var(--color-warning)' : 'var(--color-data-1)'}"></div>
										<span>{submission.name}</span>
									</div>
									<span class="submission-expiry" class:soon={submission.daysUntilExpiry <= 7}>
										{submission.daysUntilExpiry}d left
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if submissionData().nextExpiryDate && submissionData().isAtLimit && !submissionData().isWhitelisted}
					<div class="next-slot">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<polyline points="12 6 12 12 16 14" />
						</svg>
						Next slot: {formatDate(submissionData().nextExpiryDate)} ({displayedTimeUntilSlot || formatTimeUntil(submissionData().timeUntilNextSlot)})
					</div>
				{/if}

				<div class="tooltip-footer">
					<span class="data-source">
						Data: {submissionData().dataSource === 'external' ? 'Server' : 'Local'}
					</span>
					<button type="button" class="refresh-link" onclick={handleRefresh}>
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="23 4 23 10 17 10" />
							<polyline points="1 20 1 14 7 14" />
							<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
						</svg>
						Refresh
					</button>
				</div>
			</div>
		{/if}
	</div>
{:else}
	<div class="card-wrapper" class:warning-card={submissionData().warningLevel === 'caution'} class:critical-card={submissionData().isAtLimit && !submissionData().isWhitelisted}>
	<Card>
		<CardHeader>
			<div class="card-header-content">
				<CardTitle>Submission Status</CardTitle>
				<div class="header-badges">
					{#if submissionData().isDevMode}
						<Badge variant="default">DEV</Badge>
					{/if}
					<Badge variant={getBadgeVariant()}>
						{getStatusText()}
					</Badge>
				</div>
			</div>
		</CardHeader>
		<CardContent>
			{#if submissionData().isLoading}
				<div class="loading-state">
					<div class="skeleton-grid">
						<div class="skeleton-item"></div>
						<div class="skeleton-item"></div>
						<div class="skeleton-item"></div>
						<div class="skeleton-item"></div>
					</div>
				</div>
			{:else}
				{#if submissionData().hasError}
					<div class="error-banner-full">
						<div class="error-content">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10" />
								<line x1="12" y1="8" x2="12" y2="12" />
								<line x1="12" y1="16" x2="12.01" y2="16" />
							</svg>
							<span>{submissionData().message || 'Server unavailable - using local data'}</span>
						</div>
						<Button variant="outline" size="sm" onclick={handleRefresh}>Retry</Button>
					</div>
				{/if}

				{#if submissionData().isWhitelisted}
					<div class="whitelist-banner-full">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
							<polyline points="22 4 12 14.01 9 11.01" />
						</svg>
						<span>Your account is whitelisted - no submission limits apply</span>
					</div>
				{/if}

				{#if submissionData().warningLevel === 'caution' && !submissionData().isWhitelisted}
					<div class="warning-banner">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
							<line x1="12" y1="9" x2="12" y2="13" />
							<line x1="12" y1="17" x2="12.01" y2="17" />
						</svg>
						<span>Approaching submission limit - {submissionData().remainingSubmissions} slots remaining</span>
					</div>
				{/if}

				<div class="status-grid">
					<div class="status-item">
						<span class="status-label">Published Templates</span>
						<span class="status-value">{submissionData().publishedCount}</span>
					</div>
					<div class="status-item">
						<span class="status-label">This Month</span>
						<span class="status-value" class:warning={submissionData().warningLevel === 'caution'} class:critical={submissionData().isAtLimit}>
							{submissionData().assetsSubmitted30}/{SUBMISSION_LIMIT}
						</span>
					</div>
					<div class="status-item">
						<span class="status-label">Total Submitted</span>
						<span class="status-value">{submissionData().totalSubmitted}</span>
					</div>
					<div class="status-item">
						<span class="status-label">Remaining</span>
						<span class="status-value" class:warning={submissionData().warningLevel === 'caution'} class:critical={submissionData().isAtLimit}>
							{submissionData().isWhitelisted ? '∞' : submissionData().remainingSubmissions}
						</span>
					</div>
				</div>

				{#if submissionData().submissions.length > 0}
					<div class="active-submissions">
						<h4>Active Submissions (30-day window)</h4>
						<div class="submissions-full-list">
							{#each submissionData().submissions as submission}
								<div class="submission-row">
									<div class="submission-name-full">
										<div class="submission-dot" style="background: {submission.daysUntilExpiry <= 7 ? 'var(--color-warning)' : 'var(--color-data-1)'}"></div>
										<span>{submission.name}</span>
									</div>
									<div class="submission-meta">
										<span class="submission-expiry-full" class:soon={submission.daysUntilExpiry <= 7}>
											{submission.daysUntilExpiry}d until expiry
										</span>
										<span class="submission-date">
											exp. {formatDate(submission.expiryDate)}
										</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if submissionData().nextExpiryDate && submissionData().isAtLimit && !submissionData().isWhitelisted}
					<div class="next-slot-full">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<polyline points="12 6 12 12 16 14" />
						</svg>
						<div class="next-slot-info">
							<span class="next-slot-label">Next slot available</span>
							<span class="next-slot-date">{formatDate(submissionData().nextExpiryDate)}</span>
							<span class="next-slot-countdown">({displayedTimeUntilSlot || formatTimeUntil(submissionData().timeUntilNextSlot)})</span>
						</div>
					</div>
				{/if}

				<div class="card-footer">
					<span class="data-source-full">
						{submissionData().dataSource === 'external' ? 'Synced with server' : 'Local calculation'}
						{#if submissionData().isDevMode}
							(Dev mode)
						{/if}
					</span>
					<button type="button" class="refresh-button" onclick={handleRefresh}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="23 4 23 10 17 10" />
							<polyline points="1 20 1 14 7 14" />
							<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
						</svg>
						Refresh
					</button>
				</div>
			{/if}
		</CardContent>
	</Card>
	</div>
{/if}

<style>
	.card-wrapper {
		border-radius: var(--radius-lg);
	}

	.card-wrapper.warning-card :global(.card) {
		border-color: var(--color-warning-border);
	}

	.card-wrapper.critical-card :global(.card) {
		border-color: var(--color-error-border);
	}

	.compact-tracker {
		position: relative;
	}

	.tracker-button {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.loading-pulse {
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	.whitelist-icon {
		margin-right: 0.25rem;
	}

	.next-date {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.dev-indicator {
		font-size: var(--text-caption);
		padding: 0.125rem 0.375rem;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		color: var(--color-fg-muted);
		font-weight: var(--font-medium);
	}

	.tooltip-overlay {
		position: fixed;
		inset: 0;
		z-index: 49;
	}

	.tooltip-content {
		position: absolute;
		top: 100%;
		right: 0;
		z-index: 50;
		width: 20rem;
		margin-top: var(--space-xs);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
	}

	.tooltip-content.warning {
		border-color: var(--color-warning-border);
	}

	.tooltip-content.critical {
		border-color: var(--color-error-border);
	}

	.tooltip-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-sm);
	}

	.tooltip-header h4 {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.dev-mode-banner,
	.error-banner,
	.whitelist-banner {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-caption);
		padding: var(--space-xs);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-sm);
	}

	.dev-mode-banner {
		background: var(--color-info-muted);
		color: var(--color-info);
	}

	.error-banner {
		background: var(--color-error-muted);
		color: var(--color-error);
		flex-wrap: wrap;
	}

	.whitelist-banner {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.retry-button {
		background: none;
		border: none;
		color: inherit;
		text-decoration: underline;
		cursor: pointer;
		font-size: var(--text-caption);
		margin-left: auto;
	}

	.tooltip-stats {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.stat-row {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.stat-value {
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.stat-value.warning {
		color: var(--color-warning);
	}

	.stat-value.critical {
		color: var(--color-error);
	}

	.submissions-list {
		margin-bottom: var(--space-sm);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.submissions-list h5 {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-xs);
	}

	.submissions-scroll {
		max-height: 8rem;
		overflow-y: auto;
	}

	.submission-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.25rem 0;
	}

	.submission-name {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		max-width: 9rem;
	}

	.submission-name span {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.submission-dot {
		width: 0.375rem;
		height: 0.375rem;
		background: var(--color-data-1);
		border-radius: 50%;
		flex-shrink: 0;
	}

	.submission-expiry {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.submission-expiry.soon {
		color: var(--color-warning);
		font-weight: var(--font-medium);
	}

	.next-slot {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.tooltip-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: var(--space-xs);
		border-top: 1px solid var(--color-border-default);
	}

	.data-source {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.refresh-link {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		background: none;
		border: none;
		color: var(--color-fg-secondary);
		font-size: var(--text-caption);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: var(--radius-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.refresh-link:hover {
		color: var(--color-fg-primary);
	}

	/* Full variant styles */
	.card-header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}

	.header-badges {
		display: flex;
		gap: var(--space-xs);
	}

	.loading-state {
		padding: var(--space-sm);
	}

	.skeleton-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	.skeleton-item {
		height: 3rem;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		animation: pulse 1.5s ease-in-out infinite;
	}

	.error-banner-full,
	.whitelist-banner-full,
	.warning-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-md);
	}

	.error-banner-full {
		background: var(--color-error-muted);
	}

	.error-content {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-error);
		font-size: var(--text-body-sm);
	}

	.whitelist-banner-full {
		background: var(--color-success-muted);
		color: var(--color-success);
		font-size: var(--text-body-sm);
	}

	.whitelist-banner-full svg {
		flex-shrink: 0;
	}

	.warning-banner {
		background: var(--color-warning-muted);
		color: var(--color-warning);
		font-size: var(--text-body-sm);
	}

	.warning-banner svg {
		flex-shrink: 0;
	}

	.status-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.status-item {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.status-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.status-value {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.status-value.warning {
		color: var(--color-warning);
	}

	.status-value.critical {
		color: var(--color-error);
	}

	.active-submissions {
		margin-bottom: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.active-submissions h4 {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-sm);
	}

	.submissions-full-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.submission-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.submission-name-full {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.submission-name-full span {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.submission-meta {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.submission-expiry-full {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.submission-expiry-full.soon {
		color: var(--color-warning);
		font-weight: var(--font-medium);
	}

	.submission-date {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.next-slot-full {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-md);
	}

	.next-slot-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.next-slot-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.next-slot-date {
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.next-slot-countdown {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}

	.card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.data-source-full {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.refresh-button {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		background: none;
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
		font-size: var(--text-caption);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.refresh-button:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}
</style>
