<script lang="ts">
	import { goto } from '$app/navigation';
	import WebflowLogo from '$lib/components/WebflowLogo.svelte';
	import {
		SUPPORTED_COUNTRIES,
		isSupportedCountry,
		requiresSpecificStripeOnboarding
	} from '$lib/intake/countries';

	let country = $state('');
	let primaryEmail = $state('');
	let webflowEmail = $state('');
	let preferredName = $state('');
	let legalName = $state('');
	let websiteUrl = $state('');
	let biography = $state('');
	let agreedToTerms = $state(false);
	let avatarFile = $state<File | null>(null);
	let uploadedAvatarUrl = $state<string | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Inline (blur-time) validation so problems surface before submit.
	type FieldName =
		| 'country'
		| 'primaryEmail'
		| 'webflowEmail'
		| 'legalName'
		| 'websiteUrl'
		| 'biography'
		| 'avatar';
	let fieldErrors = $state<Partial<Record<FieldName, string>>>({});

	const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const AVATAR_MAX_BYTES = 100 * 1024;

	function getFieldError(field: FieldName): string | undefined {
		switch (field) {
			case 'country':
				if (!country.trim()) {
					return 'Country of residence is required.';
				}
				if (!isSupportedCountry(country)) {
					return 'Choose a country from the supported list.';
				}
				break;
			case 'primaryEmail':
				if (!primaryEmail.trim()) {
					return 'Primary email is required.';
				}
				if (!EMAIL_REGEX.test(primaryEmail.trim())) {
					return 'Enter a valid email address, e.g. you@example.com.';
				}
				break;
			case 'webflowEmail':
				if (!webflowEmail.trim()) {
					return 'Webflow account email is required.';
				}
				if (!EMAIL_REGEX.test(webflowEmail.trim())) {
					return 'Enter a valid email address, e.g. you@example.com.';
				}
				break;
			case 'legalName':
				if (!legalName.trim()) {
					return 'Your legal name is required.';
				}
				break;
			case 'websiteUrl':
				if (websiteUrl.trim()) {
					try {
						const parsed = new URL(websiteUrl.trim());
						if (!['http:', 'https:'].includes(parsed.protocol)) {
							return 'Use a full URL starting with https://';
						}
					} catch {
						return 'Use a full URL starting with https://';
					}
				}
				break;
			case 'biography':
				if (!biography.trim()) {
					return 'Short bio is required.';
				}
				break;
			case 'avatar':
				if (!avatarFile) {
					return 'Profile image is required.';
				}
				if (avatarFile.type !== 'image/webp') {
					return 'The image must be a WebP file.';
				}
				if (avatarFile.size > AVATAR_MAX_BYTES) {
					return `The image must be under 100KB (yours is ${Math.ceil(avatarFile.size / 1024)}KB).`;
				}
				break;
		}

		return undefined;
	}

	function validateField(field: FieldName): void {
		const message = getFieldError(field);
		fieldErrors = { ...fieldErrors, [field]: message };
	}

	function clearFieldError(field: FieldName): void {
		if (fieldErrors[field]) {
			fieldErrors = { ...fieldErrors, [field]: undefined };
		}
	}

	const hasFieldErrors = $derived(Object.values(fieldErrors).some(Boolean));

	function handleAvatarChange(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		avatarFile = target.files?.[0] || null;
		uploadedAvatarUrl = null;
		validateField('avatar');
	}

	async function uploadAvatar(): Promise<string> {
		if (uploadedAvatarUrl) {
			return uploadedAvatarUrl;
		}

		if (!avatarFile) {
			throw new Error('Profile image is required.');
		}

		const formData = new FormData();
		formData.set('file', avatarFile);
		if (primaryEmail) {
			formData.set('email', primaryEmail);
		}

		const response = await fetch('/api/auth/signup/upload', {
			method: 'POST',
			body: formData
		});

		const data = (await response.json()) as { error?: string; url?: string };
		if (!response.ok || !data.url) {
			throw new Error(data.error || 'Failed to upload profile image.');
		}

		uploadedAvatarUrl = data.url;
		return data.url;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();

		// Re-validate everything so submit catches fields the user never blurred.
		const nextFieldErrors = (
			[
				'country',
				'primaryEmail',
				'webflowEmail',
				'legalName',
				'websiteUrl',
				'biography',
				'avatar'
			] as const
		).reduce<Partial<Record<FieldName, string>>>((errors, field) => {
			const message = getFieldError(field);
			if (message) errors[field] = message;
			return errors;
		}, {});
		fieldErrors = nextFieldErrors;

		if (Object.values(nextFieldErrors).some(Boolean)) {
			error = 'Please fix the highlighted fields and try again.';
			return;
		}

		loading = true;
		error = null;

		try {
			const avatarUrl = await uploadAvatar();
			const response = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					country,
					primaryEmail,
					webflowEmail,
					preferredName,
					legalName,
					websiteUrl,
					biography,
					avatarUrl,
					agreedToTerms
				})
			});

			if (response.ok) {
				goto('/verify');
				return;
			}

			const data = (await response.json()) as { error?: string };
			error = data.error || 'Signup failed. Please review the form and try again.';
		} catch (submitError) {
			error =
				submitError instanceof Error
					? submitError.message
					: 'An error occurred during signup. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Creator Signup | Webflow Asset Dashboard</title>
</svelte:head>

<main class="container">
	<div class="signup-card">
		<div class="hero">
			<div class="logo">
				<WebflowLogo />
			</div>
			<div class="hero-copy">
				<h1>Create your creator account</h1>
				<p class="subtitle">
					Set up your Webflow Marketplace creator profile and we’ll email a verification link to
					finish access.
				</p>
			</div>
		</div>

		<form class="form-grid" onsubmit={handleSubmit}>
			<div class="field">
				<label for="country">Country of residence <span class="required-mark" aria-hidden="true">*</span></label>
				<input
					id="country"
					name="country"
					list="supported-countries"
					bind:value={country}
					placeholder="Start typing your country"
					autocomplete="country-name"
					required
					disabled={loading}
					aria-invalid={Boolean(fieldErrors.country)}
					aria-describedby={fieldErrors.country ? 'country-error' : undefined}
					onblur={() => validateField('country')}
					oninput={() => clearFieldError('country')}
					/>
					{#if fieldErrors.country}
						<p class="field-error" id="country-error">{fieldErrors.country}</p>
					{/if}
					<p class="hint">
						We use this to check creator payout availability. Some countries require specific
						Stripe onboarding before payouts can continue.
					</p>
					{#if country && requiresSpecificStripeOnboarding(country)}
						<p class="warning">
							This country requires specific Stripe onboarding before payouts can continue. Creators
							may need to meet Stripe requirements for another supported country, including a valid
							tax ID or incorporation through a service such as Doola or Stripe Atlas. Webflow cannot
							configure those services on your behalf; contact Stripe Support with setup questions.
						</p>
					{/if}
			</div>

			<div class="field">
				<label for="websiteUrl">Personal website URL</label>
				<input
					id="websiteUrl"
					name="websiteUrl"
					type="url"
					bind:value={websiteUrl}
					placeholder="https://your-site.com"
					autocomplete="url"
					disabled={loading}
					aria-invalid={Boolean(fieldErrors.websiteUrl)}
					aria-describedby={fieldErrors.websiteUrl ? 'websiteUrl-error' : undefined}
					onblur={() => validateField('websiteUrl')}
					oninput={() => clearFieldError('websiteUrl')}
				/>
				{#if fieldErrors.websiteUrl}
					<p class="field-error" id="websiteUrl-error">{fieldErrors.websiteUrl}</p>
				{/if}
				<p class="hint">Optional, but this will be stored on your creator profile.</p>
			</div>

			<div class="field">
				<label for="primaryEmail">Primary email <span class="required-mark" aria-hidden="true">*</span></label>
				<input
					id="primaryEmail"
					name="primaryEmail"
					type="email"
					bind:value={primaryEmail}
					placeholder="you@example.com"
					autocomplete="email"
					required
					disabled={loading}
					aria-invalid={Boolean(fieldErrors.primaryEmail)}
					aria-describedby={fieldErrors.primaryEmail ? 'primaryEmail-error' : undefined}
					onblur={() => validateField('primaryEmail')}
					oninput={() => clearFieldError('primaryEmail')}
				/>
				{#if fieldErrors.primaryEmail}
					<p class="field-error" id="primaryEmail-error">{fieldErrors.primaryEmail}</p>
				{/if}
				<p class="hint">We’ll send your verification link here.</p>
			</div>

			<div class="field">
				<label for="webflowEmail">Webflow account email <span class="required-mark" aria-hidden="true">*</span></label>
				<input
					id="webflowEmail"
					name="webflowEmail"
					type="email"
					bind:value={webflowEmail}
					placeholder="your-webflow@email.com"
					autocomplete="email"
					required
					disabled={loading}
					aria-invalid={Boolean(fieldErrors.webflowEmail)}
					aria-describedby={fieldErrors.webflowEmail ? 'webflowEmail-error' : undefined}
					onblur={() => validateField('webflowEmail')}
					oninput={() => clearFieldError('webflowEmail')}
				/>
				{#if fieldErrors.webflowEmail}
					<p class="field-error" id="webflowEmail-error">{fieldErrors.webflowEmail}</p>
				{/if}
				<p class="hint">This should match the email on your Webflow account.</p>
			</div>

			<div class="field">
				<label for="preferredName">Preferred name</label>
				<input
					id="preferredName"
					name="preferredName"
					type="text"
					bind:value={preferredName}
					placeholder="How you want your profile to appear"
					autocomplete="nickname"
					disabled={loading}
				/>
			</div>

			<div class="field">
				<label for="legalName">Full legal name <span class="required-mark" aria-hidden="true">*</span></label>
				<input
					id="legalName"
					name="legalName"
					type="text"
					bind:value={legalName}
					placeholder="Your legal name"
					autocomplete="name"
					required
					disabled={loading}
					aria-invalid={Boolean(fieldErrors.legalName)}
					aria-describedby={fieldErrors.legalName ? 'legalName-error' : undefined}
					onblur={() => validateField('legalName')}
					oninput={() => clearFieldError('legalName')}
				/>
				{#if fieldErrors.legalName}
					<p class="field-error" id="legalName-error">{fieldErrors.legalName}</p>
				{/if}
			</div>

			<div class="field full-width">
				<label for="biography">Short bio <span class="required-mark" aria-hidden="true">*</span></label>
				<textarea
					id="biography"
					name="biography"
					bind:value={biography}
					placeholder="One or two lines for your profile"
					maxlength="200"
					required
					disabled={loading}
					aria-invalid={Boolean(fieldErrors.biography)}
					aria-describedby={fieldErrors.biography ? 'biography-error biography-hint' : 'biography-hint'}
					onblur={() => validateField('biography')}
					oninput={() => clearFieldError('biography')}
				></textarea>
				{#if fieldErrors.biography}
					<p class="field-error" id="biography-error">{fieldErrors.biography}</p>
				{/if}
				<div class="field-row">
					<p class="hint" id="biography-hint">Up to 200 characters.</p>
					<p class="count">{biography.length}/200</p>
				</div>
			</div>

			<div class="field full-width">
				<label for="avatar">Profile image <span class="required-mark" aria-hidden="true">*</span></label>
				<input
					id="avatar"
					name="avatar"
					type="file"
					accept=".webp,image/webp"
					required
					disabled={loading}
					aria-invalid={Boolean(fieldErrors.avatar)}
					aria-describedby={fieldErrors.avatar ? 'avatar-error avatar-hint' : 'avatar-hint'}
					onchange={handleAvatarChange}
				/>
				<p class="hint" id="avatar-hint">Upload a 256x256 WebP image under 100KB.</p>
				{#if fieldErrors.avatar}
					<p class="field-error" id="avatar-error">{fieldErrors.avatar}</p>
				{/if}
				{#if avatarFile}
					<p class="file-name">{avatarFile.name}</p>
				{/if}
			</div>

			<label class="checkbox full-width">
				<input type="checkbox" bind:checked={agreedToTerms} required disabled={loading} />
				<span>
					I have read and agree to the
					<a
						href="https://webflow.com/legal/marketplace-agreement"
						target="_blank"
						rel="noreferrer"
					>
						Webflow Marketplace Agreement
					</a>
				</span>
			</label>

			{#if error}
				<div class="error-message full-width">{error}</div>
			{/if}

			<div class="actions full-width">
				<button
					type="submit"
					class="submit-button"
					disabled={loading || !avatarFile || !agreedToTerms}
				>
					{#if loading}
						<span class="spinner"></span>
						Creating account...
					{:else}
						Create creator account
					{/if}
				</button>

				<a class="secondary-link" href="/login">Already approved? Sign in</a>
			</div>
		</form>
	</div>

	<datalist id="supported-countries">
		{#each SUPPORTED_COUNTRIES as supportedCountry}
			<option value={supportedCountry}></option>
		{/each}
	</datalist>
</main>

<style>
	.container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.signup-card {
		width: 100%;
		max-width: 860px;
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-shell-border-default);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-lg);
	}

	.hero {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
	}

	.logo {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		line-height: 0;
	}

	.hero-copy {
		max-width: 42rem;
	}

	h1 {
		margin: 0 0 var(--space-xs);
		font-family: var(--font-heading);
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.subtitle {
		margin: 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-md);
	}

	.field,
	.checkbox,
	.actions {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.full-width {
		grid-column: 1 / -1;
	}

	label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
	}

	input,
	textarea {
		width: 100%;
		min-height: 2.75rem;
		padding: 0.75rem 1rem;
		font-size: 1rem;
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-shell-border-default);
		border-radius: var(--radius-lg);
		outline: none;
		box-shadow: var(--shadow-sm);
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			box-shadow var(--duration-micro) var(--ease-standard);
	}

	textarea {
		min-height: 8rem;
		resize: vertical;
	}

	input:focus,
	textarea:focus {
		border-color: var(--color-info);
		box-shadow: 0 0 0 4px var(--color-info-muted);
	}

	input:disabled,
	textarea:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}

	.hint,
	.warning,
	.file-name,
	.count {
		margin: 0;
		font-size: var(--text-caption);
	}

	.hint,
	.file-name,
	.count {
		color: var(--color-fg-muted);
	}

	.warning {
		color: var(--color-warning);
	}

	.required-mark {
		color: var(--color-error);
	}

	.field-error {
		font-size: var(--text-caption);
		color: var(--color-error);
		margin: var(--space-xs) 0 0;
		line-height: 1.4;
	}

	input[aria-invalid='true'],
	textarea[aria-invalid='true'] {
		border-color: var(--color-error);
	}

	.field-row {
		display: flex;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	.checkbox {
		flex-direction: row;
		align-items: flex-start;
		padding: 0.75rem 1rem;
		border: 1px solid var(--color-shell-border-default);
		border-radius: var(--radius-lg);
		background: var(--color-bg-subtle);
	}

	.checkbox input {
		width: auto;
		min-height: auto;
		margin-top: 0.2rem;
		box-shadow: none;
	}

	.checkbox span {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.checkbox a,
	.secondary-link {
		color: var(--color-info);
		text-decoration: none;
	}

	.checkbox a:hover,
	.secondary-link:hover {
		text-decoration: underline;
	}

	.error-message {
		padding: 0.75rem 1rem;
		font-size: var(--text-body-sm);
		color: var(--color-error);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
	}

	.actions {
		align-items: stretch;
	}

	.submit-button {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.85rem 1rem;
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: #ffffff;
		background: var(--color-info);
		border: 1px solid var(--color-info);
		border-radius: 999px;
		box-shadow: 0 8px 18px rgba(20, 110, 245, 0.16);
		cursor: pointer;
		transition:
			transform var(--duration-micro) var(--ease-standard),
			background-color var(--duration-micro) var(--ease-standard);
	}

	.submit-button:hover:not(:disabled) {
		background: #0055d4;
		transform: translateY(-1px);
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.secondary-link {
		text-align: center;
		font-size: var(--text-body-sm);
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.35);
		border-top-color: #ffffff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 720px) {
		.container {
			padding: var(--space-md);
		}

		.signup-card {
			padding: var(--space-md);
		}

		.form-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
