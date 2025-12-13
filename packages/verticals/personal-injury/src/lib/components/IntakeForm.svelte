<script lang="ts">
	/**
	 * Intake Form Component
	 * Client intake form that triggers WORKWAY webhook → Clio
	 *
	 * Flow:
	 * 1. User fills form
	 * 2. Submit → /api/intake
	 * 3. Server stores in D1 + triggers WORKWAY webhook
	 * 4. WORKWAY creates Clio contact + matter
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';
	import { CheckCircle, Loader2 } from 'lucide-svelte';

	const siteConfig = getSiteConfigFromContext();
	const { practiceAreas, phone } = siteConfig;

	let formState: 'idle' | 'submitting' | 'success' | 'error' = $state('idle');
	let errorMessage = $state('');

	// Form data
	let name = $state('');
	let email = $state('');
	let phoneNumber = $state('');
	let practiceArea = $state('');
	let message = $state('');

	async function handleSubmit(event: Event) {
		event.preventDefault();
		formState = 'submitting';
		errorMessage = '';

		try {
			const response = await fetch('/api/intake', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					email,
					phone: phoneNumber,
					practiceArea,
					message
				})
			});

			if (!response.ok) {
				throw new Error('Failed to submit form');
			}

			formState = 'success';
			// Reset form
			name = '';
			email = '';
			phoneNumber = '';
			practiceArea = '';
			message = '';
		} catch (err) {
			formState = 'error';
			errorMessage = 'Something went wrong. Please try again or call us directly.';
		}
	}
</script>

{#if formState === 'success'}
	<div class="success-message">
		<div class="success-icon">
			<CheckCircle size={48} strokeWidth={1.5} />
		</div>
		<h3 class="success-title">Thank you for reaching out.</h3>
		<p class="success-text">
			We've received your inquiry and will respond within 24 hours.
			For urgent matters, please call <a href="tel:{phone}">{phone}</a>.
		</p>
	</div>
{:else}
	<form class="intake-form" onsubmit={handleSubmit}>
		<div class="form-row">
			<label class="form-field">
				<span class="field-label">Full Name <span class="required">*</span></span>
				<input
					type="text"
					bind:value={name}
					required
					class="field-input"
					placeholder="Your name"
				/>
			</label>
		</div>

		<div class="form-row form-row-2col">
			<label class="form-field">
				<span class="field-label">Email <span class="required">*</span></span>
				<input
					type="email"
					bind:value={email}
					required
					class="field-input"
					placeholder="you@example.com"
				/>
			</label>

			<label class="form-field">
				<span class="field-label">Phone</span>
				<input
					type="tel"
					bind:value={phoneNumber}
					class="field-input"
					placeholder="(555) 123-4567"
				/>
			</label>
		</div>

		<div class="form-row">
			<label class="form-field">
				<span class="field-label">How can we help? <span class="required">*</span></span>
				<select bind:value={practiceArea} required class="field-select">
					<option value="">Select an area...</option>
					{#each practiceAreas as area}
						<option value={area.slug}>{area.name}</option>
					{/each}
					<option value="other">Other / Not sure</option>
				</select>
			</label>
		</div>

		<div class="form-row">
			<label class="form-field">
				<span class="field-label">Tell us about your situation <span class="required">*</span></span>
				<textarea
					bind:value={message}
					required
					class="field-textarea"
					rows="4"
					placeholder="Please provide a brief description of your legal matter..."
				></textarea>
			</label>
		</div>

		{#if formState === 'error'}
			<p class="error-message">{errorMessage}</p>
		{/if}

		<button
			type="submit"
			class="submit-button"
			disabled={formState === 'submitting'}
		>
			{#if formState === 'submitting'}
				<Loader2 size={18} class="spin" />
				Submitting...
			{:else}
				Request Consultation
			{/if}
		</button>

		<p class="form-disclaimer">
			By submitting this form, you agree to our
			<a href="/privacy">Privacy Policy</a>.
			This form does not create an attorney-client relationship.
		</p>
	</form>
{/if}

<style>
	.intake-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.form-row {
		display: flex;
		flex-direction: column;
	}

	.form-row-2col {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.field-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
	}

	.required {
		color: var(--color-error);
	}

	.field-input,
	.field-select,
	.field-textarea {
		padding: var(--space-sm);
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.field-input:focus,
	.field-select:focus,
	.field-textarea:focus {
		outline: none;
		border-color: var(--color-border-strong);
	}

	.field-input::placeholder,
	.field-textarea::placeholder {
		color: var(--color-fg-muted);
	}

	.field-select {
		cursor: pointer;
	}

	.field-textarea {
		resize: vertical;
		min-height: 100px;
	}

	.submit-button {
		padding: var(--space-sm) var(--space-lg);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-bg-pure);
		background: var(--color-fg-primary);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.submit-button:hover:not(:disabled) {
		background: var(--color-fg-secondary);
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.form-disclaimer {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-align: center;
		margin: 0;
	}

	.form-disclaimer a {
		color: var(--color-fg-tertiary);
		text-decoration: underline;
	}

	.error-message {
		padding: var(--space-sm);
		font-size: var(--text-body-sm);
		color: var(--color-error);
		background: rgba(204, 68, 68, 0.1);
		border-radius: var(--radius-sm);
		margin: 0;
	}

	.success-message {
		text-align: center;
		padding: var(--space-xl);
	}

	.success-icon {
		color: var(--color-success);
		margin-bottom: var(--space-md);
	}

	.success-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-success);
		margin: 0 0 var(--space-sm);
	}

	.success-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.success-text a {
		color: var(--color-fg-primary);
		text-decoration: underline;
	}

	@media (max-width: 768px) {
		.form-row-2col {
			grid-template-columns: 1fr;
		}
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.submit-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
	}
</style>
