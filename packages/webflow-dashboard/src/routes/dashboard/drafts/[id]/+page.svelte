<script lang="ts">
	import type { PageData } from './$types';
	import { Header, BackNavigation } from '$lib/components';
	import AssetDraftEditor from '$lib/components/AssetDraftEditor.svelte';
	import { formatStableDraftDateTime } from '$lib/utils/format';

	let { data }: { data: PageData } = $props();

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}

	function getSavedAtLabel() {
		return formatStableDraftDateTime(data.draft.updatedAt);
	}
</script>

<svelte:head>
	<title>{data.draft.title || 'Edit Draft'} | Webflow Asset Dashboard</title>
</svelte:head>

<div class="draft-page">
	<Header onLogout={handleLogout} showMarketplace={data.hasTemplateAsset} />

	<main class="main-content">
		<div class="content-wrapper">
			<BackNavigation />
			<section class="page-intro draft-intro">
				<div class="draft-intro__copy">
					<span class="draft-kicker">Saved draft workspace</span>
					<h1 class="page-intro__title">{data.draft.title || `Continue ${data.draft.assetType.toLowerCase()} draft`}</h1>
					<p class="page-intro__subtitle">
						Keep refining this {data.draft.assetType.toLowerCase()} in the dashboard. It stays in
						Cloudflare until you choose to promote it into an Airtable asset.
					</p>
				</div>
				<div class="draft-evidence" aria-label="Draft workflow summary">
					<span><strong>{data.draft.assetType}</strong> draft</span>
					<span><strong>Last saved</strong> {getSavedAtLabel()}</span>
					<span><strong>Airtable</strong> on promotion</span>
				</div>
			</section>
			<AssetDraftEditor userEmail={data.userEmail} draft={data.draft} />
		</div>
	</main>
</div>

<style>
	.draft-page {
		min-height: 100vh;
		background: var(--color-bg-pure);
	}

	.main-content {
		padding: var(--space-lg) var(--space-md);
	}

	.content-wrapper {
		max-width: var(--layout-content-max-width);
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.draft-intro {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.draft-intro__copy {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		max-width: 48rem;
	}

	.draft-kicker {
		display: inline-flex;
		align-items: center;
		font-size: 0.72rem;
		font-weight: var(--font-semibold);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	.draft-evidence {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.85rem;
		color: var(--color-fg-tertiary);
		font-size: 0.98rem;
		line-height: 1.4;
	}

	.draft-evidence span {
		position: relative;
		white-space: nowrap;
	}

	.draft-evidence span:not(:first-child)::before {
		content: '•';
		color: var(--color-fg-muted);
		margin-right: 0.85rem;
	}

	.draft-evidence strong {
		font-variant-numeric: tabular-nums;
		color: var(--color-fg-primary);
		font-weight: var(--font-semibold);
	}

	@media (max-width: 640px) {
		.main-content {
			padding: var(--space-md);
		}
	}
</style>
