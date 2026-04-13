<script lang="ts">
	import '../app.css';
	import { Navigation, Footer, Analytics, ModeIndicator, LayoutSEO } from '@create-something/canon';
	import { UnifiedSearch } from '@create-something/canon/navigation';
	import { getAgencyMarketingExperimentMetadata } from '$lib/analytics/marketing-experiment';
	import { agencyCoreMessaging } from '$lib/data/marketingCopy';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { afterNavigate, disableScrollHandling, goto, onNavigate } from '$app/navigation';

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
		{ label: 'Install', href: '/install' },
		{ label: 'About', href: '/about' }
	];

	// Quick access items for unified search
	const quickAccessItems = [
		{ id: 'nav-services', label: 'How I Work', description: 'Scoped workflow infrastructure and governed execution', href: '/services', icon: '🔨', keywords: ['workflow infrastructure', 'governed execution', 'automation', 'pricing', 'services'] },
		{ id: 'nav-products', label: 'What I\'ve Built', description: 'Artifact-backed production workflows', href: '/products', icon: '📦', keywords: ['portfolio', 'tools', 'integrations'] },
		{ id: 'nav-install', label: 'Install', description: 'Goose-standard distribution catalog with bundle, recipe, and compatibility adapter actions', href: '/install', icon: '🧩', keywords: ['install', 'catalog', 'mcp install', 'distribution', 'recipe', 'policy pack', 'goose'] },
		{ id: 'nav-recipes', label: 'Recipes', description: 'Goose workflow recipes that bundle MCPs, policy packs, and verification paths', href: '/recipes', icon: '🧭', keywords: ['recipes', 'workflow', 'goose recipe', 'bundle', 'policy pack'] },
		{ id: 'nav-observability', label: 'Observability', description: 'Telemetry keys, verification coverage, and bundle-level operator visibility', href: '/observability', icon: '📡', keywords: ['observability', 'telemetry', 'verification', 'bundle', 'audit'] },
		{ id: 'nav-book', label: agencyCoreMessaging.bookMappingSessionLabel, description: 'Map workflow risk and operational fit', href: '/book', icon: '📞', keywords: ['contact', 'hire', 'start', 'book', 'mapping', 'session'] },
		{ id: 'nav-mcp-access', label: 'MCP Access', description: 'Reveal, copy, rotate, and revoke your personal bearer token', href: '/mcp-access', icon: '🗝️', keywords: ['mcp access', 'bearer token', 'copy token', 'host setup', 'codex', 'claude', 'cursor'] },
		{ id: 'nav-security', label: 'Security', description: 'Identity boundaries, bearer-token governance, and operational controls', href: '/security', icon: '🛡️', keywords: ['security', 'trust', 'risk', 'controls', 'auth'] },
		{ id: 'nav-bearer-token-policy', label: 'Bearer Token Policy', description: 'One long-lived token per user with live entitlement checks and revocation', href: '/bearer-token-policy', icon: '🔑', keywords: ['bearer token', 'token policy', 'mcp access', 'agent access', 'auth'] },
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

	async function handleLogout() {
		try {
			const response = await fetch('/api/auth/logout', { method: 'POST' });
			const payload = (await response.json().catch(() => null)) as { logoutUrl?: string } | null;
			window.location.assign(payload?.logoutUrl || '/login');
		} catch {
			goto('/login');
		}
	}

</script>

<LayoutSEO property="agency" />

<svelte:head>
	<!-- SavvyCal Booking Widget -->
	<script src="https://embed.savvycal.com/v1/embed.js" defer></script>
</svelte:head>

<Analytics
	property="agency"
	userId={data.user?.id}
	userOptedOut={data.user?.analytics_opt_out ?? false}
	globalMetadata={getAgencyMarketingExperimentMetadata($page.url.pathname)}
/>

<!-- Unified Search - Cmd/Ctrl+K to open -->
<UnifiedSearch currentProperty="agency" localItems={quickAccessItems} />

<div class="layout-root min-h-screen">
	<Navigation
		logo="CREATE SOMETHING"
		logoSuffix=".agency"
		links={navLinks}
		currentPath={$page.url.pathname}
		fixed={true}
		ctaLabel={agencyCoreMessaging.bookMappingSessionLabel}
		ctaHref="/book"
		user={data.user}
		onLogout={handleLogout}
		showLogin={true}
		accountHref="/account"
	/>

	<main id="main-content" class="pt-[72px]">
		{@render children()}
	</main>

	<Footer
		mode="agency"
		showNewsletter={false}
		aboutText="Governed workflow infrastructure for ops-minded teams that need faster automation, clear trust boundaries, and artifact-backed delivery."
		quickLinks={[
			{ label: 'How I Work', href: '/services' },
			{ label: 'What I\'ve Built', href: '/products' },
			{ label: 'Install', href: '/install' },
			{ label: 'Recipes', href: '/recipes' },
			{ label: 'Observability', href: '/observability' },
			{ label: 'About', href: '/about' },
			{ label: 'Security', href: '/security' },
			{ label: 'Bearer Token Policy', href: '/bearer-token-policy' },
			{ label: agencyCoreMessaging.bookMappingSessionLabel, href: '/book' }
		]}
		showSocial={true}
		isAuthenticated={!!data.user}
	/>

	<ModeIndicator current="agency" />
</div>

<style>
	.layout-root {
		background: var(--color-bg-pure);
	}
</style>
