	<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { ArcDeck, visibleComposition } from '@create-something/arc';

	let { data }: { data: PageData } = $props();
	const routeId = 'app-review-governance-arc';
	const composition = visibleComposition(data.document, routeId);
	const sceneCount = composition.routes.find((route) => route.id === routeId)?.sceneIds.length ?? 0;
	let completed = false;

	function record(event: 'opened' | 'completed' | 'exited', beacon = false) {
		const endpoint = `/api/arcs/${data.document.id}/analytics`;
		const body = JSON.stringify({ event, revision: data.document.revision });
		if (beacon && navigator.sendBeacon) navigator.sendBeacon(endpoint, body);
		else void fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true });
	}

	function handleSceneChange(_sceneId: string, index: number) {
		if (!completed && index === sceneCount - 1) {
			completed = true;
			record('completed');
		}
	}

	onMount(() => {
		record('opened');
		return () => record('exited', true);
	});
</script>

<svelte:head>
	<title>App Review Governance Arc | J AND J HOME HEALTH</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="admin-arc">
	<header class="admin-arc__context">
		<nav aria-label="Arc navigation"><a href="/admin/arcs">Arc library</a><a href="/admin/arcs/app-review-governance/studio">Open Studio</a><a href="/admin/arcs/app-review-governance/playbook">Playbook</a><a href="/admin/arcs/app-review-governance/runbook">Runbook</a></nav>
		<span>Private customer Arc · {data.document.ownerContact} · r{data.document.revision}</span>
	</header>
	<ArcDeck
		{composition}
		{routeId}
		title="App Review, explained for the people involved"
		description="Submission → decision → next step → proof"
		ariaLabel="App Review Governance Arc scenes"
		assetBaseUrl="https://createsomething.agency"
		enablePresentation
		onSceneChange={handleSceneChange}
	/>
</main>

<style>
	.admin-arc { min-height: 100vh; background: var(--color-performance-paper, #f3f3f0); }
	.admin-arc__context { display: flex; justify-content: space-between; gap: 1rem; align-items: center; min-height: 3.5rem; padding: .75rem 1rem; border-bottom: 1px solid var(--color-performance-line, #d7d7d2); background: var(--color-performance-panel, #fff); font: 650 .72rem/1.3 var(--font-performance-mono, ui-monospace, monospace); text-transform: uppercase; }
	.admin-arc__context nav { display: flex; flex-wrap: wrap; gap: .9rem; }
	.admin-arc__context a { color: var(--color-performance-ink, #090909); }
	.admin-arc__context span { color: var(--color-performance-muted, #5e6268); text-align: right; }
	@media (max-width: 40rem) { .admin-arc__context { align-items: flex-start; flex-direction: column; } .admin-arc__context span { text-align: left; } }
</style>
