<script lang="ts">
	import '../app.css';
	import { onNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { initSiteConfig, siteConfig } from '$lib/config/context';
	import { browser } from '$app/environment';
	import type { SiteConfig } from '$lib/config/site';

	interface Props {
		children: import('svelte').Snippet;
		data: {
			siteConfig: SiteConfig;
			tenant: { id: string; subdomain: string; status: string } | null;
			configSource: 'tenant' | 'preview' | 'static';
		};
	}

	let { children, data }: Props = $props();

	// Initialize site config from window.__SITE_CONFIG__ if available
	initSiteConfig();

	// View Transitions API
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

	// Page entrance animation
	onMount(() => {
		const sections = document.querySelectorAll('main > section');
		sections.forEach((section, index) => {
			section.classList.add('page-enter');
			(section as HTMLElement).style.animationDelay = `${index * 100}ms`;
		});
	});
</script>

<a href="#main-content" class="skip-link">Skip to main content</a>

<div class="layout min-h-screen flex flex-col">
	<!-- Navigation -->
	<nav class="nav">
		<div class="container">
			<div class="nav-content flex items-center justify-between py-6">
				<a href="/" class="nav-brand">
					<span class="brand-name">{$siteConfig.name}</span>
				</a>
				<div class="nav-links flex items-center gap-8">
					<a href="/" class="nav-link">Home</a>
					<a href="/menu" class="nav-link">Menu</a>
					<a href="/about" class="nav-link">About</a>
					<a href="/reservations" class="nav-link">Reservations</a>
					<a href="/contact" class="nav-link">Contact</a>
				</div>
			</div>
		</div>
	</nav>

	<main id="main-content" class="flex-1" tabindex="-1">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="footer">
		<div class="container">
			<div class="footer-content">
				<div class="footer-section">
					<h3 class="footer-title">{$siteConfig.name}</h3>
					<p class="footer-text">{$siteConfig.tagline}</p>
				</div>
				<div class="footer-section">
					<h4 class="footer-heading">Hours</h4>
					<div class="footer-hours">
						{#each Object.entries($siteConfig.hours) as [day, hours]}
							<div class="hours-row">
								<span class="day">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
								<span class="hours">{hours}</span>
							</div>
						{/each}
					</div>
				</div>
				<div class="footer-section">
					<h4 class="footer-heading">Contact</h4>
					<div class="footer-contact">
						<p>{$siteConfig.address.street}</p>
						<p>{$siteConfig.address.city}, {$siteConfig.address.state} {$siteConfig.address.zip}</p>
						<p class="mt-4"><a href="tel:{$siteConfig.phone}">{$siteConfig.phone}</a></p>
						<p><a href="mailto:{$siteConfig.email}">{$siteConfig.email}</a></p>
					</div>
				</div>
			</div>
			<div class="footer-bottom">
				<p class="footer-copyright">© {new Date().getFullYear()} {$siteConfig.name}. All rights reserved.</p>
			</div>
		</div>
	</footer>
</div>

<style>
	.layout {
		background: var(--color-bg-pure);
	}

	/* Navigation */
	.nav {
		background: var(--color-bg-pure);
		border-bottom: 1px solid var(--color-border-default);
		position: sticky;
		top: 0;
		z-index: var(--z-sticky);
	}

	.brand-name {
		font-size: var(--text-h3);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	.nav-link {
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.nav-link:hover {
		color: var(--color-fg-primary);
	}

	/* Footer */
	.footer {
		background: var(--color-bg-elevated);
		border-top: 1px solid var(--color-border-default);
		padding: var(--space-2xl) 0 var(--space-lg);
	}

	.footer-content {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-xl);
		margin-bottom: var(--space-xl);
	}

	.footer-title {
		font-size: var(--text-h3);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.footer-heading {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.footer-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
	}

	.footer-hours,
	.footer-contact {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.hours-row {
		display: flex;
		justify-content: space-between;
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.hours-row:last-child {
		border-bottom: none;
	}

	.day {
		text-transform: capitalize;
		color: var(--color-fg-tertiary);
	}

	.hours {
		color: var(--color-fg-secondary);
	}

	.footer-contact a {
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-contact a:hover {
		color: var(--color-fg-primary);
	}

	.footer-bottom {
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.footer-copyright {
		text-align: center;
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}
</style>
