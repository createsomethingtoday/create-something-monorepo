<script lang="ts">
	import CategoryRow from '$lib/components/CategoryRow.svelte';
	import { ArrowRight, LayoutDashboard, Play, Film } from 'lucide-svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const featured = $derived(data.featured);
	const categories = $derived(data.categories);
</script>

<svelte:head>
	<title>Library | OUTERFIELDS</title>
</svelte:head>

<div class="library-page">
	<header class="library-header">
		<div>
			<p class="eyebrow">Subscriber Library</p>
			<h1>Welcome back, {data.user.name}</h1>
			<p class="subtitle">Browse the published catalog and watch from any category.</p>
		</div>
		<div class="header-actions">
			{#if data.isAdmin}
				<a href="/admin" class="btn-secondary">
					<LayoutDashboard size={16} />
					Open Admin
				</a>
			{/if}
			<a href="/" class="btn-primary">Main Site</a>
		</div>
	</header>

	<section class="summary">
		<div class="summary-card">
			<Film size={18} />
			<div>
				<span class="label">Available Videos</span>
				<strong>{data.totalVideos}</strong>
			</div>
		</div>
	</section>

	{#if featured}
		<section class="featured">
			<div class="featured-media">
				<img src={featured.thumbnail} alt={featured.title} />
				<div class="overlay"></div>
			</div>
			<div class="featured-content">
				<p class="featured-kicker">Latest Upload</p>
				<h2>{featured.title}</h2>
				<p>{featured.description}</p>
				<div class="featured-meta">
					<span>{featured.duration}</span>
					<span class="dot"></span>
					<span>{featured.tier}</span>
				</div>
				<a href={`/watch/${featured.id}`} class="play-link">
					<Play size={16} />
					Watch now
					<ArrowRight size={14} />
				</a>
			</div>
		</section>
	{/if}

	<section class="rows">
		{#if categories.length === 0}
			<div class="empty-state">No videos have been uploaded yet.</div>
		{:else}
			{#each categories as category (category.categoryId)}
				<CategoryRow title={category.title} videos={category.items} useLinks={true} />
			{/each}
		{/if}
	</section>
</div>

<style>
	.library-page {
		padding-top: 5.5rem;
		padding-bottom: 3rem;
	}

	.library-header {
		max-width: var(--container-max-width);
		margin: 0 auto 1rem;
		padding: 0 1.25rem;
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		align-items: flex-end;
	}

	.eyebrow {
		margin: 0;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-fg-subtle);
	}

	h1 {
		margin: 0.2rem 0;
		font-size: clamp(1.7rem, 3vw, 2.5rem);
	}

	.subtitle {
		margin: 0;
		color: var(--color-fg-muted);
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
	}

	.summary {
		max-width: var(--container-max-width);
		margin: 0 auto 1rem;
		padding: 0 1.25rem;
	}

	.summary-card {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.75rem 0.9rem;
		background: var(--glass-bg);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
	}

	.summary-card .label {
		display: block;
		font-size: 0.78rem;
		color: var(--color-fg-subtle);
	}

	.summary-card strong {
		font-size: 1.1rem;
	}

	.featured {
		max-width: var(--container-max-width);
		margin: 0 auto 2rem;
		padding: 0 1.25rem;
		display: grid;
		grid-template-columns: 1.3fr 1fr;
		gap: 1rem;
		align-items: stretch;
	}

	.featured-media {
		position: relative;
		border-radius: 0.9rem;
		overflow: hidden;
		aspect-ratio: 16 / 9;
		border: 1px solid var(--color-border-default);
		background: #000;
	}

	.featured-media img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent 60%);
	}

	.featured-content {
		padding: 1rem;
		border: 1px solid var(--color-border-default);
		border-radius: 0.9rem;
		background: var(--glass-bg);
		display: grid;
		gap: 0.7rem;
		align-content: center;
	}

	.featured-kicker {
		margin: 0;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-fg-subtle);
	}

	.featured-content h2 {
		margin: 0;
		font-size: 1.4rem;
	}

	.featured-content p {
		margin: 0;
		color: var(--color-fg-secondary);
	}

	.featured-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-fg-muted);
		font-size: 0.85rem;
	}

	.dot {
		width: 4px;
		height: 4px;
		border-radius: 999px;
		background: var(--color-fg-subtle);
	}

	.play-link {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		text-decoration: none;
		color: var(--color-fg-primary);
		font-weight: 600;
	}

	.rows {
		display: grid;
		gap: 0.2rem;
	}

	.empty-state {
		text-align: center;
		color: var(--color-fg-muted);
		padding: 2rem;
	}

	@media (max-width: 900px) {
		.featured {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.library-page {
			padding-top: 5rem;
		}

		.header-actions {
			width: 100%;
		}
	}
</style>
