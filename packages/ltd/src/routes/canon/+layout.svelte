<script lang="ts">
	import { siteNavigation } from '$lib/site-navigation';
	import { canonNavigation, flattenNavigation, findCurrentNavItem } from '$lib/canon/navigation';
	import DocSidebar from '$lib/canon/DocSidebar.svelte';
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';

	let { children } = $props();

	let mobileMenuOpen = $state(false);
	let siteMenu = $state<HTMLDetailsElement>();
	const current = $derived(findCurrentNavItem($page.url.pathname, canonNavigation));
	const ordered = flattenNavigation(canonNavigation);
	const sectionSlug = $derived($page.url.pathname.split('/')[2]);
	const sectionLabel = $derived(
		sectionSlug ? sectionSlug.charAt(0).toUpperCase() + sectionSlug.slice(1) : ''
	);
	const sectionHref = $derived(ordered.find((item) => item.href === `/canon/${sectionSlug}`)?.href);
	const index = $derived(
		ordered.findIndex((item) => item.href === $page.url.pathname.replace(/\/$/, ''))
	);
	const previous = $derived(index > 0 ? ordered[index - 1] : null);
	const next = $derived(index >= 0 ? ordered[index + 1] : null);

	function closeSiteMenu(event: KeyboardEvent) {
		if (event.key === 'Escape' && siteMenu?.open) {
			siteMenu.open = false;
			siteMenu.querySelector('summary')?.focus();
		}
	}

	onMount(() => {
		const desktop = window.matchMedia('(min-width: 1024px)');
		const closeDrawerOnDesktop = () => {
			if (desktop.matches) mobileMenuOpen = false;
		};
		desktop.addEventListener('change', closeDrawerOnDesktop);
		return () => desktop.removeEventListener('change', closeDrawerOnDesktop);
	});

	function toggleMobileMenu() {
		if (siteMenu) siteMenu.open = false;
		mobileMenuOpen = !mobileMenuOpen;
	}

	async function closeMobileMenu() {
		mobileMenuOpen = false;
		await tick();
		document.querySelector<HTMLButtonElement>('.menu-toggle')?.focus();
	}

	// Close mobile menu on route change
	$effect(() => {
		// Access page to trigger effect on route change
		$page.url.pathname;
		mobileMenuOpen = false;
		if (siteMenu) siteMenu.open = false;
	});
</script>

<svelte:head>
	<title>Canon Design System — CREATE SOMETHING</title>
	<meta
		name="description"
		content="The Canon Design System. A comprehensive, philosophically-grounded design system embodying 'weniger, aber besser' (less, but better)."
	/>
</svelte:head>

<svelte:window onkeydown={closeSiteMenu} />

<div class="doc-layout">
	<DocSidebar mobileOpen={mobileMenuOpen} onClose={closeMobileMenu} />

	<header class="site-header" inert={mobileMenuOpen}>
		<a href="/" class="site-brand">CREATE SOMETHING <span>.ltd</span></a>
		<details
			class="site-menu"
			bind:this={siteMenu}
			ontoggle={() => {
				if (siteMenu?.open) mobileMenuOpen = false;
			}}
		>
			<summary>Site menu</summary>
			<nav aria-label="Site navigation">
				{#each siteNavigation as link}
					<a href={link.href} aria-current={link.href === '/canon' ? 'location' : undefined}
						>{link.label}</a
					>
				{/each}
				<a href="/login">Sign in</a>
			</nav>
		</details>
	</header>
	<div class="mobile-header">
		<button
			class="menu-toggle"
			onclick={toggleMobileMenu}
			aria-expanded={mobileMenuOpen}
			aria-controls="canon-sidebar">Browse Canon</button
		>
	</div>

	<div class="doc-main" inert={mobileMenuOpen}>
		<article class="doc-content">
			{#if $page.url.pathname !== '/canon'}
				<nav class="breadcrumbs" aria-label="Breadcrumb">
					<a href="/">Home</a><span aria-hidden="true">/</span><a href="/canon">Canon</a>
					{#if sectionLabel}
						<span aria-hidden="true">/</span>
						{#if sectionHref && sectionHref !== $page.url.pathname}<a href={sectionHref}
								>{sectionLabel}</a
							>{:else}<span aria-current={sectionHref === $page.url.pathname ? 'page' : undefined}
								>{sectionLabel}</span
							>{/if}
					{/if}
					{#if current.item && current.item.href !== sectionHref}<span aria-hidden="true">/</span
						><span aria-current="page">{current.item.label}</span>{/if}
				</nav>
			{/if}
			{@render children()}
			{#if previous || next}
				<nav class="page-navigation" aria-label="Canon page navigation">
					<div>
						{#if previous}<a href={previous.href} rel="prev"
								><small>Previous</small>{previous.label}</a
							>{/if}
					</div>
					<div>
						{#if next}<a href={next.href} rel="next"><small>Next</small>{next.label}</a>{/if}
					</div>
				</nav>
			{/if}
		</article>
	</div>
</div>

<style>
	.site-header {
		position: fixed;
		inset: 0 0 auto;
		height: 64px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-performance-sm);
		padding: 0 var(--space-performance-md);
		background: var(--color-performance-panel);
		border-bottom: 1px solid var(--color-performance-line);
		z-index: calc(var(--z-performance-fixed) - 2);
	}
	.site-brand {
		font-size: var(--text-performance-body-sm);
		font-weight: var(--font-performance-semibold);
		text-decoration: none;
		color: var(--color-performance-fg-primary);
	}
	.site-brand span {
		color: var(--color-performance-fg-muted);
	}
	.site-menu summary {
		cursor: pointer;
		padding: var(--space-performance-xs);
		font-size: var(--text-performance-body-sm);
	}
	.site-menu nav {
		position: absolute;
		right: var(--space-performance-md);
		top: 64px;
		min-width: 180px;
		display: grid;
		padding: var(--space-performance-sm);
		border: 1px solid var(--color-performance-line);
		background: var(--color-performance-panel);
	}
	.site-menu a {
		padding: var(--space-performance-xs);
	}
	.site-menu a[aria-current] {
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.breadcrumbs {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-performance-xs);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
	}
	.page-navigation {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: var(--space-performance-md);
		padding-top: var(--space-performance-lg);
		border-top: 1px solid var(--color-performance-line);
	}
	.page-navigation a {
		display: grid;
		gap: var(--space-performance-xs);
		overflow-wrap: anywhere;
	}
	.page-navigation div:last-child {
		text-align: right;
	}
	.page-navigation small {
		color: var(--color-performance-fg-muted);
	}
	a:focus-visible,
	button:focus-visible,
	summary:focus-visible {
		outline: 2px solid var(--color-performance-fg-primary);
		outline-offset: 4px;
	}

	.doc-layout {
		min-height: 100vh;
		background: var(--color-performance-bg-pure);
	}

	/* Mobile header */
	.mobile-header {
		position: fixed;
		top: 64px;
		left: 0;
		right: 0;
		height: 48px;
		background: var(--color-performance-panel);
		border-bottom: 1px solid var(--color-performance-line);
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		padding: 0 var(--space-performance-md);
		z-index: calc(var(--z-performance-fixed) - 3);
	}

	@media (min-width: 1024px) {
		.mobile-header {
			display: none;
		}
	}

	.menu-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 var(--space-performance-sm);
		height: 44px;
		background: transparent;
		border: none;
		border-radius: var(--radius-performance-scale-md);
		color: var(--color-performance-fg-primary);
		cursor: pointer;
		transition: background var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.menu-toggle:hover {
		background: var(--color-performance-hover);
	}

	/* Main content area */
	.doc-main {
		min-height: 100vh;
		padding-top: 112px; /* Mobile header height */
	}

	@media (min-width: 1024px) {
		.doc-main {
			margin-left: 280px; /* Sidebar width */
			padding-top: 64px;
		}
	}

	.doc-content {
		max-width: 900px;
		margin: 0 auto;
		padding: var(--space-performance-xl) var(--space-performance-md);
	}

	@media (min-width: 768px) {
		.doc-content {
			padding: var(--space-performance-xl) var(--space-performance-xl);
		}
	}
</style>
