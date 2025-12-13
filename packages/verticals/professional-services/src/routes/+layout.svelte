<script lang="ts">
	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import StickyCTA from '$lib/components/StickyCTA.svelte';
	import { onNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { initSiteConfig } from '$lib/config/context';
	import { browser } from '$app/environment';
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

	// Initialize site config from window.__SITE_CONFIG__ if available
	// This makes the config reactive via the store
	initSiteConfig();

	// Don't show sticky CTA on contact page (already there)
	let showStickyCTA = $derived($page.url.pathname !== '/contact');

	// View Transitions API - Canon Motion Philosophy
	// Motion serves "disclosure" (reveal state/relationships), not decoration
	// Zuhandenheit: The transition recedes into transparent use
	onNavigate((navigation) => {
		// Check for browser support
		if (!document.startViewTransition) return;

		// Respect reduced motion preference
		if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	// Page entrance animation
	onMount(() => {
		// Add staggered reveal to main content sections
		const sections = document.querySelectorAll('main > section, main > div > section');
		sections.forEach((section, index) => {
			section.classList.add('page-enter');
			(section as HTMLElement).style.animationDelay = `${index * 100}ms`;
		});
	});
</script>

<a href="#main-content" class="skip-link">Skip to main content</a>

<div class="layout min-h-screen flex flex-col">
	<Navigation />
	<main id="main-content" class="flex-1" tabindex="-1">
		{@render children()}
	</main>
	<Footer />

	{#if showStickyCTA}
		<StickyCTA />
	{/if}
</div>

<style>
	.layout {
		background: var(--color-bg-pure);
	}
</style>
