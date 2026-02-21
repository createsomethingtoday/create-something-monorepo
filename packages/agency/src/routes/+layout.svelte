<script lang="ts">
	import '../app.css';
	import { Navigation, Analytics, ModeIndicator, LayoutSEO } from '@create-something/canon';
	import { UnifiedSearch } from '@create-something/canon/navigation';
	import AgencyFooter from '$lib/components/AgencyFooter.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { afterNavigate, disableScrollHandling, onNavigate } from '$app/navigation';

	let { children, data } = $props();

	function scrollToTop() {
		window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
		document.documentElement.scrollTop = 0;
		document.body.scrollTop = 0;
	}

	// View Transitions API - Hermeneutic Navigation
	// .agency: Efficient (200ms)
	onNavigate((navigation) => {
		// Keep back/forward restoration, but force top-scroll on normal page links
		if (navigation.type !== 'popstate' && !navigation.to?.url.hash) {
			disableScrollHandling();
		}

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
		{ label: 'How I Work', href: '/services' },
		{ label: 'What I\'ve Built', href: '/products' },
		{ label: 'About', href: '/about' }
	];

	// Quick access items for unified search
	const quickAccessItems = [
		{ id: 'nav-services', label: 'How I Work', description: 'Retainer model, what\'s included', href: '/services', icon: '🔨', keywords: ['hire', 'consulting', 'pricing', 'cost', 'retainer'] },
		{ id: 'nav-products', label: 'What I\'ve Built', description: '16+ production integrations', href: '/products', icon: '📦', keywords: ['portfolio', 'tools', 'integrations'] },
		{ id: 'nav-book', label: 'Book a Call', description: 'See if there\'s a fit', href: '/book', icon: '📞', keywords: ['contact', 'hire', 'start', 'book', 'call'] },
		{ id: 'nav-space', label: 'Go to .space', description: 'MCP experiments', href: 'https://createsomething.space', icon: '🧪', keywords: ['explore', 'try', 'interactive'] },
		{ id: 'nav-io', label: 'Go to .io', description: 'MCP patterns for builders', href: 'https://createsomething.io', icon: '📖', keywords: ['papers', 'research', 'learn'] },
		{ id: 'nav-ltd', label: 'Go to .ltd', description: 'Philosophy of automation', href: 'https://createsomething.ltd', icon: '📜', keywords: ['canon', 'principles', 'foundation'] },
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
			return;
		}

		// Handle full-document navigations that hydrate as type='enter'
		const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
		const isBackForward = navEntry?.type === 'back_forward';
		if (!isBackForward) {
			requestAnimationFrame(scrollToTop);
			setTimeout(scrollToTop, 50);
		}
	});

	// Scroll handling after navigation:
	// - Preserve browser restore for popstate/back-forward
	// - Hash links scroll to section
	// - Other internal links scroll to top
	afterNavigate(({ to, type }) => {
		if (to?.url.hash) {
			setTimeout(() => scrollToHash(to.url.hash), 100);
			return;
		}

		if (type === 'popstate') return;

		requestAnimationFrame(scrollToTop);
		setTimeout(scrollToTop, 50);
	});

</script>

<LayoutSEO property="agency" />

<svelte:head>
	<!-- SavvyCal Booking Widget -->
	<script src="https://embed.savvycal.com/v1/embed.js" defer></script>
</svelte:head>

<Analytics property="agency" userId={data.user?.id} userOptedOut={data.user?.analytics_opt_out ?? false} />

<!-- Unified Search - Cmd/Ctrl+K to open -->
<UnifiedSearch currentProperty="agency" localItems={quickAccessItems} />

<div class="layout-root min-h-screen">
	<Navigation
		logo="CREATE SOMETHING"
		logoSuffix=".agency"
		links={navLinks}
		currentPath={$page.url.pathname}
		fixed={true}
		ctaLabel="Book a Call"
		ctaHref="/book"
		showLogin={false}
	/>

	<main id="main-content" class="pt-[72px]">
		{@render children()}
	</main>

	<AgencyFooter />

	<ModeIndicator current="agency" />
</div>

<style>
	.layout-root {
		background: var(--color-bg-pure);
	}
</style>
