<script lang="ts">
	import '../app.css';

	const navItems = [
		{ href: '/', label: 'Operator shell' },
		{ href: '/chat', label: 'Threads' },
		{ href: '/settings', label: 'Settings' }
	];
</script>

<div class="app-shell">
	<header class="app-nav glass">
		<div>
			<div class="eyebrow">CREATE SOMETHING / ONA</div>
			<div class="brand">Operator Chat</div>
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
		font-size: 1.35rem;
		font-weight: 700;
	}

	nav {
		display: flex;
		gap: 0.8rem;
		flex-wrap: wrap;
	}

	nav a {
		padding: 0.55rem 0.8rem;
		border-radius: var(--radius-tight);
		text-decoration: none;
		background: var(--surface-strong);
		border: 1px solid var(--line);
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
