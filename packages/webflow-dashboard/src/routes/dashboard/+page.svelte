<script lang="ts">
	import type { PageData } from './$types';
	import type { Asset } from '$lib/server/airtable';
	import { goto, invalidate } from '$app/navigation';
	import { Header, AssetsDisplay, OverviewStats, SubmissionTracker, StatsBar } from '$lib/components';
	import { toast } from '$lib/stores/toast';

	let { data }: { data: PageData } = $props();

	let searchTerm = $state('');
	let isProfileOpen = $state(false);
	let isEditModalOpen = $state(false);
	let isLoadingEditAsset = $state(false);
	let currentEditingAsset = $state<Asset | null>(null);
	
	// Lazy-loaded modal components
	// NOTE: Svelte 5 dynamic component typing is a bit different; keep this permissive for lazy-loading.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let EditProfileModal = $state<any>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let EditAssetModal = $state<any>(null);

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}

	function handleSearch(term: string) {
		searchTerm = term;
	}

	async function handleProfileClick() {
		// Lazy load the EditProfileModal component
		if (!EditProfileModal) {
			const module = await import('$lib/components/EditProfileModal.svelte');
			EditProfileModal = module.default;
		}
		isProfileOpen = true;
	}

	function handleProfileClose() {
		isProfileOpen = false;
	}

	function handleViewAsset(id: string) {
		goto(`/assets/${id}`);
	}

	async function handleEditAsset(id: string) {
		// Lazy load the EditAssetModal component
		if (!EditAssetModal) {
			const module = await import('$lib/components/EditAssetModal.svelte');
			EditAssetModal = module.default;
		}

		isLoadingEditAsset = true;
		try {
			// Fetch full asset details (includes short + long description fields)
			const response = await fetch(`/api/assets/${id}`);
			if (!response.ok) {
				// If forbidden, fetch debug payload (same session/cookies) to help troubleshoot Airtable ownership matching
				if (response.status === 403) {
					try {
						const dbgRes = await fetch(`/api/assets/${id}?debug=1`);
						const dbgJson = await dbgRes.json();
						// eslint-disable-next-line no-console
						console.error('[EditAssetModal][OwnershipDebug]', dbgJson);
						toast.error('Permission denied loading asset details. Debug info logged to console.');
					} catch (e) {
						// eslint-disable-next-line no-console
						console.error('[EditAssetModal][OwnershipDebug] Failed to load debug info', e);
					}
				}

				const errorData = (await response.json().catch(() => ({}))) as { message?: string };
				throw new Error(errorData.message || 'Failed to load asset details');
			}
			const result = (await response.json()) as { asset: Asset };
			currentEditingAsset = result.asset;
			isEditModalOpen = true;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to load asset details';
			toast.error(message);
			currentEditingAsset = null;
			isEditModalOpen = false;
		} finally {
			isLoadingEditAsset = false;
		}
	}

	function handleEditClose() {
		isEditModalOpen = false;
		currentEditingAsset = null;
	}

	async function handleEditSave(updateData: {
		name?: string;
		descriptionShort?: string;
		descriptionLongHtml?: string;
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
				// Await invalidate to ensure data refresh completes
				await invalidate('app:assets');
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

	{#if isProfileOpen && EditProfileModal}
		<svelte:component this={EditProfileModal} onClose={handleProfileClose} />
	{/if}

	{#if isEditModalOpen && currentEditingAsset && EditAssetModal}
		<svelte:component
			this={EditAssetModal}
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
