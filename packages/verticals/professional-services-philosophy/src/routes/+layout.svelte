<script lang="ts">
	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { onNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { initSiteConfig } from '$lib/config/context';
	import type { SiteConfig } from '$lib/config/site';

	interface Props {
		children: import('svelte').Snippet;
		data: {
			siteConfig: SiteConfig;
			tenant: { id: string; subdomain: string; status: string } | null;
			configSource: 'tenant' | 'preview' | 'static';
		};
	}

	let { children, data }: Props = $props();

	// View Transitions API
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	onMount(() => {
		initSiteConfig();
	});
</script>

<a href="#main-content" class="skip-link">Skip to main content</a>

<div class="layout">
	<Navigation />
	<main id="main-content" tabindex="-1">
		{@render children()}
	</main>
	<Footer />
</div>

<style>
	.layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	main {
		flex: 1;
	}

	.skip-link {
		position: absolute;
		top: -40px;
		left: 0;
		background: #000;
		color: #fff;
		padding: 8px 16px;
		z-index: 1000;
		transition: top 0.3s;
	}

	.skip-link:focus {
		top: 0;
	}
</style>
