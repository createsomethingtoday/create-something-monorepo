<script lang="ts">
	/**
	 * Hero Section for createsomething.io
	 *
	 * Showcases the ontological distinction between:
	 *   - Experiments (Zuhandenheit) → Engaged practice, reader as participant
	 *   - Papers (Vorhandenheit) → Detached analysis, reader as observer
	 *
	 * Both paths lead to understanding; the difference is in HOW you engage.
	 */
</script>

<section class="hero">
	<div class="hero-container">
		<!-- Masthead -->
		<div class="masthead animate-reveal" style="--delay: 0">
			<span class="masthead-text">CREATE SOMETHING</span>
		</div>

		<!-- Main Headline -->
		<h1 class="headline animate-reveal" style="--delay: 1">
			Systems Thinking for AI-Native Development
		</h1>

		<!-- Subheadline -->
		<p class="subheadline animate-reveal" style="--delay: 2">
			Research with tracked experiments and rigorous methodology.
			Each piece documents what was built, measured results, and honest learnings.
		</p>

		<!-- The Two Paths -->
		<div class="paths-container animate-reveal" style="--delay: 3">
			<!-- Experiments Path -->
			<a href="/experiments" class="path-card experiments">
				<div class="path-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
					</svg>
				</div>
				<h2 class="path-title">Experiments</h2>
				<p class="path-mode">Zuhandenheit</p>
				<p class="path-description">
					Engaged practice. Interactive demonstrations where tools recede into use.
					You participate; patterns emerge through doing.
				</p>
				<span class="path-cta">
					Explore Experiments
					<svg viewBox="0 0 20 20" fill="currentColor" class="cta-arrow">
						<path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd" />
					</svg>
				</span>
			</a>

			<!-- Divider -->
			<div class="path-divider">
				<span class="divider-text">or</span>
			</div>

			<!-- Papers Path -->
			<a href="/papers" class="path-card papers">
				<div class="path-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
					</svg>
				</div>
				<h2 class="path-title">Papers</h2>
				<p class="path-mode">Vorhandenheit</p>
				<p class="path-description">
					Detached analysis. Theoretical grounding where concepts are examined.
					You observe; understanding deepens through reflection.
				</p>
				<span class="path-cta">
					Read Papers
					<svg viewBox="0 0 20 20" fill="currentColor" class="cta-arrow">
						<path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd" />
					</svg>
				</span>
			</a>
		</div>

		<!-- Hermeneutic Circle Note -->
		<p class="hermeneutic-note animate-reveal" style="--delay: 4">
			Both paths connect. Experiments test what papers theorize. Papers ground what experiments reveal.
			<span class="note-label">— The Hermeneutic Circle</span>
		</p>
	</div>
</section>

<style>
	/* ==========================================================================
	   Hero Section - Canonical CSS
	   ========================================================================== */

	.hero {
		position: relative;
		padding: var(--space-xl) var(--space-md);
		overflow: hidden;
		background: linear-gradient(to bottom, var(--color-bg-pure), var(--color-bg-surface));
	}

	.hero-container {
		max-width: 1100px;
		margin: 0 auto;
		text-align: center;
	}

	/* Masthead */
	.masthead {
		margin-bottom: var(--space-md);
	}

	.masthead-text {
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		letter-spacing: var(--tracking-widest);
		color: var(--color-fg-secondary);
	}

	/* Headline */
	.headline {
		font-size: clamp(2rem, 6vw, 3.5rem);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		line-height: var(--leading-tight);
		margin: 0 0 var(--space-sm) 0;
		text-align: center;
	}

	/* Subheadline */
	.subheadline {
		font-size: var(--text-body-lg);
		color: var(--color-fg-muted);
		max-width: 700px;
		margin: 0 auto var(--space-lg);
		line-height: var(--leading-relaxed);
	}

	/* Paths Container */
	.paths-container {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: var(--space-md);
		align-items: stretch;
		margin-bottom: var(--space-lg);
	}

	@media (max-width: 768px) {
		.paths-container {
			grid-template-columns: 1fr;
			gap: var(--space-sm);
		}
	}

	/* Path Cards */
	.path-card {
		display: flex;
		flex-direction: column;
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: all var(--duration-standard) var(--ease-out);
	}

	.path-card:hover {
		border-color: var(--color-border-hover);
		background: var(--color-hover);
		transform: translateY(-2px);
	}

	.path-icon {
		width: 48px;
		height: 48px;
		margin: 0 auto var(--space-sm);
		color: var(--color-fg-muted);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.path-card:hover .path-icon {
		color: var(--color-fg-secondary);
	}

	.path-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs) 0;
	}

	.path-mode {
		font-size: var(--text-caption);
		font-style: italic;
		color: var(--color-fg-muted);
		margin: 0 0 var(--space-sm) 0;
		letter-spacing: var(--tracking-wide);
	}

	.path-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
		flex-grow: 1;
	}

	.path-cta {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		margin-top: var(--space-md);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.path-card:hover .path-cta {
		color: var(--color-fg-primary);
	}

	.cta-arrow {
		width: 16px;
		height: 16px;
		transition: transform var(--duration-micro) var(--ease-out);
	}

	.path-card:hover .cta-arrow {
		transform: translateX(4px);
	}

	/* Divider */
	.path-divider {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.divider-text {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-style: italic;
	}

	@media (max-width: 768px) {
		.path-divider {
			padding: var(--space-xs) 0;
		}

		.divider-text::before,
		.divider-text::after {
			content: '—';
			margin: 0 var(--space-sm);
			color: var(--color-border-default);
		}
	}

	/* Hermeneutic Note */
	.hermeneutic-note {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-style: italic;
		max-width: 600px;
		margin: 0 auto;
		line-height: var(--leading-relaxed);
	}

	.note-label {
		display: block;
		margin-top: var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		letter-spacing: var(--tracking-wide);
	}

	/* Staggered reveal animation - CSS only */
	.animate-reveal {
		opacity: 0;
		transform: translateY(16px);
		animation: reveal 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		animation-delay: calc(var(--delay, 0) * 150ms);
	}

	@keyframes reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-reveal {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
