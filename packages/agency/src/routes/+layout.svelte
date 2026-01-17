<script lang="ts">
	import '../app.css';
	import { Navigation, Analytics, ModeIndicator, Footer, SkipToContent, LayoutSEO } from '@create-something/components';
	import { UnifiedSearch } from '@create-something/components/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { afterNavigate, onNavigate, goto, invalidateAll } from '$app/navigation';

	let { children, data } = $props();

	// Handle logout
	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		await invalidateAll();
		goto('/');
	}

	// View Transitions API - Hermeneutic Navigation
	// .agency: Efficient (200ms)
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
		{ label: 'Services', href: '/services' },
		{ label: 'Products', href: '/products' },
		{ label: 'Discover', href: '/discover' },
		{ label: 'Work', href: '/work' },
		{ label: 'About', href: '/about' }
	];

	// Quick access items for unified search
	const quickAccessItems = [
		{ id: 'nav-services', label: 'Services', description: 'Professional AI-native development', href: '/services', icon: '🔨', keywords: ['hire', 'consulting', 'build'] },
		{ id: 'nav-products', label: 'Products', description: 'Ready-to-use solutions', href: '/products', icon: '📦', keywords: ['buy', 'solutions', 'tools'] },
		{ id: 'nav-work', label: 'Our Work', description: 'Case studies and portfolio', href: '/work', icon: '💼', keywords: ['portfolio', 'examples', 'clients'] },
		{ id: 'nav-contact', label: 'Get Started', description: 'Start your project', href: '/contact', icon: '✉️', keywords: ['contact', 'hire', 'start'] },
		{ id: 'nav-space', label: 'Go to .space', description: 'Interactive experiments', href: 'https://createsomething.space', icon: '🧪', keywords: ['explore', 'try', 'interactive'] },
		{ id: 'nav-io', label: 'Go to .io', description: 'Research papers and analysis', href: 'https://createsomething.io', icon: '📖', keywords: ['papers', 'research', 'learn'] },
		{ id: 'nav-ltd', label: 'Go to .ltd', description: 'Canon principles and patterns', href: 'https://createsomething.ltd', icon: '📜', keywords: ['canon', 'principles', 'foundation'] },
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

<LayoutSEO property="agency" />

<svelte:head>
	<!-- SavvyCal Booking Widget -->
	<script src="https://embed.savvycal.com/v1/embed.js" defer></script>
</svelte:head>

<Analytics property="agency" userId={data.user?.id} userOptedOut={data.user?.analytics_opt_out ?? false} />

<SkipToContent />

<!-- Unified Search - Cmd/Ctrl+K to open -->
<UnifiedSearch currentProperty="agency" localItems={quickAccessItems} />

<div class="layout-root min-h-screen">
	<Navigation
		logo="CREATE SOMETHING"
		logoSuffix=".agency"
		links={navLinks}
		currentPath={$page.url.pathname}
		fixed={true}
		ctaLabel="Get Started"
		ctaHref="/contact"
		user={data.user}
		onLogout={handleLogout}
		showLogin={true}
		loginHref="/login"
		accountHref="/account"
	/>

	<main id="main-content" class="pt-[72px]">
		{@render children()}
	</main>

	<Footer
		mode="agency"
		showNewsletter={false}
		aboutText="Professional AI-native development services. Research-backed consulting, implementation, and training."
		quickLinks={[
			{ label: 'Services', href: '/services' },
			{ label: 'Products', href: '/products' },
			{ label: 'Discover', href: '/discover' },
			{ label: 'Work', href: '/work' },
			{ label: 'About', href: '/about' },
			{ label: 'Contact', href: '/contact' }
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
