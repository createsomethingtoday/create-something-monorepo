<script lang="ts">
	import '../app.css';
	import { Navigation, Footer, Analytics, ModeIndicator, LayoutSEO } from '@create-something/canon';
	import { UnifiedSearch } from '@create-something/canon/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { afterNavigate, onNavigate, goto, invalidateAll } from '$app/navigation';
	import { revokeSession } from '@create-something/canon/auth';

	let { children, data } = $props();

	// Handle logout
	async function handleLogout() {
		// Clear session on server
		await fetch('/api/auth/logout', { method: 'POST' });
		// Refresh to clear user state
		await invalidateAll();
		goto('/');
	}

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

	// Quick access items for unified search
	const quickAccessItems = [
		{ id: 'nav-experiments', label: 'Experiments', description: 'Browse interactive experiments', href: '/experiments', icon: '🧪', keywords: ['explore', 'try', 'learn'] },
		{ id: 'nav-praxis', label: 'Praxis', description: 'Applied methodology', href: '/praxis', icon: '⚡', keywords: ['practice', 'apply'] },
		{ id: 'nav-methodology', label: 'Methodology', description: 'How we build and learn', href: '/methodology', icon: '📐', keywords: ['process', 'approach'] },
		{ id: 'nav-io', label: 'Go to .io', description: 'Research papers and analysis', href: 'https://createsomething.io', icon: '📖', keywords: ['papers', 'research', 'learn'] },
		{ id: 'nav-agency', label: 'Go to .agency', description: 'Professional services', href: 'https://createsomething.agency', icon: '🔨', keywords: ['services', 'hire', 'work'] },
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

<LayoutSEO property="space" />

<Analytics property="space" userId={data.user?.id} userOptedOut={data.user?.analytics_opt_out ?? false} />

<!-- Unified Search - Cmd/Ctrl+K to open -->
<UnifiedSearch currentProperty="space" localItems={quickAccessItems} />

<div class="layout">
	<Navigation
		logo="CREATE SOMETHING"
		logoSuffix=".space"
		links={navLinks}
		currentPath={$page.url.pathname}
		fixed={true}
		ctaLabel="Contact"
		ctaHref="/contact"
		user={data.user}
		onLogout={handleLogout}
		showLogin={true}
		loginHref="/login"
		accountHref="/account"
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
		isAuthenticated={!!data.user}
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
