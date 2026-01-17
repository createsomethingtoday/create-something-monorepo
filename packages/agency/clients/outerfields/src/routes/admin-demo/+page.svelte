<script lang="ts">
	/**
	 * OUTERFIELDS Admin Dashboard Demo
	 *
	 * Fully interactive analytics dashboard for content creators showing
	 * views, subscribers, revenue, and content management.
	 * All elements are clickable, filterable, and sortable.
	 */
	import {
		Upload,
		Eye,
		Users,
		CreditCard,
		TrendingUp,
		UserPlus,
		MessageCircle,
		CheckCircle,
		Bell,
		RefreshCw,
		Pencil,
		BarChart3,
		MoreVertical,
		Info,
		ArrowRight,
		Search,
		Filter,
		X,
		ChevronUp,
		ChevronDown,
		Play,
		Trash2,
		Copy,
		ExternalLink,
		ArrowUpDown,
		Lightbulb,
		Send
	} from 'lucide-svelte';
	import type { ComponentType } from 'svelte';

	interface Activity {
		type: string;
		message: string;
		user?: string;
		detail?: string;
		time: string;
	}

	interface UploadItem {
		id: string;
		title: string;
		thumbnail: string;
		status: string;
		views?: string;
		viewsNum?: number;
		progress?: number;
		uploadedAt: string;
		uploadedAtNum?: number;
	}

	interface ChartPeriodData {
		labels: string[];
		views: number[];
		engagement: number[];
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
			chartData: ChartPeriodData;
			recentActivity: Activity[];
			uploads: UploadItem[];
		};
	}

	let { data }: Props = $props();

	// ============================================
	// STATE
	// ============================================

	// Chart period selection
	type ChartPeriod = '7d' | '30d' | '90d';
	let selectedPeriod = $state<ChartPeriod>('7d');

	// Different data for each period
	const chartDataByPeriod: Record<ChartPeriod, ChartPeriodData> = {
		'7d': {
			labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
			views: [12000, 19000, 15000, 22000, 18000, 24000, 21000],
			engagement: [45, 52, 48, 62, 55, 68, 65]
		},
		'30d': {
			labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
			views: [85000, 92000, 78000, 105000],
			engagement: [52, 58, 55, 62]
		},
		'90d': {
			labels: ['Jan', 'Feb', 'Mar'],
			views: [320000, 380000, 420000],
			engagement: [48, 55, 62]
		}
	};

	// Table sorting
	type SortField = 'title' | 'status' | 'views' | 'uploadedAt';
	type SortDirection = 'asc' | 'desc';
	let sortField = $state<SortField>('uploadedAt');
	let sortDirection = $state<SortDirection>('desc');

	// Status filtering
	type StatusFilter = 'all' | 'published' | 'processing' | 'draft';
	let statusFilter = $state<StatusFilter>('all');

	// Activity type filtering
	type ActivityFilter = 'all' | 'subscription' | 'view' | 'comment' | 'upload';
	let activityFilter = $state<ActivityFilter>('all');

	// Search
	let searchQuery = $state('');

	// Modals
	let showUploadModal = $state(false);
	let showVideoModal = $state(false);
	let showAnalyticsModal = $state(false);
	let selectedVideo = $state<UploadItem | null>(null);
	let showActivityExpanded = $state(false);
	let showStatDetail = $state<string | null>(null);

	// Video action menu
	let activeActionMenu = $state<string | null>(null);

	// Analytics chat
	type ChatMessage = { role: 'user' | 'assistant'; content: string };
	let chatMessages = $state<ChatMessage[]>([]);
	let chatInput = $state('');
	let isSendingMessage = $state(false);

	// ============================================
	// COMPUTED / DERIVED
	// ============================================

	// Current chart data based on period
	let currentChartData = $derived(chartDataByPeriod[selectedPeriod]);

	// Add numeric values for sorting
	const uploadsWithNumbers: UploadItem[] = data.uploads.map((u, i) => ({
		...u,
		viewsNum: u.views === '-' ? 0 : parseFloat(u.views?.replace('K', '000').replace('.', '') || '0'),
		uploadedAtNum: data.uploads.length - i // Most recent = highest
	}));

	// Filtered and sorted uploads
	let filteredUploads = $derived.by(() => {
		let result = [...uploadsWithNumbers];

		// Apply search filter
		if (searchQuery) {
			result = result.filter((u) => u.title.toLowerCase().includes(searchQuery.toLowerCase()));
		}

		// Apply status filter
		if (statusFilter !== 'all') {
			result = result.filter((u) => u.status === statusFilter);
		}

		// Apply sorting
		result.sort((a, b) => {
			let comparison = 0;
			switch (sortField) {
				case 'title':
					comparison = a.title.localeCompare(b.title);
					break;
				case 'status':
					comparison = a.status.localeCompare(b.status);
					break;
				case 'views':
					comparison = (a.viewsNum || 0) - (b.viewsNum || 0);
					break;
				case 'uploadedAt':
					comparison = (a.uploadedAtNum || 0) - (b.uploadedAtNum || 0);
					break;
			}
			return sortDirection === 'asc' ? comparison : -comparison;
		});

		return result;
	});

	// Filtered activities
	let filteredActivities = $derived.by(() => {
		if (activityFilter === 'all') return data.recentActivity;
		return data.recentActivity.filter((a) => a.type === activityFilter);
	});

	// ============================================
	// HELPERS
	// ============================================

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

	function toggleSort(field: SortField) {
		if (sortField === field) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDirection = 'desc';
		}
	}

	function openVideoDetails(video: UploadItem) {
		selectedVideo = video;
		showVideoModal = true;
		activeActionMenu = null;
	}

	function openAnalytics(video: UploadItem) {
		selectedVideo = video;
		showAnalyticsModal = true;
		activeActionMenu = null;
	}

	function toggleActionMenu(id: string) {
		activeActionMenu = activeActionMenu === id ? null : id;
	}

	function closeModals() {
		showUploadModal = false;
		showVideoModal = false;
		showAnalyticsModal = false;
		showStatDetail = null;
		activeActionMenu = null;
		// Reset chat when closing analytics modal
		if (!showAnalyticsModal) {
			chatMessages = [];
			chatInput = '';
		}
	}

	// Analytics chat
	async function sendChatMessage() {
		if (!chatInput.trim() || isSendingMessage || !selectedVideo) return;

		const userMessage = chatInput.trim();
		chatInput = '';

		// Add user message to chat
		chatMessages = [...chatMessages, { role: 'user', content: userMessage }];

		isSendingMessage = true;

		try {
			const response = await fetch('/api/analytics-chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: userMessage,
					videoAnalytics: {
						title: selectedVideo.title,
						views: selectedVideo.views
					}
				})
			});

			const data = await response.json();

			if (data.success && data.message) {
				chatMessages = [...chatMessages, { role: 'assistant', content: data.message }];
			} else {
				chatMessages = [
					...chatMessages,
					{ role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
				];
			}
		} catch (error) {
			console.error('Chat error:', error);
			chatMessages = [
				...chatMessages,
				{
					role: 'assistant',
					content: 'Sorry, I couldn\'t connect to the AI service. Please try again.'
				}
			];
		} finally {
			isSendingMessage = false;
		}
	}

	function handleChatKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendChatMessage();
		}
	}

	// Stat detail data
	const statDetails: Record<
		string,
		{ title: string; description: string; breakdown: { label: string; value: string }[] }
	> = {
		views: {
			title: 'Total Views Breakdown',
			description: 'Detailed view analytics across all content',
			breakdown: [
				{ label: 'YouTube Embeds', value: '485K' },
				{ label: 'Direct Platform', value: '620K' },
				{ label: 'Social Shares', value: '95K' }
			]
		},
		subscribers: {
			title: 'Subscriber Analytics',
			description: 'Subscriber growth and retention metrics',
			breakdown: [
				{ label: 'Free Tier', value: '32.1K' },
				{ label: 'Premium', value: '8.4K' },
				{ label: 'Enterprise', value: '4.7K' }
			]
		},
		revenue: {
			title: 'Revenue Breakdown',
			description: 'Monthly revenue by source',
			breakdown: [
				{ label: 'Subscriptions', value: '$38,200' },
				{ label: 'One-time Purchases', value: '$8,400' },
				{ label: 'Tips & Donations', value: '$5,800' }
			]
		},
		engagement: {
			title: 'Engagement Metrics',
			description: 'How users interact with your content',
			breakdown: [
				{ label: 'Avg. Watch Time', value: '12:34' },
				{ label: 'Completion Rate', value: '72%' },
				{ label: 'Comments/Video', value: '45' }
			]
		}
	};
</script>

<svelte:head>
	<title>Dashboard | OUTERFIELDS Admin Demo</title>
</svelte:head>

<!-- Close menus on click outside and handle escape key for modals -->
<svelte:window
	onclick={() => {
		activeActionMenu = null;
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			closeModals();
			showActivityExpanded = false;
		}
	}}
/>

<div class="dashboard">
	<!-- Header -->
	<header class="dashboard-header">
		<div class="header-left">
			<h1>Dashboard</h1>
			<p class="header-subtitle">Welcome back! Here's what's happening with your content.</p>
		</div>
		<div class="header-actions">
			<div class="search-box">
				<Search size={16} />
				<input
					type="text"
					placeholder="Search videos..."
					bind:value={searchQuery}
					class="search-input"
				/>
				{#if searchQuery}
					<button class="search-clear" onclick={() => (searchQuery = '')}>
						<X size={14} />
					</button>
				{/if}
			</div>
			<button class="btn-upload" onclick={() => (showUploadModal = true)}>
				<Upload size={20} />
				Upload Video
			</button>
		</div>
	</header>

	<!-- Stats Grid - Clickable -->
	<section class="stats-grid">
		<button class="stat-card" onclick={() => (showStatDetail = 'views')}>
			<div class="stat-icon views">
				<Eye size={20} />
			</div>
			<div class="stat-content">
				<span class="stat-label">Total Views</span>
				<span class="stat-value">{data.stats.totalViews}</span>
				<span class="stat-change positive">{data.stats.viewsChange} this month</span>
			</div>
			<ArrowRight size={16} class="stat-arrow" />
		</button>

		<button class="stat-card" onclick={() => (showStatDetail = 'subscribers')}>
			<div class="stat-icon subscribers">
				<Users size={20} />
			</div>
			<div class="stat-content">
				<span class="stat-label">Subscribers</span>
				<span class="stat-value">{data.stats.subscribers}</span>
				<span class="stat-change positive">{data.stats.subscribersChange} this month</span>
			</div>
			<ArrowRight size={16} class="stat-arrow" />
		</button>

		<button class="stat-card" onclick={() => (showStatDetail = 'revenue')}>
			<div class="stat-icon revenue">
				<CreditCard size={20} />
			</div>
			<div class="stat-content">
				<span class="stat-label">Revenue</span>
				<span class="stat-value">{data.stats.revenue}</span>
				<span class="stat-change positive">{data.stats.revenueChange} this month</span>
			</div>
			<ArrowRight size={16} class="stat-arrow" />
		</button>

		<button class="stat-card" onclick={() => (showStatDetail = 'engagement')}>
			<div class="stat-icon engagement">
				<TrendingUp size={20} />
			</div>
			<div class="stat-content">
				<span class="stat-label">Engagement</span>
				<span class="stat-value">{data.stats.engagement}</span>
				<span class="stat-change positive">{data.stats.engagementChange} this month</span>
			</div>
			<ArrowRight size={16} class="stat-arrow" />
		</button>
	</section>

	<!-- Main Content -->
	<div class="dashboard-main">
		<!-- Chart Section -->
		<section class="chart-section">
			<div class="section-header">
				<h2>Analytics Overview</h2>
				<div class="chart-controls">
					<button
						class="chart-btn"
						class:active={selectedPeriod === '7d'}
						onclick={() => (selectedPeriod = '7d')}
					>
						7 Days
					</button>
					<button
						class="chart-btn"
						class:active={selectedPeriod === '30d'}
						onclick={() => (selectedPeriod = '30d')}
					>
						30 Days
					</button>
					<button
						class="chart-btn"
						class:active={selectedPeriod === '90d'}
						onclick={() => (selectedPeriod = '90d')}
					>
						90 Days
					</button>
				</div>
			</div>
			<div class="chart-placeholder">
				<div class="chart-bars">
					{#each currentChartData.views as value, i}
						<div class="chart-bar-wrapper">
							<div class="chart-bar-group">
								<div
									class="chart-bar views"
									style="height: {(value / Math.max(...currentChartData.views)) * 100}%"
									title="{value.toLocaleString()} views"
								></div>
								<div
									class="chart-bar engagement"
									style="height: {currentChartData.engagement[i]}%"
									title="{currentChartData.engagement[i]}% engagement"
								></div>
							</div>
							<span class="chart-label">{currentChartData.labels[i]}</span>
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
				<button type="button" class="view-all-btn" onclick={() => (showActivityExpanded = true)}>
					View All
				</button>
			</div>

			<!-- Activity Filter -->
			<div class="filter-pills">
				<button
					class="filter-pill"
					class:active={activityFilter === 'all'}
					onclick={() => (activityFilter = 'all')}
				>
					All
				</button>
				<button
					class="filter-pill"
					class:active={activityFilter === 'subscription'}
					onclick={() => (activityFilter = 'subscription')}
				>
					Subs
				</button>
				<button
					class="filter-pill"
					class:active={activityFilter === 'view'}
					onclick={() => (activityFilter = 'view')}
				>
					Views
				</button>
				<button
					class="filter-pill"
					class:active={activityFilter === 'comment'}
					onclick={() => (activityFilter = 'comment')}
				>
					Comments
				</button>
			</div>

			<div class="activity-list">
				{#each filteredActivities as activity}
					{@const ActivityIcon = getActivityIcon(activity.type)}
					<button class="activity-item">
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
					</button>
				{/each}
				{#if filteredActivities.length === 0}
					<div class="empty-state">No activity matching filter</div>
				{/if}
			</div>
		</section>
	</div>

	<!-- Uploads Table -->
	<section class="uploads-section">
		<div class="section-header">
			<h2>Recent Uploads</h2>
			<div class="table-controls">
				<div class="status-filter">
					<Filter size={14} />
					<select bind:value={statusFilter}>
						<option value="all">All Status</option>
						<option value="published">Published</option>
						<option value="processing">Processing</option>
						<option value="draft">Draft</option>
					</select>
				</div>
				<button type="button" class="view-all-btn">Manage All Videos</button>
			</div>
		</div>
		<div class="uploads-table-wrapper">
			<table class="uploads-table">
				<thead>
					<tr>
						<th>
							<button class="sort-header" onclick={() => toggleSort('title')}>
								Video
								{#if sortField === 'title'}
									{#if sortDirection === 'asc'}
										<ChevronUp size={14} />
									{:else}
										<ChevronDown size={14} />
									{/if}
								{:else}
									<ArrowUpDown size={14} class="sort-inactive" />
								{/if}
							</button>
						</th>
						<th>
							<button class="sort-header" onclick={() => toggleSort('status')}>
								Status
								{#if sortField === 'status'}
									{#if sortDirection === 'asc'}
										<ChevronUp size={14} />
									{:else}
										<ChevronDown size={14} />
									{/if}
								{:else}
									<ArrowUpDown size={14} class="sort-inactive" />
								{/if}
							</button>
						</th>
						<th>
							<button class="sort-header" onclick={() => toggleSort('views')}>
								Views
								{#if sortField === 'views'}
									{#if sortDirection === 'asc'}
										<ChevronUp size={14} />
									{:else}
										<ChevronDown size={14} />
									{/if}
								{:else}
									<ArrowUpDown size={14} class="sort-inactive" />
								{/if}
							</button>
						</th>
						<th>
							<button class="sort-header" onclick={() => toggleSort('uploadedAt')}>
								Uploaded
								{#if sortField === 'uploadedAt'}
									{#if sortDirection === 'asc'}
										<ChevronUp size={14} />
									{:else}
										<ChevronDown size={14} />
									{/if}
								{:else}
									<ArrowUpDown size={14} class="sort-inactive" />
								{/if}
							</button>
						</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredUploads as upload}
						<tr>
							<td class="video-cell">
								<button class="video-thumb-btn" onclick={() => openVideoDetails(upload)}>
									<img src={upload.thumbnail} alt={upload.title} class="video-thumb" />
									<span class="thumb-play">
										<Play size={16} />
									</span>
								</button>
								<button class="video-title-btn" onclick={() => openVideoDetails(upload)}>
									{upload.title}
								</button>
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
									<button
										class="action-btn"
										title="Edit"
										onclick={() => openVideoDetails(upload)}
									>
										<Pencil size={16} />
									</button>
									<button class="action-btn" title="Analytics" onclick={() => openAnalytics(upload)}>
										<BarChart3 size={16} />
									</button>
									<div class="action-menu-wrapper">
										<button
											class="action-btn"
											title="More"
											onclick={(e) => {
												e.stopPropagation();
												toggleActionMenu(upload.id);
											}}
										>
											<MoreVertical size={16} />
										</button>
										{#if activeActionMenu === upload.id}
											<div class="action-menu" role="menu" tabindex="-1">
												<button class="menu-item" onclick={(e) => e.stopPropagation()}>
													<Play size={14} />
													Preview
												</button>
												<button class="menu-item" onclick={(e) => e.stopPropagation()}>
													<Copy size={14} />
													Duplicate
												</button>
												<button class="menu-item" onclick={(e) => e.stopPropagation()}>
													<ExternalLink size={14} />
													Share Link
												</button>
												<hr />
												<button class="menu-item danger" onclick={(e) => e.stopPropagation()}>
													<Trash2 size={14} />
													Delete
												</button>
											</div>
										{/if}
									</div>
								</div>
							</td>
						</tr>
					{/each}
					{#if filteredUploads.length === 0}
						<tr>
							<td colspan="5" class="empty-state">
								No videos match your search or filter criteria
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Demo Notice -->
	<div class="demo-notice">
		<Info size={20} />
		<p>
			This is a demo of the OUTERFIELDS admin dashboard. Data shown is for demonstration purposes
			only.
		</p>
		<a href="/demo" class="switch-link">
			Switch to User Portal
			<ArrowRight size={16} />
		</a>
	</div>
</div>

<!-- Upload Modal -->
{#if showUploadModal}
	<div
		class="modal-overlay"
		onclick={(e) => e.target === e.currentTarget && closeModals()}
		onkeydown={(e) => e.key === 'Escape' && closeModals()}
		role="presentation"
		tabindex="-1"
	>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="upload-modal-title" tabindex="-1">
			<div class="modal-header">
				<h3 id="upload-modal-title">Upload Video</h3>
				<button class="modal-close" onclick={closeModals}>
					<X size={20} />
				</button>
			</div>
			<div class="modal-body">
				<div class="upload-dropzone">
					<Upload size={48} />
					<p>Drag and drop your video here</p>
					<span>or</span>
					<button class="btn-browse">Browse Files</button>
					<p class="upload-hint">MP4, MOV, or WebM up to 10GB</p>
				</div>
				<div class="upload-form">
					<label>
						Title
						<input type="text" placeholder="Enter video title" />
					</label>
					<label>
						Description
						<textarea placeholder="Describe your video..."></textarea>
					</label>
					<label>
						Visibility
						<select>
							<option>Public</option>
							<option>Members Only</option>
							<option>Premium Only</option>
							<option>Draft</option>
						</select>
					</label>
				</div>
			</div>
			<div class="modal-footer">
				<button class="btn-secondary" onclick={closeModals}>Cancel</button>
				<button class="btn-primary">Upload</button>
			</div>
		</div>
	</div>
{/if}

<!-- Video Detail Modal -->
{#if showVideoModal && selectedVideo}
	<div
		class="modal-overlay"
		onclick={(e) => e.target === e.currentTarget && closeModals()}
		onkeydown={(e) => e.key === 'Escape' && closeModals()}
		role="presentation"
		tabindex="-1"
	>
		<div class="modal modal-lg" role="dialog" aria-modal="true" aria-labelledby="video-modal-title" tabindex="-1">
			<div class="modal-header">
				<h3 id="video-modal-title">{selectedVideo.title}</h3>
				<button class="modal-close" onclick={closeModals}>
					<X size={20} />
				</button>
			</div>
			<div class="modal-body">
				<div class="video-detail-grid">
					<div class="video-preview">
						<img src={selectedVideo.thumbnail} alt={selectedVideo.title} />
						<div class="preview-overlay">
							<span class="play-button play-button-lg">
								<Play size={32} />
							</span>
						</div>
					</div>
					<div class="video-meta">
						<div class="meta-row">
							<span class="meta-label">Status</span>
							<span class="status-badge {getStatusClass(selectedVideo.status)}">
								{selectedVideo.status}
							</span>
						</div>
						<div class="meta-row">
							<span class="meta-label">Views</span>
							<span>{selectedVideo.views || '0'}</span>
						</div>
						<div class="meta-row">
							<span class="meta-label">Uploaded</span>
							<span>{selectedVideo.uploadedAt}</span>
						</div>
						<div class="meta-row">
							<span class="meta-label">Engagement</span>
							<span>72%</span>
						</div>
					</div>
				</div>
				<div class="video-actions-grid">
					<button class="action-card">
						<Pencil size={20} />
						<span>Edit Details</span>
					</button>
					<button class="action-card">
						<BarChart3 size={20} />
						<span>View Analytics</span>
					</button>
					<button class="action-card">
						<ExternalLink size={20} />
						<span>Share Link</span>
					</button>
					<button class="action-card danger">
						<Trash2 size={20} />
						<span>Delete</span>
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Stat Detail Modal -->
{#if showStatDetail}
	{@const detail = statDetails[showStatDetail]}
	<div
		class="modal-overlay"
		onclick={(e) => e.target === e.currentTarget && closeModals()}
		onkeydown={(e) => e.key === 'Escape' && closeModals()}
		role="presentation"
		tabindex="-1"
	>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="stat-modal-title" tabindex="-1">
			<div class="modal-header">
				<h3 id="stat-modal-title">{detail.title}</h3>
				<button class="modal-close" onclick={closeModals}>
					<X size={20} />
				</button>
			</div>
			<div class="modal-body">
				<p class="stat-description">{detail.description}</p>
				<div class="stat-breakdown">
					{#each detail.breakdown as item}
						<div class="breakdown-row">
							<span class="breakdown-label">{item.label}</span>
							<span class="breakdown-value">{item.value}</span>
						</div>
					{/each}
				</div>
			</div>
			<div class="modal-footer">
				<button class="btn-primary" onclick={closeModals}>Close</button>
			</div>
		</div>
	</div>
{/if}

<!-- Expanded Activity Modal -->
{#if showActivityExpanded}
	<div
		class="modal-overlay"
		onclick={(e) => e.target === e.currentTarget && (showActivityExpanded = false)}
		onkeydown={(e) => e.key === 'Escape' && (showActivityExpanded = false)}
		role="presentation"
		tabindex="-1"
	>
		<div class="modal modal-lg" role="dialog" aria-modal="true" aria-labelledby="activity-modal-title" tabindex="-1">
			<div class="modal-header">
				<h3 id="activity-modal-title">All Activity</h3>
				<button class="modal-close" onclick={() => (showActivityExpanded = false)}>
					<X size={20} />
				</button>
			</div>
			<div class="modal-body">
				<div class="filter-pills modal-filters">
					<button
						class="filter-pill"
						class:active={activityFilter === 'all'}
						onclick={() => (activityFilter = 'all')}
					>
						All
					</button>
					<button
						class="filter-pill"
						class:active={activityFilter === 'subscription'}
						onclick={() => (activityFilter = 'subscription')}
					>
						Subscriptions
					</button>
					<button
						class="filter-pill"
						class:active={activityFilter === 'view'}
						onclick={() => (activityFilter = 'view')}
					>
						Views
					</button>
					<button
						class="filter-pill"
						class:active={activityFilter === 'comment'}
						onclick={() => (activityFilter = 'comment')}
					>
						Comments
					</button>
					<button
						class="filter-pill"
						class:active={activityFilter === 'upload'}
						onclick={() => (activityFilter = 'upload')}
					>
						Uploads
					</button>
				</div>
				<div class="activity-list expanded">
					{#each filteredActivities as activity}
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
			</div>
		</div>
	</div>
{/if}

<!-- Analytics Modal -->
{#if showAnalyticsModal && selectedVideo}
	<div
		class="modal-overlay"
		onclick={(e) => e.target === e.currentTarget && closeModals()}
		onkeydown={(e) => e.key === 'Escape' && closeModals()}
		role="presentation"
		tabindex="-1"
	>
		<div class="modal modal-lg analytics-modal" role="dialog" aria-modal="true" aria-labelledby="analytics-modal-title" tabindex="-1">
			<div class="modal-header">
				<h3 id="analytics-modal-title">Analytics: {selectedVideo.title}</h3>
				<button class="modal-close" onclick={closeModals}>
					<X size={20} />
				</button>
			</div>
			<div class="modal-body">
				<!-- Key Metrics Grid -->
				<div class="analytics-metrics">
					<div class="metric-card">
						<div class="metric-label">Total Views</div>
						<div class="metric-value">{selectedVideo.views ?? '—'}</div>
						<div class="metric-change positive">+12.5% vs last 7 days</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Avg Watch Time</div>
						<div class="metric-value">4m 32s</div>
						<div class="metric-change positive">+8.3% vs last 7 days</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Engagement Rate</div>
						<div class="metric-value">24.8%</div>
						<div class="metric-change negative">-2.1% vs last 7 days</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Subscribers Gained</div>
						<div class="metric-value">847</div>
						<div class="metric-change positive">+34.2% vs last 7 days</div>
					</div>
				</div>

				<!-- Engagement Breakdown -->
				<div class="analytics-section">
					<h4>Engagement Breakdown</h4>
					<div class="engagement-stats">
						<div class="engagement-row">
							<span class="engagement-label">Likes</span>
							<div class="engagement-bar">
								<div class="engagement-fill" style="width: 89%"></div>
							</div>
							<span class="engagement-value">12.4K</span>
						</div>
						<div class="engagement-row">
							<span class="engagement-label">Comments</span>
							<div class="engagement-bar">
								<div class="engagement-fill" style="width: 67%"></div>
							</div>
							<span class="engagement-value">2.8K</span>
						</div>
						<div class="engagement-row">
							<span class="engagement-label">Shares</span>
							<div class="engagement-bar">
								<div class="engagement-fill" style="width: 45%"></div>
							</div>
							<span class="engagement-value">1.2K</span>
						</div>
						<div class="engagement-row">
							<span class="engagement-label">Saves</span>
							<div class="engagement-bar">
								<div class="engagement-fill" style="width: 34%"></div>
							</div>
							<span class="engagement-value">892</span>
						</div>
					</div>
				</div>

				<!-- Audience Retention -->
				<div class="analytics-section">
					<h4>Audience Retention</h4>
					<div class="retention-chart">
						<svg viewBox="0 0 400 120" preserveAspectRatio="none">
							<polyline
								points="0,100 50,95 100,85 150,70 200,55 250,60 300,70 350,85 400,95"
								fill="rgba(255,255,255,0.1)"
								stroke="rgba(255,255,255,0.5)"
								stroke-width="2"
							/>
						</svg>
						<div class="retention-labels">
							<span>0%</span>
							<span>25%</span>
							<span>50%</span>
							<span>75%</span>
							<span>100%</span>
						</div>
					</div>
					<p class="retention-note">Peak retention at 3m 15s (78% of viewers)</p>
				</div>

				<!-- Traffic Sources -->
				<div class="analytics-section">
					<h4>Traffic Sources</h4>
					<div class="traffic-sources">
						<div class="traffic-item">
							<div class="traffic-label">
								<span class="traffic-dot" style="background: var(--color-data-1)"></span>
								Browse Features
							</div>
							<span class="traffic-value">42%</span>
						</div>
						<div class="traffic-item">
							<div class="traffic-label">
								<span class="traffic-dot" style="background: var(--color-brand)"></span>
								Suggested Videos
							</div>
							<span class="traffic-value">28%</span>
						</div>
						<div class="traffic-item">
							<div class="traffic-label">
								<span class="traffic-dot" style="background: var(--color-success)"></span>
								External Links
							</div>
							<span class="traffic-value">18%</span>
						</div>
						<div class="traffic-item">
							<div class="traffic-label">
								<span class="traffic-dot" style="background: var(--color-warning)"></span>
								Search
							</div>
							<span class="traffic-value">12%</span>
						</div>
					</div>
				</div>

				<!-- Geographic Distribution -->
				<div class="analytics-section">
					<h4>Top Locations</h4>
					<div class="locations-list">
						<div class="location-item">
							<span class="location-name">United States</span>
							<span class="location-value">34.2%</span>
						</div>
						<div class="location-item">
							<span class="location-name">United Kingdom</span>
							<span class="location-value">18.5%</span>
						</div>
						<div class="location-item">
							<span class="location-name">Canada</span>
							<span class="location-value">12.8%</span>
						</div>
						<div class="location-item">
							<span class="location-name">Australia</span>
							<span class="location-value">9.3%</span>
						</div>
						<div class="location-item">
							<span class="location-name">Germany</span>
							<span class="location-value">7.1%</span>
						</div>
					</div>
				</div>

				<!-- AI Content Strategist Chat -->
				<div class="analytics-section analytics-chat-section">
					<h4 class="chat-title">
						<Lightbulb size={18} />
						Content Strategy Assistant
					</h4>
					<p class="chat-intro">
						Ask me anything about your video's performance or get content ideas based on what's
						working.
					</p>

					<div class="chat-container">
						{#if chatMessages.length === 0}
							<div class="chat-empty">
								<p>Start a conversation to get insights and content ideas!</p>
								<div class="chat-suggestions">
									<button class="suggestion-btn" onclick={() => (chatInput = 'Why is this video performing well?')}>
										Why is this video performing well?
									</button>
									<button class="suggestion-btn" onclick={() => (chatInput = 'What content should I create next?')}>
										What content should I create next?
									</button>
									<button class="suggestion-btn" onclick={() => (chatInput = 'How can I improve engagement?')}>
										How can I improve engagement?
									</button>
								</div>
							</div>
						{:else}
							<div class="chat-messages">
								{#each chatMessages as message}
									<div class="chat-message" class:user={message.role === 'user'} class:assistant={message.role === 'assistant'}>
										<div class="message-content">{message.content}</div>
									</div>
								{/each}
								{#if isSendingMessage}
									<div class="chat-message assistant">
										<div class="message-content typing">Thinking...</div>
									</div>
								{/if}
							</div>
						{/if}

						<div class="chat-input-wrapper">
							<input
								type="text"
								class="chat-input"
								placeholder="Ask about your analytics or get content ideas..."
								bind:value={chatInput}
								onkeydown={handleChatKeydown}
								disabled={isSendingMessage}
							/>
							<button class="chat-send-btn" onclick={sendChatMessage} disabled={!chatInput.trim() || isSendingMessage} aria-label="Send message">
								<Send size={20} />
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.dashboard {
		min-height: 100vh;
		background: var(--color-bg-pure);
		padding: 6rem 4% 2rem;
	}

	/* Header */
	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
		gap: 1rem;
		flex-wrap: wrap;
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

	.header-actions {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.search-box {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--glass-bg);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-muted);
	}

	.search-input {
		background: none;
		border: none;
		color: var(--color-fg-primary);
		font-size: 0.875rem;
		width: 200px;
		outline: none;
	}

	.search-input::placeholder {
		color: var(--color-fg-muted);
	}

	.search-clear {
		display: flex;
		padding: 0.25rem;
		background: none;
		border: none;
		color: var(--color-fg-muted);
		cursor: pointer;
	}

	.search-clear:hover {
		color: var(--color-fg-primary);
	}

	.btn-upload {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: var(--color-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
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
		cursor: pointer;
		text-align: left;
		transition: all var(--duration-micro) var(--ease-standard);
		position: relative;
	}

	.stat-card:hover {
		border-color: var(--color-border-strong);
		transform: translateY(-2px);
	}

	.stat-card :global(.stat-arrow) {
		position: absolute;
		right: 1rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-fg-subtle);
		opacity: 0;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.stat-card:hover :global(.stat-arrow) {
		opacity: 1;
		color: var(--color-primary);
	}

	.stat-icon {
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		flex-shrink: 0;
	}

	.stat-icon.views {
		background: var(--color-data-1-muted);
		color: var(--color-data-1);
	}

	.stat-icon.subscribers {
		background: var(--color-data-2-muted);
		color: var(--color-data-2);
	}

	.stat-icon.revenue {
		background: var(--color-data-3-muted);
		color: var(--color-data-3);
	}

	.stat-icon.engagement {
		background: var(--color-data-4-muted);
		color: var(--color-data-4);
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
		flex-wrap: wrap;
		gap: 0.5rem;
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

	.table-controls {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.status-filter {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-fg-muted);
	}

	.status-filter select {
		background: var(--glass-bg);
		border: 1px solid var(--color-border-default);
		border-radius: 0.375rem;
		color: var(--color-fg-primary);
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		cursor: pointer;
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
		margin-top: 1rem;
	}

	.chart-bars {
		display: flex;
		align-items: flex-end;
		gap: 0.75rem;
		height: 240px;
		padding: 0 0.5rem 2rem 0.5rem;
	}

	.chart-bar-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
	}

	.chart-bar-group {
		display: flex;
		gap: 6px;
		align-items: flex-end;
		height: 100%;
		width: 100%;
		justify-content: center;
	}

	.chart-bar {
		width: 45%;
		max-width: 28px;
		min-width: 18px;
		border-radius: 0.25rem 0.25rem 0 0;
		transition: height var(--duration-standard) var(--ease-standard);
		cursor: pointer;
	}

	.chart-bar.views {
		background: linear-gradient(to top, var(--color-primary), rgba(124, 43, 238, 0.5));
	}

	.chart-bar.engagement {
		background: linear-gradient(to top, var(--color-success), var(--color-success-muted));
	}

	.chart-bar:hover {
		opacity: 0.8;
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
		margin-top: 1.25rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border-default);
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
		background: var(--color-success);
	}

	/* Activity Section */
	.activity-section {
		padding: 1.5rem;
		background: var(--glass-bg);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
	}

	.filter-pills {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.filter-pill {
		padding: 0.375rem 0.75rem;
		background: transparent;
		color: var(--color-fg-muted);
		border: 1px solid var(--color-border-default);
		border-radius: 9999px;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.filter-pill:hover,
	.filter-pill.active {
		background: var(--color-primary-muted);
		color: var(--color-primary);
		border-color: rgba(124, 43, 238, 0.3);
	}

	.activity-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.activity-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.5rem;
		background: none;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		text-align: left;
		width: 100%;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.activity-item:hover {
		background: var(--color-bg-surface);
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
		flex-shrink: 0;
	}

	.activity-icon.subscription {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.activity-icon :global(svg) {
		flex-shrink: 0;
	}

	.activity-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.activity-message {
		font-size: 0.875rem;
		color: var(--color-fg-primary);
	}

	.activity-detail {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.activity-time {
		font-size: 0.75rem;
		color: var(--color-fg-subtle);
		white-space: nowrap;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: var(--color-fg-muted);
		font-size: 0.875rem;
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

	.sort-header {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		background: none;
		border: none;
		color: var(--color-fg-muted);
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		cursor: pointer;
		padding: 0;
	}

	.sort-header:hover {
		color: var(--color-fg-primary);
	}

	.sort-header :global(.sort-inactive) {
		opacity: 0.3;
	}

	.video-cell {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.video-thumb-btn {
		position: relative;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.video-thumb {
		width: 80px;
		height: 45px;
		object-fit: cover;
		border-radius: 0.375rem;
		display: block;
	}

	.thumb-play {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		border-radius: 0.375rem;
		color: white;
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.video-thumb-btn:hover .thumb-play {
		opacity: 1;
	}

	.video-title-btn {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-fg-primary);
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		padding: 0;
	}

	.video-title-btn:hover {
		text-decoration: underline;
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
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.status-processing {
		background: var(--color-warning-muted);
		color: var(--color-warning);
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

	.action-menu-wrapper {
		position: relative;
	}

	.action-menu {
		position: absolute;
		right: 0;
		top: 100%;
		margin-top: 0.25rem;
		min-width: 160px;
		background: rgba(10, 10, 10, 0.95); /* Nearly opaque dark background */
		backdrop-filter: blur(8px); /* Glassmorphic blur */
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		padding: 0.5rem;
		z-index: 100;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: none;
		border: none;
		color: var(--color-fg-secondary);
		font-size: 0.875rem;
		text-align: left;
		cursor: pointer;
		border-radius: 0.375rem;
	}

	.menu-item:hover {
		background: var(--color-bg-subtle);
	}

	.menu-item.danger {
		color: var(--color-error);
	}

	.action-menu hr {
		border: none;
		border-top: 1px solid var(--color-border-default);
		margin: 0.5rem 0;
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

	/* Modals */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		width: 100%;
		max-width: 480px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal.modal-lg {
		max-width: 640px;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid var(--color-border-default);
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.modal-close {
		display: flex;
		padding: 0.5rem;
		background: none;
		border: none;
		color: var(--color-fg-muted);
		cursor: pointer;
		border-radius: 0.375rem;
	}

	.modal-close:hover {
		background: var(--color-bg-subtle);
		color: var(--color-fg-primary);
	}

	.modal-body {
		padding: 1.5rem;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding: 1.5rem;
		border-top: 1px solid var(--color-border-default);
	}

	.btn-primary {
		padding: 0.75rem 1.5rem;
		background: var(--color-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-secondary {
		padding: 0.75rem 1.5rem;
		background: transparent;
		color: var(--color-fg-secondary);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}

	/* Upload Modal */
	.upload-dropzone {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 3rem 2rem;
		border: 2px dashed var(--color-border-emphasis);
		border-radius: 0.75rem;
		text-align: center;
		margin-bottom: 1.5rem;
		color: var(--color-fg-muted);
	}

	.upload-dropzone p {
		margin: 0;
		font-size: 1rem;
		color: var(--color-fg-secondary);
	}

	.upload-dropzone span {
		font-size: 0.875rem;
	}

	.btn-browse {
		padding: 0.625rem 1.25rem;
		background: var(--color-primary-muted);
		color: var(--color-primary);
		border: none;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}

	.upload-hint {
		font-size: 0.75rem !important;
		color: var(--color-fg-subtle) !important;
	}

	.upload-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.upload-form label {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
	}

	.upload-form input,
	.upload-form textarea,
	.upload-form select {
		padding: 0.75rem;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-primary);
		font-size: 0.875rem;
	}

	.upload-form textarea {
		min-height: 100px;
		resize: vertical;
	}

	/* Video Detail Modal */
	.video-detail-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.video-preview {
		position: relative;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.video-preview img {
		width: 100%;
		aspect-ratio: 16/9;
		object-fit: cover;
		display: block;
	}

	.preview-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.4);
	}

	/* Larger variant of the glassmorphic play button for modals */
	.play-button-lg {
		width: 4rem;
		height: 4rem;
	}

	.play-button-lg :global(svg) {
		width: 32px;
		height: 32px;
	}

	.video-meta {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.meta-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: var(--color-bg-subtle);
		border-radius: 0.5rem;
	}

	.meta-label {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
	}

	.video-actions-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
	}

	.action-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-secondary);
		font-size: 0.75rem;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.action-card:hover {
		background: var(--color-bg-surface);
		border-color: var(--color-border-strong);
	}

	.action-card.danger {
		color: var(--color-error);
	}

	/* Stat Detail Modal */
	.stat-description {
		color: var(--color-fg-muted);
		font-size: 0.875rem;
		margin: 0 0 1.5rem;
	}

	.stat-breakdown {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.breakdown-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: var(--color-bg-subtle);
		border-radius: 0.5rem;
	}

	.breakdown-label {
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
	}

	.breakdown-value {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.modal-filters {
		margin-bottom: 1.5rem;
	}

	.activity-list.expanded {
		max-height: 400px;
		overflow-y: auto;
	}

	/* Analytics Modal */
	.analytics-metrics {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.metric-card {
		padding: 1.5rem;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
	}

	.metric-label {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin-bottom: 0.5rem;
	}

	.metric-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: 0.25rem;
	}

	.metric-change {
		font-size: 0.75rem;
		font-weight: 500;
	}

	.metric-change.positive {
		color: var(--color-success);
	}

	.metric-change.negative {
		color: var(--color-error);
	}

	.analytics-section {
		margin-bottom: 2rem;
	}

	.analytics-section h4 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 1rem;
	}

	.engagement-stats {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.engagement-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.engagement-label {
		min-width: 80px;
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
	}

	.engagement-bar {
		flex: 1;
		height: 8px;
		background: var(--color-bg-subtle);
		border-radius: 4px;
		overflow: hidden;
	}

	.engagement-fill {
		height: 100%;
		background: linear-gradient(90deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.3));
		transition: width 0.3s ease;
	}

	.engagement-value {
		min-width: 60px;
		text-align: right;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.retention-chart {
		position: relative;
		width: 100%;
		height: 200px;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		margin-bottom: 0.5rem;
		padding: 1rem;
	}

	.retention-chart svg {
		width: 100%;
		height: 100%;
	}

	.retention-labels {
		display: flex;
		justify-content: space-between;
		padding: 0 0.5rem;
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	.retention-note {
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
		margin-top: 0.5rem;
	}

	.traffic-sources {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.traffic-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: var(--color-bg-subtle);
		border-radius: 0.5rem;
	}

	.traffic-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
	}

	.traffic-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}

	.traffic-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.locations-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.location-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: var(--color-bg-subtle);
		border-radius: 0.5rem;
	}

	.location-name {
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
	}

	.location-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	/* Analytics Chat */
	.analytics-chat-section {
		border-top: 1px solid var(--color-border-default);
		padding-top: 2rem;
	}

	.chat-title {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.5rem;
	}

	.chat-intro {
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
		margin-bottom: 1rem;
	}

	.chat-container {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.chat-empty {
		padding: 2rem;
		text-align: center;
	}

	.chat-empty p {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin-bottom: 1.5rem;
	}

	.chat-suggestions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 400px;
		margin: 0 auto;
	}

	.suggestion-btn {
		padding: 0.75rem 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-secondary);
		font-size: 0.875rem;
		text-align: left;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.suggestion-btn:hover {
		background: var(--color-bg-elevated);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
		transform: translateY(-2px);
	}

	.chat-messages {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
		max-height: 400px;
		overflow-y: auto;
	}

	.chat-message {
		display: flex;
	}

	.chat-message.user {
		justify-content: flex-end;
	}

	.chat-message.assistant {
		justify-content: flex-start;
	}

	.message-content {
		max-width: 80%;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		font-size: 0.875rem;
		line-height: 1.5;
		white-space: pre-wrap;
	}

	.chat-message.user .message-content {
		background: rgba(255, 255, 255, 0.1);
		color: var(--color-fg-primary);
	}

	.chat-message.assistant .message-content {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
	}

	.message-content.typing {
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.chat-input-wrapper {
		display: flex;
		gap: 0.5rem;
		padding: 1rem;
		border-top: 1px solid var(--color-border-default);
		background: var(--color-bg-elevated);
	}

	.chat-input {
		flex: 1;
		padding: 0.75rem 1rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-primary);
		font-size: 0.875rem;
		outline: none;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.chat-input:focus {
		border-color: var(--color-border-emphasis);
	}

	.chat-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.chat-send-btn {
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-primary);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.chat-send-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.15);
		border-color: var(--color-border-emphasis);
		transform: translateY(-2px);
	}

	.chat-send-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 1024px) {
		.dashboard-main {
			grid-template-columns: 1fr;
		}

		.video-detail-grid {
			grid-template-columns: 1fr;
		}

		.video-actions-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 768px) {
		.dashboard {
			padding: 5rem 5% 1.5rem;
		}

		.dashboard-header {
			flex-direction: column;
			gap: 1rem;
		}

		.header-actions {
			width: 100%;
			flex-direction: column;
		}

		.search-box {
			width: 100%;
		}

		.search-input {
			width: 100%;
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

		.section-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.table-controls {
			width: 100%;
			flex-wrap: wrap;
		}
	}
</style>
