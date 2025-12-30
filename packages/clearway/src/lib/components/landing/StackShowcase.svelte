<script lang="ts">
	// The Stack Showcase Section
	// Live proof of concept with actual production facility
	import Widget from '../../../embed/Widget.svelte';
</script>

<section id="showcase" class="showcase">
	<div class="container">
		<h2 class="section-title">See It Live</h2>
		<p class="section-subtitle">
			CLEARWAY powers court booking at The Stack Padel.
			Try the actual production system.
		</p>

		<div class="embed-container">
			<Widget facilitySlug="thestack" theme="dark" />
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
