<script lang="ts">
	/**
	 * PIIntakeForm - Personal Injury Intake Form
	 *
	 * Multi-step form with case screening fields:
	 * - Contact information
	 * - Accident details (type, date, location)
	 * - Fault assessment
	 * - Injury severity
	 * - Treatment status
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';
	import type { InjurySeverity } from '$lib/config/site';
	import {
		User,
		Phone,
		Mail,
		Calendar,
		MapPin,
		AlertTriangle,
		Heart,
		ArrowRight,
		ArrowLeft,
		Check,
		Loader2
	} from 'lucide-svelte';

	const siteConfig = getSiteConfigFromContext();

	interface Props {
		onSubmit?: (data: IntakeData) => void;
	}

	let { onSubmit }: Props = $props();

	// Form state
	let currentStep = $state(1);
	let isSubmitting = $state(false);
	let isSubmitted = $state(false);
	let error = $state<string | null>(null);

	// Form data
	let formData = $state({
		// Step 1: Contact
		name: '',
		email: '',
		phone: '',
		bestTimeToCall: 'anytime' as 'morning' | 'afternoon' | 'evening' | 'anytime',

		// Step 2: Accident
		accidentType: '',
		accidentDate: '',
		accidentLocation: '',
		accidentDescription: '',

		// Step 3: Fault
		atFaultParty: '' as 'yes' | 'no' | 'unsure' | '',
		policeReportFiled: false,

		// Step 4: Injuries
		injurySeverity: '' as InjurySeverity | '',
		injuryDescription: '',
		receivedTreatment: false,
		ongoingTreatment: false
	});

	export interface IntakeData {
		name: string;
		email: string;
		phone: string;
		bestTimeToCall: string;
		accidentType: string;
		accidentDate: string;
		accidentLocation: string;
		accidentDescription: string;
		atFaultParty: string;
		policeReportFiled: boolean;
		injurySeverity: string;
		injuryDescription: string;
		receivedTreatment: boolean;
		ongoingTreatment: boolean;
	}

	const totalSteps = 4;

	const severityOptions: { value: InjurySeverity; label: string; description: string }[] = [
		{ value: 'minor', label: 'Minor', description: 'Bruises, minor cuts, no lasting effects' },
		{ value: 'moderate', label: 'Moderate', description: 'Sprains, soft tissue injuries, some treatment needed' },
		{ value: 'serious', label: 'Serious', description: 'Fractures, significant injuries, ongoing treatment' },
		{ value: 'severe', label: 'Severe', description: 'Multiple injuries, hospitalization, long recovery' },
		{ value: 'catastrophic', label: 'Catastrophic', description: 'Life-altering injuries, permanent disability' }
	];

	function nextStep() {
		if (currentStep < totalSteps) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep--;
		}
	}

	function canProceed(): boolean {
		switch (currentStep) {
			case 1:
				return !!(formData.name && formData.email && formData.phone);
			case 2:
				return !!(formData.accidentType && formData.accidentDate);
			case 3:
				return !!formData.atFaultParty;
			case 4:
				return !!formData.injurySeverity;
			default:
				return false;
		}
	}

	async function handleSubmit() {
		if (!canProceed()) return;

		isSubmitting = true;
		error = null;

		try {
			const response = await fetch('/api/intake', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			if (!response.ok) {
				throw new Error('Failed to submit. Please try again.');
			}

			isSubmitted = true;
			onSubmit?.(formData as IntakeData);
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="intake-form">
	{#if isSubmitted}
		<!-- Success State -->
		<div class="success-state">
			<div class="success-icon">
				<Check size={32} />
			</div>
			<h3>Thank You!</h3>
			<p>We've received your case information and will contact you within 24 hours—often much sooner for urgent cases.</p>
			<p class="phone-reminder">
				Need immediate help? Call us now:
				<a href="tel:{siteConfig.phone.replace(/[^0-9+]/g, '')}">{siteConfig.phone}</a>
			</p>
		</div>
	{:else}
		<!-- Progress Bar -->
		<div class="progress-bar">
			{#each Array(totalSteps) as _, i}
				<div class="progress-step" class:active={i + 1 === currentStep} class:complete={i + 1 < currentStep}>
					<span class="step-number">{i + 1}</span>
				</div>
				{#if i < totalSteps - 1}
					<div class="progress-line" class:complete={i + 1 < currentStep}></div>
				{/if}
			{/each}
		</div>

		<form onsubmit={(e) => { e.preventDefault(); if (currentStep === totalSteps) handleSubmit(); else nextStep(); }}>
			<!-- Step 1: Contact Information -->
			{#if currentStep === 1}
				<div class="form-step">
					<h3>Contact Information</h3>
					<p class="step-description">How can we reach you?</p>

					<div class="form-group">
						<label for="name">
							<User size={16} />
							<span>Full Name</span>
						</label>
						<input
							type="text"
							id="name"
							bind:value={formData.name}
							placeholder="Your full name"
							required
						/>
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="email">
								<Mail size={16} />
								<span>Email</span>
							</label>
							<input
								type="email"
								id="email"
								bind:value={formData.email}
								placeholder="you@example.com"
								required
							/>
						</div>

						<div class="form-group">
							<label for="phone">
								<Phone size={16} />
								<span>Phone</span>
							</label>
							<input
								type="tel"
								id="phone"
								bind:value={formData.phone}
								placeholder="(555) 555-5555"
								required
							/>
						</div>
					</div>

					<div class="form-group">
						<label for="bestTime">Best Time to Call</label>
						<select id="bestTime" bind:value={formData.bestTimeToCall}>
							<option value="anytime">Anytime</option>
							<option value="morning">Morning (8am - 12pm)</option>
							<option value="afternoon">Afternoon (12pm - 5pm)</option>
							<option value="evening">Evening (5pm - 8pm)</option>
						</select>
					</div>
				</div>
			{/if}

			<!-- Step 2: Accident Details -->
			{#if currentStep === 2}
				<div class="form-step">
					<h3>Accident Details</h3>
					<p class="step-description">Tell us about what happened</p>

					<div class="form-group">
						<label for="accidentType">
							<AlertTriangle size={16} />
							<span>Type of Accident</span>
						</label>
						<select id="accidentType" bind:value={formData.accidentType} required>
							<option value="">Select accident type...</option>
							{#each siteConfig.accidentTypes as type}
								<option value={type.slug}>{type.name}</option>
							{/each}
						</select>
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="accidentDate">
								<Calendar size={16} />
								<span>Date of Accident</span>
							</label>
							<input
								type="date"
								id="accidentDate"
								bind:value={formData.accidentDate}
								max={new Date().toISOString().split('T')[0]}
								required
							/>
						</div>

						<div class="form-group">
							<label for="accidentLocation">
								<MapPin size={16} />
								<span>Location</span>
							</label>
							<input
								type="text"
								id="accidentLocation"
								bind:value={formData.accidentLocation}
								placeholder="City, intersection, etc."
							/>
						</div>
					</div>

					<div class="form-group">
						<label for="accidentDescription">Brief Description</label>
						<textarea
							id="accidentDescription"
							bind:value={formData.accidentDescription}
							placeholder="Tell us what happened..."
							rows="3"
						></textarea>
					</div>
				</div>
			{/if}

			<!-- Step 3: Fault Assessment -->
			{#if currentStep === 3}
				<div class="form-step">
					<h3>About the Other Party</h3>
					<p class="step-description">Help us understand liability</p>

					<div class="form-group">
						<label>Was someone else at fault for your accident?</label>
						<div class="radio-group">
							<label class="radio-option" class:selected={formData.atFaultParty === 'yes'}>
								<input
									type="radio"
									name="atFault"
									value="yes"
									bind:group={formData.atFaultParty}
								/>
								<span class="radio-label">Yes, another party was at fault</span>
							</label>
							<label class="radio-option" class:selected={formData.atFaultParty === 'no'}>
								<input
									type="radio"
									name="atFault"
									value="no"
									bind:group={formData.atFaultParty}
								/>
								<span class="radio-label">No, it was my fault</span>
							</label>
							<label class="radio-option" class:selected={formData.atFaultParty === 'unsure'}>
								<input
									type="radio"
									name="atFault"
									value="unsure"
									bind:group={formData.atFaultParty}
								/>
								<span class="radio-label">I'm not sure</span>
							</label>
						</div>
					</div>

					<div class="form-group">
						<label class="checkbox-option">
							<input
								type="checkbox"
								bind:checked={formData.policeReportFiled}
							/>
							<span>A police report was filed</span>
						</label>
					</div>
				</div>
			{/if}

			<!-- Step 4: Injury Information -->
			{#if currentStep === 4}
				<div class="form-step">
					<h3>Your Injuries</h3>
					<p class="step-description">Help us understand the severity</p>

					<div class="form-group">
						<label>
							<Heart size={16} />
							<span>How would you describe your injuries?</span>
						</label>
						<div class="severity-options">
							{#each severityOptions as option}
								<label class="severity-option" class:selected={formData.injurySeverity === option.value}>
									<input
										type="radio"
										name="severity"
										value={option.value}
										bind:group={formData.injurySeverity}
									/>
									<div class="severity-content">
										<span class="severity-label">{option.label}</span>
										<span class="severity-description">{option.description}</span>
									</div>
								</label>
							{/each}
						</div>
					</div>

					<div class="form-group">
						<label for="injuryDescription">Describe your injuries (optional)</label>
						<textarea
							id="injuryDescription"
							bind:value={formData.injuryDescription}
							placeholder="List any injuries you've sustained..."
							rows="2"
						></textarea>
					</div>

					<div class="form-group checkbox-group">
						<label class="checkbox-option">
							<input
								type="checkbox"
								bind:checked={formData.receivedTreatment}
							/>
							<span>I have received medical treatment</span>
						</label>
						<label class="checkbox-option">
							<input
								type="checkbox"
								bind:checked={formData.ongoingTreatment}
							/>
							<span>I am currently receiving ongoing treatment</span>
						</label>
					</div>
				</div>
			{/if}

			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			<!-- Navigation -->
			<div class="form-actions">
				{#if currentStep > 1}
					<button type="button" class="btn-secondary" onclick={prevStep}>
						<ArrowLeft size={16} />
						<span>Back</span>
					</button>
				{:else}
					<div></div>
				{/if}

				{#if currentStep < totalSteps}
					<button type="submit" class="btn-primary" disabled={!canProceed()}>
						<span>Continue</span>
						<ArrowRight size={16} />
					</button>
				{:else}
					<button type="submit" class="btn-primary submit" disabled={!canProceed() || isSubmitting}>
						{#if isSubmitting}
							<Loader2 size={16} class="spinning" />
							<span>Submitting...</span>
						{:else}
							<span>Get Free Case Review</span>
							<ArrowRight size={16} />
						{/if}
					</button>
				{/if}
			</div>
		</form>

		<p class="privacy-note">
			Your information is confidential and protected by attorney-client privilege.
		</p>
	{/if}
</div>

<style>
	.intake-form {
		max-width: 600px;
		margin: 0 auto;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	/* Progress Bar */
	.progress-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		margin-bottom: var(--space-lg);
	}

	.progress-step {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-full);
		background: var(--color-bg-subtle);
		border: 2px solid var(--color-border-default);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.progress-step.active {
		background: var(--color-fg-primary);
		border-color: var(--color-fg-primary);
	}

	.progress-step.active .step-number {
		color: var(--color-bg-pure);
	}

	.progress-step.complete {
		background: var(--color-success);
		border-color: var(--color-success);
	}

	.progress-step.complete .step-number {
		color: var(--color-fg-primary);
	}

	.step-number {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-muted);
	}

	.progress-line {
		width: 40px;
		height: 2px;
		background: var(--color-border-default);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.progress-line.complete {
		background: var(--color-success);
	}

	/* Form Step */
	.form-step h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.step-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-lg);
	}

	/* Form Groups */
	.form-group {
		margin-bottom: var(--space-md);
	}

	.form-group label {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
	}

	input[type="text"],
	input[type="email"],
	input[type="tel"],
	input[type="date"],
	select,
	textarea {
		width: 100%;
		padding: var(--space-sm);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	input:focus,
	select:focus,
	textarea:focus {
		outline: none;
		border-color: var(--color-fg-tertiary);
	}

	textarea {
		resize: vertical;
	}

	/* Radio & Checkbox Options */
	.radio-group,
	.checkbox-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.radio-option,
	.checkbox-option {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.radio-option:hover,
	.checkbox-option:hover {
		border-color: var(--color-border-emphasis);
	}

	.radio-option.selected,
	.checkbox-option.selected {
		border-color: var(--color-fg-tertiary);
		background: rgba(255, 255, 255, 0.05);
	}

	.radio-option input,
	.checkbox-option input {
		accent-color: var(--color-fg-primary);
	}

	.radio-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Severity Options */
	.severity-options {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.severity-option {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.severity-option:hover {
		border-color: var(--color-border-emphasis);
	}

	.severity-option.selected {
		border-color: var(--color-fg-tertiary);
		background: rgba(255, 255, 255, 0.05);
	}

	.severity-option input {
		margin-top: 4px;
		accent-color: var(--color-fg-primary);
	}

	.severity-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.severity-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.severity-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Form Actions */
	.form-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-md);
		margin-top: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.btn-primary,
	.btn-secondary {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-lg);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-md);
		border: none;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-fg-secondary);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary.submit {
		background: var(--color-success);
	}

	.btn-primary.submit:hover:not(:disabled) {
		background: rgb(88, 190, 88);
	}

	.btn-secondary {
		background: transparent;
		color: var(--color-fg-secondary);
		border: 1px solid var(--color-border-default);
	}

	.btn-secondary:hover {
		background: var(--color-bg-elevated);
	}

	:global(.spinning) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Error */
	.error-message {
		padding: var(--space-sm);
		background: rgba(204, 68, 68, 0.1);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-md);
		color: var(--color-error);
		font-size: var(--text-body-sm);
		margin-top: var(--space-md);
	}

	/* Privacy Note */
	.privacy-note {
		text-align: center;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: var(--space-md);
	}

	/* Success State */
	.success-state {
		text-align: center;
		padding: var(--space-lg);
	}

	.success-icon {
		width: 64px;
		height: 64px;
		margin: 0 auto var(--space-md);
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(68, 170, 68, 0.2);
		border-radius: var(--radius-full);
		color: var(--color-success);
	}

	.success-state h3 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.success-state p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-md);
	}

	.phone-reminder {
		padding: var(--space-sm);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-md);
	}

	.phone-reminder a {
		color: var(--color-success);
		font-weight: var(--font-semibold);
		text-decoration: none;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.intake-form {
			padding: var(--space-md);
		}

		.form-row {
			grid-template-columns: 1fr;
		}
	}
</style>
