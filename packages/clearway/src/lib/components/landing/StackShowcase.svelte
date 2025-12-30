<script lang="ts">
	// The Stack Showcase Section
	// Live proof of concept with actual production facility
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
					<span class="placeholder-icon">&#x1F3BE;</span>
					<p>Live booking widget loads here</p>
					<a href="https://thestackpadel.com/book" target="_blank" rel="noopener" class="placeholder-link">
						Visit The Stack to book
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
		font-size: 3rem;
		display: block;
		margin-bottom: var(--space-sm);
	}

	.placeholder-content p {
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-sm);
	}

	.placeholder-link {
		color: var(--clearway-accent);
		text-decoration: none;
		font-weight: 500;
	}

	.placeholder-link:hover {
		text-decoration: underline;
	}

	.testimonial {
		margin: 0;
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		border-left: 3px solid var(--clearway-accent);
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
