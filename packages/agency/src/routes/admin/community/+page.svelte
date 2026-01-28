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
		critical: 'var(--color-error)',
		high: 'var(--color-warning)',
		medium: 'var(--color-info)',
		low: 'var(--color-fg-muted)'
	};
	
	const leadColors: Record<string, string> = {
		hot: 'var(--color-error)',
		warm: 'var(--color-warning)',
		cold: 'var(--color-info)',
		unknown: 'var(--color-fg-muted)',
		client: 'var(--color-success)'
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
	
	// Track dismissed items for optimistic UI
	let dismissedSignals = $state<Set<string>>(new Set());
	let processedQueue = $state<Set<string>>(new Set());
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
			<h1>Community</h1>
			<p class="subtitle">Your 5-minute review. Then deep work.</p>
		</div>
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
	</header>

	{#if form?.success}
		<div class="toast success">
			Action completed: {form.action}
		</div>
	{/if}

	<div class="dashboard-grid">
		<!-- Response Queue -->
		<Card variant="glass" radius="md" padding="lg" class="glass-emphasis col-span-2">
			<h2 class="panel-title">Response Queue</h2>
			<p class="panel-subtitle">Drafted by AI. Approve or edit.</p>
			
			{#if data.queue.length === 0}
				<div class="empty-state">
					<p>No pending responses</p>
				</div>
			{:else}
				<div class="queue-list">
					{#each data.queue as item}
						{#if !processedQueue.has(item.id)}
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
										name="draft" 
										class="draft-textarea"
										value={item.draft_content}
									></textarea>
								</div>
								
								{#if item.draft_reasoning}
									<p class="reasoning">{item.draft_reasoning}</p>
								{/if}
								
								<div class="queue-actions">
									<form method="POST" action="?/approve" use:enhance={() => {
										processedQueue.add(item.id);
										processedQueue = processedQueue;
										return async ({ update }) => {
											await update();
										};
									}}>
										<input type="hidden" name="id" value={item.id} />
										<button type="submit" class="btn btn-approve">Approve</button>
									</form>
									
									<form method="POST" action="?/reject" use:enhance={() => {
										processedQueue.add(item.id);
										processedQueue = processedQueue;
										return async ({ update }) => {
											await update();
										};
									}}>
										<input type="hidden" name="id" value={item.id} />
										<button type="submit" class="btn btn-reject">Reject</button>
									</form>
									
									{#if item.target_url}
										<a href={item.target_url} target="_blank" class="btn btn-link">View</a>
									{/if}
								</div>
							</div>
						{/if}
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
						{#if !dismissedSignals.has(signal.id)}
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
									<form method="POST" action="?/flag" use:enhance={() => {
										dismissedSignals.add(signal.id);
										dismissedSignals = dismissedSignals;
										return async ({ update }) => {
											await update();
										};
									}}>
										<input type="hidden" name="id" value={signal.id} />
										<button type="submit" class="btn btn-flag">Flag for Response</button>
									</form>
									
									<form method="POST" action="?/dismiss" use:enhance={() => {
										dismissedSignals.add(signal.id);
										dismissedSignals = dismissedSignals;
										return async ({ update }) => {
											await update();
										};
									}}>
										<input type="hidden" name="id" value={signal.id} />
										<button type="submit" class="btn btn-dismiss">Dismiss</button>
									</form>
									
									{#if signal.source_url}
										<a href={signal.source_url} target="_blank" class="btn btn-link">View</a>
									{/if}
								</div>
							</div>
						{/if}
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
</main>

<style>
	.dashboard {
		max-width: 1400px;
		margin: 0 auto;
		padding: var(--space-lg);
	}
	
	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-xl);
		padding-bottom: var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}
	
	.header-content h1 {
		font-size: var(--text-h1);
		margin: 0;
	}
	
	.subtitle {
		color: var(--color-fg-muted);
		margin: var(--space-xs) 0 0;
	}
	
	.header-stats {
		display: flex;
		gap: var(--space-lg);
	}
	
	.stat {
		text-align: center;
	}
	
	.stat-value {
		display: block;
		font-size: var(--text-h2);
		font-weight: 600;
	}
	
	.stat-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}
	
	.toast {
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-md);
	}
	
	.toast.success {
		background: var(--color-success-bg);
		color: var(--color-success);
	}
	
	.dashboard-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-lg);
	}
	
	
	.panel-title {
		font-size: var(--text-h3);
		margin: 0 0 var(--space-xs);
	}
	
	.panel-subtitle {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		margin: 0 0 var(--space-md);
	}
	
	.empty-state {
		padding: var(--space-xl);
		text-align: center;
		color: var(--color-fg-muted);
	}
	
	/* Queue Items */
	.queue-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}
	
	.queue-item {
		background: var(--color-bg-default);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		padding: var(--space-md);
	}
	
	.queue-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
	}
	
	.platform-badge {
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		color: white;
		text-transform: capitalize;
	}
	
	.action-type {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}
	
	.priority {
		margin-left: auto;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}
	
	.signal-context {
		background: var(--color-bg-subtle);
		padding: var(--space-sm);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-sm);
	}
	
	.signal-author {
		font-weight: 500;
		font-size: var(--text-body-sm);
	}
	
	.signal-preview {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		margin: var(--space-xs) 0 0;
	}
	
	.draft-content {
		margin-bottom: var(--space-sm);
	}
	
	.draft-textarea {
		width: 100%;
		min-height: 80px;
		padding: var(--space-sm);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-family: inherit;
		font-size: var(--text-body-sm);
		resize: vertical;
	}
	
	.reasoning {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-style: italic;
		margin: 0 0 var(--space-sm);
	}
	
	.queue-actions {
		display: flex;
		gap: var(--space-sm);
	}
	
	/* Buttons */
	.btn {
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		border: 1px solid var(--color-border-default);
		cursor: pointer;
		text-decoration: none;
		display: inline-block;
	}
	
	.btn-approve {
		background: var(--color-success);
		color: white;
		border-color: var(--color-success);
	}
	
	.btn-reject, .btn-dismiss {
		background: transparent;
		color: var(--color-fg-secondary);
	}
	
	.btn-flag {
		background: var(--color-info);
		color: white;
		border-color: var(--color-info);
	}
	
	.btn-link {
		background: transparent;
		color: var(--color-fg-primary);
	}
	
	/* Signals */
	.signals-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		max-height: 500px;
		overflow-y: auto;
	}
	
	.signal-item {
		background: var(--color-bg-default);
		border: 1px solid var(--color-border-default);
		border-left: 3px solid var(--urgency-color);
		border-radius: var(--radius-sm);
		padding: var(--space-sm);
	}
	
	.signal-header {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-xs);
		flex-wrap: wrap;
	}
	
	.signal-type {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}
	
	.urgency-badge {
		font-size: var(--text-caption);
		padding: 1px 6px;
		border-radius: var(--radius-sm);
		background: var(--urgency-color);
		color: white;
	}
	
	.time {
		margin-left: auto;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}
	
	.signal-author-info {
		margin-bottom: var(--space-xs);
	}
	
	.author-name {
		font-weight: 500;
		font-size: var(--text-body-sm);
	}
	
	.followers {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-left: var(--space-xs);
	}
	
	.signal-content {
		font-size: var(--text-body-sm);
		margin: 0 0 var(--space-sm);
		color: var(--color-fg-secondary);
	}
	
	.signal-actions {
		display: flex;
		gap: var(--space-xs);
	}
	
	/* Relationships */
	.relationships-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}
	
	.relationship-item {
		background: var(--color-bg-default);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		padding: var(--space-sm);
	}
	
	.rel-header {
		display: flex;
		gap: var(--space-xs);
		margin-bottom: var(--space-xs);
	}
	
	.lead-badge {
		padding: 1px 6px;
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		color: white;
		text-transform: capitalize;
	}
	
	.rel-person {
		margin-bottom: var(--space-xs);
	}
	
	.person-name {
		font-weight: 500;
	}
	
	.person-company {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-left: var(--space-xs);
	}
	
	.rel-stats {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}
	
	.warmth-bar {
		flex: 1;
		height: 4px;
		background: var(--color-bg-subtle);
		border-radius: 2px;
		overflow: hidden;
	}
	
	.warmth-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-info), var(--color-warning), var(--color-error));
	}
	
	.interactions, .last-seen {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}
	
	/* Footer */
	.dashboard-footer {
		margin-top: var(--space-xl);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
		display: flex;
		justify-content: space-between;
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
	}
	
	.nav-link {
		color: var(--color-fg-primary);
	}
	
	@media (max-width: 900px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
		}
		
		.dashboard-header {
			flex-direction: column;
			gap: var(--space-md);
		}
		
		.header-stats {
			width: 100%;
			justify-content: space-between;
		}
	}
</style>
