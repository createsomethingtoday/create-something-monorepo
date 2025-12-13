<script lang="ts">
	import { page } from '$app/stores';
	import { siteConfig } from '$lib/config/site';

	const navLinks = [
		{ href: '/work', label: 'Work' },
		{ href: '/services', label: 'Services' },
		{ href: '/about', label: 'About' }
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
				<a href={link.href} class="nav-link" class:active={$page.url.pathname.startsWith(link.href)}>
					{link.label}
				</a>
			{/each}
			<a href="/contact" class="nav-cta">Start a Project</a>
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
		background: rgba(10, 10, 10, 0.95);
		backdrop-filter: blur(10px);
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
		font-weight: 600;
		letter-spacing: var(--tracking-tight);
	}

	.nav-links {
		display: flex;
		align-items: center;
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

	.nav-cta {
		font-size: var(--text-body-sm);
		font-weight: 500;
		padding: var(--space-xs) var(--space-md);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-full);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.nav-cta:hover {
		background: var(--color-accent);
		color: var(--color-fg-primary);
	}

	@media (max-width: 768px) {
		.nav-links {
			gap: var(--space-md);
		}

		.nav-cta {
			display: none;
		}
	}
</style>
