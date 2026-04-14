<script lang="ts">
	import { SEO } from '@create-something/canon';

	type SubmitMessage = { type: 'success' | 'error'; text: string } | null;
	type ProfessionOption = 'rn' | 'lpn' | 'lvn' | 'cna' | 'allied' | 'other';
	type ShiftPreference = 'days' | 'nights' | 'rotating' | 'weekends';
	type ContractPreference = 'travel' | 'staff' | 'local_contract' | 'per_diem';

	let submitting = $state(false);
	let message = $state<SubmitMessage>(null);

	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let profession = $state<ProfessionOption>('rn');
	let specialtyPrimary = $state('');
	let specialties = $state('');
	let homeState = $state('');
	let compactLicense = $state(false);
	let shiftPreferences = $state<ShiftPreference[]>([]);
	let contractPreferences = $state<ContractPreference[]>(['travel']);
	let payFloorWeekly = $state<number | undefined>();
	let availableFrom = $state('');
	let resumeUrl = $state('');
	let recruiterNotes = $state('');
	let consentGranted = $state(false);

	const professionOptions: { value: ProfessionOption; label: string }[] = [
		{ value: 'rn', label: 'Registered Nurse' },
		{ value: 'lpn', label: 'Licensed Practical Nurse' },
		{ value: 'lvn', label: 'Licensed Vocational Nurse' },
		{ value: 'cna', label: 'Certified Nursing Assistant' },
		{ value: 'allied', label: 'Allied Health' },
		{ value: 'other', label: 'Other' }
	];

	const shiftOptions: { value: ShiftPreference; label: string }[] = [
		{ value: 'days', label: 'Days' },
		{ value: 'nights', label: 'Nights' },
		{ value: 'rotating', label: 'Rotating' },
		{ value: 'weekends', label: 'Weekends' }
	];

	const contractOptions: { value: ContractPreference; label: string }[] = [
		{ value: 'travel', label: 'Travel' },
		{ value: 'staff', label: 'Staff' },
		{ value: 'local_contract', label: 'Local Contract' },
		{ value: 'per_diem', label: 'Per Diem' }
	];

	function toggleSelection<T extends string>(value: T, current: T[]): T[] {
		return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		message = null;

		if (!email.trim() && !phone.trim()) {
			message = { type: 'error', text: 'Add at least one contact method: email or phone.' };
			return;
		}

		if (!consentGranted) {
			message = { type: 'error', text: 'Consent is required before intake can be submitted.' };
			return;
		}

		submitting = true;

		try {
			const response = await fetch('/api/abundance/intake', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					person: {
						name,
						email: email || undefined,
						phone: phone || undefined,
						primary_role: 'candidate',
						source: 'web_nurse_intake'
					},
					profile: {
						profession,
						specialty_primary: specialtyPrimary || undefined,
						specialties: parseCommaList(specialties),
						home_state: homeState || undefined,
						compact_license: compactLicense,
						shift_preferences: shiftPreferences,
						contract_preferences: contractPreferences,
						pay_floor_weekly: payFloorWeekly,
						available_from: availableFrom || undefined,
						recruiter_notes: recruiterNotes || undefined
					},
					documents: {
						resume_url: resumeUrl || undefined
					},
					consent: {
						granted: consentGranted,
						scope: 'candidate_intake',
						granted_at: new Date().toISOString()
					},
					context: {
						intake_channel: 'web',
						source: 'web_nurse_intake'
					}
				})
			});

			const result = (await response.json()) as {
				success?: boolean;
				error?: string;
				data?: { next_steps?: string[]; profile_status?: string };
			};

			if (response.ok && result.success) {
				const profileStatus = result.data?.profile_status || 'draft';
				const nextSteps = result.data?.next_steps?.[0];
				message = {
					type: 'success',
					text: nextSteps
						? `Intake submitted. Status: ${profileStatus}. ${nextSteps}`
						: `Intake submitted. Status: ${profileStatus}.`
				};
				resetForm();
				return;
			}

			message = { type: 'error', text: result.error || 'Unable to submit intake right now.' };
		} catch {
			message = { type: 'error', text: 'Network error while submitting intake.' };
		} finally {
			submitting = false;
		}
	}

	function parseCommaList(input: string): string[] {
		return input
			.split(',')
			.map((value) => value.trim())
			.filter(Boolean);
	}

	function resetForm() {
		name = '';
		email = '';
		phone = '';
		profession = 'rn';
		specialtyPrimary = '';
		specialties = '';
		homeState = '';
		compactLicense = false;
		shiftPreferences = [];
		contractPreferences = ['travel'];
		payFloorWeekly = undefined;
		availableFrom = '';
		resumeUrl = '';
		recruiterNotes = '';
		consentGranted = false;
	}
</script>

<SEO
	title="Nurse Intake | CREATE SOMETHING .agency"
	description="Web-first nurse intake for qualification, consent capture, and recruiter review without relying on WhatsApp as the primary entry point."
	keywords="nurse intake, travel nurse intake, recruiter intake, nurse qualification"
	propertyName="agency"
/>

<main class="page">
	<section class="hero">
		<p class="eyebrow">Abundance Intake</p>
		<h1>Start intake in the browser, not in a chat thread.</h1>
		<p class="lede">
			This flow captures the nurse profile, consent, and recruiter review context in one place.
			WhatsApp and SMS can feed the same system later, but they do not have to be the front door.
		</p>
	</section>

	<section class="panel">
		<div class="panel-header">
			<div>
				<h2>Nurse Intake</h2>
				<p class="panel-copy">
					Submit the minimum profile needed for review. Missing items can be collected later,
					but consent and a contact surface are required.
				</p>
			</div>
			<div class="panel-note">
				<strong>Current wedge</strong>
				<span>Candidate profile + consent + recruiter-ready status</span>
			</div>
		</div>

		{#if message}
			<p class="message" class:success={message.type === 'success'} class:error={message.type === 'error'}>
				{message.text}
			</p>
		{/if}

		<form class="intake-form" onsubmit={handleSubmit}>
			<section class="section">
				<h3>Contact</h3>
				<div class="grid">
					<label class="field field-wide">
						<span>Name</span>
						<input bind:value={name} type="text" required autocomplete="name" placeholder="Jamie Nurse" />
					</label>
					<label class="field">
						<span>Email</span>
						<input bind:value={email} type="email" autocomplete="email" placeholder="jamie@example.com" />
					</label>
					<label class="field">
						<span>Phone</span>
						<input bind:value={phone} type="tel" autocomplete="tel" placeholder="+13125551234" />
					</label>
				</div>
				<p class="helper">At least one of email or phone is required.</p>
			</section>

			<section class="section">
				<h3>Clinical Profile</h3>
				<div class="grid">
					<label class="field">
						<span>Profession</span>
						<select bind:value={profession}>
							{#each professionOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</label>
					<label class="field">
						<span>Primary Specialty</span>
						<input bind:value={specialtyPrimary} type="text" required placeholder="ICU" />
					</label>
					<label class="field">
						<span>Home State</span>
						<input bind:value={homeState} type="text" required maxlength="32" placeholder="TX" />
					</label>
					<label class="field">
						<span>Available From</span>
						<input bind:value={availableFrom} type="date" required />
					</label>
					<label class="field field-wide">
						<span>Additional Specialties</span>
						<input
							bind:value={specialties}
							type="text"
							placeholder="Telemetry, Stepdown, Med Surg"
						/>
					</label>
					<label class="field">
						<span>Weekly Pay Floor</span>
						<input bind:value={payFloorWeekly} type="number" min="0" step="50" placeholder="2200" />
					</label>
				</div>

				<div class="toggle-row">
					<label class="checkbox">
						<input bind:checked={compactLicense} type="checkbox" />
						<span>Compact license eligible</span>
					</label>
				</div>

				<div class="choice-groups">
					<div class="choice-group">
						<h4>Shift Preferences</h4>
						<div class="chips">
							{#each shiftOptions as option}
								<label class="chip">
									<input
										type="checkbox"
										checked={shiftPreferences.includes(option.value)}
										onchange={() => {
											shiftPreferences = toggleSelection(option.value, shiftPreferences);
										}}
									/>
									<span>{option.label}</span>
								</label>
							{/each}
						</div>
					</div>

					<div class="choice-group">
						<h4>Contract Preferences</h4>
						<div class="chips">
							{#each contractOptions as option}
								<label class="chip">
									<input
										type="checkbox"
										checked={contractPreferences.includes(option.value)}
										onchange={() => {
											contractPreferences = toggleSelection(option.value, contractPreferences);
										}}
									/>
									<span>{option.label}</span>
								</label>
							{/each}
						</div>
					</div>
				</div>
			</section>

			<section class="section">
				<h3>Documents and Notes</h3>
				<div class="grid">
					<label class="field field-wide">
						<span>Resume URL</span>
						<input
							bind:value={resumeUrl}
							type="url"
							placeholder="https://example.com/jamie-nurse-resume.pdf"
						/>
					</label>
					<label class="field field-wide">
						<span>Notes</span>
						<textarea
							bind:value={recruiterNotes}
							rows="4"
							placeholder="Optional notes, recruiter context, or missing pieces to collect next."
						></textarea>
					</label>
				</div>
			</section>

			<section class="section">
				<h3>Consent</h3>
				<label class="checkbox consent">
					<input bind:checked={consentGranted} type="checkbox" required />
					<span>
						I consent to profile review, recruiter follow-up, and storage of the information submitted here.
					</span>
				</label>
			</section>

			<div class="actions">
				<button class="submit" type="submit" disabled={submitting}>
					{submitting ? 'Submitting...' : 'Submit Intake'}
				</button>
			</div>
		</form>
	</section>
</main>

<style>
	.page {
		max-width: 72rem;
		margin: 0 auto;
		padding: 4rem 1.5rem 6rem;
	}

	.hero {
		max-width: 42rem;
		margin-bottom: 3rem;
	}

	.eyebrow {
		margin: 0 0 0.75rem;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	h1 {
		margin: 0 0 1rem;
		font-size: clamp(2.5rem, 5vw, 4.25rem);
		line-height: 0.96;
		letter-spacing: -0.04em;
	}

	.lede {
		margin: 0;
		font-size: 1.125rem;
		line-height: 1.7;
		color: var(--color-fg-secondary);
	}

	.panel {
		border: 1px solid color-mix(in srgb, var(--color-fg-primary) 10%, transparent);
		border-radius: 1.5rem;
		padding: 2rem;
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--color-bg-secondary) 78%, transparent), transparent),
			color-mix(in srgb, var(--color-bg-primary) 94%, black 6%);
		box-shadow: 0 1.5rem 4rem color-mix(in srgb, black 20%, transparent);
	}

	.panel-header {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
	}

	.panel-header h2 {
		margin: 0 0 0.35rem;
		font-size: 1.5rem;
	}

	.panel-copy {
		margin: 0;
		max-width: 40rem;
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.panel-note {
		display: grid;
		gap: 0.25rem;
		padding: 0.9rem 1rem;
		border-radius: 1rem;
		min-width: 15rem;
		background: color-mix(in srgb, var(--color-accent, #7dd3fc) 14%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-accent, #7dd3fc) 24%, transparent);
	}

	.panel-note strong {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}

	.panel-note span {
		font-size: 0.95rem;
		color: var(--color-fg-secondary);
	}

	.message {
		margin: 0 0 1.5rem;
		padding: 0.9rem 1rem;
		border-radius: 0.9rem;
		font-size: 0.95rem;
	}

	.message.success {
		background: color-mix(in srgb, #15803d 16%, transparent);
		border: 1px solid color-mix(in srgb, #22c55e 36%, transparent);
	}

	.message.error {
		background: color-mix(in srgb, #b91c1c 16%, transparent);
		border: 1px solid color-mix(in srgb, #ef4444 38%, transparent);
	}

	.intake-form {
		display: grid;
		gap: 1.75rem;
	}

	.section {
		display: grid;
		gap: 1rem;
		padding-top: 1.25rem;
		border-top: 1px solid color-mix(in srgb, var(--color-fg-primary) 8%, transparent);
	}

	.section:first-of-type {
		padding-top: 0;
		border-top: 0;
	}

	.section h3 {
		margin: 0;
		font-size: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-fg-muted);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.field {
		display: grid;
		gap: 0.45rem;
	}

	.field-wide {
		grid-column: 1 / -1;
	}

	.field span,
	.choice-group h4 {
		font-size: 0.9rem;
		font-weight: 600;
	}

	input,
	select,
	textarea {
		width: 100%;
		padding: 0.85rem 0.95rem;
		border-radius: 0.9rem;
		border: 1px solid color-mix(in srgb, var(--color-fg-primary) 12%, transparent);
		background: color-mix(in srgb, var(--color-bg-primary) 86%, black 14%);
		color: var(--color-fg-primary);
		font: inherit;
	}

	textarea {
		resize: vertical;
	}

	.helper {
		margin: -0.25rem 0 0;
		font-size: 0.85rem;
		color: var(--color-fg-muted);
	}

	.toggle-row,
	.choice-groups {
		display: grid;
		gap: 1rem;
	}

	.checkbox {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.95rem;
		color: var(--color-fg-secondary);
	}

	.checkbox input {
		width: 1.1rem;
		height: 1.1rem;
		margin: 0;
	}

	.choice-groups {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.choice-group {
		display: grid;
		gap: 0.75rem;
	}

	.choice-group h4 {
		margin: 0;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.7rem 0.85rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--color-fg-primary) 12%, transparent);
		background: color-mix(in srgb, var(--color-bg-secondary) 78%, transparent);
	}

	.chip input {
		width: 1rem;
		height: 1rem;
		margin: 0;
	}

	.consent {
		align-items: flex-start;
		padding: 1rem;
		border-radius: 1rem;
		background: color-mix(in srgb, var(--color-accent, #7dd3fc) 8%, transparent);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
	}

	.submit {
		padding: 0.95rem 1.4rem;
		border: 0;
		border-radius: 999px;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		background: linear-gradient(135deg, #f97316, #fb7185);
		color: #111827;
	}

	.submit:disabled {
		opacity: 0.65;
		cursor: wait;
	}

	@media (max-width: 768px) {
		.page {
			padding-inline: 1rem;
		}

		.panel {
			padding: 1.25rem;
			border-radius: 1.2rem;
		}

		.grid,
		.choice-groups {
			grid-template-columns: 1fr;
		}
	}
</style>
