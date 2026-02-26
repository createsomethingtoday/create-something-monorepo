<script lang="ts">
	import CategoryRow from '$lib/components/CategoryRow.svelte';
	import { ArrowRight, LayoutDashboard, Play } from 'lucide-svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const featured = $derived(data.featured);
	const categories = $derived(data.categories);
	const totalCategories = $derived(categories.length);
	const freeVideos = $derived(
		categories.reduce(
			(total, category) => total + category.items.filter((video) => video.tier === 'free').length,
			0
		)
	);
</script>

<svelte:head>
	<title>Library | OUTERFIELDS</title>
</svelte:head>

<div class="library-page">
	<header class="library-header glass-card">
		<div class="header-copy">
			<p class="eyebrow">Subscriber Library</p>
			<h1>Welcome back, {data.user.name}</h1>
			<p class="subtitle">Browse the published catalog and watch from any category.</p>
			<div class="metrics">
				<div class="metric-chip">
					<span class="metric-label">Videos</span>
					<strong>{data.totalVideos}</strong>
				</div>
				<div class="metric-chip">
					<span class="metric-label">Collections</span>
					<strong>{totalCategories}</strong>
				</div>
				<div class="metric-chip">
					<span class="metric-label">Free to Watch</span>
					<strong>{freeVideos}</strong>
				</div>
			</div>
		</div>
		<div class="header-actions">
			{#if data.isAdmin}
				<a href="/admin/videos" class="btn-secondary">
					<LayoutDashboard size={16} />
					Open Admin
				</a>
			{/if}
			<a href="/" class="btn-primary">Main Site</a>
		</div>
	</header>

	{#if featured}
		<section class="featured">
			<div class="featured-media">
				<img src={featured.thumbnail} alt={featured.title} />
				<div class="overlay"></div>
				<p class="featured-label">Latest Upload</p>
			</div>
			<div class="featured-content">
				<p class="featured-kicker">Fresh in your feed</p>
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
		<div class="rows-header">
			<h2>Browse Library</h2>
			<p>{totalCategories} collections • {data.totalVideos} videos</p>
		</div>

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
		position: relative;
		isolation: isolate;
		padding-top: 5.5rem;
		padding-bottom: 3.5rem;
	}

	.library-page::before,
	.library-page::after {
		content: '';
		position: absolute;
		pointer-events: none;
		z-index: -1;
		filter: blur(70px);
		opacity: 0.42;
	}

	.library-page::before {
		top: 4rem;
		right: 4%;
		width: clamp(180px, 26vw, 320px);
		height: clamp(180px, 26vw, 320px);
		background: radial-gradient(circle, rgba(244, 81, 38, 0.42), rgba(244, 81, 38, 0));
	}

	.library-page::after {
		top: 14rem;
		left: -2rem;
		width: clamp(220px, 30vw, 360px);
		height: clamp(220px, 30vw, 360px);
		background: radial-gradient(circle, rgba(218, 191, 255, 0.2), rgba(218, 191, 255, 0));
	}

	.library-header {
		max-width: var(--container-max-width);
		margin: 0 auto 1.3rem;
		padding: 1.15rem 1.25rem;
		display: flex;
		justify-content: space-between;
		gap: 1.35rem;
		flex-wrap: wrap;
		align-items: flex-start;
		border-radius: 1rem;
		background: linear-gradient(
			135deg,
			rgba(244, 81, 38, 0.1) 0%,
			rgba(255, 255, 255, 0.04) 32%,
			rgba(255, 255, 255, 0.02) 100%
		);
	}

	.header-copy {
		flex: 1 1 28rem;
		min-width: min(100%, 19rem);
	}

	.eyebrow {
		margin: 0;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-subtle);
	}

	h1 {
		margin: 0.25rem 0 0.55rem;
		font-size: clamp(1.8rem, 3vw, 2.55rem);
		line-height: 1.12;
	}

	.subtitle {
		margin: 0;
		max-width: 40ch;
		color: var(--color-fg-tertiary);
	}

	.metrics {
		margin-top: 1rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.metric-chip {
		min-width: 7.25rem;
		padding: 0.58rem 0.74rem;
		border-radius: 0.72rem;
		border: 1px solid var(--color-border-default);
		background: rgba(255, 255, 255, 0.04);
	}

	.metric-label {
		display: block;
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-fg-subtle);
	}

	.metric-chip strong {
		display: block;
		margin-top: 0.05rem;
		font-size: 1.1rem;
		line-height: 1.2;
	}

	.header-actions {
		display: flex;
		gap: 0.55rem;
		align-self: flex-end;
		flex-wrap: wrap;
	}

	.header-actions a {
		min-width: 8.9rem;
	}

	.featured {
		max-width: var(--container-max-width);
		margin: 0 auto 2.2rem;
		padding: 0 1.25rem;
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
		gap: 1rem;
		align-items: stretch;
	}

	.featured-media {
		position: relative;
		border-radius: 0.9rem;
		overflow: hidden;
		aspect-ratio: 16 / 9;
		border: 1px solid var(--color-border-default);
		background: linear-gradient(145deg, rgba(0, 0, 0, 0.7), rgba(16, 16, 16, 1));
	}

	.featured-media img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transform: scale(1.01);
	}

	.overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.75),
			rgba(0, 0, 0, 0.22) 50%,
			rgba(0, 0, 0, 0.04) 100%
		);
	}

	.featured-label {
		position: absolute;
		top: 0.85rem;
		left: 0.85rem;
		margin: 0;
		padding: 0.3rem 0.55rem;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		border-radius: var(--radius-full);
		border: 1px solid rgba(255, 255, 255, 0.22);
		background: rgba(0, 0, 0, 0.45);
		color: var(--color-fg-primary);
	}

	.featured-content {
		padding: 1.1rem 1.15rem;
		border: 1px solid var(--color-border-default);
		border-radius: 0.9rem;
		background: linear-gradient(160deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
		display: grid;
		gap: 0.8rem;
		align-content: center;
	}

	.featured-kicker {
		margin: 0;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-subtle);
	}

	.featured-content h2 {
		margin: 0;
		font-size: clamp(1.3rem, 1.5vw + 0.85rem, 1.8rem);
		line-height: 1.2;
	}

	.featured-content p {
		margin: 0;
		color: var(--color-fg-secondary);
	}

	.featured-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-fg-tertiary);
		font-size: 0.85rem;
		text-transform: lowercase;
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
		gap: 0.5rem;
		width: fit-content;
		padding: 0.62rem 0.9rem;
		border-radius: 0.68rem;
		border: 1px solid var(--color-border-default);
		background: rgba(255, 255, 255, 0.07);
		text-decoration: none;
		color: var(--color-fg-primary);
		font-weight: 600;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.play-link:hover {
		background: rgba(255, 255, 255, 0.13);
		border-color: var(--color-border-emphasis);
		transform: translateY(-1px);
	}

	.rows {
		display: grid;
		gap: 0.4rem;
	}

	.rows-header {
		max-width: var(--container-max-width);
		margin: 0 auto 0.55rem;
		padding: 0 1.25rem;
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.6rem 1rem;
		flex-wrap: wrap;
	}

	.rows-header h2 {
		margin: 0;
		font-size: clamp(1.18rem, 1.2vw + 0.85rem, 1.6rem);
	}

	.rows-header p {
		margin: 0;
		color: var(--color-fg-muted);
		font-size: 0.9rem;
	}

	.empty-state {
		max-width: calc(var(--container-max-width) - 2.5rem);
		margin: 0 auto;
		text-align: center;
		color: var(--color-fg-muted);
		padding: 2rem 1rem;
		border: 1px solid var(--color-border-default);
		border-radius: 0.85rem;
		background: rgba(255, 255, 255, 0.02);
	}

	@media (max-width: 900px) {
		.featured {
			grid-template-columns: 1fr;
		}

		.header-actions {
			align-self: flex-start;
		}
	}

	@media (max-width: 640px) {
		.library-page {
			padding-top: 5rem;
			padding-bottom: 2.9rem;
		}

		.header-actions {
			width: 100%;
		}

		.header-actions a {
			flex: 1 1 10.5rem;
		}

		.metrics {
			gap: 0.5rem;
		}

		.metric-chip {
			flex: 1 1 7.3rem;
		}
	}
</style>
