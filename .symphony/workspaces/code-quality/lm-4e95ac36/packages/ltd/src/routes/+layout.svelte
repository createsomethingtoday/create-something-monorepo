<script lang="ts">
	import { Navigation, Footer, Analytics, ModeIndicator, LayoutSEO } from '@create-something/canon';
	import { UnifiedSearch } from '@create-something/canon/navigation';
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

	// Quick access items for unified search
	const quickAccessItems = [
		{ id: 'nav-canon', label: 'Canon', description: 'The philosophical foundation', href: '/canon', icon: '📜', keywords: ['philosophy', 'foundation', 'truth'] },
		{ id: 'nav-masters', label: 'Masters', description: 'Learn from the masters', href: '/masters', icon: '🎓', keywords: ['teachers', 'wisdom', 'dieter'] },
		{ id: 'nav-principles', label: 'Principles', description: 'Core design principles', href: '/principles', icon: '⚖️', keywords: ['rules', 'guidelines', 'values'] },
		{ id: 'nav-patterns', label: 'Patterns', description: 'Reusable patterns', href: '/patterns', icon: '🔷', keywords: ['components', 'templates', 'recipes'] },
		{ id: 'nav-standards', label: 'Standards', description: 'Technical standards', href: '/standards', icon: '📏', keywords: ['specs', 'requirements'] },
		{ id: 'nav-space', label: 'Go to .space', description: 'Interactive experiments', href: 'https://createsomething.space', icon: '🧪', keywords: ['explore', 'try', 'interactive'] },
		{ id: 'nav-io', label: 'Go to .io', description: 'Research papers and analysis', href: 'https://createsomething.io', icon: '📖', keywords: ['papers', 'research', 'learn'] },
		{ id: 'nav-agency', label: 'Go to .agency', description: 'Professional services', href: 'https://createsomething.agency', icon: '🔨', keywords: ['services', 'hire', 'work'] },
	];

	// Canon documentation pages have their own layout with DocSidebar.
	// The footer does not earn its existence there: the sidebar already
	// provides navigation, and documentation is a dwelling for study,
	// not marketing. Weniger, aber besser.
	const isCanonRoute = $derived((data?.pathname || '/').startsWith('/canon'));
</script>

<LayoutSEO property="ltd" />

<Analytics property="ltd" userId={data.user?.id} userOptedOut={data.user?.analytics_opt_out ?? false} />

<!-- Unified Search - Cmd/Ctrl+K to open -->
<UnifiedSearch currentProperty="ltd" localItems={quickAccessItems} />

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
