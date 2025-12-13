<script lang="ts">
	import { page } from '$app/stores';
	import { siteConfig } from '$lib/config/site';

	const navLinks = [
		{ href: '/projects', label: 'Projects' },
		{ href: '/studio', label: 'Studio' },
		{ href: '/contact', label: 'Contact' }
	];

	let scrolled = $state(false);

	$effect(() => {
		const handleScroll = () => {
			scrolled = window.scrollY > 50;
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	});
</script>

<header class="nav" class:scrolled>
	<div class="nav-inner">
		<a href="/" class="logo">
			{siteConfig.name}
		</a>

		<nav class="nav-links">
			{#each navLinks as link}
				<a href={link.href} class="nav-link" class:active={$page.url.pathname === link.href}>
					{link.label}
				</a>
			{/each}
		</nav>
	</div>
</header>

<style>
	.nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		padding: var(--space-md) var(--gutter);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.nav.scrolled {
		background: var(--color-bg-pure);
		box-shadow: var(--shadow-sm);
	}

	.nav-inner {
		max-width: var(--content-width);
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.logo {
		font-size: var(--text-body);
		font-weight: 400;
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.logo:hover {
		opacity: 0.7;
	}

	.nav-links {
		display: flex;
		gap: var(--space-lg);
	}

	.nav-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.nav-link:hover,
	.nav-link.active {
		color: var(--color-fg-primary);
	}

	@media (max-width: 640px) {
		.nav-links {
			gap: var(--space-md);
		}
	}
</style>
