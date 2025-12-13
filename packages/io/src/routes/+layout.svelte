<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate, onNavigate } from '$app/navigation';
	import { Navigation, Footer, Analytics, ModeIndicator } from '@create-something/components';
	import { page } from '$app/stores';

	// View Transitions API - Hermeneutic Navigation
	// "Navigation should feel like dwelling, not jumping"
	onNavigate((navigation) => {
		// Progressive enhancement: skip if API not available
		if (!document.startViewTransition) return;

		// Respect reduced motion preference
		if (typeof window !== 'undefined') {
			const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			if (prefersReducedMotion) return;
		}

		// Set mode-specific duration (300ms for .io - analytical)
		document.documentElement.style.setProperty('--view-transition-duration', '300ms');

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	// Handle cross-property entry animations
	onMount(() => {
		// Check if arriving from another CREATE Something property
		const transitionFrom = sessionStorage.getItem('cs-transition-from');
		if (transitionFrom) {
			sessionStorage.removeItem('cs-transition-from');
			sessionStorage.removeItem('cs-transition-to');
			sessionStorage.removeItem('cs-transition-time');

			// Play entry animation
			document.body.classList.add('transitioning-in');
			setTimeout(() => {
				document.body.classList.remove('transitioning-in');
			}, 500);
		}
	});

	let { children, data } = $props();

	const navLinks = [
		{ label: 'Experiments', href: '/experiments' },
		{ label: 'Papers', href: '/papers' },
		{ label: 'Methodology', href: '/methodology' },
		{ label: 'About', href: '/about' }
	];

	// Handle hash scrolling
	function scrollToHash(hash: string) {
		if (!hash) return;

		// Try multiple times with increasing delays to ensure component is rendered
		const attemptScroll = (attempts = 0, maxAttempts = 5) => {
			const element = document.querySelector(hash);
			if (element) {
				// Account for fixed navigation height (approximately 72px)
				const navHeight = 72;
				const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
				const offsetPosition = elementPosition - navHeight;

				window.scrollTo({
					top: offsetPosition,
					behavior: 'smooth'
				});
			} else if (attempts < maxAttempts) {
				setTimeout(() => attemptScroll(attempts + 1, maxAttempts), 100 * (attempts + 1));
			}
		};

		attemptScroll();
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
	<!-- Basic Meta Tags -->
	<title>CREATE SOMETHING | Systems Thinking for AI-Native Development</title>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="description" content="Systematic evaluation of AI-native development with real data. Tracked experiments using Claude Code + Cloudflare — not just blog posts, but honest results with precise metrics: time, costs, errors, and learnings." />
	<meta name="keywords" content="AI-native development, Claude Code, Cloudflare Workers, tracked experiments, development metrics, AI-assisted coding, TanStack Router, D1 database, systems thinking, experiment tracking, development costs, time tracking, error analysis, AI development patterns" />
	<meta name="author" content="Micah Johnson" />
	<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
	<meta name="googlebot" content="index, follow" />

	<!-- Theme & PWA -->
	<meta name="theme-color" content="#000000" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black" />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://createsomething.io" />
	<meta property="og:title" content="CREATE SOMETHING | AI-Native Development Experiments" />
	<meta property="og:description" content="Systematic evaluation of AI-native development with tracked experiments. Real data from building with Claude Code + Cloudflare: time, costs, errors, and honest learnings." />
	<meta property="og:image" content="https://createsomething.io/og-image.svg" />
	<meta property="og:image:type" content="image/svg+xml" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content="CREATE SOMETHING" />
	<meta property="og:locale" content="en_US" />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content="https://createsomething.io" />
	<meta name="twitter:title" content="CREATE SOMETHING | AI-Native Development Experiments" />
	<meta name="twitter:description" content="Tracked experiments with Claude Code + Cloudflare. Real metrics: time, costs, errors. Not blog posts—honest data from building in production." />
	<meta name="twitter:image" content="https://createsomething.io/og-image.svg" />
	<meta name="twitter:creator" content="@micahryanjohnson" />

	<!-- AEO (Answer Engine Optimization) -->
	<meta name="article:section" content="AI-Native Development Research" />
	<meta name="article:tag" content="Claude Code, Cloudflare Workers, Development Metrics, Experiment Tracking, AI-Assisted Coding" />
	<meta name="citation_title" content="CREATE SOMETHING: Systematic Evaluation of AI-Native Development" />
	<meta name="citation_author" content="Micah Johnson" />
	<meta name="citation_publication_date" content="2025" />

	<!-- Favicons & Manifest -->
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
	<link rel="canonical" href="https://createsomething.io" />
	<link rel="manifest" href="/manifest.json" />

	<!-- Fonts -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@200..700&family=JetBrains+Mono:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>

	<!-- Structured Data (JSON-LD) -->
	{@html `<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "WebSite",
			"name": "CREATE SOMETHING",
			"alternateName": "AI-Native Development Research",
			"description": "Systematic evaluation of AI-native development through tracked experiments. Real data from building with Claude Code and Cloudflare: development time, costs, error counts, and honest learnings from production systems.",
			"url": "https://createsomething.io",
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
					"url": "https://createsomething.io/favicon.svg"
				}
			},
			"about": {
				"@type": "Thing",
				"name": "AI-Native Development",
				"description": "Development practices and patterns using AI coding assistants like Claude Code with modern infrastructure"
			},
			"keywords": ["AI-native development", "Claude Code experiments", "Cloudflare Workers", "development metrics tracking", "AI-assisted coding", "experiment-driven development", "TanStack Router", "systems thinking", "transparent development costs"],
			"potentialAction": {
				"@type": "SearchAction",
				"target": "https://createsomething.io/articles?q={search_term_string}",
				"query-input": "required name=search_term_string"
			}
		}
	</script>`}
</svelte:head>

<Analytics property="io" />

<div class="layout-root">
	<Navigation
		logo="CREATE SOMETHING"
		links={navLinks}
		currentPath={$page.url.pathname}
		fixed={true}
		ctaLabel="Contact"
		ctaHref="/contact"
	/>

	<!-- Add top padding to account for fixed navigation -->
	<div class="main-content">
		{@render children()}
	</div>

	<Footer
		mode="io"
		showNewsletter={true}
		turnstileSiteKey={data.turnstileSiteKey}
		newsletterTitle="Stay updated with new experiments"
		newsletterDescription="Get notified when new research is published. Real metrics, tracked experiments, honest learnings."
		aboutText="Systematic evaluation of AI-native development through tracked experiments. Real data from building with Claude Code and Cloudflare."
		quickLinks={[
			{ label: 'Experiments', href: '/experiments' },
			{ label: 'Methodology', href: '/methodology' },
			{ label: 'Categories', href: '/categories' },
			{ label: 'About', href: '/about' },
			{ label: 'Contact', href: '/contact' }
		]}
		showSocial={true}
	/>

	<!-- Mode of Being Indicator - Hermeneutic Circle Position -->
	<ModeIndicator current="io" />
</div>

<style>
	.layout-root {
		min-height: 100vh;
		background: var(--color-bg-pure);
	}

	.main-content {
		padding-top: 72px;
	}
</style>
