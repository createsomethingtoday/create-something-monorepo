<script lang="ts">
	import type { PageData } from './$types';
	import { Header, BackNavigation } from '$lib/components';
	import AssetDraftEditor from '$lib/components/AssetDraftEditor.svelte';

	let { data }: { data: PageData } = $props();

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<svelte:head>
	<title>Create Draft | Webflow Asset Dashboard</title>
</svelte:head>

<div class="draft-page">
	<Header onLogout={handleLogout} showMarketplace={data.hasTemplateAsset} />

	<main class="main-content">
		<div class="content-wrapper">
			<BackNavigation />
			<AssetDraftEditor userEmail={data.userEmail} />
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
		gap: var(--space-md);
	}
</style>
