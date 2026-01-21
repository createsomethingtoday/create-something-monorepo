<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const statusColors: Record<string, string> = {
		complete: 'var(--color-success)',
		in_progress: 'var(--color-info)',
		pending: 'var(--color-fg-muted)',
		missed: 'var(--color-error)',
		posted: 'var(--color-success)',
		failed: 'var(--color-error)'
	};

	const dayLabels: Record<string, string> = {
		monday: 'Mon',
		tuesday: 'Tue',
		wednesday: 'Wed',
		thursday: 'Thu',
		friday: 'Fri'
	};

	// Type-safe accessors
	const rhythm = data.rhythm as Record<string, { focus: string; description: string; status: string; date: string; post?: { id: string; preview: string } }> | undefined;
	const stats = data.stats as Record<string, number> | undefined;
</script>

<svelte:head>
	<title>Social Calendar | CREATE SOMETHING</title>
</svelte:head>

<main class="dashboard">
	<header class="header">
		<h1>Social Calendar</h1>
		<p class="subtitle">AI-native content scheduling with full observability</p>
	</header>

	<!-- Token Status Banner -->
	{#if data.tokenStatus}
		<div class="banner" class:warning={data.tokenStatus.warning} class:disconnected={!data.tokenStatus.connected}>
			{#if !data.tokenStatus.connected}
				<span class="banner-icon">⚠</span>
				<span>LinkedIn disconnected. <a href="https://createsomething.io/api/linkedin/auth">Reconnect</a></span>
			{:else if data.tokenStatus.warning}
				<span class="banner-icon">⚠</span>
				<span>{data.tokenStatus.warning}</span>
			{:else}
				<span class="banner-icon">✓</span>
				<span>LinkedIn connected ({data.tokenStatus.daysRemaining} days remaining)</span>
			{/if}
		</div>
	{/if}

	<!-- Weekly Rhythm -->
	<section class="section">
		<h2 class="section-title">Weekly Rhythm</h2>
		<p class="section-subtitle">Clay Playbook adherence for this week</p>

		<div class="rhythm-grid">
			{#each ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as day}
				{@const dayData = rhythm?.[day]}
				<div
					class="rhythm-day"
					class:today={data.currentDay === day}
					style="--status-color: {statusColors[dayData?.status || 'pending']}"
				>
					<div class="day-header">
						<span class="day-label">{dayLabels[day]}</span>
						<span class="day-status">{dayData?.status || 'pending'}</span>
					</div>
					<div class="day-focus">{dayData?.focus || ''}</div>
					{#if dayData?.post}
						<div class="day-content">{dayData.post.preview}</div>
					{:else}
						<div class="day-empty">No content</div>
					{/if}
				</div>
			{/each}
		</div>

		{#if data.gaps && data.gaps.length > 0}
			<div class="gaps-alert">
				<strong>{data.gaps.length} gap{data.gaps.length > 1 ? 's' : ''}</strong> in schedule.
				Next slot: <strong>{data.nextSlot?.formatted}</strong>
			</div>
		{/if}
	</section>

	<!-- Today's Focus -->
	<section class="section">
		<h2 class="section-title">Today's Focus</h2>
		<div class="focus-card">
			<div class="focus-day">{data.currentDay}</div>
			<div class="focus-title">{data.todaysFocus}</div>
			<div class="focus-description">
				{rhythm?.[data.currentDay || '']?.description || 'No focus defined'}
			</div>
		</div>
	</section>

	<!-- Stats -->
	<section class="section">
		<h2 class="section-title">Statistics</h2>
		<div class="stats-grid">
			<div class="stat-card">
				<span class="stat-value">{stats?.pending || 0}</span>
				<span class="stat-label">Pending</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">{stats?.posted || 0}</span>
				<span class="stat-label">Posted</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">{stats?.failed || 0}</span>
				<span class="stat-label">Failed</span>
			</div>
		</div>
	</section>

	<!-- Upcoming Posts -->
	<section class="section">
		<h2 class="section-title">Schedule</h2>
		{#if data.posts && data.posts.length > 0}
			<div class="posts-list">
				{#each data.posts as post}
					<div class="post-card" class:past={post.isPast}>
						<div class="post-time">{post.scheduledForFormatted}</div>
						<div class="post-content">
							<div class="post-preview">{post.preview}</div>
							{#if post.campaign}
								<span class="post-campaign">{post.campaign}</span>
							{/if}
						</div>
						<div class="post-status" style="--status-color: {statusColors[post.status]}">
							{post.status}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="empty-state">No posts scheduled. Use MCP tools or the API to schedule content.</p>
		{/if}
	</section>

	<!-- Quick Actions -->
	<section class="section">
		<h2 class="section-title">API Endpoints</h2>
		<div class="api-links">
			<a href="/api/social/status" class="api-link" target="_blank">/api/social/status</a>
			<a href="/api/social/gaps" class="api-link" target="_blank">/api/social/gaps</a>
			<a href="/api/social/rhythm" class="api-link" target="_blank">/api/social/rhythm</a>
			<a href="/api/social/suggest" class="api-link" target="_blank">/api/social/suggest</a>
		</div>
	</section>

	<!-- MCP Tools Reference -->
	<section class="section">
		<h2 class="section-title">MCP Tools</h2>
		<div class="tools-grid">
			<div class="tool-card">
				<code>social_status</code>
				<span>Check schedule state</span>
			</div>
			<div class="tool-card">
				<code>social_gaps</code>
				<span>Find posting gaps</span>
			</div>
			<div class="tool-card">
				<code>social_schedule</code>
				<span>Schedule content</span>
			</div>
			<div class="tool-card">
				<code>social_suggest</code>
				<span>Get suggestions</span>
			</div>
			<div class="tool-card">
				<code>social_rhythm</code>
				<span>Check rhythm</span>
			</div>
			<div class="tool-card">
				<code>social_cancel</code>
				<span>Cancel a post</span>
			</div>
		</div>
	</section>
</main>

<style>
	.dashboard {
		max-width: 1000px;
		margin: 0 auto;
		padding: var(--space-lg);
	}

	.header {
		margin-bottom: var(--space-xl);
	}

	.header h1 {
		font-size: var(--text-h1);
		margin: 0 0 var(--space-xs) 0;
	}

	.subtitle {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.banner {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-lg);
		font-size: var(--text-body-sm);
	}

	.banner.warning {
		background: rgba(251, 191, 36, 0.1);
		border-color: var(--color-warning);
	}

	.banner.disconnected {
		background: rgba(239, 68, 68, 0.1);
		border-color: var(--color-error);
	}

	.banner a {
		color: var(--color-info);
	}

	.section {
		margin-bottom: var(--space-xl);
	}

	.section-title {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-xs) 0;
	}

	.section-subtitle {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		margin: 0 0 var(--space-md) 0;
	}

	/* Rhythm Grid */
	.rhythm-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: var(--space-sm);
	}

	.rhythm-day {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
		border-top: 3px solid var(--status-color, var(--color-fg-muted));
	}

	.rhythm-day.today {
		background: var(--color-bg-surface);
		border-color: var(--color-border-emphasis);
	}

	.day-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-xs);
	}

	.day-label {
		font-weight: 600;
		font-size: var(--text-body-sm);
	}

	.day-status {
		font-size: var(--text-caption);
		color: var(--status-color);
		text-transform: capitalize;
	}

	.day-focus {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.day-content {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		line-height: 1.4;
	}

	.day-empty {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-style: italic;
	}

	.gaps-alert {
		margin-top: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: rgba(251, 191, 36, 0.1);
		border: 1px solid var(--color-warning);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
	}

	/* Focus Card */
	.focus-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-md);
		padding: var(--space-md);
	}

	.focus-day {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.focus-title {
		font-size: var(--text-h3);
		margin: var(--space-xs) 0;
	}

	.focus-description {
		color: var(--color-fg-secondary);
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-md);
	}

	.stat-card {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-md);
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
		text-transform: uppercase;
	}

	/* Posts List */
	.posts-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.post-card {
		display: grid;
		grid-template-columns: 150px 1fr auto;
		gap: var(--space-md);
		align-items: center;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.post-card.past {
		opacity: 0.6;
	}

	.post-time {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.post-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.post-preview {
		font-size: var(--text-body-sm);
	}

	.post-campaign {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.post-status {
		font-size: var(--text-caption);
		color: var(--status-color);
		text-transform: capitalize;
	}

	.empty-state {
		color: var(--color-fg-muted);
		font-style: italic;
		padding: var(--space-lg);
		text-align: center;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
	}

	/* API Links */
	.api-links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.api-link {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-family: monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		text-decoration: none;
	}

	.api-link:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	/* Tools Grid */
	.tools-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: var(--space-sm);
	}

	.tool-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.tool-card code {
		font-size: var(--text-body-sm);
		color: var(--color-info);
	}

	.tool-card span {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	@media (max-width: 768px) {
		.rhythm-grid {
			grid-template-columns: 1fr;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.post-card {
			grid-template-columns: 1fr;
		}
	}
</style>
