<script lang="ts">
	import type { PageData } from './$types';
	import { ArcDeck } from '@create-something/arc';
	import { APP_REVIEW_GOVERNANCE_COMPOSITION } from '@create-something/atlas-composition';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>App Review Governance Arc | J AND J HOME HEALTH</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="admin-arc">
	<header class="admin-arc__context">
		<a href="/admin/contacts">Back to customer workspace</a>
		<span>Private customer Arc · {data.customerOwner}</span>
	</header>
	<ArcDeck
		composition={APP_REVIEW_GOVERNANCE_COMPOSITION}
		routeId="app-review-governance-arc"
		title="App Review, explained for the people involved"
		description="Submission → decision → next step → proof"
		ariaLabel="App Review Governance Arc scenes"
		assetBaseUrl="https://createsomething.agency"
		enablePresentation
	/>
</main>

<style>
	.admin-arc { min-height: 100vh; background: var(--color-performance-paper, #f3f3f0); }
	.admin-arc__context { display: flex; justify-content: space-between; gap: 1rem; align-items: center; min-height: 3.5rem; padding: .75rem 1rem; border-bottom: 1px solid var(--color-performance-line, #d7d7d2); background: var(--color-performance-panel, #fff); font: 650 .72rem/1.3 var(--font-performance-mono, ui-monospace, monospace); text-transform: uppercase; }
	.admin-arc__context a { color: var(--color-performance-ink, #090909); }
	.admin-arc__context span { color: var(--color-performance-muted, #5e6268); text-align: right; }
	@media (max-width: 40rem) { .admin-arc__context { align-items: flex-start; flex-direction: column; } .admin-arc__context span { text-align: left; } }
</style>
