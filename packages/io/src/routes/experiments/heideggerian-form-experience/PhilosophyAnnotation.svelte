<script lang="ts">
	/**
	 * PhilosophyAnnotation - Inline educational cards
	 *
	 * Shows Heideggerian concepts as they occur in the form experience.
	 * These annotations make the philosophy tangible, not just theoretical.
	 */

	interface Props {
		concept: 'zuhandenheit' | 'vorhandenheit' | 'gestell' | 'gelassenheit';
		visible?: boolean;
		onDismiss?: () => void;
	}

	let { concept, visible = false, onDismiss }: Props = $props();

	const concepts = {
		zuhandenheit: {
			title: 'Zuhandenheit',
			subtitle: 'Ready-to-hand',
			description: 'The form recedes into transparent use. You were configuring a service, not "filling out a form."',
			color: 'var(--color-success)'
		},
		vorhandenheit: {
			title: 'Vorhandenheit',
			subtitle: 'Present-at-hand',
			description: 'The validation error made you aware of the form as a form. The tool becomes visible through breakdown.',
			color: 'var(--color-error)'
		},
		gestell: {
			title: 'Gestell',
			subtitle: 'Enframing',
			description: 'Most forms treat users as resources to extract value from. Required fields, dark patterns, and aggressive upsells are Gestell in action.',
			color: 'var(--color-warning)'
		},
		gelassenheit: {
			title: 'Gelassenheit',
			subtitle: 'Releasement',
			description: 'Neither submission nor rejection—engagement without capture. The form serves your intent.',
			color: 'var(--color-info)'
		}
	};

	$effect(() => {
		if (visible) {
			// Track that user observed this concept
			// This could be sent to analytics
		}
	});
</script>

{#if visible}
	<aside
		class="philosophy-annotation animate-fade-in"
		style="--accent-color: {concepts[concept].color}"
		role="complementary"
		aria-label="Philosophy annotation"
	>
		<div class="annotation-header">
			<div class="annotation-titles">
				<h4 class="annotation-title">{concepts[concept].title}</h4>
				<span class="annotation-subtitle">{concepts[concept].subtitle}</span>
			</div>
			{#if onDismiss}
				<button class="dismiss-button" onclick={onDismiss} aria-label="Dismiss annotation">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>
		<p class="annotation-description">{concepts[concept].description}</p>
	</aside>
{/if}

<style>
	.philosophy-annotation {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-left: 3px solid var(--accent-color);
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
		margin: var(--space-md) 0;
	}

	.animate-fade-in {
		animation: fadeIn var(--duration-standard) var(--ease-standard);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateX(-8px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.annotation-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-xs);
	}

	.annotation-titles {
		display: flex;
		align-items: baseline;
		gap: var(--space-xs);
	}

	.annotation-title {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--accent-color);
		margin: 0;
	}

	.annotation-subtitle {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-style: italic;
	}

	.dismiss-button {
		background: none;
		border: none;
		color: var(--color-fg-muted);
		cursor: pointer;
		padding: 4px;
		border-radius: var(--radius-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.dismiss-button:hover {
		color: var(--color-fg-secondary);
	}

	.annotation-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.5;
		margin: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-fade-in {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
