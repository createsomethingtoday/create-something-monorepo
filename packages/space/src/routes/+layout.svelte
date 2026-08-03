<script lang="ts">
	import '../app.css';
	import { Navigation, Footer, Analytics, ModeIndicator, LayoutSEO } from '@create-something/canon';
	import { UnifiedSearch } from '@create-something/canon/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { afterNavigate, onNavigate } from '$app/navigation';

	let { children } = $props();
	let mobileNavigationOpen = $state(false);

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
		{ label: 'Playground', href: '/playground' },
		{ label: 'Praxis', href: '/praxis' },
		{ label: 'Motion', href: '/motion' },
		{ label: 'Data', href: '/data' }
	];

	// Quick access items for unified search
	const quickAccessItems = [
		{ id: 'nav-playground', label: 'Code Playground', description: 'Execute JavaScript in Workers runtime', href: '/playground', icon: '>', keywords: ['code', 'run', 'execute', 'javascript'] },
		{ id: 'nav-praxis', label: 'Praxis', description: 'Learn integration patterns through code', href: '/praxis', icon: '>', keywords: ['practice', 'learn', 'patterns'] },
		{ id: 'nav-motion', label: 'Motion Lab', description: 'Analyze CSS animations from any URL', href: '/motion', icon: '>', keywords: ['animation', 'css', 'motion', 'analyze'] },
		{ id: 'nav-data', label: 'Data Studio', description: 'Live data dashboards and analysis', href: '/data', icon: '>', keywords: ['data', 'dashboard', 'nba', 'live'] },
		{ id: 'nav-discover', label: 'Discover Concepts', description: 'Explore concepts across CREATE SOMETHING properties', href: '/discover', icon: '>', keywords: ['discover', 'concepts', 'hermeneutic', 'map'] },
		{ id: 'nav-io', label: 'Go to .io', description: 'Research papers and documentation', href: 'https://createsomething.io', icon: '>', keywords: ['papers', 'research', 'read'] },
		{ id: 'nav-agency', label: 'Go to .agency', description: 'Custom MCP development', href: 'https://createsomething.agency', icon: '>', keywords: ['services', 'hire', 'build'] },
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

<LayoutSEO property="space" />

<Analytics property="space" />

<!-- Unified Search - Cmd/Ctrl+K to open -->
<UnifiedSearch
	currentProperty="space"
	localItems={quickAccessItems}
	showMobileButton={!mobileNavigationOpen}
	deferMobileButtonUntilCampaignExit={$page.url.pathname === '/'}
/>

<div class="layout property-performance">
	<Navigation
		logo="CREATE SOMETHING"
		logoSuffix=".space"
		links={navLinks}
		currentPath={$page.url.pathname}
		fixed={true}
		ctaLabel=".io"
		ctaHref="https://createsomething.io"
		showLogin={false}
		visualStyle="performance"
		onMobileMenuChange={(open) => (mobileNavigationOpen = open)}
	/>

	<main id="main-content" class="content">
		{@render children()}
	</main>

	<Footer
		mode="space"
		showNewsletter={false}
		aboutText="The workbench for automation infrastructure. Build, test, and analyze with live tools powered by Cloudflare Workers."
		quickLinks={[
			{ label: 'Playground', href: '/playground' },
			{ label: 'Praxis', href: '/praxis' },
			{ label: 'Motion Lab', href: '/motion' },
			{ label: 'Data Studio', href: '/data' }
		]}
		showSocial={true}
		visualStyle="performance"
	/>

	<ModeIndicator current="space" />
</div>

<style>
	.layout {
		min-height: 100vh;
		background: var(--color-performance-paper, #f3f3f0);
	}

	.content {
		padding-top: 72px;
	}
</style>
