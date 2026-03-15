<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import type { LayoutData } from './$types';
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { Toast } from '$lib/components';
	import { getPageName, getRouteGroup, trackPageView } from '$lib/utils/analytics';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let lastTrackedLocation = '';

	function trackCurrentPage(pathname: string, search: string): void {
		const locationKey = `${pathname}${search}`;
		if (locationKey === lastTrackedLocation) return;

		lastTrackedLocation = locationKey;

		trackPageView(getPageName(pathname), {
			route_group: getRouteGroup(pathname),
			query_present: search.length > 0,
			is_authenticated: Boolean(data.user?.email)
		});
	}

	onMount(() => {
		trackCurrentPage(window.location.pathname, window.location.search);

		afterNavigate(({ to }) => {
			if (!to?.url) return;
			trackCurrentPage(to.url.pathname, to.url.search);
		});
	});
</script>

<svelte:head>
	<title>Webflow Asset Dashboard</title>
	<meta name="description" content="Manage your Webflow templates and assets" />
</svelte:head>

{@render children()}
<Toast />
