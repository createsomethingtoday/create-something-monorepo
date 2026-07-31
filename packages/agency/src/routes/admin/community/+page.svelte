<script lang="ts">
	import { SEO, Card } from '@create-something/canon';
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	
	let { data, form }: { data: PageData; form: ActionData } = $props();
	
	const platformColors: Record<string, string> = {
		linkedin: '#0A66C2',
		twitter: '#1DA1F2',
		github: '#333',
		hackernews: '#FF6600',
		reddit: '#FF4500'
	};
	
	const urgencyColors: Record<string, string> = {
		critical: 'var(--color-performance-error)',
		high: 'var(--color-performance-warning)',
		medium: 'var(--color-performance-info)',
		low: 'var(--color-performance-fg-muted)'
	};
	
	const leadColors: Record<string, string> = {
		hot: 'var(--color-performance-error)',
		warm: 'var(--color-performance-warning)',
		cold: 'var(--color-performance-info)',
		unknown: 'var(--color-performance-fg-muted)',
		client: 'var(--color-performance-success)'
	};
	
	function formatTime(iso: string | null): string {
		if (!iso) return 'Never';
		const date = new Date(iso);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const hours = Math.floor(diff / (1000 * 60 * 60));
		const days = Math.floor(hours / 24);
		
		if (hours < 1) return 'Just now';
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return date.toLocaleDateString();
	}
	
	function truncate(text: string, length: number): string {
		if (text.length <= length) return text;
		return text.slice(0, length) + '...';
	}

	const actionReceipts: Record<string, string> = {
		approved: 'Draft approved for the response queue. Nothing was published.',
		rejected: 'Draft rejected and its source signal dismissed.',
		dismissed: 'Signal dismissed from the review queue.',
		flagged: 'Signal marked reviewed for manual follow-up.'
	};
</script>

<SEO
	title="Admin - Community"
	description="Administrative dashboard"
	propertyName="agency"
	noindex={true}
/>

<main class="dashboard">
	<header class="dashboard-header">
		<div class="header-content">
			<h1>Review community signals</h1>
			<p class="subtitle">Review new signals and draft responses. These decisions do not publish anything.</p>
		</div>
		{#if data.available}
		<div class="header-stats">
			<div class="stat">
				<span class="stat-value">{data.stats.new_signals}</span>
				<span class="stat-label">New Signals</span>
			</div>
			<div class="stat">
				<span class="stat-value">{data.stats.pending_responses}</span>
				<span class="stat-label">Pending</span>
			</div>
			<div class="stat">
				<span class="stat-value">{data.stats.hot_leads}</span>
				<span class="stat-label">Hot Leads</span>
			</div>
			<div class="stat">
				<span class="stat-value">{data.stats.responses_this_week}</span>
				<span class="stat-label">This Week</span>
			</div>
		</div>
		{/if}
	</header>

	{#if !data.available}
		<div class="toast" role="alert">
			<p>Community data is unavailable. Stop: do not review or approve responses until it loads.</p>
			<a href="/admin/community">Try again</a>
		</div>
	{:else}
	{#if form?.success}
		<div class="toast success" role="status">
			{actionReceipts[form.action] ?? 'Decision recorded.'} Record {form.id}.
		</div>
	{:else if form?.error}
		<div class="toast" role="alert">
			{form.error} The record remains in the queue. Try again.
		</div>
	{/if}

	<div class="dashboard-grid">
		<!-- Response Queue -->
		<Card variant="glass" radius="md" padding="lg" class="glass-emphasis col-span-2">
			<h2 class="panel-title">Response Queue</h2>
			<p class="panel-subtitle">Drafted by an agent. Approve or edit.</p>
			
			{#if data.queue.length === 0}
				<div class="empty-state">
					<p>No pending responses</p>
				</div>
			{:else}
				<div class="queue-list">
					{#each data.queue as item}
							<div class="queue-item">
								<div class="queue-header">
									<span class="platform-badge" style="background: {platformColors[item.platform] || '#666'}">
										{item.platform}
									</span>
									<span class="action-type">{item.action_type}</span>
									<span class="priority">P{item.priority}</span>
								</div>
								
								{#if item.signal_content}
									<div class="signal-context">
										<span class="signal-author">{item.signal_author || 'Unknown'}</span>
										<p class="signal-preview">{truncate(item.signal_content, 100)}</p>
									</div>
								{/if}
								
								<div class="draft-content">
									<textarea 
										name="edited_content"
										form={`approve-${item.id}`}
										class="draft-textarea"
										value={item.draft_content}
									></textarea>
								</div>
								
								{#if item.draft_reasoning}
									<p class="reasoning">{item.draft_reasoning}</p>
								{/if}
								
								<div class="queue-actions">
									<form id={`approve-${item.id}`} method="POST" action="?/approve" use:enhance>
										<input type="hidden" name="id" value={item.id} />
										<button type="submit" class="btn btn-approve">Approve</button>
									</form>
									
									<form method="POST" action="?/reject" use:enhance>
										<input type="hidden" name="id" value={item.id} />
										<button type="submit" class="btn btn-reject">Reject</button>
									</form>
									
									{#if item.target_url}
										<a href={item.target_url} target="_blank" class="btn btn-link">View</a>
									{/if}
								</div>
							</div>
					{/each}
				</div>
			{/if}
		</Card>

		<!-- Signals -->
		<Card variant="glass" radius="md" padding="lg" class="glass-emphasis">
			<h2 class="panel-title">Signals</h2>
			<p class="panel-subtitle">Mentions, questions, opportunities</p>
			
			{#if data.signals.length === 0}
				<div class="empty-state">
					<p>No new signals</p>
				</div>
			{:else}
				<div class="signals-list">
					{#each data.signals as signal}
							<div class="signal-item" style="--urgency-color: {urgencyColors[signal.urgency]}">
								<div class="signal-header">
									<span class="platform-badge" style="background: {platformColors[signal.platform] || '#666'}">
										{signal.platform}
									</span>
									<span class="signal-type">{signal.signal_type}</span>
									<span class="urgency-badge">{signal.urgency}</span>
									<span class="time">{formatTime(signal.detected_at)}</span>
								</div>
								
								<div class="signal-author-info">
									<span class="author-name">{signal.author_name || signal.author_handle || 'Unknown'}</span>
									{#if signal.author_followers}
										<span class="followers">{signal.author_followers.toLocaleString()} followers</span>
									{/if}
								</div>
								
								<p class="signal-content">{truncate(signal.content, 200)}</p>
								
								<div class="signal-actions">
									<form method="POST" action="?/flag" use:enhance>
										<input type="hidden" name="id" value={signal.id} />
										<button type="submit" class="btn btn-flag">Mark for follow-up</button>
									</form>
									
									<form method="POST" action="?/dismiss" use:enhance>
										<input type="hidden" name="id" value={signal.id} />
										<button type="submit" class="btn btn-dismiss">Dismiss</button>
									</form>
									
									{#if signal.source_url}
										<a href={signal.source_url} target="_blank" class="btn btn-link">View</a>
									{/if}
								</div>
							</div>
					{/each}
				</div>
			{/if}
		</Card>

		<!-- Relationships -->
		<Card variant="glass" radius="md" padding="lg" class="glass-emphasis">
			<h2 class="panel-title">Warming Relationships</h2>
			<p class="panel-subtitle">People engaging with your work</p>
			
			{#if data.relationships.length === 0}
				<div class="empty-state">
					<p>No tracked relationships yet</p>
				</div>
			{:else}
				<div class="relationships-list">
					{#each data.relationships as rel}
						<div class="relationship-item">
							<div class="rel-header">
								<span class="platform-badge" style="background: {platformColors[rel.platform] || '#666'}">
									{rel.platform}
								</span>
								<span class="lead-badge" style="background: {leadColors[rel.lead_potential]}">
									{rel.lead_potential}
								</span>
							</div>
							
							<div class="rel-person">
								<span class="person-name">{rel.person_name || rel.person_handle}</span>
								{#if rel.person_company}
									<span class="person-company">{rel.person_company}</span>
								{/if}
							</div>
							
							<div class="rel-stats">
								<div class="warmth-bar">
									<div class="warmth-fill" style="width: {rel.warmth_score * 100}%"></div>
								</div>
								<span class="interactions">{rel.interactions_count} interactions</span>
								<span class="last-seen">{formatTime(rel.last_interaction)}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card>
	</div>

	<footer class="dashboard-footer">
		<p>Generated {new Date(data.generatedAt).toLocaleTimeString()}</p>
		<a href="/admin/funnel" class="nav-link">Back to Funnel</a>
	</footer>
	{/if}
</main>

<style>
	.dashboard {
		max-width: var(--content-width-xl);
		margin: 0 auto;
		padding: var(--space-performance-lg);
	}
	
	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-performance-xl);
		padding-bottom: var(--space-performance-lg);
	}
	
	.header-content h1 {
		font-size: var(--text-performance-h1);
		margin: 0;
	}
	
	.subtitle {
		color: var(--color-performance-fg-muted);
		margin: var(--space-performance-xs) 0 0;
	}
	
	.header-stats {
		display: flex;
		gap: var(--space-performance-lg);
	}
	
	.stat {
		text-align: center;
	}
	
	.stat-value {
		display: block;
		font-size: var(--text-performance-h2);
		font-weight: 600;
	}
	
	.stat-label {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}
	
	.toast {
		padding: var(--space-performance-sm) var(--space-performance-md);
		border-radius: var(--radius-performance-scale-sm);
		margin-bottom: var(--space-performance-md);
	}
	
	.toast.success {
		background: var(--color-performance-success-bg);
		color: var(--color-performance-success);
	}
	
	.dashboard-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-performance-lg);
	}
	
	
	.panel-title {
		font-size: var(--text-performance-h3);
		margin: 0 0 var(--space-performance-xs);
	}
	
	.panel-subtitle {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-body-sm);
		margin: 0 0 var(--space-performance-md);
	}
	
	.empty-state {
		padding: var(--space-performance-xl);
		text-align: center;
		color: var(--color-performance-fg-muted);
	}
	
	/* Queue Items */
	.queue-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-md);
	}
	
	.queue-item {
		background: var(--color-bg-default);
		border-radius: var(--radius-performance-scale-sm);
		padding: var(--space-performance-md);
	}
	
	.queue-header {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		margin-bottom: var(--space-performance-sm);
	}
	
	.platform-badge {
		padding: 2px 8px;
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-caption);
		color: white;
		text-transform: capitalize;
	}
	
	.action-type {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-secondary);
	}
	
	.priority {
		margin-left: auto;
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}
	
	.signal-context {
		background: var(--color-performance-bg-subtle);
		padding: var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-sm);
		margin-bottom: var(--space-performance-sm);
	}
	
	.signal-author {
		font-weight: 500;
		font-size: var(--text-performance-body-sm);
	}
	
	.signal-preview {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-secondary);
		margin: var(--space-performance-xs) 0 0;
	}
	
	.draft-content {
		margin-bottom: var(--space-performance-sm);
	}
	
	.draft-textarea {
		width: 100%;
		min-height: 80px;
		padding: var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-sm);
		font-family: inherit;
		font-size: var(--text-performance-body-sm);
		resize: vertical;
	}
	
	.reasoning {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		font-style: italic;
		margin: 0 0 var(--space-performance-sm);
	}
	
	.queue-actions {
		display: flex;
		gap: var(--space-performance-sm);
	}
	
	/* Buttons */
	.btn {
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-caption);
		cursor: pointer;
		text-decoration: none;
		display: inline-block;
	}
	
	.btn-approve {
		background: var(--color-performance-success);
		color: white;
		border-color: var(--color-performance-success);
	}
	
	.btn-reject, .btn-dismiss {
		background: transparent;
		color: var(--color-performance-fg-secondary);
	}
	
	.btn-flag {
		background: var(--color-performance-info);
		color: white;
		border-color: var(--color-performance-info);
	}
	
	.btn-link {
		background: transparent;
		color: var(--color-performance-fg-primary);
	}
	
	/* Signals */
	.signals-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-sm);
		max-height: 500px;
		overflow-y: auto;
	}
	
	.signal-item {
		background: var(--color-bg-default);
		border-left: 3px solid var(--urgency-color);
		border-radius: var(--radius-performance-scale-sm);
		padding: var(--space-performance-sm);
	}
	
	.signal-header {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
		margin-bottom: var(--space-performance-xs);
		flex-wrap: wrap;
	}
	
	.signal-type {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-secondary);
	}
	
	.urgency-badge {
		font-size: var(--text-performance-caption);
		padding: 1px 6px;
		border-radius: var(--radius-performance-scale-sm);
		background: var(--urgency-color);
		color: white;
	}
	
	.time {
		margin-left: auto;
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}
	
	.signal-author-info {
		margin-bottom: var(--space-performance-xs);
	}
	
	.author-name {
		font-weight: 500;
		font-size: var(--text-performance-body-sm);
	}
	
	.followers {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		margin-left: var(--space-performance-xs);
	}
	
	.signal-content {
		font-size: var(--text-performance-body-sm);
		margin: 0 0 var(--space-performance-sm);
		color: var(--color-performance-fg-secondary);
	}
	
	.signal-actions {
		display: flex;
		gap: var(--space-performance-xs);
	}
	
	/* Relationships */
	.relationships-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-sm);
	}
	
	.relationship-item {
		background: var(--color-bg-default);
		border-radius: var(--radius-performance-scale-sm);
		padding: var(--space-performance-sm);
	}
	
	.rel-header {
		display: flex;
		gap: var(--space-performance-xs);
		margin-bottom: var(--space-performance-xs);
	}
	
	.lead-badge {
		padding: 1px 6px;
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-caption);
		color: white;
		text-transform: capitalize;
	}
	
	.rel-person {
		margin-bottom: var(--space-performance-xs);
	}
	
	.person-name {
		font-weight: 500;
	}
	
	.person-company {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		margin-left: var(--space-performance-xs);
	}
	
	.rel-stats {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
	}
	
	.warmth-bar {
		flex: 1;
		height: 4px;
		background: var(--color-performance-bg-subtle);
		border-radius: 2px;
		overflow: hidden;
	}
	
	.warmth-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-performance-info), var(--color-performance-warning), var(--color-performance-error));
	}
	
	.interactions, .last-seen {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}
	
	/* Footer */
	.dashboard-footer {
		margin-top: var(--space-performance-xl);
		padding-top: var(--space-performance-md);
		display: flex;
		justify-content: space-between;
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-caption);
	}
	
	.nav-link {
		color: var(--color-performance-fg-primary);
	}
	
	@media (max-width: 900px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
		}
		
		.dashboard-header {
			flex-direction: column;
			gap: var(--space-performance-md);
		}
		
		.header-stats {
			width: 100%;
			justify-content: space-between;
		}
	}
</style>
