<script lang="ts">
	/**
	 * ProductShowcase Component - 3-column vertical video cards
	 * Maverick X Design System
	 */

	import { inview } from '$lib/actions/inview';

	interface Solution {
		id: string;
		name: string;
		tagline: string;
		description: string;
		videoSrc?: string;
		video?: string;
		imageSrc?: string;
		image?: string;
		href?: string;
		url?: string;
		accentColor?: 'petrox' | 'lithx' | 'dme';
		color?: string;
	}

	interface Props {
		solutions?: Solution[] | Record<string, Solution>;
	}

	let { solutions }: Props = $props();

	let visible = $state(false);

	const defaultSolutions: Solution[] = [
		{
			id: 'petrox',
			name: 'PetroX',
			tagline: 'Targeted Oilfield Chemistry',
			description: 'PetroX is a portfolio of oilfield chemicals with superior performance, economics, and safety over legacy solutions',
			videoSrc: 'https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/082466515-oil-rig-pumpjack-working-natur.mp4',
			href: '/oil-gas',
			accentColor: 'petrox'
		},
		{
			id: 'lithx',
			name: 'LithX',
			tagline: 'Next-Gen Metal Recovery',
			description: 'Valorize low-grade ores with LithX—advanced chelation technology for critical metals recovery from heaps, tailings, and complex mineralogy.',
			videoSrc: 'https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/168384056-deep-open-pit-mine-copper-ore-.mp4',
			href: '/mining',
			accentColor: 'lithx'
		},
		{
			id: 'hydrox',
			name: 'HydroX',
			tagline: 'Wastewater Valorization',
			description: 'Unlocking new domestic sources of critical minerals and industrial water through advanced resin-based recovery technology.',
			videoSrc: 'https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/124452682-engineers-assessing-waste-wate.mp4',
			href: '/water-treatment',
			accentColor: 'dme'
		}
	];

	// Normalize solutions: handle array, object, or undefined
	function normalizeSolutions(input: Solution[] | Record<string, Solution> | undefined): Solution[] {
		if (!input) return defaultSolutions;

		// If it's an array, use it directly (if non-empty)
		if (Array.isArray(input)) {
			return input.length > 0 ? input : defaultSolutions;
		}

		// If it's an object, convert to array
		const entries = Object.entries(input);
		if (entries.length === 0) return defaultSolutions;

		return entries
			.sort(([a], [b]) => a.localeCompare(b)) // Sort by key (solution_0, solution_1, etc.)
			.map(([_, solution]) => ({
				...solution,
				// Normalize field names from KV format
				videoSrc: solution.videoSrc || solution.video,
				imageSrc: solution.imageSrc || solution.image,
				href: solution.href || solution.url || '/',
				accentColor: (solution.accentColor || solution.color || 'petrox') as 'petrox' | 'lithx' | 'dme'
			}));
	}

	const items = normalizeSolutions(solutions);
</script>

<section
	use:inview
	oninview={() => (visible = true)}
	class="showcase-section"
>
	<div class="showcase-grid">
		{#each items as solution, index}
			<div
				class="scroll-reveal"
				class:scroll-reveal-hidden={!visible}
				class:stagger-1={index === 0}
				class:stagger-2={index === 1}
				class:stagger-3={index === 2}
			>
				<article>
					<a
						href={solution.href}
						class="group card"
						aria-label="Explore {solution.name} - {solution.tagline}"
					>
						{#if solution.videoSrc}
							<video
								class="card-video"
								autoplay
								loop
								muted
								playsinline
							>
								<source src={solution.videoSrc} type="video/mp4" />
							</video>
						{:else if solution.imageSrc}
							<div
								class="card-image"
								style="background-image: url({solution.imageSrc})"
							></div>
						{/if}
						<div class="card-gradient card-gradient-{solution.accentColor}"></div>
						<div class="card-content">
							<h3 class="card-title">{solution.name}</h3>
							<p class="card-tagline">{solution.tagline}</p>
							<p class="card-description">{solution.description}</p>
						</div>
					</a>
				</article>
			</div>
		{/each}
	</div>
</section>

<style>
	.showcase-section {
		background: #000000;
	}

	.showcase-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
	}

	@media (max-width: 1023px) {
		.showcase-grid {
			grid-template-columns: 1fr;
		}
	}

	.card {
		position: relative;
		display: flex;
		min-height: 800px;
		overflow: hidden;
	}

	@media (max-width: 1023px) {
		.card {
			min-height: 500px;
		}
	}

	@media (max-width: 767px) {
		.card {
			min-height: 400px;
		}
	}

	.card-video,
	.card-image {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.7s ease;
	}

	.card-image {
		background-size: cover;
		background-position: center;
	}

	:global(.group:hover) .card-video,
	:global(.group:hover) .card-image {
		transform: scale(1.05);
	}

	.card-gradient {
		position: absolute;
		inset: 0;
		z-index: 2;
		background: linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0.7) 0%,
			rgba(0, 0, 0, 0.5) 50%,
			rgba(0, 0, 0, 0.8) 100%
		);
		transition: background 0.5s ease;
	}

	:global(.group:hover) .card-gradient {
		background: linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0.6) 0%,
			rgba(0, 0, 0, 0.4) 50%,
			rgba(0, 0, 0, 0.7) 100%
		);
	}

	/* Fallback gradient backgrounds */
	.card-gradient-petrox {
		background-image: linear-gradient(135deg, rgba(255, 122, 0, 0.2) 0%, rgba(0, 0, 0, 0.9) 100%);
	}

	.card-gradient-lithx {
		background-image: linear-gradient(135deg, rgba(0, 194, 168, 0.2) 0%, rgba(0, 0, 0, 0.9) 100%);
	}

	.card-gradient-dme {
		background-image: linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(0, 0, 0, 0.9) 100%);
	}

	.card-content {
		position: relative;
		z-index: 3;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		height: 100%;
		width: 100%;
		padding: 2.5rem;
	}

	@media (max-width: 1179px) {
		.card-content {
			padding: 2rem;
		}
	}

	@media (max-width: 1023px) {
		.card-content {
			padding: 1.5rem;
		}
	}

	@media (max-width: 767px) {
		.card-content {
			padding: 1.25rem;
		}
	}

	.card-title {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 2.25rem;
		font-weight: 600;
		color: #ffffff;
		margin-bottom: 1rem;
	}

	@media (max-width: 1179px) {
		.card-title {
			font-size: 1.875rem;
		}
	}

	.card-tagline {
		font-size: 1rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.9);
		font-weight: 400;
		margin-bottom: 1.5rem;
		opacity: 0;
		transition: opacity 0.5s ease;
	}

	:global(.group:hover) .card-tagline {
		opacity: 1;
	}

	.card-description {
		font-size: 0.875rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.8);
		opacity: 0;
		transition: opacity 0.5s ease;
	}

	:global(.group:hover) .card-description {
		opacity: 1;
	}
</style>
