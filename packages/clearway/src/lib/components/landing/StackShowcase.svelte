<script lang="ts">
	// The Stack Showcase Section
	// Live proof of concept with actual production facility
	import { onMount } from 'svelte';
	import Widget from '../../../embed/Widget.svelte';

	let isLoading = true;

	onMount(() => {
		// Widget loading typically completes within 1-2 seconds
		// Show skeleton during initial load, then fade in widget
		const timer = setTimeout(() => {
			isLoading = false;
		}, 800);
		return () => clearTimeout(timer);
	});
</script>

<section id="showcase" class="showcase">
	<div class="container">
		<h2 class="section-title">See It Live</h2>
		<p class="section-subtitle">
			CLEARWAY powers court booking at The Stack Padel.
			Try the actual production system.
		</p>

		<div class="embed-container">
			{#if isLoading}
				<div class="skeleton-widget">
					<div class="skeleton-header">
						<div class="skeleton-title"></div>
						<div class="skeleton-subtitle"></div>
					</div>
					<div class="skeleton-grid">
						{#each Array(6) as _}
							<div class="skeleton-slot"></div>
						{/each}
					</div>
				</div>
			{/if}
			<div class="widget-wrapper" class:loading={isLoading}>
				<Widget facilitySlug="thestack" theme="dark" />
			</div>
		</div>

		<blockquote class="testimonial">
			<p>
				"We stopped thinking about scheduling. Courts just... fill themselves now."
			</p>
			<cite>&mdash; The Stack Operations</cite>
		</blockquote>
	</div>
</section>

<style>
	.showcase {
		padding: var(--space-2xl) var(--space-md);
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 56rem;
		margin: 0 auto;
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 600;
		text-align: center;
		margin: 0 0 var(--space-sm);
		color: var(--color-fg-primary);
	}

	.section-subtitle {
		font-size: var(--text-body-lg);
		text-align: center;
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-xl);
	}

	.testimonial {
		margin: 0;
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		border-left: 3px solid var(--color-border-emphasis);
	}

	.testimonial p {
		font-size: var(--text-body-lg);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
		font-style: italic;
	}

	.testimonial cite {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		font-style: normal;
	}

	/* Skeleton loader (Canon: --duration-slow = 700ms for transitions) */
	.skeleton-widget {
		position: absolute;
		inset: 0;
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
	}

	.skeleton-header {
		margin-bottom: var(--space-lg);
	}

	.skeleton-title {
		height: 1.5rem;
		width: 40%;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-xs);
		animation: shimmer 1.5s infinite;
	}

	.skeleton-subtitle {
		height: 1rem;
		width: 60%;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		animation: shimmer 1.5s infinite 0.1s;
	}

	.skeleton-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-sm);
	}

	.skeleton-slot {
		height: 4rem;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		animation: shimmer 1.5s infinite;
	}

	.skeleton-slot:nth-child(2) { animation-delay: 0.1s; }
	.skeleton-slot:nth-child(3) { animation-delay: 0.2s; }
	.skeleton-slot:nth-child(4) { animation-delay: 0.3s; }
	.skeleton-slot:nth-child(5) { animation-delay: 0.4s; }
	.skeleton-slot:nth-child(6) { animation-delay: 0.5s; }

	@keyframes shimmer {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 0.7; }
	}

	.embed-container {
		position: relative;
		min-height: 320px;
		margin-bottom: var(--space-xl);
	}

	.widget-wrapper {
		transition: opacity var(--duration-slow, 700ms) var(--ease-decelerate, cubic-bezier(0.0, 0.0, 0.2, 1));
	}

	.widget-wrapper.loading {
		opacity: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.skeleton-title,
		.skeleton-subtitle,
		.skeleton-slot {
			animation: none;
		}
		.widget-wrapper {
			transition: none;
		}
		.widget-wrapper.loading {
			opacity: 1;
		}
	}
</style>
