<script lang="ts">
	import { Badge, Card, CardHeader, CardTitle, CardContent, Button } from './ui';
	import type { Asset } from '$lib/server/airtable';
	import { submissionStore } from '$lib/stores/submission';
	import { onMount } from 'svelte';

	interface Props {
		assets: Asset[];
		variant?: 'default' | 'compact';
		userEmail?: string;
	}

	interface Submission {
		id: string;
		name: string;
		submittedDate: Date;
		expiryDate: Date;
		status: string;
	}

	let { assets, variant = 'default', userEmail }: Props = $props();

	let isTooltipOpen = $state(false);
	let storeData = $state<typeof $submissionStore | null>(null);

	// Initialize store with assets and optionally fetch external data
	onMount(() => {
		submissionStore.setAssets(assets);
		if (userEmail) {
			submissionStore.refresh(userEmail);
		}

		// Subscribe to store updates
		const unsubscribe = submissionStore.subscribe((data) => {
			storeData = data;
		});

		return unsubscribe;
	});

	// Update store when assets change
	$effect(() => {
		submissionStore.setAssets(assets);
	});

	// Calculate submissions within the 30-day window (local calculation)
	const submissionData = $derived(() => {
		// Use store data if available and loaded
		if (storeData && !storeData.isLoading) {
			return {
				submissions: storeData.submissions,
				remainingSubmissions: storeData.remainingSubmissions,
				isAtLimit: storeData.isAtLimit,
				nextExpiryDate: storeData.nextExpiryDate,
				publishedCount: storeData.publishedTemplates,
				totalSubmitted: storeData.submittedTemplates,
				assetsSubmitted30: storeData.assetsSubmitted30,
				isWhitelisted: storeData.isWhitelisted,
				isLoading: storeData.isLoading
			};
		}

		// Fallback to local calculation
		const now = new Date();
		const thirtyDaysAgo = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30, 0, 0, 0, 0)
		);

		const submissions: Submission[] = [];

		for (const asset of assets) {
			// Skip delisted assets
			if (asset.status === 'Delisted') continue;
			if (!asset.submittedDate) continue;

			const submissionDate = new Date(asset.submittedDate);
			const submissionDateUTC = new Date(
				Date.UTC(
					submissionDate.getUTCFullYear(),
					submissionDate.getUTCMonth(),
					submissionDate.getUTCDate(),
					submissionDate.getUTCHours(),
					submissionDate.getUTCMinutes(),
					submissionDate.getUTCSeconds()
				)
			);

			// Count all non-delisted submissions within 30 days
			if (submissionDateUTC >= thirtyDaysAgo) {
				submissions.push({
					id: asset.id,
					name: asset.name,
					submittedDate: submissionDateUTC,
					expiryDate: new Date(submissionDateUTC.getTime() + 30 * 24 * 60 * 60 * 1000),
					status: asset.status
				});
			}
		}

		// Sort by submission date ascending so oldest expire first
		submissions.sort((a, b) => a.submittedDate.getTime() - b.submittedDate.getTime());

		const remainingSubmissions = Math.max(0, 6 - submissions.length);
		const isAtLimit = remainingSubmissions <= 0;
		const nextExpiryDate = submissions[0]?.expiryDate || null;

		// Count published templates
		const publishedCount = assets.filter((a) => a.status === 'Published').length;
		const totalSubmitted = assets.filter((a) => a.status !== 'Delisted').length;

		return {
			submissions,
			remainingSubmissions,
			isAtLimit,
			nextExpiryDate,
			publishedCount,
			totalSubmitted,
			assetsSubmitted30: submissions.length,
			isWhitelisted: false,
			isLoading: false
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
</script>

{#if variant === 'compact'}
	<div class="compact-tracker">
		<button type="button" class="tracker-button" onclick={toggleTooltip}>
			<Badge variant={submissionData().isAtLimit ? 'error' : 'success'}>
				{submissionData().assetsSubmitted30}/6 this month
			</Badge>
			{#if submissionData().isAtLimit && submissionData().nextExpiryDate}
				<span class="next-date">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
						<line x1="16" y1="2" x2="16" y2="6" />
						<line x1="8" y1="2" x2="8" y2="6" />
						<line x1="3" y1="10" x2="21" y2="10" />
					</svg>
					Next: {formatDate(submissionData().nextExpiryDate)}
				</span>
			{/if}
		</button>

		{#if isTooltipOpen}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="tooltip-overlay" onclick={() => (isTooltipOpen = false)}></div>
			<div class="tooltip-content">
				<div class="tooltip-header">
					<h4>Submission Status</h4>
					<Badge variant={submissionData().isAtLimit ? 'error' : 'success'}>
						{submissionData().isAtLimit ? 'Limit Reached' : 'Can Submit'}
					</Badge>
				</div>

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
						<span class="stat-value">{submissionData().assetsSubmitted30}/6</span>
					</div>
				</div>

				{#if submissionData().submissions.length > 0}
					<div class="submissions-list">
						<h5>Active Submissions</h5>
						<div class="submissions-scroll">
							{#each submissionData().submissions.slice(0, 6) as submission}
								<div class="submission-item">
									<div class="submission-name">
										<div class="submission-dot"></div>
										<span>{submission.name}</span>
									</div>
									<span class="submission-expiry">exp. {formatDate(submission.expiryDate)}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if submissionData().nextExpiryDate && submissionData().isAtLimit}
					<div class="next-slot">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
							<line x1="16" y1="2" x2="16" y2="6" />
							<line x1="8" y1="2" x2="8" y2="6" />
							<line x1="3" y1="10" x2="21" y2="10" />
						</svg>
						Next slot: {formatDate(submissionData().nextExpiryDate)}
					</div>
				{/if}
			</div>
		{/if}
	</div>
{:else}
	<Card>
		<CardHeader>
			<div class="card-header-content">
				<CardTitle>Submission Status</CardTitle>
				<Badge variant={submissionData().isAtLimit ? 'error' : 'success'}>
					{submissionData().isAtLimit ? 'Limit Reached' : 'Can Submit'}
				</Badge>
			</div>
		</CardHeader>
		<CardContent>
			<div class="status-grid">
				<div class="status-item">
					<span class="status-label">Published Templates</span>
					<span class="status-value">{submissionData().publishedCount}</span>
				</div>
				<div class="status-item">
					<span class="status-label">This Month</span>
					<span class="status-value">{submissionData().assetsSubmitted30}/6</span>
				</div>
				<div class="status-item">
					<span class="status-label">Total Submitted</span>
					<span class="status-value">{submissionData().totalSubmitted}</span>
				</div>
				<div class="status-item">
					<span class="status-label">Remaining</span>
					<span class="status-value">{submissionData().remainingSubmissions}</span>
				</div>
			</div>

			{#if submissionData().submissions.length > 0}
				<div class="active-submissions">
					<h4>Active Submissions</h4>
					<div class="submissions-full-list">
						{#each submissionData().submissions as submission}
							<div class="submission-row">
								<div class="submission-name-full">
									<div class="submission-dot"></div>
									<span>{submission.name}</span>
								</div>
								<span class="submission-expiry-full">Expires {formatDate(submission.expiryDate)}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if submissionData().nextExpiryDate && submissionData().isAtLimit}
				<div class="next-slot-full">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
						<line x1="16" y1="2" x2="16" y2="6" />
						<line x1="8" y1="2" x2="8" y2="6" />
						<line x1="3" y1="10" x2="21" y2="10" />
					</svg>
					<span>Next slot available on {formatDate(submissionData().nextExpiryDate)}</span>
				</div>
			{/if}
		</CardContent>
	</Card>
{/if}

<style>
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

	.next-date {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
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

	.next-slot {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Full variant styles */
	.card-header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
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

	.submission-expiry-full {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.next-slot-full {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}
</style>
