<script lang="ts">
	/**
	 * EditorChoice Component
	 * StreamVerse-style featured content banner with full-bleed image and left-aligned content.
	 * Replaces the standard Films category row with a cinematic highlight section.
	 */
	import { Play, Info } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import type { Video as DbVideo } from '$lib/server/db/videos';

	interface FeaturedFilm {
		id: string;
		title: string;
		description: string;
		thumbnail: string;
		duration: string;
		tier: 'free' | 'preview' | 'gated';
	}

	let film = $state<FeaturedFilm | null>(null);
	let isLoading = $state(true);

	function formatClock(totalSeconds: number): string {
		const s = Math.max(0, Math.floor(totalSeconds));
		const hours = Math.floor(s / 3600);
		const minutes = Math.floor((s % 3600) / 60);
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	function getThumbnailPath(v: DbVideo): string {
		if (v.thumbnail_path.startsWith('/thumbnails/')) {
			return v.thumbnail_path;
		}
		return `/thumbnails${v.thumbnail_path.startsWith('/') ? '' : '/'}${v.thumbnail_path}`;
	}

	onMount(async () => {
		try {
			const response = await fetch('/api/videos?grouped=true');
			const result = await response.json();

			if (response.ok && result?.success) {
				const grouped = result.data as Record<string, DbVideo[]>;
				const films = grouped['films'];

				if (films && films.length > 0) {
					const featured = films[0];
					film = {
						id: featured.id,
						title: featured.title,
						description: featured.description || 'A cinematic experience from OUTERFIELDS.',
						thumbnail: getThumbnailPath(featured),
						duration: formatClock(featured.duration),
						tier: featured.tier
					};
				}
			}
		} catch (err) {
			console.error('Failed to load featured film:', err);
		} finally {
			isLoading = false;
		}
	});

	function handleWatch() {
		if (film) {
			window.location.href = `/watch/${film.id}`;
		}
	}

	function handleDetails() {
		if (film) {
			window.location.href = `/watch/${film.id}`;
		}
	}
</script>

{#if !isLoading && film}
	<section class="editor-choice">
		<img
			src={film.thumbnail}
			alt={film.title}
			class="background-image"
			loading="lazy"
		/>
		<div class="gradient-overlay"></div>

		<div class="content">
			<span class="label">Editor's Choice</span>
			<h3 class="title">{film.title.toUpperCase()}</h3>
			<p class="description">{film.description}</p>

			<div class="meta">
				{#if film.tier === 'free'}
					<span class="badge free">FREE</span>
				{:else}
					<span class="badge members">MEMBERS</span>
				{/if}
				<span class="duration">{film.duration}</span>
			</div>

			<div class="actions">
				<button class="btn-primary" onclick={handleWatch}>
					<Play size={18} />
					<span>WATCH TRAILER</span>
				</button>
				<button class="btn-secondary" onclick={handleDetails}>
					<Info size={18} />
					<span>DETAILS</span>
				</button>
			</div>
		</div>
	</section>
{/if}

<style>
	.editor-choice {
		position: relative;
		height: 400px;
		width: calc(100% - var(--space-xl) * 2);
		margin: var(--space-2xl) auto;
		border-radius: var(--radius-xl);
		overflow: hidden;
	}

	.background-image {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.gradient-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to right,
			rgba(0, 0, 0, 0.95) 0%,
			rgba(0, 0, 0, 0.7) 40%,
			rgba(0, 0, 0, 0.3) 70%,
			transparent 100%
		);
	}

	.content {
		position: relative;
		z-index: 10;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: var(--space-2xl) var(--space-xl);
		max-width: 500px;
	}

	.label {
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		margin-bottom: var(--space-sm);
	}

	.title {
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 900;
		color: var(--color-fg-primary);
		line-height: 1;
		text-transform: uppercase;
		margin: 0 0 var(--space-md) 0;
	}

	.description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0 0 var(--space-md) 0;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	.badge {
		font-size: var(--text-xs);
		font-weight: 700;
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		text-transform: uppercase;
	}

	.badge.free {
		background: var(--color-success);
		color: var(--color-bg-pure);
	}

	.badge.members {
		background: rgba(255, 255, 255, 0.15);
		color: var(--color-fg-primary);
		border: 1px solid rgba(255, 255, 255, 0.25);
	}

	.duration {
		font-size: var(--text-sm);
		color: var(--color-fg-muted);
	}

	.actions {
		display: flex;
		gap: var(--space-md);
	}

	.btn-primary,
	.btn-secondary {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-primary {
		background: rgba(255, 255, 255, 0.12);
		color: var(--color-fg-primary);
		border: 1px solid rgba(255, 255, 255, 0.25);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.btn-primary:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.35);
		transform: translateY(-1px);
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.1);
		color: var(--color-fg-primary);
		border: 1px solid rgba(255, 255, 255, 0.2);
		backdrop-filter: blur(8px);
	}

	.btn-secondary:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.editor-choice {
			width: calc(100% - var(--space-lg) * 2);
			height: 350px;
		}

		.content {
			padding: var(--space-xl) var(--space-lg);
		}
	}

	@media (max-width: 768px) {
		.editor-choice {
			width: calc(100% - var(--space-md) * 2);
			height: 320px;
			border-radius: var(--radius-lg);
		}

		.content {
			padding: var(--space-lg) var(--space-md);
			max-width: 100%;
		}

		.gradient-overlay {
			background: linear-gradient(
				to top,
				rgba(0, 0, 0, 0.95) 0%,
				rgba(0, 0, 0, 0.7) 50%,
				rgba(0, 0, 0, 0.3) 80%,
				transparent 100%
			);
		}

		.title {
			font-size: 1.75rem;
		}

		.description {
			-webkit-line-clamp: 2;
		}

		.actions {
			flex-direction: column;
			gap: var(--space-sm);
		}

		.btn-primary,
		.btn-secondary {
			justify-content: center;
			width: 100%;
		}
	}

	@media (max-width: 480px) {
		.editor-choice {
			width: calc(100% - var(--space-sm) * 2);
			height: 280px;
		}

		.content {
			padding: var(--space-md) var(--space-sm);
		}

		.title {
			font-size: 1.5rem;
		}
	}
</style>
