<script lang="ts">
	import '../app.css';
	import { Navigation } from '@create-something/components';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';

	let { children } = $props();

	const navLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'Services', href: '/services' },
		{ label: 'Work', href: '/work' },
		{ label: 'About', href: '/about' }
	];

	// Handle hash scrolling
	function scrollToHash(hash: string) {
		if (!hash) return;

		const element = document.querySelector(hash);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	// Scroll to hash on mount (for direct links)
	onMount(() => {
		if (window.location.hash) {
			setTimeout(() => scrollToHash(window.location.hash), 100);
		}
	});

	// Scroll to hash after navigation
	afterNavigate(({ to }) => {
		if (to?.url.hash) {
			setTimeout(() => scrollToHash(to.url.hash), 100);
		}
	});
</script>

<svelte:head>
	<title>CREATE SOMETHING Agency | AI-Native Development Services</title>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="description" content="Professional AI-native development services. Consulting, implementation, training - backed by research from createsomething.io" />
	<meta name="keywords" content="AI development services, Claude Code consulting, Cloudflare Workers, developer training, AI transformation" />
	<meta name="author" content="Micah Johnson" />
	<meta name="robots" content="index, follow" />

	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://createsomething.agency" />
	<meta property="og:title" content="CREATE SOMETHING Agency | AI-Native Services" />
	<meta property="og:description" content="Professional AI-native development services backed by real research" />
	<meta property="og:image" content="https://createsomething.agency/og-image.svg" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="CREATE SOMETHING Agency" />
	<meta name="twitter:description" content="AI-native development services" />
	<meta name="twitter:creator" content="@micahryanjohnson" />

	<link rel="icon" href="/favicon.png" type="image/png" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="icon" href="/favicon.ico" sizes="any" />
	<link rel="canonical" href="https://createsomething.agency" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@200..700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
</svelte:head>

<div class="min-h-screen bg-black">
	<Navigation
		logo="CREATE SOMETHING"
		logoSuffix=".agency"
		links={navLinks}
		currentPath={$page.url.pathname}
		fixed={true}
		ctaLabel="Get Started"
		ctaHref="/contact"
	/>

	<div class="pt-[72px]">
		{@render children()}
	</div>
</div>
