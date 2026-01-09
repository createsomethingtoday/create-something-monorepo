<script lang="ts">
	/**
	 * OUTERFIELDS Navigation
	 *
	 * Fixed navigation with logo, links, and auth buttons
	 */
	import { Infinity } from 'lucide-svelte';
	import { page } from '$app/stores';
</script>

<header class="nav-header">
	<div class="nav-container">
		<div class="nav-left">
			<!-- Logo -->
			<a href="/" class="logo-link">
				<div class="logo-icon">
					<Infinity size={32} />
				</div>
				<span class="logo-text">OUTERFIELDS</span>
			</a>

			<!-- Desktop Nav Links -->
			<nav class="nav-links">
				<a href="/" class="nav-link" class:active={$page.url.pathname === '/'}>Home</a>
				<a href="/#features" class="nav-link">Features</a>
				<a href="/#pricing" class="nav-link">Pricing</a>
				<a href="/demo" class="nav-link">Demo</a>
			</nav>
		</div>

		<div class="nav-right">
			<a href="/login" class="nav-link">Log In</a>
			<a href="/signup" class="btn-primary">Get Started</a>
		</div>
	</div>
</header>

<style>
	.nav-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 50;
		padding: 1rem 1.5rem;
		background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), transparent);
		transition: background var(--duration-standard) var(--ease-standard);
	}

	.nav-container {
		max-width: 80rem;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.nav-left {
		display: flex;
		align-items: center;
		gap: 3rem;
	}

	.logo-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
		color: var(--color-fg-primary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.logo-link:hover {
		color: var(--color-primary);
	}

	.logo-icon {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-primary);
	}

	.logo-text {
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 2rem;
	}

	.nav-link {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.nav-link:hover,
	.nav-link.active {
		color: var(--color-fg-primary);
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	@media (max-width: 768px) {
		.nav-links {
			display: none;
		}

		.nav-right .nav-link {
			display: none;
		}
	}
</style>
