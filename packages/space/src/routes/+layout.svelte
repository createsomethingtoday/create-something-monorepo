<script lang="ts">
	import '../app.css';
	import { Navigation, Footer, Analytics, ModeIndicator, SkipToContent, LayoutSEO } from '@create-something/components';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { afterNavigate, onNavigate, goto, invalidateAll } from '$app/navigation';
	import { revokeSession } from '@create-something/components/auth';

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

<SkipToContent />

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
