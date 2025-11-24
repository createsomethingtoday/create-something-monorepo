<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	export let property: string = 'io'; // 'agency', 'io', or 'space'

	let tracked = false;

	// Track page view
	async function trackPageView() {
		if (tracked) return;
		tracked = true;

		try {
			await fetch('/api/analytics/track', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					event_type: 'page_view',
					property,
					path: $page.url.pathname,
					referrer: document.referrer || null
				})
			});
		} catch (error) {
			// Silently fail - don't break the page if analytics fails
			console.debug('Analytics tracking failed:', error);
		}
	}

	onMount(() => {
		trackPageView();
	});

	// Track when page changes (SvelteKit navigation)
	$: if ($page.url.pathname) {
		tracked = false;
		trackPageView();
	}

	// Expose tracking function globally for custom events
	if (typeof window !== 'undefined') {
		(window as any).trackEvent = async (
			event_type: string,
			data: Record<string, any> = {}
		) => {
			try {
				await fetch('/api/analytics/track', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						event_type,
						property,
						path: $page.url.pathname,
						...data
					})
				});
			} catch (error) {
				console.debug('Analytics tracking failed:', error);
			}
		};
	}
</script>
