<script lang="ts">
	interface TimeSlot {
		start_at: string;
		end_at: string;
		duration_minutes: number;
	}

	interface BookingFormData {
		name: string;
		email: string;
		company: string;
		notes: string;
	}

	interface Props {
		selectedSlot: TimeSlot;
		timezone: string;
		onSubmit: (data: BookingFormData) => Promise<void>;
		onBack: () => void;
		loading?: boolean;
		error?: string | null;
	}

	let {
		selectedSlot,
		timezone,
		onSubmit,
		onBack,
		loading = false,
		error = null
	}: Props = $props();

	let name = $state('');
	let email = $state('');
	let company = $state('');
	let notes = $state('');

	let errors = $state<Record<string, string>>({});

	function formatDateTime(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			timeZone: timezone
		});
	}

	function formatTime(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZone: timezone
		});
	}

	function validate(): boolean {
		const newErrors: Record<string, string> = {};

		if (!name.trim()) {
			newErrors.name = 'Name is required';
		}

		if (!email.trim()) {
			newErrors.email = 'Email is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			newErrors.email = 'Please enter a valid email';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!validate()) return;

		await onSubmit({
			name: name.trim(),
			email: email.trim(),
			company: company.trim(),
			notes: notes.trim()
		});
	}
</script>

<form class="booking-form" onsubmit={handleSubmit}>
	<div class="selected-time">
		<span class="time-label">Selected time</span>
		<span class="time-value">
			{formatDateTime(selectedSlot.start_at)}
		</span>
		<span class="time-range">
			{formatTime(selectedSlot.start_at)} - {formatTime(selectedSlot.end_at)}
		</span>
		<button type="button" class="change-button" onclick={onBack}>
			Change
		</button>
	</div>

	<div class="form-fields">
		<div class="field">
			<label for="name" class="label">
				Name <span class="required">*</span>
			</label>
			<input
				type="text"
				id="name"
				bind:value={name}
				class="input"
				class:error={errors.name}
				placeholder="Your name"
				disabled={loading}
				autocomplete="name"
			/>
			{#if errors.name}
				<span class="field-error">{errors.name}</span>
			{/if}
		</div>

		<div class="field">
			<label for="email" class="label">
				Email <span class="required">*</span>
			</label>
			<input
				type="email"
				id="email"
				bind:value={email}
				class="input"
				class:error={errors.email}
				placeholder="you@example.com"
				disabled={loading}
				autocomplete="email"
			/>
			{#if errors.email}
				<span class="field-error">{errors.email}</span>
			{/if}
		</div>

		<div class="field">
			<label for="company" class="label">Company</label>
			<input
				type="text"
				id="company"
				bind:value={company}
				class="input"
				placeholder="Your company (optional)"
				disabled={loading}
				autocomplete="organization"
			/>
		</div>

		<div class="field">
			<label for="notes" class="label">Notes</label>
			<textarea
				id="notes"
				bind:value={notes}
				class="textarea"
				placeholder="Anything you'd like to discuss? (optional)"
				disabled={loading}
				rows={3}
			></textarea>
		</div>
	</div>

	{#if error}
		<div class="form-error">
			<span class="error-icon">!</span>
			<span class="error-text">{error}</span>
		</div>
	{/if}

	<div class="form-actions">
		<button type="button" class="back-button" onclick={onBack} disabled={loading}>
			← Back
		</button>
		<button type="submit" class="submit-button" disabled={loading}>
			{#if loading}
				Booking...
			{:else}
				Confirm booking
			{/if}
		</button>
	</div>
</form>

<style>
	.booking-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-lg);
	}

	.selected-time {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		position: relative;
	}

	.time-label {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.time-value {
		font-size: var(--text-performance-body-lg);
		font-weight: var(--font-performance-semibold);
		color: var(--color-performance-fg-primary);
	}

	.time-range {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
	}

	.change-button {
		position: absolute;
		top: var(--space-performance-md);
		right: var(--space-performance-md);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.change-button:hover {
		color: var(--color-performance-fg-primary);
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-md);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.label {
		font-size: var(--text-performance-body-sm);
		font-weight: var(--font-performance-medium);
		color: var(--color-performance-fg-secondary);
	}

	.required {
		color: var(--color-performance-error);
	}

	.input,
	.textarea {
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-primary);
		transition: border-color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.input::placeholder,
	.textarea::placeholder {
		color: var(--color-performance-fg-muted);
	}

	.input:focus,
	.textarea:focus {
		outline: none;
		border-color: var(--color-performance-border-emphasis);
	}

	.input:focus-visible,
	.textarea:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 2px;
	}

	.input.error,
	.input.error:focus {
		border-color: var(--color-performance-error);
	}

	.input:disabled,
	.textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.textarea {
		resize: vertical;
		min-height: 80px;
	}

	.field-error {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-error);
	}

	.form-error {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: var(--color-performance-error-muted);
		border: 1px solid var(--color-performance-error-border);
		border-radius: var(--radius-performance-scale-md);
	}

	.error-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		background: var(--color-performance-error);
		color: var(--color-performance-bg-pure);
		border-radius: 50%;
		font-size: var(--text-performance-caption);
		font-weight: var(--font-performance-bold);
	}

	.error-text {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-error);
	}

	.form-actions {
		display: flex;
		justify-content: space-between;
		gap: var(--space-performance-md);
		padding-top: var(--space-performance-md);
	}

	.back-button {
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: transparent;
		border-radius: var(--radius-performance-scale-md);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.back-button:hover:not(:disabled) {
		border-color: var(--color-performance-border-emphasis);
		color: var(--color-performance-fg-primary);
	}

	.back-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-button {
		padding: var(--space-performance-sm) var(--space-performance-lg);
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-pure);
		border: none;
		border-radius: var(--radius-performance-scale-md);
		font-size: var(--text-performance-body);
		font-weight: var(--font-performance-medium);
		cursor: pointer;
		transition: opacity var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.submit-button:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-button:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 2px;
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
