<script lang="ts">
	// Philosophy Section - "Why We Built This Way"
	// The Heideggerian foundation of CLEARWAY
	// Introduces Zuhandenheit without the jargon
</script>

<section class="philosophy">
	<div class="container">
		<h2 class="section-title">Why We Built This Way</h2>

		<div class="philosophy-content">
			<p class="philosophy-lead">
				In philosophy, there's a distinction between tools that work and tools that recede.
			</p>

			<div class="analogy">
				<p>
					A hammer in use is invisible. You don't think about the hammer&mdash;you think about the nail.
					Only when it breaks do you notice it.
				</p>
			</div>

			<p class="philosophy-insight">
				Most scheduling software is always broken. It constantly demands attention, asks for input,
				requires decisions. It never lets you forget it exists.
			</p>

			<div class="principle">
				<p class="principle-statement">
					CLEARWAY is built on a different principle:
				</p>
				<p class="principle-core">
					The best infrastructure is the kind you never notice.
				</p>
			</div>

			<p class="philosophy-resolution">
				When members book courts through CLEARWAY, they don't think about booking systems.
				They think about playing pickleball. The system recedes. The experience remains.
			</p>
		</div>

		<div class="philosophy-cta">
			<a href="/philosophy" class="cta-link">
				Read the full philosophy
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M5 12h14"/>
					<path d="m12 5 7 7-7 7"/>
				</svg>
			</a>
		</div>
	</div>
</section>

<style>
	.philosophy {
		padding: var(--space-2xl) var(--space-md);
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 48rem;
		margin: 0 auto;
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 600;
		text-align: center;
		margin: 0 0 var(--space-xl);
		color: var(--color-fg-primary);
	}

	.philosophy-content {
		text-align: center;
	}

	.philosophy-lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-lg);
		line-height: 1.7;
	}

	.analogy {
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		margin: 0 0 var(--space-lg);
	}

	.analogy p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
		line-height: 1.7;
		font-style: italic;
	}

	.philosophy-insight {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-xl);
		line-height: 1.7;
	}

	.principle {
		margin: 0 0 var(--space-lg);
		padding: var(--space-lg) 0;
		border-top: 1px solid var(--color-border-default);
		border-bottom: 1px solid var(--color-border-default);
	}

	.principle-statement {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		margin: 0 0 var(--space-sm);
	}

	.principle-core {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.philosophy-resolution {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-xl);
		line-height: 1.7;
	}

	.philosophy-cta {
		text-align: center;
	}

	.cta-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.cta-link:hover {
		color: var(--color-fg-primary);
	}

	.cta-link svg {
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.cta-link:hover svg {
		transform: translateX(4px);
	}

	.cta-link:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 4px;
		border-radius: var(--radius-sm);
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.cta-link,
		.cta-link svg {
			transition: none;
		}
		.cta-link:hover svg {
			transform: none;
		}
	}
</style>
