<script lang="ts">
	import '../app.css';
	import { onNavigate } from '$app/navigation';
	import { initSiteConfig } from '$lib/config/context';
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

	initSiteConfig();

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
</script>

<a href="#main-content" class="skip-link">Skip to main content</a>

<div class="layout min-h-screen flex flex-col">
	<nav class="nav">
		<div class="container">
			<a href="/" class="logo">Medical Practice</a>
			<div class="nav-links">
				<a href="/services">Services</a>
				<a href="/team">Providers</a>
				<a href="/about">About</a>
				<a href="/contact" class="cta-button">Book Appointment</a>
			</div>
		</div>
	</nav>

	<main id="main-content" class="flex-1" tabindex="-1">
		{@render children()}
	</main>

	<footer class="footer">
		<div class="container">
			<p>&copy; 2024 Medical Practice. All rights reserved.</p>
		</div>
	</footer>
</div>

<style>
	.layout {
		background: var(--color-bg-pure);
	}

	.nav {
		border-bottom: 1px solid var(--color-border-default);
		padding: var(--space-md) 0;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 var(--space-md);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.logo {
		font-size: var(--text-h4);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.nav-links {
		display: flex;
		gap: var(--space-lg);
		align-items: center;
	}

	.nav-links a {
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.nav-links a:hover {
		color: var(--color-fg-primary);
	}

	.cta-button {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		font-weight: var(--font-medium);
	}

	.cta-button:hover {
		background: var(--color-fg-secondary);
	}

	.footer {
		border-top: 1px solid var(--color-border-default);
		padding: var(--space-xl) 0;
		margin-top: var(--space-2xl);
	}

	.footer p {
		color: var(--color-fg-tertiary);
		text-align: center;
	}
</style>
