<script lang="ts">
	/**
	 * ProcessSection Component
	 * Alternating image/text steps for methods display
	 * Maverick X Design System
	 */

	import { inview } from '$lib/actions/inview';
	import Button from './Button.svelte';

	interface ProcessStep {
		id: string;
		title: string;
		description: string;
		image: string;
		imagePosition?: 'left' | 'right';
		stepNumber?: string;
		ctaText?: string;
		features?: string[];
	}

	interface Props {
		headline?: string;
		steps: ProcessStep[];
		numbered?: boolean;
		accentColor?: 'petrox' | 'lithx' | 'dme';
		onCtaClick?: (stepId: string) => void;
	}

	let { headline, steps, numbered = false, accentColor = 'lithx', onCtaClick }: Props = $props();

	let visible = $state(false);
	let stepVisibility = $state<boolean[]>(steps.map(() => false));

	function getImagePosition(index: number, step: ProcessStep): 'left' | 'right' {
		return step.imagePosition || (index % 2 === 0 ? 'left' : 'right');
	}
</script>

<section
	use:inview
	oninview={() => (visible = true)}
	class="process-section"
>
	<div class="container">
		{#if headline}
			<div
				class="headline-wrapper scroll-reveal"
				class:scroll-reveal-hidden={!visible}
			>
				<h2 class="process-headline">{headline}</h2>
			</div>
		{/if}

		<div class="steps-wrapper">
			{#each steps as step, index}
				{@const imagePosition = getImagePosition(index, step)}
				{@const isLeft = imagePosition === 'left'}
				<div
					use:inview={{ threshold: 0.2 }}
					oninview={() => (stepVisibility[index] = true)}
					class="step-row"
					class:step-reverse={!isLeft}
				>
					<!-- Image Column -->
					<div
						class="image-column scroll-reveal"
						class:scroll-reveal-hidden={!stepVisibility[index]}
						class:slide-from-left={isLeft}
						class:slide-from-right={!isLeft}
					>
						<div class="image-wrapper">
							<img
								src={step.image}
								alt={step.title}
								class="step-image"
							/>
						</div>
					</div>

					<!-- Content Column -->
					<div
						class="content-column scroll-reveal"
						class:scroll-reveal-hidden={!stepVisibility[index]}
						class:slide-from-right={isLeft}
						class:slide-from-left={!isLeft}
						class:stagger-1={true}
					>
						<div class="step-content">
							{#if numbered}
								<div class="step-number step-number-{accentColor}">
									<span>{step.stepNumber || (index + 1).toString().padStart(2, '0')}</span>
								</div>
							{/if}

							<h3 class="step-title">{step.title}</h3>

							<p class="step-description">{step.description}</p>

							{#if step.features && step.features.length > 0}
								<ul class="features-list">
									{#each step.features as feature}
										<li class="feature-item">
											<span class="feature-bullet feature-bullet-{accentColor}"></span>
											<span>{feature}</span>
										</li>
									{/each}
								</ul>
							{/if}

							{#if step.ctaText}
								<div class="cta-wrapper">
									<Button
										title={step.ctaText}
										arrow
										onclick={() => {
											if (onCtaClick) {
												onCtaClick(step.id);
											} else {
												// Default: open contact modal with appropriate category
												window.dispatchEvent(new CustomEvent('openContactModal', { detail: { categoryId: accentColor } }));
											}
										}}
									/>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.process-section {
		padding: 7.5rem 0;
		background: #000000;
	}

	.headline-wrapper {
		margin-bottom: 5rem;
	}

	@media (max-width: 1179px) {
		.headline-wrapper {
			margin-bottom: 4rem;
		}
	}

	@media (max-width: 767px) {
		.headline-wrapper {
			margin-bottom: 3rem;
		}
	}

	.process-headline {
		max-width: 48rem;
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 2.25rem;
		font-weight: 500;
		color: #ffffff;
		line-height: 1.2;
	}

	@media (max-width: 1023px) {
		.process-headline {
			font-size: 1.875rem;
		}
	}

	@media (max-width: 767px) {
		.process-headline {
			font-size: 1.5rem;
		}
	}

	.steps-wrapper {
		display: flex;
		flex-direction: column;
		gap: 5rem;
	}

	@media (max-width: 1023px) {
		.steps-wrapper {
			gap: 4rem;
		}
	}

	@media (max-width: 767px) {
		.steps-wrapper {
			gap: 3rem;
		}
	}

	.step-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4rem;
		align-items: center;
	}

	@media (max-width: 1023px) {
		.step-row {
			grid-template-columns: 1fr;
			gap: 2rem;
		}
	}

	.step-row.step-reverse {
		direction: rtl;
	}

	.step-row.step-reverse > * {
		direction: ltr;
	}

	@media (max-width: 1023px) {
		.step-row.step-reverse {
			direction: ltr;
		}
	}

	.image-column {
		width: 100%;
	}

	.image-wrapper {
		position: relative;
		aspect-ratio: 4 / 3;
		border-radius: 0;  /* Industrial aesthetic - all radius = 0 */
		overflow: hidden;
		background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
	}

	.step-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.content-column {
		width: 100%;
	}

	.step-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.step-number {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		border-width: 2px;
		border-style: solid;
	}

	.step-number span {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 1.25rem;
		font-weight: 700;
	}

	.step-number-petrox {
		background: rgba(255, 122, 0, 0.1);
		border-color: #FF7A00;
	}

	.step-number-petrox span {
		color: #FF7A00;
	}

	.step-number-lithx {
		background: rgba(0, 194, 168, 0.1);
		border-color: #00C2A8;
	}

	.step-number-lithx span {
		color: #00C2A8;
	}

	.step-number-dme {
		background: rgba(6, 182, 212, 0.1);
		border-color: #06B6D4;
	}

	.step-number-dme span {
		color: #06B6D4;
	}

	.step-title {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 1.75rem;
		font-weight: 500;
		color: #ffffff;
		line-height: 1.3;
	}

	@media (max-width: 767px) {
		.step-title {
			font-size: 1.5rem;
		}
	}

	.step-description {
		font-size: 1rem;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.75);
	}

	.features-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.feature-item {
		display: flex;
		align-items: flex-start;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.75);
	}

	.feature-bullet {
		flex-shrink: 0;
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 50%;
		margin-right: 0.5rem;
		margin-top: 0.5rem;
	}

	.feature-bullet-petrox {
		background: #FF7A00;
	}

	.feature-bullet-lithx {
		background: #00C2A8;
	}

	.feature-bullet-dme {
		background: #06B6D4;
	}

	.cta-wrapper {
		padding-top: 0.5rem;
	}

	/* Slide animations */
	.slide-from-left {
		transform: translateX(-30px);
	}

	.slide-from-right {
		transform: translateX(30px);
	}

	.scroll-reveal.slide-from-left,
	.scroll-reveal.slide-from-right {
		opacity: 0;
		transition: opacity 0.8s ease-out, transform 0.8s ease-out;
	}

	.scroll-reveal.slide-from-left:not(.scroll-reveal-hidden),
	.scroll-reveal.slide-from-right:not(.scroll-reveal-hidden) {
		opacity: 1;
		transform: translateX(0);
	}

	.scroll-reveal.stagger-1 {
		transition-delay: 150ms;
	}
</style>
