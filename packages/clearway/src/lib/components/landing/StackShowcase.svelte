<script lang="ts">
	// The Stack Showcase Section
	// Live proof of concept with actual production facility
	// Icon: Lucide (LayoutGrid)
</script>

<section id="showcase" class="showcase">
	<div class="container">
		<h2 class="section-title">See It Live</h2>
		<p class="section-subtitle">
			CLEARWAY powers court booking at The Stack Padel.
			Try the actual production system.
		</p>

		<div class="embed-container">
			<div class="embed-placeholder">
				<div class="placeholder-content">
					<div class="placeholder-icon">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<rect width="7" height="7" x="3" y="3" rx="1"/>
							<rect width="7" height="7" x="14" y="3" rx="1"/>
							<rect width="7" height="7" x="14" y="14" rx="1"/>
							<rect width="7" height="7" x="3" y="14" rx="1"/>
						</svg>
					</div>
					<p>Live booking widget loads here</p>
					<a href="https://thestackpadel.com/book" target="_blank" rel="noopener" class="placeholder-link">
						Visit The Stack to book →
					</a>
				</div>
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

	.embed-container {
		margin-bottom: var(--space-xl);
	}

	.embed-placeholder {
		aspect-ratio: 16 / 9;
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.placeholder-content {
		text-align: center;
	}

	.placeholder-icon {
		width: 3rem;
		height: 3rem;
		margin: 0 auto var(--space-sm);
		color: var(--color-fg-tertiary);
	}

	.placeholder-icon svg {
		width: 100%;
		height: 100%;
	}

	.placeholder-content p {
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-sm);
	}

	.placeholder-link {
		color: var(--color-fg-secondary);
		text-decoration: none;
		font-weight: 500;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.placeholder-link:hover {
		color: var(--color-fg-primary);
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
</style>
