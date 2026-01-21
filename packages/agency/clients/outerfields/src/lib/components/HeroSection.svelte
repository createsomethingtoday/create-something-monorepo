<script lang="ts">
	/**
	 * OUTERFIELDS Hero Section
	 *
	 * StreamVerse-inspired full-bleed hero with category pills at bottom
	 */
	import { Play, Plus, Star, Clock } from 'lucide-svelte';

	function scrollToJourney() {
		document.getElementById('journey')?.scrollIntoView({ behavior: 'smooth' });
	}

	function scrollToPricing() {
		document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
	}

	// Category filters
	const categories = [
		{ id: 'trending', label: 'Trending', active: true },
		{ id: 'series', label: 'Series', active: false },
		{ id: 'films', label: 'Films', active: false },
		{ id: 'bts', label: 'Behind the Scenes', active: false },
		{ id: 'trailers', label: 'Trailers', active: false },
		{ id: 'free', label: 'Free to Watch', active: false }
	];
</script>

<section class="hero">
	<!-- Background with 3D embed -->
	<div class="hero-backdrop">
		<iframe
			title="OUTERFIELDS 3D Experience"
			class="sketchfab-embed"
			frameborder="0"
			allow="autoplay; fullscreen"
			src="https://sketchfab.com/models/d6521362b37b48e3a82bce4911409303/embed?autospin=0.2&autostart=1&preload=1&ui_infos=0&ui_stop=0&ui_inspector=0&ui_watermark_link=0&ui_watermark=0&ui_hint=0&ui_ar=1&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0&ui_theme=dark&dnt=1"
		></iframe>
		<div class="hero-gradient"></div>
	</div>

	<!-- Left-aligned content -->
	<div class="hero-content">
		<!-- Metadata row -->
		<div class="hero-meta">
			<span class="meta-badge">New Season</span>
			<span class="meta-item">
				<Clock size={14} />
				75+ Episodes
			</span>
			<span class="meta-item">
				<Star size={14} class="star-icon" />
				Built in Public
			</span>
		</div>

		<!-- Title - MASSIVE -->
		<h1 class="hero-title">OUTERFIELDS</h1>

		<!-- Subtitle -->
		<p class="hero-subtitle">
			A premium content network built in public. Watch how we create, market, 
			and distribute content across 7 unique series. Trailers and first episodes are free.
		</p>

		<!-- CTA Buttons -->
		<div class="hero-actions">
			<button class="btn-primary" onclick={scrollToJourney}>
				<Play size={20} />
				<span>Watch Now</span>
			</button>
			<button class="btn-secondary" onclick={scrollToPricing}>
				<Plus size={20} />
				<span>Join for $99</span>
			</button>
		</div>
	</div>

	<!-- Category pills at bottom of hero -->
	<div class="category-pills">
		{#each categories as category}
			<button class="pill" class:active={category.active}>
				{category.label}
			</button>
		{/each}
	</div>
</section>

<style>
	.hero {
		position: relative;
		height: 85vh;
		min-height: 600px;
		width: 100%;
		display: flex;
		align-items: center;
		padding: 0 3rem;
		overflow: hidden;
	}

	.hero-backdrop {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	.hero-backdrop :global(.sketchfab-embed) {
		width: 100%;
		height: 120%;
		border: none;
		pointer-events: none;
		transform: scale(1.1);
		transform-origin: center center;
	}

	/* StreamVerse-style gradient: strong at bottom, fading up */
	.hero-gradient {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			0deg,
			var(--color-bg-pure) 0%,
			var(--color-bg-pure) 5%,
			rgba(0, 0, 0, 0.8) 30%,
			rgba(0, 0, 0, 0.4) 60%,
			rgba(0, 0, 0, 0.6) 100%
		);
	}

	.hero-content {
		position: relative;
		z-index: 10;
		max-width: 42rem;
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	/* Metadata row */
	.hero-meta {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-muted);
	}

	.meta-badge {
		padding: 0.25rem 0.625rem;
		background: var(--color-brand);
		color: white;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		border-radius: var(--radius-sm);
		letter-spacing: 0.05em;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.meta-item :global(.star-icon) {
		color: #facc15;
	}

	/* Title - MASSIVE like StreamVerse */
	.hero-title {
		font-size: clamp(4rem, 12vw, 9rem);
		font-weight: 900;
		color: var(--color-fg-primary);
		line-height: 0.9;
		text-transform: uppercase;
		letter-spacing: -0.03em;
		text-shadow: 0 4px 40px rgba(0, 0, 0, 0.5);
		margin: 0;
	}

	/* Subtitle */
	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-muted);
		line-height: 1.6;
		font-weight: 300;
		max-width: 36rem;
		margin: 0;
	}

	/* CTA Buttons */
	.hero-actions {
		display: flex;
		gap: var(--space-md);
	}

	.btn-primary,
	.btn-secondary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.875rem 2rem;
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-primary {
		background: var(--color-brand);
		color: white;
		border: none;
	}

	.btn-primary:hover {
		filter: brightness(0.85);
	}

	.btn-primary:active {
		transform: scale(0.98);
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
		backdrop-filter: blur(8px);
	}

	.btn-secondary:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	/* Category pills at bottom */
	.category-pills {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: 0 3rem 1.5rem;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.category-pills::-webkit-scrollbar {
		display: none;
	}

	.pill {
		padding: 0.5rem 1.25rem;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-radius: var(--radius-full);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.pill:hover {
		background: rgba(255, 255, 255, 0.2);
		color: var(--color-fg-primary);
	}

	.pill.active {
		background: var(--color-brand);
		color: white;
		font-weight: 700;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero {
			height: 80vh;
			min-height: 550px;
			padding: 0 1.5rem;
		}

		.hero-title {
			font-size: clamp(3rem, 14vw, 5rem);
		}

		.hero-subtitle {
			font-size: var(--text-body);
		}

		.hero-meta {
			flex-wrap: wrap;
			gap: var(--space-sm);
		}

		.hero-actions {
			flex-direction: column;
			gap: var(--space-sm);
		}

		.btn-primary,
		.btn-secondary {
			width: 100%;
			justify-content: center;
		}

		.category-pills {
			padding: 0 1.5rem 1rem;
		}
	}

	@media (max-width: 480px) {
		.hero {
			height: 75vh;
			min-height: 500px;
			padding: 0 1rem;
		}

		.hero-content {
			gap: var(--space-md);
		}

		.hero-title {
			font-size: clamp(2.5rem, 16vw, 3.5rem);
		}

		.hero-subtitle {
			font-size: var(--text-body-sm);
		}

		.btn-primary,
		.btn-secondary {
			padding: 0.75rem 1.5rem;
			font-size: 0.8125rem;
		}

		.category-pills {
			padding: 0 1rem 0.75rem;
			gap: var(--space-xs);
		}

		.pill {
			padding: 0.375rem 1rem;
			font-size: 0.75rem;
		}
	}
</style>
