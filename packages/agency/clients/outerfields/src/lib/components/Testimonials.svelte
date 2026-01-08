<script lang="ts">
	/**
	 * OUTERFIELDS Testimonials
	 *
	 * Creator success stories and quotes
	 */

	interface Testimonial {
		quote: string;
		author: string;
		role: string;
		avatar: string;
		revenue?: string;
		subscribers?: string;
	}

	const testimonials: Testimonial[] = [
		{
			quote:
				"OUTERFIELDS transformed how I connect with my audience. The analytics alone helped me double my engagement in three months.",
			author: 'Sarah Chen',
			role: 'Photography Educator',
			avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face',
			revenue: '$45K/mo',
			subscribers: '12.4K'
		},
		{
			quote:
				"Moving from Uscreen was the best decision. The customization options and community features are leagues ahead.",
			author: 'Marcus Thompson',
			role: 'Fitness Creator',
			avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
			revenue: '$78K/mo',
			subscribers: '34.2K'
		},
		{
			quote:
				"The Netflix-style interface made my members feel like they were using a premium platform. Worth every penny.",
			author: 'Elena Rodriguez',
			role: 'Cooking Channel',
			avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face',
			revenue: '$23K/mo',
			subscribers: '8.7K'
		}
	];
</script>

<section class="testimonials-section">
	<div class="testimonials-container">
		<div class="section-header">
			<span class="section-badge">Success Stories</span>
			<h2 class="section-title">Creators Love OUTERFIELDS</h2>
			<p class="section-description">
				Join thousands of creators who've transformed their content businesses with our platform.
			</p>
		</div>

		<div class="testimonials-grid">
			{#each testimonials as testimonial}
				<article class="testimonial-card">
					<div class="quote-icon">
						<span class="material-symbols-outlined">format_quote</span>
					</div>
					<blockquote class="testimonial-quote">
						"{testimonial.quote}"
					</blockquote>
					<div class="testimonial-footer">
						<div class="author-info">
							<img
								src={testimonial.avatar}
								alt={testimonial.author}
								class="author-avatar"
								loading="lazy"
							/>
							<div class="author-details">
								<span class="author-name">{testimonial.author}</span>
								<span class="author-role">{testimonial.role}</span>
							</div>
						</div>
						{#if testimonial.revenue || testimonial.subscribers}
							<div class="author-stats">
								{#if testimonial.revenue}
									<span class="stat">
										<span class="stat-value">{testimonial.revenue}</span>
										<span class="stat-label">Revenue</span>
									</span>
								{/if}
								{#if testimonial.subscribers}
									<span class="stat">
										<span class="stat-value">{testimonial.subscribers}</span>
										<span class="stat-label">Subscribers</span>
									</span>
								{/if}
							</div>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	</div>
</section>

<style>
	.testimonials-section {
		padding: 6rem 1.5rem;
		background: var(--color-bg-pure);
	}

	.testimonials-container {
		max-width: 72rem;
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: 4rem;
	}

	.section-badge {
		display: inline-block;
		padding: 0.375rem 0.75rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1rem;
	}

	.section-title {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
	}

	.section-description {
		font-size: 1.125rem;
		color: var(--color-fg-muted);
		max-width: 36rem;
		margin: 0 auto;
		line-height: 1.7;
	}

	.testimonials-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	.testimonial-card {
		position: relative;
		padding: 2rem;
		background: var(--glass-bg);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		transition: all 0.3s ease;
	}

	.testimonial-card:hover {
		border-color: var(--color-border-strong);
		transform: translateY(-4px);
		box-shadow: 0 20px 40px -15px rgba(255, 255, 255, 0.1);
	}

	.quote-icon {
		position: absolute;
		top: 1rem;
		right: 1rem;
		color: var(--color-fg-secondary);
		opacity: 0.3;
	}

	.quote-icon .material-symbols-outlined {
		font-size: 2rem;
	}

	.testimonial-quote {
		font-size: 1rem;
		line-height: 1.7;
		color: var(--color-fg-secondary);
		margin: 0 0 1.5rem;
		font-style: italic;
	}

	.testimonial-footer {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.author-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.author-avatar {
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid var(--color-border-default);
	}

	.author-details {
		display: flex;
		flex-direction: column;
	}

	.author-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.author-role {
		font-size: 0.75rem;
		color: var(--color-fg-subtle);
	}

	.author-stats {
		display: flex;
		gap: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border-default);
	}

	.stat {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.stat-label {
		font-size: 0.625rem;
		color: var(--color-fg-subtle);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	@media (max-width: 1024px) {
		.testimonials-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.testimonials-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
