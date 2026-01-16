<script lang="ts">
	/**
	 * Explainer Component - 3-column feature grid on dark background
	 * Maverick X Design System
	 */

	import { inview } from '$lib/actions/inview';

	interface ExplainerPoint {
		title: string;
		description: string;
	}

	interface Props {
		headline?: string;
		points?: ExplainerPoint[];
	}

	let { headline, points }: Props = $props();

	let visible = $state(false);

	const defaultPoints: ExplainerPoint[] = [
		{
			title: 'Strong',
			description: 'Targeted chemistry precision-engineered for each use case'
		},
		{
			title: 'Safe',
			description: 'Non-hazmat, non-toxic, non-flammable, non-carcinogenic'
		},
		{
			title: 'Sustainable',
			description: 'Biodegradable, environmentally-safe, produced from organic feedstocks'
		}
	];

	const items = points ?? defaultPoints;

	// Gradient colors for each point
	const gradientColors = [
		'from-blue-100 to-blue-50',
		'from-emerald-100 to-emerald-50',
		'from-orange-100 to-orange-50'
	];

	// Format headline with line break at "through"
	function formatHeadline(text: string): string[] {
		const parts = text.split(' through ');
		if (parts.length === 2) {
			return [parts[0], 'through ' + parts[1]];
		}
		return [text];
	}

	const headlineText = headline ?? 'We are unlocking critical resources through precision chemistry.';
	const headlineParts = formatHeadline(headlineText);
</script>

<section
	use:inview
	oninview={() => (visible = true)}
	class="explainer-section"
>
	<div class="container">
		<!-- Heading -->
		<div
			class="scroll-reveal"
			class:scroll-reveal-hidden={!visible}
		>
			<h2 class="explainer-headline">
				{#each headlineParts as part, i}
					{#if i > 0}<br />{/if}{part}
				{/each}
			</h2>
		</div>

		<!-- Key Points Grid -->
		<div class="points-grid">
			{#each items as point, index}
				<div
					class="scroll-reveal"
					class:scroll-reveal-hidden={!visible}
					class:stagger-1={index === 0}
					class:stagger-2={index === 1}
					class:stagger-3={index === 2}
				>
					<div class="point-card">
						<div class="point-icon point-icon-{index}">
						{#if index === 0}
							<!-- Strong - strength/target icon -->
							<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
							</svg>
						{:else if index === 1}
							<!-- Safe - shield icon -->
							<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
							</svg>
						{:else}
							<!-- Sustainable - leaf/recycle icon -->
							<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
						{/if}
						</div>
						<h3 class="point-title">{point.title}</h3>
						<p class="point-description">{point.description}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.explainer-section {
		position: relative;
		padding: 5rem 0;
		background: #000000;
		overflow: hidden;
	}

	.explainer-headline {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 2.25rem;
		font-weight: 500;
		color: #ffffff;
		text-align: center;
		line-height: 1.3;
		margin-bottom: 3rem;
	}

	@media (max-width: 1179px) {
		.explainer-headline {
			font-size: 1.875rem;
			margin-bottom: 2.5rem;
		}
	}

	@media (max-width: 1023px) {
		.explainer-headline {
			font-size: 1.875rem;
			margin-bottom: 2rem;
		}
	}

	@media (max-width: 767px) {
		.explainer-headline {
			font-size: 1.5rem;
			margin-bottom: 1.5rem;
		}
	}

	.points-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 3rem;
	}

	@media (max-width: 1179px) {
		.points-grid {
			gap: 2.5rem;
		}
	}

	@media (max-width: 1023px) {
		.points-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 2rem;
		}
	}

	@media (max-width: 767px) {
		.points-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
	}

	.point-card {
		text-align: center;
	}

	.point-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 4rem;
		height: 4rem;
		margin-bottom: 1.5rem;
		border-radius: 50%;
	}

	.point-icon-0 {
		background: linear-gradient(135deg, rgba(96, 165, 250, 0.3) 0%, rgba(96, 165, 250, 0.1) 100%);
		color: #60a5fa;
	}

	.point-icon-1 {
		background: linear-gradient(135deg, rgba(52, 211, 153, 0.3) 0%, rgba(52, 211, 153, 0.1) 100%);
		color: #34d399;
	}

	.point-icon-2 {
		background: linear-gradient(135deg, rgba(255, 122, 0, 0.3) 0%, rgba(255, 122, 0, 0.1) 100%);
		color: #FF7A00;
	}

	.point-title {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 1.125rem;
		font-weight: 600;
		color: #ffffff;
		margin-bottom: 1rem;
	}

	.point-description {
		font-size: 1rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.8);
	}
</style>
