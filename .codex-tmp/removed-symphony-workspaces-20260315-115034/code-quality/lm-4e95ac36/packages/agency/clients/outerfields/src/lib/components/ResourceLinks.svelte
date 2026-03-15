<script lang="ts">
	/**
	 * OUTERFIELDS Resource Links
	 *
	 * Documentation and design guideline links
	 */
	import { BookOpen, ArrowRight, Palette } from 'lucide-svelte';
</script>

<section class="resources-section">
	<div class="resources-container">
		<div class="resources-grid">
			<a href="/docs" class="resource-card">
				<div class="card-content">
					<div class="card-header">
						<BookOpen size={32} />
						<ArrowRight size={20} class="arrow" />
					</div>
					<h3 class="card-title">Technical Documentation</h3>
					<p class="card-description">Deep dive into the architecture, API references, and integration guides.</p>
				</div>
			</a>

			<a href="/design" class="resource-card">
				<div class="card-content">
					<div class="card-header">
						<Palette size={32} />
						<ArrowRight size={20} class="arrow" />
					</div>
					<h3 class="card-title">Design Guidelines</h3>
					<p class="card-description">Typography, color palettes, and accessibility standards for the OUTERFIELDS network.</p>
				</div>
			</a>
		</div>
	</div>
</section>

<style>
	.resources-section {
		padding: 4rem 1.5rem;
		background: var(--color-bg-pure);
	}

	.resources-container {
		max-width: var(--container-max-width);
		margin: 0 auto;
	}

	.resources-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
	}

	.resource-card {
		display: block;
		padding: 2rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1.5rem;
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.resource-card:hover {
		border-color: var(--color-border-strong);
		background: rgba(255, 255, 255, 0.03);
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.card-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.card-description {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		line-height: 1.6;
		margin: 0;
	}

	@media (max-width: 640px) {
		.resources-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
