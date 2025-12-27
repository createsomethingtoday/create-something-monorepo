<script lang="ts">
	import { Navigation, Footer, Analytics, ModeIndicator, SkipToContent, LayoutSEO } from '@create-something/components';
	import { onNavigate, goto, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import '../app.css';

	let { children, data } = $props();

	// Handle logout
	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		await invalidateAll();
		goto('/');
	}

	// View Transitions API - Hermeneutic Navigation
	// .ltd: Contemplative (500ms)
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

	// Handle cross-property entry animations
	onMount(() => {
		const transitionFrom = sessionStorage.getItem('cs-transition-from');
		if (transitionFrom) {
			sessionStorage.removeItem('cs-transition-from');
			sessionStorage.removeItem('cs-transition-to');
			sessionStorage.removeItem('cs-transition-time');
			document.body.classList.add('transitioning-in');
			setTimeout(() => document.body.classList.remove('transitioning-in'), 500);
		}
	});

	const navLinks = [
		{ label: 'Canon', href: '/canon' },
		{ label: 'Masters', href: '/masters' },
		{ label: 'Principles', href: '/principles' },
		{ label: 'Patterns', href: '/patterns' },
		{ label: 'Standards', href: '/standards' },
		{ label: 'Voice', href: '/voice' },
		{ label: 'Ethos', href: '/ethos' }
	];

	const quickLinks = [
		{ label: 'Canon', href: '/canon' },
		{ label: 'Masters', href: '/masters' },
		{ label: 'Principles', href: '/principles' },
		{ label: 'Patterns', href: '/patterns' },
		{ label: 'Standards', href: '/standards' },
		{ label: 'Voice', href: '/voice' },
		{ label: 'Ethos', href: '/ethos' }
	];

	// Canon documentation pages have their own layout with DocSidebar.
	// The footer does not earn its existence there: the sidebar already
	// provides navigation, and documentation is a dwelling for study,
	// not marketing. Weniger, aber besser.
	const isCanonRoute = $derived((data?.pathname || '/').startsWith('/canon'));
</script>

<LayoutSEO property="ltd" />

<Analytics property="ltd" userId={data.user?.id} userOptedOut={data.user?.analytics_opt_out ?? false} />

<SkipToContent />

<div class="min-h-screen flex flex-col">
	{#if !isCanonRoute}
		<Navigation
			logo="CREATE SOMETHING"
			logoSuffix=".ltd"
			links={navLinks}
			currentPath={data?.pathname || '/'}
			user={data.user}
			onLogout={handleLogout}
			showLogin={true}
			loginHref="/login"
			accountHref="/account"
		/>
	{/if}

	<main id="main-content" class="flex-1">
		{@render children()}
	</main>

	{#if !isCanonRoute}
		<Footer
			mode="ltd"
			showNewsletter={false}
			aboutText="The philosophical foundation for the Create Something ecosystem. Curated wisdom from masters who embody 'less, but better.'"
			quickLinks={quickLinks}
			showSocial={true}
			isAuthenticated={!!data.user}
		/>

		<ModeIndicator current="ltd" />
	{/if}
</div>
