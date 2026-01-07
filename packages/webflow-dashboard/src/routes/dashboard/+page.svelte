<script lang="ts">
	import type { PageData } from './$types';
	import type { Asset } from '$lib/server/airtable';
	import { goto, invalidate } from '$app/navigation';
	import { Header, AssetsDisplay, OverviewStats, EditProfileModal, SubmissionTracker, StatsBar } from '$lib/components';
	import EditAssetModal from '$lib/components/EditAssetModal.svelte';
	import { toast } from '$lib/stores/toast';

	let { data }: { data: PageData } = $props();

	let searchTerm = $state('');
	let isProfileOpen = $state(false);
	let isEditModalOpen = $state(false);
	let currentEditingAsset = $state<Asset | null>(null);

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
		const asset = data.assets?.find((a) => a.id === id);
		if (asset) {
			currentEditingAsset = asset;
			isEditModalOpen = true;
		}
	}

	function handleEditClose() {
		isEditModalOpen = false;
		currentEditingAsset = null;
	}

	async function handleEditSave(updateData: {
		name?: string;
		description?: string;
		descriptionShort?: string;
		websiteUrl?: string;
		previewUrl?: string;
		thumbnailUrl?: string | null;
		secondaryThumbnailUrl?: string | null;
		carouselImages?: string[];
	}): Promise<void> {
		if (!currentEditingAsset) return;

		const response = await fetch(`/api/assets/${currentEditingAsset.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(updateData)
		});

		if (!response.ok) {
			const errorData = (await response.json()) as { message?: string };
			throw new Error(errorData.message || 'Failed to update asset');
		}

		toast.success('Asset updated successfully');
		handleEditClose();
		await handleRefreshAssets();
	}

	async function handleArchiveAsset(id: string) {
		try {
			const response = await fetch(`/api/assets/${id}/archive`, { method: 'POST' });
			if (response.ok) {
				toast.success('Asset archived successfully');
				invalidate('app:assets');
			} else {
				const errorData = (await response.json()) as { message?: string };
				toast.error(errorData.message || 'Failed to archive asset');
			}
		} catch {
			toast.error('Failed to archive asset');
		}
	}

	async function handleRefreshAssets() {
		invalidate('app:assets');
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
			<!-- Overview Section - Tufte: High density, minimal chrome -->
			<section class="overview-section">
				<div class="page-header">
					<div class="header-text">
						<h1 class="page-title">Welcome back</h1>
						<p class="page-subtitle">Your Webflow templates at a glance.</p>
					</div>
					<SubmissionTracker assets={data.assets || []} variant="compact" userEmail={data.user?.email} />
				</div>

				<!-- Tufte: Single-line high-density metrics bar -->
				<StatsBar assets={data.assets || []} />

				<!-- Detailed breakdown in compact grid -->
				<div class="dashboard-grid">
					<div class="stats-column">
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

	{#if isEditModalOpen && currentEditingAsset}
		<EditAssetModal
			asset={currentEditingAsset}
			onClose={handleEditClose}
			onSave={handleEditSave}
		/>
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
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		margin-bottom: var(--space-xl);
	}

	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-md);
	}

	.header-text {
		flex: 1;
	}

	.page-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.page-subtitle {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: var(--space-xs) 0 0;
	}

	.dashboard-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-md);
	}

	.stats-column {
		display: flex;
		flex-direction: column;
	}

	.assets-section {
		margin-bottom: var(--space-xl);
	}

	@media (max-width: 640px) {
		.page-header {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
