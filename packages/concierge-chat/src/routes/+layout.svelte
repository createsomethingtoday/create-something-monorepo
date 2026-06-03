<script lang="ts">
	import '../app.css';

	const navItems = [
		{ href: '/', label: 'Overview' },
		{ href: '/chat', label: 'Chat' },
		{ href: '/settings', label: 'Settings' }
	];
</script>

<div class="app-shell">
	<header class="app-nav glass">
		<div>
			<div class="eyebrow">CREATE SOMETHING</div>
			<div class="brand">Concierge Chat</div>
		</div>

		<nav>
			{#each navItems as item}
				<a href={item.href}>{item.label}</a>
			{/each}
		</nav>
	</header>

	<main>
		<slot />
	</main>
</div>

<style>
	.app-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.1rem;
		margin-bottom: 1rem;
		position: sticky;
		top: 1rem;
		z-index: 10;
	}

	.brand {
		font-family: var(--font-sans);
		font-size: 1.35rem;
	}

	nav {
		display: flex;
		gap: 0.8rem;
		flex-wrap: wrap;
	}

	nav a {
		padding: 0.55rem 0.9rem;
		border-radius: 999px;
		text-decoration: none;
		background: rgba(255, 255, 255, 0.55);
	}

	main {
		padding-bottom: 3rem;
	}

	@media (max-width: 760px) {
		.app-nav {
			flex-direction: column;
			align-items: stretch;
		}

		nav {
			justify-content: space-between;
		}
	}
</style>
