<script lang="ts">
	/**
	 * OUTERFIELDS Platform Preview
	 *
	 * Tabbed preview showing User Portal and Admin Dashboard
	 */
	import { Monitor, LayoutDashboard, Play, Plus, Video, BarChart3, Users, Settings, CloudUpload, CreditCard, PlayCircle, ExternalLink } from 'lucide-svelte';

	let activeTab = $state<'user' | 'admin'>('user');
</script>

<section class="preview-section" id="platform">
	<div class="preview-container">
		<div class="section-header">
			<span class="section-badge">Platform Preview</span>
			<h2 class="section-title">Experience Both Sides</h2>
			<p class="section-description">
				See what your subscribers experience and how you manage your content network.
			</p>
		</div>

		<div class="tab-container">
			<div class="tab-buttons">
				<button
					class="tab-button"
					class:active={activeTab === 'user'}
					onclick={() => (activeTab = 'user')}
				>
					<Monitor size={20} />
					User Portal
				</button>
				<button
					class="tab-button"
					class:active={activeTab === 'admin'}
					onclick={() => (activeTab = 'admin')}
				>
					<LayoutDashboard size={20} />
					Admin Dashboard
				</button>
			</div>
		</div>

		<div class="preview-frame">
			<div class="frame-chrome">
				<div class="chrome-dots">
					<span class="dot red"></span>
					<span class="dot yellow"></span>
					<span class="dot green"></span>
				</div>
				<div class="chrome-url">
					{activeTab === 'user' ? 'app.outerfields.com' : 'admin.outerfields.com'}
				</div>
			</div>

			<div class="frame-content">
				{#if activeTab === 'user'}
					<div class="user-preview">
						<!-- Simplified User Portal Preview -->
						<div class="preview-nav">
							<div class="preview-logo">OUTERFIELDS</div>
							<div class="preview-nav-links">
								<span>Home</span>
								<span>Series</span>
								<span>Movies</span>
								<span>My List</span>
							</div>
						</div>

						<div class="preview-hero">
							<div class="preview-hero-content">
								<span class="preview-badge">Featured Series</span>
								<h3 class="preview-hero-title">The Void Walker</h3>
								<p class="preview-hero-desc">In a future where silence is the only currency...</p>
								<div class="preview-buttons">
									<button class="preview-btn primary">
										<Play size={16} />
										Play Now
									</button>
									<button class="preview-btn secondary">
										<Plus size={16} />
										My List
									</button>
								</div>
							</div>
						</div>

						<div class="preview-rail">
							<h4 class="rail-title">New Releases</h4>
							<div class="rail-items">
								<div class="rail-item"></div>
								<div class="rail-item"></div>
								<div class="rail-item"></div>
								<div class="rail-item"></div>
							</div>
						</div>
					</div>
				{:else}
					<div class="admin-preview">
						<!-- Simplified Admin Dashboard Preview -->
						<div class="admin-sidebar">
							<div class="sidebar-item active">
								<LayoutDashboard size={20} />
							</div>
							<div class="sidebar-item">
								<Video size={20} />
							</div>
							<div class="sidebar-item">
								<BarChart3 size={20} />
							</div>
							<div class="sidebar-item">
								<Users size={20} />
							</div>
							<div class="sidebar-item">
								<Settings size={20} />
							</div>
						</div>

						<div class="admin-main">
							<div class="admin-header">
								<h3>Overview</h3>
								<button class="admin-upload">
									<CloudUpload size={16} />
									Upload
								</button>
							</div>

							<div class="admin-stats">
								<div class="admin-stat-card">
									<span class="stat-icon">
										<CreditCard size={16} />
									</span>
									<div class="stat-info">
										<span class="stat-label">Revenue</span>
										<span class="stat-value">$42,850</span>
									</div>
									<span class="stat-badge success">+12.5%</span>
								</div>
								<div class="admin-stat-card">
									<span class="stat-icon">
										<Users size={16} />
									</span>
									<div class="stat-info">
										<span class="stat-label">Subscribers</span>
										<span class="stat-value">128.4k</span>
									</div>
									<span class="stat-badge success">+5.2%</span>
								</div>
								<div class="admin-stat-card">
									<span class="stat-icon">
										<PlayCircle size={16} />
									</span>
									<div class="stat-info">
										<span class="stat-label">Views (30d)</span>
										<span class="stat-value">1.2M</span>
									</div>
									<span class="stat-badge neutral">-0.8%</span>
								</div>
							</div>

							<div class="admin-chart">
								<div class="chart-header">
									<span>Engagement Performance</span>
								</div>
								<div class="chart-placeholder">
									<svg viewBox="0 0 400 100" preserveAspectRatio="none">
										<defs>
											<linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
												<stop offset="0%" stop-color="#ffffff" stop-opacity="0.2" />
												<stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
											</linearGradient>
										</defs>
										<path
											d="M0,80 C50,70 75,90 125,50 C175,10 200,30 250,25 C300,20 325,40 400,15 L400,100 L0,100 Z"
											fill="url(#chartGrad)"
										/>
										<path
											d="M0,80 C50,70 75,90 125,50 C175,10 200,30 250,25 C300,20 325,40 400,15"
											fill="none"
											stroke="#ffffff"
											stroke-width="2"
										/>
									</svg>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<div class="preview-cta">
			<a href={activeTab === 'user' ? '/demo' : '/admin-demo'} class="btn-primary">
				<ExternalLink size={20} />
				Try Full {activeTab === 'user' ? 'User Portal' : 'Admin Dashboard'}
			</a>
		</div>
	</div>
</section>

<style>
	.preview-section {
		padding: 6rem 1.5rem;
		background: var(--color-bg-pure);
	}

	.preview-container {
		max-width: 72rem;
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.section-badge {
		display: inline-block;
		padding: 0.375rem 0.75rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1rem;
	}

	.section-title {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
	}

	.section-description {
		font-size: 1.125rem;
		color: var(--color-fg-muted);
		max-width: 32rem;
		margin: 0 auto;
	}

	.tab-container {
		display: flex;
		justify-content: center;
		margin-bottom: 2rem;
	}

	.tab-buttons {
		display: inline-flex;
		gap: 0.25rem;
		padding: 0.25rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
	}

	.tab-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-fg-muted);
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.tab-button:hover {
		color: var(--color-fg-primary);
	}

	.tab-button.active {
		color: var(--color-fg-primary);
		background: var(--color-bg-surface-hover);
	}

	.preview-frame {
		border-radius: 1rem;
		overflow: hidden;
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-pure);
	}

	.frame-chrome {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background: var(--color-bg-surface);
		border-bottom: 1px solid var(--color-border-default);
	}

	.chrome-dots {
		display: flex;
		gap: 0.375rem;
	}

	.dot {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
	}

	.dot.red {
		background: #ff5f57;
	}
	.dot.yellow {
		background: #febc2e;
	}
	.dot.green {
		background: #28c840;
	}

	.chrome-url {
		flex: 1;
		text-align: center;
		font-size: 0.75rem;
		color: var(--color-fg-subtle);
	}

	.frame-content {
		min-height: 28rem;
		overflow: hidden;
	}

	/* User Preview Styles */
	.user-preview {
		background: var(--color-bg-pure);
	}

	.preview-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		background: rgba(0, 0, 0, 0.6);
	}

	.preview-logo {
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.preview-nav-links {
		display: flex;
		gap: 1.5rem;
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	.preview-hero {
		background: rgba(255, 255, 255, 0.03);
		padding: 3rem 1.5rem;
	}

	.preview-hero-content {
		max-width: 24rem;
	}

	.preview-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.25rem;
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		margin-bottom: 0.5rem;
	}

	.preview-hero-title {
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.preview-hero-desc {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
		margin: 0 0 1rem;
	}

	.preview-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.preview-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem 1rem;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: 0.375rem;
		border: none;
		cursor: pointer;
	}

	.preview-btn.primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.preview-btn.secondary {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
	}

	.preview-rail {
		padding: 1.5rem;
	}

	.rail-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
	}

	.rail-items {
		display: flex;
		gap: 0.75rem;
	}

	.rail-item {
		width: 8rem;
		height: 4.5rem;
		background: var(--color-bg-surface);
		border-radius: 0.375rem;
		border: 1px solid var(--color-border-default);
	}

	/* Admin Preview Styles */
	.admin-preview {
		display: flex;
		min-height: 28rem;
	}

	.admin-sidebar {
		width: 4rem;
		padding: 1rem 0;
		background: var(--color-bg-pure);
		border-right: 1px solid var(--color-border-default);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.sidebar-item {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		color: var(--color-fg-subtle);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.sidebar-item:hover {
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
	}

	.sidebar-item.active {
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
	}

	.admin-main {
		flex: 1;
		padding: 1.5rem;
	}

	.admin-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.admin-header h3 {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.admin-upload {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 1rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: 0.75rem;
		font-weight: 600;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
	}

	.admin-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.admin-stat-card {
		padding: 1rem;
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
		border-radius: 0.75rem;
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.stat-icon {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface);
		border-radius: 0.5rem;
		color: var(--color-fg-muted);
	}

	.stat-info {
		flex: 1;
	}

	.stat-info .stat-label {
		display: block;
		font-size: 0.625rem;
		color: var(--color-fg-subtle);
		margin-bottom: 0.125rem;
	}

	.stat-info .stat-value {
		display: block;
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.stat-badge {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	.stat-badge.success {
		color: var(--color-success);
		background: var(--color-success-muted);
	}

	.stat-badge.neutral {
		color: var(--color-fg-subtle);
		background: var(--color-bg-surface);
	}

	.admin-chart {
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.chart-header {
		padding: 1rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		border-bottom: 1px solid var(--color-border-default);
	}

	.chart-placeholder {
		padding: 1rem;
		height: 6rem;
	}

	.chart-placeholder svg {
		width: 100%;
		height: 100%;
	}

	.preview-cta {
		text-align: center;
		margin-top: 2rem;
	}

	@media (max-width: 768px) {
		.admin-stats {
			grid-template-columns: 1fr;
		}

		.preview-nav-links {
			display: none;
		}
	}
</style>
