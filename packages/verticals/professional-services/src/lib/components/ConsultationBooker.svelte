<script lang="ts">
	/**
	 * ConsultationBooker Component
	 *
	 * Integrates with WORKWAY workflows for:
	 * - Calendar integration (Calendly/Google Calendar)
	 * - Intake form submission
	 * - Confirmation email
	 * - CRM sync
	 *
	 * This component handles the UI; workflows handle the automation.
	 */

	interface Props {
		title?: string;
		description?: string;
	}

	// Title: 3 words (Fibonacci), Description: ~13 words (Fibonacci)
	let {
		title = "Schedule Your Consultation",
		description = "Select a time that works for you. We'll confirm within one business day."
	}: Props = $props();

	let formState = $state({
		name: '',
		email: '',
		company: '',
		phone: '',
		service: '',
		message: '',
		preferredDate: '',
		preferredTime: ''
	});

	let isSubmitting = $state(false);
	let submitStatus = $state<'idle' | 'success' | 'error'>('idle');

	// 3 services (Fibonacci) matching siteConfig
	const services = [
		{ value: 'strategic', label: 'Strategic Advisory' },
		{ value: 'financial', label: 'Financial Guidance' },
		{ value: 'operations', label: 'Operational Excellence' }
	];

	const timeSlots = [
		'9:00 AM',
		'10:00 AM',
		'11:00 AM',
		'1:00 PM',
		'2:00 PM',
		'3:00 PM',
		'4:00 PM'
	];

	async function handleSubmit(event: Event) {
		event.preventDefault();
		isSubmitting = true;
		submitStatus = 'idle';

		try {
			// This will trigger the WORKWAY consultation-booking workflow
			const response = await fetch('/api/consultation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formState)
			});

			if (response.ok) {
				submitStatus = 'success';
				// Reset form
				formState = {
					name: '',
					email: '',
					company: '',
					phone: '',
					service: '',
					message: '',
					preferredDate: '',
					preferredTime: ''
				};
			} else {
				submitStatus = 'error';
			}
		} catch {
			submitStatus = 'error';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<section class="booker-section">
	<div class="booker-container">
		<div class="booker-header">
			<h2 class="booker-title">{title}</h2>
			<p class="booker-description">{description}</p>
		</div>

		{#if submitStatus === 'success'}
			<div class="success-message page-enter">
				<div class="success-icon">&#10003;</div>
				<h3>Consultation Requested</h3>
				<p>We've received your request and will confirm your appointment within 24 hours. Check your email for next steps.</p>
				<button class="cta-secondary btn-canon" onclick={() => submitStatus = 'idle'}>
					Schedule Another
				</button>
			</div>
		{:else}
			<form class="booker-form" onsubmit={handleSubmit}>
				<div class="form-grid">
					<div class="form-group">
						<label for="name" class="form-label">Full Name *</label>
						<input
							type="text"
							id="name"
							class="form-input"
							bind:value={formState.name}
							required
						/>
					</div>

					<div class="form-group">
						<label for="email" class="form-label">Email Address *</label>
						<input
							type="email"
							id="email"
							class="form-input"
							bind:value={formState.email}
							required
						/>
					</div>

					<div class="form-group">
						<label for="company" class="form-label">Company</label>
						<input
							type="text"
							id="company"
							class="form-input"
							bind:value={formState.company}
						/>
					</div>

					<div class="form-group">
						<label for="phone" class="form-label">Phone Number</label>
						<input
							type="tel"
							id="phone"
							class="form-input"
							bind:value={formState.phone}
						/>
					</div>

					<div class="form-group">
						<label for="service" class="form-label">Service of Interest *</label>
						<select
							id="service"
							class="form-input"
							bind:value={formState.service}
							required
						>
							<option value="">Select a service</option>
							{#each services as service}
								<option value={service.value}>{service.label}</option>
							{/each}
						</select>
					</div>

					<div class="form-group">
						<label for="preferredDate" class="form-label">Preferred Date *</label>
						<input
							type="date"
							id="preferredDate"
							class="form-input"
							bind:value={formState.preferredDate}
							min={new Date().toISOString().split('T')[0]}
							required
						/>
					</div>

					<div class="form-group">
						<label for="preferredTime" class="form-label">Preferred Time *</label>
						<select
							id="preferredTime"
							class="form-input"
							bind:value={formState.preferredTime}
							required
						>
							<option value="">Select a time</option>
							{#each timeSlots as slot}
								<option value={slot}>{slot}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="form-group form-group-full">
					<label for="message" class="form-label">Tell us about your needs</label>
					<textarea
						id="message"
						class="form-input form-textarea"
						bind:value={formState.message}
						rows="4"
					></textarea>
				</div>

				{#if submitStatus === 'error'}
					<div class="error-message">
						Something went wrong. Please try again or contact us directly.
					</div>
				{/if}

				<button type="submit" class="cta-primary btn-canon submit-btn" disabled={isSubmitting}>
					{isSubmitting ? 'Submitting...' : 'Request Consultation'}
				</button>
			</form>
		{/if}
	</div>
</section>

<style>
	.booker-section {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-pure);
	}

	.booker-container {
		max-width: var(--width-prose);
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	.booker-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.booker-title {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.booker-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.booker-form {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-md);
	}

	@media (min-width: 640px) {
		.form-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.form-group-full {
		margin-top: var(--space-md);
	}

	.form-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
	}

	.form-input {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			box-shadow var(--duration-micro) var(--ease-standard);
	}

	.form-input:focus {
		outline: none;
		border-color: var(--color-border-strong);
		box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
	}

	.form-input:hover:not(:focus) {
		border-color: var(--color-border-emphasis);
	}

	.form-input::placeholder {
		color: var(--color-fg-muted);
	}

	.form-textarea {
		resize: vertical;
		min-height: var(--space-2xl); /* ~110px */
	}

	.submit-btn {
		width: 100%;
		margin-top: var(--space-lg);
		font-size: var(--text-body);
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.success-message {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-success);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
		text-align: center;
	}

	.success-icon {
		width: var(--width-avatar-sm);
		height: var(--width-avatar-sm);
		border-radius: var(--radius-full);
		background: var(--color-success-muted);
		color: var(--color-success);
		font-size: var(--text-h2);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto var(--space-md);
	}

	.success-message h3 {
		font-size: var(--text-h4);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.success-message p {
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
	}

	.error-message {
		background: var(--color-error-muted);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
		color: var(--color-error);
		font-size: var(--text-body-sm);
		margin-top: var(--space-md);
		text-align: center;
	}
</style>
