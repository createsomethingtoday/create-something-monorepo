<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { config } from '$lib/config/runtime';

	let formState = $state<'idle' | 'submitting' | 'success' | 'error'>('idle');
	let formData = $state({
		name: '',
		email: '',
		company: '',
		budget: '',
		message: ''
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		formState = 'submitting';

		try {
			const response = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			if (response.ok) {
				formState = 'success';
			} else {
				formState = 'error';
			}
		} catch {
			formState = 'error';
		}
	}
</script>

<SEO
	title="Start a Project"
	description="Let's build something together"
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Contact', url: '/contact' }
	]}
/>

<div class="contact-page">
	<div class="contact-layout">
		<div class="contact-info">
			<h1 class="page-title">Let's talk</h1>
			<p class="page-intro">
				Have a project in mind? We'd love to hear about it. Tell us about your goals and we'll get
				back to you within 24 hours.
			</p>

			<div class="contact-details">
				<div class="detail">
					<span class="detail-label">Email</span>
					<a href="mailto:{$config.email}" class="detail-value">{$config.email}</a>
				</div>
				<div class="detail">
					<span class="detail-label">Phone</span>
					<a href="tel:{$config.phone}" class="detail-value">{$config.phone}</a>
				</div>
				<div class="detail">
					<span class="detail-label">Office</span>
					<address class="detail-address">
						{$config.address.street}<br />
						{$config.address.city}, {$config.address.state}
					</address>
				</div>
			</div>
		</div>

		<div class="contact-form-wrapper">
			{#if formState === 'success'}
				<div class="success-state">
					<h2 class="success-title">Message received</h2>
					<p class="success-text">
						We'll review your project and get back to you within 24 hours.
					</p>
				</div>
			{:else}
				<form class="contact-form" onsubmit={handleSubmit}>
					<div class="form-row">
						<div class="form-group">
							<label for="name" class="form-label">Name</label>
							<input
								type="text"
								id="name"
								bind:value={formData.name}
								required
								class="form-input"
							/>
						</div>
						<div class="form-group">
							<label for="email" class="form-label">Email</label>
							<input
								type="email"
								id="email"
								bind:value={formData.email}
								required
								class="form-input"
							/>
						</div>
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="company" class="form-label">Company</label>
							<input type="text" id="company" bind:value={formData.company} class="form-input" />
						</div>
						<div class="form-group">
							<label for="budget" class="form-label">Budget Range</label>
							<select id="budget" bind:value={formData.budget} class="form-select">
								<option value="">Select...</option>
								<option value="25-50k">$25K - $50K</option>
								<option value="50-100k">$50K - $100K</option>
								<option value="100-250k">$100K - $250K</option>
								<option value="250k+">$250K+</option>
							</select>
						</div>
					</div>

					<div class="form-group">
						<label for="message" class="form-label">Tell us about your project</label>
						<textarea
							id="message"
							bind:value={formData.message}
							rows="5"
							required
							class="form-textarea"
							placeholder="What are you trying to achieve? What's the timeline?"
						></textarea>
					</div>

					{#if formState === 'error'}
						<p class="error-message">Something went wrong. Please try again or email us directly.</p>
					{/if}

					<button type="submit" class="btn-primary submit-btn" disabled={formState === 'submitting'}>
						{formState === 'submitting' ? 'Sending...' : 'Send Message'}
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>

<style>
	.contact-page {
		min-height: 100vh;
		padding: calc(var(--space-3xl) + 80px) var(--gutter) var(--space-2xl);
	}

	.contact-layout {
		display: grid;
		grid-template-columns: 1fr 1.2fr;
		gap: var(--space-3xl);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.page-title {
		font-size: var(--text-display);
		font-weight: 700;
		margin-bottom: var(--space-md);
	}

	.page-intro {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-2xl);
	}

	.contact-details {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.detail-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.detail-value {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.detail-value:hover {
		color: var(--color-accent);
	}

	.detail-address {
		font-size: var(--text-body);
		font-style: normal;
		line-height: var(--leading-relaxed);
	}

	/* Form */
	.contact-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.form-row {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.form-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.form-input,
	.form-select,
	.form-textarea {
		font-family: inherit;
		font-size: var(--text-body);
		padding: var(--space-sm);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.form-input:focus,
	.form-select:focus,
	.form-textarea:focus {
		outline: none;
		border-color: var(--color-accent);
	}

	.form-textarea {
		resize: vertical;
		min-height: 140px;
	}

	.form-textarea::placeholder {
		color: var(--color-fg-muted);
	}

	.submit-btn {
		align-self: flex-start;
		font-size: var(--text-body);
		padding: var(--space-sm) var(--space-xl);
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error-message {
		font-size: var(--text-body-sm);
		color: #ff6b6b;
	}

	/* Success */
	.success-state {
		padding: var(--space-2xl);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		text-align: center;
	}

	.success-title {
		font-size: var(--text-h2);
		font-weight: 600;
		margin-bottom: var(--space-md);
	}

	.success-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	@media (max-width: 768px) {
		.contact-layout {
			grid-template-columns: 1fr;
		}

		.form-row {
			grid-template-columns: 1fr;
		}
	}
</style>
