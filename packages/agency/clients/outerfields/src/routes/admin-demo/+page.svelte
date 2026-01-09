<script lang="ts">
	/**
	 * OUTERFIELDS Admin Dashboard Demo
	 *
	 * Analytics dashboard for content creators showing
	 * views, subscribers, revenue, and content management.
	 */
	import { Upload, Eye, Users, CreditCard, TrendingUp, UserPlus, MessageCircle, CheckCircle, Bell, RefreshCw, Pencil, BarChart3, MoreVertical, Info, ArrowRight } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';

	interface Activity {
		type: string;
		message: string;
		user?: string;
		detail?: string;
		time: string;
	}

	interface Upload {
		id: string;
		title: string;
		thumbnail: string;
		status: string;
		views?: string;
		progress?: number;
		uploadedAt: string;
	}

	interface Props {
		data: {
			stats: {
				totalViews: string;
				viewsChange: string;
				subscribers: string;
				subscribersChange: string;
				revenue: string;
				revenueChange: string;
				engagement: string;
				engagementChange: string;
			};
			chartData: {
				labels: string[];
				views: number[];
				engagement: number[];
			};
			recentActivity: Activity[];
			uploads: Upload[];
		};
	}

	let { data }: Props = $props();

	function getStatusClass(status: string): string {
		switch (status) {
			case 'published':
				return 'status-published';
			case 'processing':
				return 'status-processing';
			case 'draft':
				return 'status-draft';
			default:
				return '';
		}
	}

	const activityIconMap: Record<string, ComponentType> = {
		subscription: UserPlus,
		view: Eye,
		comment: MessageCircle,
		upload: CheckCircle,
		default: Bell
	};

	function getActivityIcon(type: string): ComponentType {
		return activityIconMap[type] || activityIconMap.default;
	}
</script>

<svelte:head>
	<title>Dashboard | OUTERFIELDS Admin Demo</title>
</svelte:head>

<div class="dashboard">
	<!-- Header -->
	<header class="dashboard-header">
		<div class="header-left">
			<h1>Dashboard</h1>
			<p class="header-subtitle">Welcome back! Here's what's happening with your content.</p>
		</div>
		<div class="header-actions">
			<button class="btn-upload">
				<Upload size={20} />
				Upload Video
			</button>
		</div>
	</header>

	<!-- Stats Grid -->
	<section class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon views">
				<Eye size={20} />
			</div>
			<div class="stat-content">
				<span class="stat-label">Total Views</span>
				<span class="stat-value">{data.stats.totalViews}</span>
				<span class="stat-change positive">{data.stats.viewsChange} this month</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon subscribers">
				<Users size={20} />
			</div>
			<div class="stat-content">
				<span class="stat-label">Subscribers</span>
				<span class="stat-value">{data.stats.subscribers}</span>
				<span class="stat-change positive">{data.stats.subscribersChange} this month</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon revenue">
				<CreditCard size={20} />
			</div>
			<div class="stat-content">
				<span class="stat-label">Revenue</span>
				<span class="stat-value">{data.stats.revenue}</span>
				<span class="stat-change positive">{data.stats.revenueChange} this month</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon engagement">
				<TrendingUp size={20} />
			</div>
			<div class="stat-content">
				<span class="stat-label">Engagement</span>
				<span class="stat-value">{data.stats.engagement}</span>
				<span class="stat-change positive">{data.stats.engagementChange} this month</span>
			</div>
		</div>
	</section>

	<!-- Main Content -->
	<div class="dashboard-main">
		<!-- Chart Section -->
		<section class="chart-section">
			<div class="section-header">
				<h2>Analytics Overview</h2>
				<div class="chart-controls">
					<button class="chart-btn active">7 Days</button>
					<button class="chart-btn">30 Days</button>
					<button class="chart-btn">90 Days</button>
				</div>
			</div>
			<div class="chart-placeholder">
				<div class="chart-bars">
					{#each data.chartData.views as value, i}
						<div class="chart-bar-wrapper">
							<div
								class="chart-bar"
								style="height: {(value / Math.max(...data.chartData.views)) * 100}%"
							></div>
							<span class="chart-label">{data.chartData.labels[i]}</span>
						</div>
					{/each}
				</div>
				<div class="chart-legend">
					<span class="legend-item">
						<span class="legend-dot views"></span>
						Views
					</span>
					<span class="legend-item">
						<span class="legend-dot engagement"></span>
						Engagement
					</span>
				</div>
			</div>
		</section>

		<!-- Activity Section -->
		<section class="activity-section">
			<div class="section-header">
				<h2>Recent Activity</h2>
				<button type="button" class="view-all-btn">View All</button>
			</div>
			<div class="activity-list">
				{#each data.recentActivity as activity}
					{@const ActivityIcon = getActivityIcon(activity.type)}
					<div class="activity-item">
						<div class="activity-icon" class:subscription={activity.type === 'subscription'}>
							<ActivityIcon size={16} />
						</div>
						<div class="activity-content">
							<span class="activity-message">{activity.message}</span>
							{#if activity.user}
								<span class="activity-detail">{activity.user}</span>
							{/if}
							{#if activity.detail}
								<span class="activity-detail">{activity.detail}</span>
							{/if}
						</div>
						<span class="activity-time">{activity.time}</span>
					</div>
				{/each}
			</div>
		</section>
	</div>

	<!-- Uploads Table -->
	<section class="uploads-section">
		<div class="section-header">
			<h2>Recent Uploads</h2>
			<button type="button" class="view-all-btn">Manage All Videos</button>
		</div>
		<div class="uploads-table-wrapper">
			<table class="uploads-table">
				<thead>
					<tr>
						<th>Video</th>
						<th>Status</th>
						<th>Views</th>
						<th>Uploaded</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.uploads as upload}
						<tr>
							<td class="video-cell">
								<img src={upload.thumbnail} alt={upload.title} class="video-thumb" />
								<span class="video-title">{upload.title}</span>
							</td>
							<td>
								<span class="status-badge {getStatusClass(upload.status)}">
									{#if upload.status === 'processing'}
										<RefreshCw size={14} class="spinning" />
										{upload.progress}%
									{:else}
										{upload.status}
									{/if}
								</span>
							</td>
							<td>{upload.views || '-'}</td>
							<td>{upload.uploadedAt}</td>
							<td>
								<div class="action-buttons">
									<button class="action-btn" title="Edit">
										<Pencil size={16} />
									</button>
									<button class="action-btn" title="Analytics">
										<BarChart3 size={16} />
									</button>
									<button class="action-btn" title="More">
										<MoreVertical size={16} />
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Demo Notice -->
	<div class="demo-notice">
		<Info size={20} />
		<p>This is a demo of the OUTERFIELDS admin dashboard. Data shown is for demonstration purposes only.</p>
		<a href="/demo" class="switch-link">
			Switch to User Portal
			<ArrowRight size={16} />
		</a>
	</div>
</div>

<style>
	.dashboard {
		min-height: 100vh;
		background: var(--color-bg-pure);
		padding: 2rem 4%;
	}

	/* Header */
	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
	}

	.dashboard-header h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.header-subtitle {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0;
	}

	.btn-upload {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.btn-upload:hover {
		transform: scale(1.02);
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		display: flex;
		gap: 1rem;
		padding: 1.5rem;
		background: var(--glass-bg);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
	}

	.stat-icon {
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
	}

	.stat-icon.views {
		background: rgba(96, 165, 250, 0.2);
		color: #60a5fa;
	}

	.stat-icon.subscribers {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.stat-icon.revenue {
		background: rgba(192, 132, 252, 0.2);
		color: #c084fc;
	}

	.stat-icon.engagement {
		background: rgba(251, 191, 36, 0.2);
		color: #fbbf24;
	}

	.stat-content {
		display: flex;
		flex-direction: column;
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
		margin-bottom: 0.25rem;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.stat-change {
		font-size: 0.75rem;
		margin-top: 0.25rem;
	}

	.stat-change.positive {
		color: var(--color-success);
	}

	/* Main Content */
	.dashboard-main {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.section-header h2 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.view-all-btn {
		font-size: 0.75rem;
		color: var(--color-primary);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.view-all-btn:hover {
		text-decoration: underline;
	}

	/* Chart Section */
	.chart-section {
		padding: 1.5rem;
		background: var(--glass-bg);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
	}

	.chart-controls {
		display: flex;
		gap: 0.5rem;
	}

	.chart-btn {
		padding: 0.375rem 0.75rem;
		background: transparent;
		color: var(--color-fg-muted);
		border: 1px solid var(--color-border-default);
		border-radius: 0.375rem;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.chart-btn:hover,
	.chart-btn.active {
		background: var(--color-primary-muted);
		color: var(--color-primary);
		border-color: rgba(124, 43, 238, 0.3);
	}

	.chart-placeholder {
		margin-top: 1.5rem;
	}

	.chart-bars {
		display: flex;
		align-items: flex-end;
		gap: 1rem;
		height: 200px;
		padding-bottom: 2rem;
	}

	.chart-bar-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
	}

	.chart-bar {
		width: 100%;
		max-width: 40px;
		background: linear-gradient(to top, var(--color-primary), rgba(124, 43, 238, 0.5));
		border-radius: 0.25rem 0.25rem 0 0;
		margin-top: auto;
		transition: height var(--duration-standard) var(--ease-standard);
	}

	.chart-label {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	.chart-legend {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		margin-top: 1rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	.legend-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.legend-dot.views {
		background: var(--color-primary);
	}

	.legend-dot.engagement {
		background: #22c55e;
	}

	/* Activity Section */
	.activity-section {
		padding: 1.5rem;
		background: var(--glass-bg);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
	}

	.activity-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.activity-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.activity-icon {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface);
		border-radius: 50%;
		color: var(--color-fg-muted);
	}

	.activity-icon.subscription {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.activity-icon :global(svg) {
		flex-shrink: 0;
	}

	.activity-content {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.activity-message {
		font-size: 0.875rem;
		color: var(--color-fg-primary);
	}

	.activity-detail {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	.activity-time {
		font-size: 0.75rem;
		color: var(--color-fg-subtle);
		white-space: nowrap;
	}

	/* Uploads Table */
	.uploads-section {
		padding: 1.5rem;
		background: var(--glass-bg);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
		margin-bottom: 2rem;
	}

	.uploads-table-wrapper {
		overflow-x: auto;
	}

	.uploads-table {
		width: 100%;
		border-collapse: collapse;
	}

	.uploads-table th,
	.uploads-table td {
		padding: 1rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border-default);
	}

	.uploads-table th {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.uploads-table tbody tr:last-child td {
		border-bottom: none;
	}

	.video-cell {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.video-thumb {
		width: 80px;
		height: 45px;
		object-fit: cover;
		border-radius: 0.375rem;
	}

	.video-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-fg-primary);
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.625rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.status-published {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.status-processing {
		background: rgba(251, 191, 36, 0.2);
		color: #fbbf24;
	}

	.status-draft {
		background: var(--color-bg-surface);
		color: var(--color-fg-muted);
	}

	.spinning {
		font-size: 0.875rem;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: 0.375rem;
		color: var(--color-fg-muted);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.action-btn:hover {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
	}

	.action-btn :global(svg) {
		flex-shrink: 0;
	}

	/* Demo Notice */
	.demo-notice {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		max-width: 60rem;
		margin: 2rem auto 0;
		padding: 1rem 1.5rem;
		background: var(--color-primary-muted);
		border: 1px solid rgba(124, 43, 238, 0.3);
		border-radius: 0.75rem;
	}

	.demo-notice > :global(svg) {
		color: var(--color-primary);
		flex-shrink: 0;
	}

	.demo-notice p {
		flex: 1;
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
	}

	.switch-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-primary);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
	}

	.switch-link:hover {
		text-decoration: underline;
	}

	.switch-link :global(svg) {
		flex-shrink: 0;
	}

	@media (max-width: 1024px) {
		.dashboard-main {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.dashboard {
			padding: 1.5rem 5%;
		}

		.dashboard-header {
			flex-direction: column;
			gap: 1rem;
		}

		.btn-upload {
			width: 100%;
			justify-content: center;
		}

		.video-cell {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.demo-notice {
			flex-direction: column;
			text-align: center;
		}
	}
</style>
