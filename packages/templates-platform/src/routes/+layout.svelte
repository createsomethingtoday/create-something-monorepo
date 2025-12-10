<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<svelte:head>
	<title>Templates | CREATE SOMETHING</title>
	<meta name="description" content="Beautiful website templates. Deploy in seconds." />
</svelte:head>

<div class="app">
	<!-- Header -->
	<header class="header">
		<div class="header-content">
			<a href="/" class="logo">
				<span class="logo-mark">CS</span>
				<span class="logo-text">Templates</span>
			</a>

			<nav class="nav">
				<a href="/templates">Browse</a>
				<a href="/dashboard">Dashboard</a>
			</nav>

			<div class="header-actions">
				<a href="/dashboard" class="btn btn-primary">Get Started</a>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="main">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="footer">
		<div class="footer-content">
			<div class="footer-brand">
				<span class="logo-mark">CS</span>
				<p class="footer-tagline">Beautiful sites. Zero friction.</p>
			</div>

			<div class="footer-links">
				<a href="https://createsomething.ltd">Philosophy</a>
				<a href="https://createsomething.io">Research</a>
				<a href="https://createsomething.space">Practice</a>
				<a href="https://createsomething.agency">Services</a>
			</div>

			<p class="footer-copyright">
				CREATE SOMETHING
			</p>
		</div>
	</footer>
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	/* Header */
	.header {
		position: sticky;
		top: 0;
		z-index: 100;
		background: var(--color-bg-pure);
		border-bottom: 1px solid var(--color-border-default);
	}

	.header-content {
		max-width: var(--content-width);
		margin: 0 auto;
		padding: var(--space-sm) var(--gutter);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-lg);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.logo-mark {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-weight: 700;
		font-size: var(--text-body-sm);
		border-radius: var(--radius-sm);
	}

	.logo-text {
		font-weight: 600;
		font-size: var(--text-body);
	}

	.nav {
		display: flex;
		gap: var(--space-md);
	}

	.nav a {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.nav a:hover {
		color: var(--color-fg-primary);
	}

	.header-actions {
		display: flex;
		gap: var(--space-sm);
	}

	/* Main */
	.main {
		flex: 1;
	}

	/* Footer */
	.footer {
		border-top: 1px solid var(--color-border-default);
		padding: var(--space-xl) var(--gutter);
		margin-top: auto;
	}

	.footer-content {
		max-width: var(--content-width);
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		text-align: center;
	}

	.footer-brand {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
	}

	.footer-tagline {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-links {
		display: flex;
		gap: var(--space-md);
	}

	.footer-links a {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-copyright {
		font-size: var(--text-caption);
		color: var(--color-fg-subtle);
	}

	@media (max-width: 768px) {
		.nav {
			display: none;
		}

		.header-actions {
			display: none;
		}
	}
</style>
