<script lang="ts">
	import type { PageData } from './$types';
	import { Header, Card, CardHeader, CardTitle, CardContent } from '$lib/components';

	let { data }: { data: PageData } = $props();

	let searchTerm = $state('');
	let isProfileOpen = $state(false);

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}

	function handleSearch(term: string) {
		searchTerm = term;
		// Will be used in Phase 5 for asset filtering
	}

	function handleProfileClick() {
		isProfileOpen = true;
		// Profile modal will be implemented in Phase 9
	}
</script>

<svelte:head>
	<title>Dashboard | Webflow Asset Dashboard</title>
</svelte:head>

<div class="dashboard">
	<Header
		userEmail={data.user?.email}
		onLogout={handleLogout}
		onProfileClick={handleProfileClick}
		onSearch={handleSearch}
	/>

	<main class="main-content">
		<div class="content-wrapper">
			<!-- Overview Section -->
			<section class="overview-section">
				<h1 class="page-title">Welcome back</h1>
				<p class="page-subtitle">Here's an overview of your Webflow templates and assets.</p>

				<div class="stats-grid">
					<Card>
						<CardHeader>
							<CardTitle>Total Templates</CardTitle>
						</CardHeader>
						<CardContent>
							<div class="stat-value">--</div>
							<p class="stat-label">Published templates</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Pending Review</CardTitle>
						</CardHeader>
						<CardContent>
							<div class="stat-value">--</div>
							<p class="stat-label">Awaiting approval</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>This Month</CardTitle>
						</CardHeader>
						<CardContent>
							<div class="stat-value">--/6</div>
							<p class="stat-label">Submissions used</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Total Revenue</CardTitle>
						</CardHeader>
						<CardContent>
							<div class="stat-value">$--</div>
							<p class="stat-label">All time earnings</p>
						</CardContent>
					</Card>
				</div>
			</section>

			<!-- Assets Section Placeholder -->
			<section class="assets-section">
				<div class="section-header">
					<h2 class="section-title">Your Assets</h2>
				</div>

				<Card>
					<CardContent>
						<div class="empty-state">
							<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
							</svg>
							<h3>Assets will appear here</h3>
							<p>Your published and pending templates will be displayed in this section.</p>
						</div>
					</CardContent>
				</Card>
			</section>
		</div>
	</main>
</div>

<style>
	.dashboard {
		min-height: 100vh;
		background: var(--color-bg-pure);
	}

	.main-content {
		padding: var(--space-lg) var(--space-md);
	}

	.content-wrapper {
		max-width: 80rem;
		margin: 0 auto;
	}

	.overview-section {
		margin-bottom: var(--space-xl);
	}

	.page-title {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.page-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-lg);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.stat-value {
		font-size: var(--text-display);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		line-height: 1;
	}

	.stat-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: var(--space-xs) 0 0;
	}

	.assets-section {
		margin-bottom: var(--space-xl);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-md);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-2xl) var(--space-md);
		text-align: center;
	}

	.empty-state svg {
		color: var(--color-fg-muted);
		margin-bottom: var(--space-md);
	}

	.empty-state h3 {
		font-size: var(--text-body-lg);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.empty-state p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
		max-width: 24rem;
	}
</style>
