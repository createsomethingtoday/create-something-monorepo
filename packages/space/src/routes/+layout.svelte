<script lang="ts">
	import '../app.css';
	import { Navigation, Footer, Analytics, ModeIndicator } from '@create-something/components';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { afterNavigate, onNavigate } from '$app/navigation';

	let { children, data } = $props();

	// View Transitions API - Hermeneutic Navigation
	// .space: Experimental (300ms)
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

	const navLinks = [
		{ label: 'Experiments', href: '/experiments' },
		{ label: 'Praxis', href: '/praxis' },
		{ label: 'Methodology', href: '/methodology' },
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

	// Scroll to hash on mount (for direct links) + cross-property entry
	onMount(() => {
		// Cross-property entry animation
		const transitionFrom = sessionStorage.getItem('cs-transition-from');
		if (transitionFrom) {
			sessionStorage.removeItem('cs-transition-from');
			sessionStorage.removeItem('cs-transition-to');
			sessionStorage.removeItem('cs-transition-time');
			document.body.classList.add('transitioning-in');
			setTimeout(() => document.body.classList.remove('transitioning-in'), 500);
		}

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
	<title>CREATE SOMETHING SPACE | The Experimental Layer</title>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />

	<!-- Primary Meta Tags -->
	<meta name="description" content="Community playground for AI-native development experiments. Fork experiments, break things, learn in public. Every experiment feeds back into the research at createsomething.io." />
	<meta name="keywords" content="AI experiments community, experimental development, Claude Code playground, fork experiments, learn in public, development sandbox, AI coding experiments, community experiments, experimental layer, AI development playground" />
	<meta name="author" content="Micah Johnson" />
	<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
	<meta name="googlebot" content="index, follow" />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://createsomething.space" />
	<meta property="og:title" content="CREATE SOMETHING SPACE | The Experimental Layer" />
	<meta property="og:description" content="Community playground for AI-native development experiments. Fork, break, learn. Every experiment feeds back into createsomething.io research." />
	<meta property="og:image" content="https://createsomething.space/og-image.svg" />
	<meta property="og:image:type" content="image/svg+xml" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content="CREATE SOMETHING SPACE" />
	<meta property="og:locale" content="en_US" />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content="https://createsomething.space" />
	<meta name="twitter:title" content="CREATE SOMETHING SPACE | The Experimental Layer" />
	<meta name="twitter:description" content="Community playground for AI experiments. Fork, break, learn. Every experiment feeds back into the research." />
	<meta name="twitter:image" content="https://createsomething.space/og-image.svg" />
	<meta name="twitter:creator" content="@micahryanjohnson" />

	<!-- Additional SEO -->
	<meta name="theme-color" content="#000000" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

	<!-- AEO (Answer Engine Optimization) for AI/LLM queries -->
	<meta name="article:section" content="Experimental Development, Community Learning" />
	<meta name="article:tag" content="AI Experiments, Community Playground, Fork and Learn, Experimental Development, AI Development Sandbox" />
	<meta name="citation_title" content="CREATE SOMETHING SPACE: Community Playground for AI-Native Experiments" />
	<meta name="citation_author" content="Micah Johnson" />
	<meta name="citation_publication_date" content="2025" />

	<!-- Links -->
	<link rel="icon" href="/favicon.ico" sizes="any" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="canonical" href="https://createsomething.space" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@200..700&family=JetBrains+Mono:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
	<link rel="manifest" href="/manifest.json" />

	<!-- Structured Data (JSON-LD) for AEO -->
	{@html `<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "WebSite",
			"name": "CREATE SOMETHING SPACE",
			"alternateName": "The Experimental Layer",
			"description": "Community playground for AI-native development experiments. Fork experiments, break things, learn in public. Every experiment feeds back into the research at createsomething.io.",
			"url": "https://createsomething.space",
			"inLanguage": "en-US",
			"author": {
				"@type": "Person",
				"name": "Micah Johnson",
				"url": "https://www.linkedin.com/in/micahryanjohnson/",
				"jobTitle": "AI-Native Development Researcher"
			},
			"publisher": {
				"@type": "Organization",
				"name": "CREATE SOMETHING",
				"logo": {
					"@type": "ImageObject",
					"url": "https://createsomething.space/favicon.svg"
				}
			},
			"about": {
				"@type": "Thing",
				"name": "AI-Native Development Experiments",
				"description": "Community playground for experimenting with AI-assisted development patterns and techniques"
			},
			"keywords": ["AI experiments community", "experimental development", "Claude Code playground", "fork experiments", "learn in public", "development sandbox", "AI coding experiments"],
			"potentialAction": {
				"@type": "SearchAction",
				"target": "https://createsomething.space/experiments?q={search_term_string}",
				"query-input": "required name=search_term_string"
			},
			"isPartOf": {
				"@type": "WebSite",
				"name": "CREATE SOMETHING",
				"url": "https://createsomething.io"
			}
		}
	</script>`}
</svelte:head>

<Analytics property="space" />

<a href="#main-content" class="skip-to-content">Skip to main content</a>

<div class="layout">
	<Navigation
		logo="CREATE SOMETHING"
		logoSuffix=".space"
		links={navLinks}
		currentPath={$page.url.pathname}
		fixed={true}
		ctaLabel="Contact"
		ctaHref="/contact"
	/>

	<main id="main-content" class="content">
		{@render children()}
	</main>

	<Footer
		mode="space"
		showNewsletter={true}
		turnstileSiteKey={data.turnstileSiteKey}
		newsletterTitle="Join the experimental layer"
		newsletterDescription="Get notified when new experiments are added. Fork, break, learn in public."
		aboutText="Community playground for AI-native development experiments. Every experiment feeds back into the research at createsomething.io."
		quickLinks={[
			{ label: 'Experiments', href: '/experiments' },
			{ label: 'Methodology', href: '/methodology' },
			{ label: 'About', href: '/about' },
			{ label: 'Contact', href: '/contact' }
		]}
		showSocial={true}
	/>

	<ModeIndicator current="space" />
</div>

<style>
	.layout {
		min-height: 100vh;
		background: var(--color-bg-pure);
	}

	.content {
		padding-top: 72px;
	}
</style>
