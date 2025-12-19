<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidate } from '$app/navigation';
	import { Header, Card, CardHeader, CardTitle, CardContent, AssetsDisplay, OverviewStats, EditProfileModal, SubmissionTracker } from '$lib/components';

	let { data }: { data: PageData } = $props();

	let searchTerm = $state('');
	let isProfileOpen = $state(false);

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}

	function handleSearch(term: string) {
		searchTerm = term;
	}

	function handleProfileClick() {
		isProfileOpen = true;
	}

	function handleProfileClose() {
		isProfileOpen = false;
	}

	function handleViewAsset(id: string) {
		goto(`/assets/${id}`);
	}

	function handleEditAsset(id: string) {
		// Edit modal will be implemented in Phase 7
		console.log('Edit asset:', id);
	}

	async function handleArchiveAsset(id: string) {
		const response = await fetch(`/api/assets/${id}/archive`, { method: 'POST' });
		if (response.ok) {
			// Refresh the page data
			invalidate('app:assets');
		} else {
			const error = await response.json();
			console.error('Archive failed:', error);
		}
	}

	async function handleRefreshAssets() {
		invalidate('app:assets');
	}

	// Calculate stats from assets
	const stats = $derived(() => {
		const assets = data.assets || [];
		const published = assets.filter((a) => a.status === 'Published').length;
		const pending = assets.filter((a) => ['Upcoming', 'Scheduled'].includes(a.status)).length;
		const totalRevenue = assets.reduce((sum, a) => sum + (a.cumulativeRevenue || 0), 0);

		return {
			totalTemplates: published,
			pendingReview: pending,
			totalRevenue
		};
	});
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

				<div class="dashboard-grid">
					<!-- Quick Stats -->
					<div class="quick-stats">
						<Card>
							<CardHeader>
								<CardTitle>Total Templates</CardTitle>
							</CardHeader>
							<CardContent>
								<div class="stat-value">{stats().totalTemplates}</div>
								<p class="stat-label">Published templates</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Pending Review</CardTitle>
							</CardHeader>
							<CardContent>
								<div class="stat-value">{stats().pendingReview}</div>
								<p class="stat-label">Awaiting approval</p>
							</CardContent>
						</Card>

						<SubmissionTracker assets={data.assets || []} />
					</div>

					<!-- Detailed Stats -->
					<div class="detailed-stats">
						<OverviewStats assets={data.assets || []} />
					</div>
				</div>
			</section>

			<!-- Assets Section -->
			<section class="assets-section">
				<AssetsDisplay
					assets={data.assets || []}
					{searchTerm}
					onView={handleViewAsset}
					onEdit={handleEditAsset}
					onArchive={handleArchiveAsset}
					onRefresh={handleRefreshAssets}
				/>
			</section>
		</div>
	</main>

	{#if isProfileOpen}
		<EditProfileModal onClose={handleProfileClose} />
	{/if}
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

	.dashboard-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-lg);
	}

	.quick-stats {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.detailed-stats {
		display: flex;
		flex-direction: column;
	}

	@media (max-width: 1024px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
		}
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
</style>
