<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';
	import { page } from '$app/stores';
	// Footer is provided by layout

	// Service mapping for display names
	const serviceNames: Record<string, string> = {
		'web-development': 'Web Development',
		automation: 'AI Automation Systems',
		'agentic-systems': 'Agentic Systems Engineering',
		partnership: 'Ongoing Systems Partnership',
		transformation: 'AI-Native Transformation',
		advisory: 'Strategic Advisory'
	};

	// Get service and assessment from URL query params
	let serviceParam = $derived($page.url.searchParams.get('service'));
	let assessmentId = $derived($page.url.searchParams.get('assessment'));
	let serviceName = $derived(serviceParam ? serviceNames[serviceParam] || serviceParam : null);
	let hasAssessment = $derived(!!assessmentId);

	let submitting = $state(false);
	let submitMessage = $state('');
	let submitSuccess = $state(false);

	async function handleSubmit(event: Event) {
		event.preventDefault();
		submitting = true;
		submitMessage = '';

		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);

		try {
			const response = await fetch('/api/contact', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: formData.get('name'),
					email: formData.get('email'),
					message: formData.get('message'),
					service: serviceParam || undefined,
					assessment_id: assessmentId || undefined
				})
			});

			const result = await response.json();

			if (response.ok && result.success) {
				submitSuccess = true;
				submitMessage = 'Sent. We\'ll be in touch.';
				form.reset();
			} else {
				submitSuccess = false;
				submitMessage = result.message || 'Something went wrong. Try again.';
			}
		} catch (error) {
			submitSuccess = false;
			submitMessage = 'Something went wrong. Try again.';
		} finally {
			submitting = false;
		}
	}
</script>

<SEO
	title="Contact"
	description="Start a conversation about your project. We build AI systems that work while you sleep."
	keywords="contact, agentic systems, AI automation, autonomous systems"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<section class="contact-section">
	<div class="max-w-2xl mx-auto px-6">
		{#if hasAssessment && serviceName}
			<div class="assessment-context">
				<span class="context-label">Based on your assessment</span>
				<span class="context-value">We recommend {serviceName}</span>
			</div>
		{:else if serviceName}
			<div class="service-context">
				<span class="service-label">Interested in</span>
				<span class="service-name">{serviceName}</span>
			</div>
		{/if}

		<h1 class="contact-headline">
			{hasAssessment
				? 'Tell us more about your situation.'
				: serviceName
					? 'Tell us about your situation.'
					: "Tell us what you're building."}
		</h1>

		<form class="contact-form" onsubmit={handleSubmit}>
			<div class="form-field">
				<label for="name" class="form-label">Name <span class="required-indicator" aria-hidden="true">*</span></label>
				<input
					type="text"
					id="name"
					name="name"
					required
					aria-required="true"
					aria-invalid={!submitSuccess && !!submitMessage}
					aria-describedby={submitMessage && !submitSuccess ? 'contact-message' : undefined}
					class="form-input"
					autocomplete="name"
				/>
			</div>

			<div class="form-field">
				<label for="email" class="form-label">Email <span class="required-indicator" aria-hidden="true">*</span></label>
				<input
					type="email"
					id="email"
					name="email"
					required
					aria-required="true"
					aria-invalid={!submitSuccess && !!submitMessage}
					aria-describedby={submitMessage && !submitSuccess ? 'contact-message' : undefined}
					class="form-input"
					autocomplete="email"
				/>
			</div>

			<div class="form-field">
				<label for="message" class="form-label">What are you working on? <span class="required-indicator" aria-hidden="true">*</span></label>
				<textarea
					id="message"
					name="message"
					required
					aria-required="true"
					aria-invalid={!submitSuccess && !!submitMessage}
					rows="5"
					class="form-input form-textarea"
				></textarea>
			</div>

			<button
				type="submit"
				disabled={submitting}
				class="form-submit"
			>
				{submitting ? 'Sending...' : 'Send'}
			</button>

			{#if submitMessage}
				<p
					id="contact-message"
					class="form-message"
					class:success={submitSuccess}
					class:error={!submitSuccess}
					role="alert"
					aria-live="polite"
				>
					{submitMessage}
				</p>
			{/if}
		</form>

		<p class="contact-alt">
			Or email directly: <a href="mailto:micah@createsomething.io" class="contact-link">micah@createsomething.io</a>
		</p>
	</div>
</section>

<style>
	.contact-section {
		min-height: 80vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-2xl) 0;
	}

	.contact-headline {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-tight);
		line-height: var(--leading-tight);
		margin-bottom: var(--space-xl);
	}

	.contact-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
	}

	.form-input {
		padding: 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.form-input::placeholder {
		color: var(--color-fg-muted);
	}

	.form-input:focus {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-color: var(--color-fg-primary);
	}

	.form-textarea {
		resize: none;
		min-height: 140px;
	}

	.form-submit {
		margin-top: var(--space-sm);
		padding: 1rem 2rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-full);
		border: none;
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.form-submit:hover:not(:disabled) {
		opacity: 0.9;
	}

	.form-submit:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.form-submit:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.form-message {
		padding: 1rem;
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		text-align: center;
	}

	.form-message.success {
		background: var(--color-success-muted);
		color: var(--color-success);
		border: 1px solid var(--color-success);
	}

	.form-message.error {
		background: var(--color-error-muted);
		color: var(--color-error);
		border: 1px solid var(--color-error);
	}

	.required-indicator {
		color: var(--color-error);
		margin-left: 0.25em;
	}

	.contact-alt {
		margin-top: var(--space-xl);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-align: center;
	}

	.contact-link {
		color: var(--color-fg-primary);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.contact-link:hover {
		opacity: 0.8;
	}

	/* Service context */
	.service-context {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
		margin-bottom: var(--space-lg);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.service-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
	}

	.service-name {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	/* Assessment context - emphasized version */
	.assessment-context {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
		margin-bottom: var(--space-lg);
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-lg);
	}

	.context-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-tertiary);
	}

	.context-value {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}
</style>
