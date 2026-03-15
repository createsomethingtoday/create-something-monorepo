<script lang="ts">
	/**
	 * OUTERFIELDS Presentations Index
	 */
	import { Presentation, Users } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Presentations | OUTERFIELDS</title>
	<meta name="description" content="OUTERFIELDS presentations for investors and users." />
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="page">
	<header class="header">
		<h1 class="title">Presentations</h1>
		<p class="subtitle">Choose the deck that matches the audience.</p>
	</header>

	<section class="grid" aria-label="Available presentations">
		<a class="card" href="/presentations/investor">
			<span class="icon"><Presentation size={20} /></span>
			<h2>Investor deck</h2>
			<p>Problem → solution → traction → model → roadmap → ask.</p>
		</a>

		<a class="card" href="/presentations/user">
			<span class="icon"><Users size={20} /></span>
			<h2>User deck</h2>
			<p>What OUTERFIELDS is, what you get, and how it works.</p>
		</a>
	</section>
</main>

<style>
	.page {
		max-width: 64rem;
		margin: 0 auto;
		padding: 4rem 1.5rem;
	}

	.header {
		text-align: center;
		margin-bottom: 2.5rem;
	}

	.title {
		margin: 0 0 0.75rem;
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--color-fg-primary);
	}

	.subtitle {
		margin: 0;
		color: var(--color-fg-muted);
		font-size: 1.125rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.25rem;
	}

	.card {
		display: block;
		text-decoration: none;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		transition: transform var(--duration-micro) var(--ease-standard),
			border-color var(--duration-micro) var(--ease-standard);
	}

	.card:hover {
		transform: translateY(-2px);
		border-color: var(--color-border-emphasis);
	}

	.icon {
		width: 2.5rem;
		height: 2.5rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		margin-bottom: 1rem;
	}

	h2 {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	p {
		margin: 0;
		color: var(--color-fg-muted);
		line-height: 1.6;
	}

	@media (max-width: 768px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>

