<script lang="ts">
	import { Footer, SEO } from '@create-something/components';

	let selectedTrack = $state('');
	let feedback = $state('');
	let isSubmitting = $state(false);
	let submitSuccess = $state(false);
	let submitError = $state('');

	const tracks = [
		{
			value: 'cloudflare',
			label: 'More Cloudflare',
			description: 'Workers, D1 databases, KV storage — deeper infrastructure'
		},
		{
			value: 'agentic',
			label: 'AI-Assisted Development',
			description: 'Advanced Cursor, multi-agent workflows, Loom & Ground tools'
		},
		{
			value: 'systems',
			label: 'Building Automation Systems',
			description: 'Architecture patterns, the CREATE SOMETHING approach'
		},
		{
			value: 'workway',
			label: 'Building Products on Cloudflare',
			description: 'WORKWAY workflows, marketplace development, shipping products'
		}
	];

	async function handleSubmit(event: Event) {
		event.preventDefault();
		
		if (!selectedTrack) {
			submitError = 'Please select what you want to learn next';
			return;
		}

		isSubmitting = true;
		submitError = '';

		try {
			const response = await fetch('/api/webinar/survey', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					webinar_slug: 'zero-to-cloudflare',
					track: selectedTrack,
					feedback
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to submit');
			}

			submitSuccess = true;
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			isSubmitting = false;
		}
	}

	const quickLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'Experiments', href: '/experiments' },
		{ label: 'Methodology', href: '/methodology' }
	];
</script>

<SEO
	title="Workshop Feedback | CREATE SOMETHING"
	description="Help shape the next CREATE SOMETHING workshop. Tell us what you want to learn."
	propertyName="space"
/>

<section class="survey-section">
	<div class="survey-container">
		{#if submitSuccess}
			<div class="success-message animate-reveal">
				<div class="success-icon">✓</div>
				<h1 class="success-title">Thank You</h1>
				<p class="success-description">
					Your feedback shapes what we build next. We'll be in touch with content tailored to your interests.
				</p>
				<a href="/" class="back-link">← Back to Space</a>
			</div>
		{:else}
			<div class="survey-content">
				<div class="survey-header animate-reveal" style="--delay: 0">
					<p class="eyebrow">WORKSHOP FEEDBACK</p>
					<h1 class="title">What's Next For You?</h1>
					<p class="description">
						You've deployed your first site to Cloudflare. Now help us understand where you want to go next.
					</p>
				</div>

				<form class="survey-form" onsubmit={handleSubmit}>
					<div class="tracks-grid">
						{#each tracks as track, index}
							<label
								class="track-option animate-reveal"
								class:selected={selectedTrack === track.value}
								style="--delay: {index + 1}"
							>
								<input
									type="radio"
									name="track"
									value={track.value}
									bind:group={selectedTrack}
									class="track-input"
								/>
								<div class="track-content">
									<span class="track-label">{track.label}</span>
									<span class="track-description">{track.description}</span>
								</div>
								<div class="track-check">
									{#if selectedTrack === track.value}
										<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
											<path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor"/>
										</svg>
									{/if}
								</div>
							</label>
						{/each}
					</div>

					<div class="feedback-section animate-reveal" style="--delay: 5">
						<label for="feedback" class="feedback-label">
							Anything else? (Optional)
						</label>
						<textarea
							id="feedback"
							bind:value={feedback}
							class="feedback-input"
							rows="3"
							placeholder="Questions, suggestions, or what you're building..."
						></textarea>
					</div>

					{#if submitError}
						<div class="form-error animate-reveal">{submitError}</div>
					{/if}

					<button
						type="submit"
						class="submit-button animate-reveal"
						style="--delay: 6"
						disabled={isSubmitting}
					>
						{isSubmitting ? 'Submitting...' : 'Submit Feedback'}
					</button>
				</form>
			</div>
		{/if}
	</div>
</section>

<Footer
	mode="space"
	showNewsletter={false}
	aboutText="CREATE SOMETHING workshops — learning the foundations of modern infrastructure."
	{quickLinks}
	showSocial={true}
/>

<style>
	.survey-section {
		min-height: 100vh;
		padding: var(--space-3xl) var(--space-lg) var(--space-2xl);
	}

	.survey-container {
		max-width: 600px;
		margin: 0 auto;
	}

	.survey-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.eyebrow {
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-sm);
	}

	.title {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
	}

	.tracks-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		margin-bottom: var(--space-xl);
	}

	.track-option {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.track-option:hover {
		border-color: var(--color-border-emphasis);
	}

	.track-option.selected {
		border-color: var(--color-fg-primary);
		background: var(--color-bg-elevated);
	}

	.track-input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.track-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.track-label {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.track-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.track-check {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-fg-primary);
	}

	.feedback-section {
		margin-bottom: var(--space-lg);
	}

	.feedback-label {
		display: block;
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.feedback-input {
		width: 100%;
		padding: var(--space-md);
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		resize: vertical;
		font-family: inherit;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.feedback-input:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.feedback-input::placeholder {
		color: var(--color-fg-muted);
	}

	.form-error {
		padding: var(--space-sm) var(--space-md);
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--radius-md);
		color: #ef4444;
		font-size: var(--text-body-sm);
		margin-bottom: var(--space-md);
	}

	.submit-button {
		width: 100%;
		padding: var(--space-sm) var(--space-lg);
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-bg-pure);
		background: var(--color-fg-primary);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.submit-button:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Success State */
	.success-message {
		text-align: center;
		padding: var(--space-2xl) var(--space-lg);
	}

	.success-icon {
		width: 64px;
		height: 64px;
		margin: 0 auto var(--space-lg);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		font-weight: 700;
	}

	.success-title {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.success-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-xl);
	}

	.back-link {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	/* Animations */
	.animate-reveal {
		opacity: 0;
		transform: translateY(16px);
		animation: reveal var(--duration-complex) var(--ease-standard) forwards;
		animation-delay: calc(var(--delay, 0) * 80ms);
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
