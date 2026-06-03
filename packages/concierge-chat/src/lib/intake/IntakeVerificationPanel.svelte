<script lang="ts">
	import {
		requestIntakeVerificationCode,
		verifyIntakeVerificationCode
	} from '$chat/client-actions';
	import type { IntakeVerificationSupport } from './types';

	export let accessGranted = false;
	export let verifiedEmail: string | null = null;
	export let verificationSupport: IntakeVerificationSupport;
	export let title = 'Unlock secure credential steps';
	export let description =
		'Verify your email to unlock protected document upload and recruiter review.';
	export let compact = false;

	let emailInput = verifiedEmail ?? '';
	let codeInput = '';
	let requestedEmail = '';
	let requestPending = false;
	let verifyPending = false;
	let actionError = '';
	let infoMessage = '';
	let previewCode = '';
	let deliveryMode: 'email' | 'preview' | null = null;
	let optimisticVerifiedEmail = '';

	$: activeVerifiedEmail = accessGranted ? verifiedEmail : optimisticVerifiedEmail || null;
	$: isVerified = accessGranted || Boolean(optimisticVerifiedEmail);
	$: activeEmail = requestedEmail || emailInput.trim();

	async function requestCode() {
		if (!emailInput.trim()) {
			actionError = 'Enter an email address first.';
			return;
		}

		requestPending = true;
		actionError = '';
		infoMessage = '';

		try {
			const response = await requestIntakeVerificationCode(emailInput);
			emailInput = response.email;
			requestedEmail = response.email;
			deliveryMode = response.mode;
			previewCode = response.previewCode ?? '';
			infoMessage =
				response.mode === 'preview'
					? 'Preview mode issued a local verification code for testing.'
					: `We sent a 6-digit verification code to ${response.email}.`;
		} catch (error) {
			actionError =
				error instanceof Error ? error.message : 'Unable to send the verification code.';
		} finally {
			requestPending = false;
		}
	}

	async function verifyCode() {
		if (!activeEmail) {
			actionError = 'Enter an email address before verifying.';
			return;
		}

		if (!codeInput.trim()) {
			actionError = 'Enter the 6-digit verification code.';
			return;
		}

		verifyPending = true;
		actionError = '';

		try {
			const response = await verifyIntakeVerificationCode(activeEmail, codeInput);
			optimisticVerifiedEmail = response.email;
			infoMessage = `Verification is active for ${response.email}.`;
			codeInput = '';
			previewCode = '';
			deliveryMode = null;
		} catch (error) {
			actionError =
				error instanceof Error ? error.message : 'Unable to verify the provided code.';
		} finally {
			verifyPending = false;
		}
	}
</script>

<section class={`verification-panel glass ${compact ? 'compact' : ''}`}>
	<div class="panel-top">
		<div>
			<div class="eyebrow">Secure Verification</div>
			<h2 class="section-title">{title}</h2>
		</div>
		<span class={`status-pill ${isVerified ? 'good' : verificationSupport.available ? 'warn' : 'danger'}`}>
			{#if isVerified}
				verified
			{:else if verificationSupport.mode === 'preview'}
				local preview
			{:else if verificationSupport.available}
				email code
			{:else}
				unavailable
			{/if}
		</span>
	</div>

	<p class="muted">{description}</p>

	{#if isVerified}
		<div class="success-card">
			<strong>Secure verification active</strong>
			<p>
				Protected uploads and later-stage staffing actions are now unlocked for this browser
				session.
			</p>
			{#if activeVerifiedEmail}
				<div class="verified-email">{activeVerifiedEmail}</div>
			{/if}
		</div>
	{:else}
		<p class="muted support-detail">{verificationSupport.detail}</p>

		{#if verificationSupport.available}
			<div class="step-grid">
				<label class="field">
					<span>Email address</span>
					<input
						type="email"
						bind:value={emailInput}
						placeholder="name@example.com"
						autocomplete="email"
						disabled={requestPending || verifyPending}
					/>
				</label>

				<div class="actions">
					<button
						type="button"
						class="secondary"
						on:click={requestCode}
						disabled={requestPending || verifyPending || !emailInput.trim()}
					>
						{requestPending
							? 'Sending code...'
							: deliveryMode
								? 'Resend code'
								: 'Send code'}
					</button>
				</div>
			</div>

			{#if deliveryMode}
				<div class="step-grid verify-step">
					<label class="field">
						<span>Verification code</span>
						<input
							type="text"
							inputmode="numeric"
							pattern="[0-9]*"
							bind:value={codeInput}
							placeholder="123456"
							maxlength="6"
							autocomplete="one-time-code"
							disabled={verifyPending}
						/>
					</label>

					<div class="actions">
						<button
							type="button"
							on:click={verifyCode}
							disabled={verifyPending || !codeInput.trim() || !activeEmail}
						>
							{verifyPending ? 'Verifying...' : 'Verify code'}
						</button>
					</div>
				</div>
			{/if}

			{#if previewCode}
				<div class="preview-card">
					<strong>Preview code</strong>
					<div class="preview-code">{previewCode}</div>
				</div>
			{/if}
		{/if}
	{/if}

	{#if infoMessage}
		<p class="info-text">{infoMessage}</p>
	{/if}

	{#if actionError}
		<p class="error-text">{actionError}</p>
	{/if}
</section>

<style>
	.verification-panel {
		display: grid;
		gap: 1rem;
		padding: 1.2rem;
	}

	.verification-panel.compact {
		padding: 1rem;
	}

	.panel-top,
	.actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.step-grid {
		display: grid;
		gap: 0.8rem;
	}

	.verify-step {
		padding-top: 0.2rem;
	}

	.field {
		display: grid;
		gap: 0.45rem;
		font-size: 0.92rem;
		color: var(--muted);
	}

	.field input {
		min-height: 2.85rem;
		padding: 0.75rem 0.9rem;
		border-radius: 14px;
		border: 1px solid var(--line);
		background: var(--surface-soft);
		color: var(--ink);
		font: inherit;
	}

	.field input:focus {
		outline: none;
		border-color: var(--line-accent);
		box-shadow: 0 0 0 1px rgba(167, 184, 255, 0.16);
	}

	.success-card,
	.preview-card {
		display: grid;
		gap: 0.45rem;
		padding: 0.95rem 1rem;
		border-radius: 16px;
		background: var(--surface-soft);
		border: 1px solid var(--line);
	}

	.success-card {
		border-color: rgba(107, 201, 152, 0.24);
	}

	.preview-card {
		border-color: rgba(255, 214, 153, 0.24);
	}

	.success-card p,
	.preview-card p {
		margin: 0;
		color: var(--muted);
	}

	.preview-code,
	.verified-email {
		font-family: var(--font-mono);
		letter-spacing: 0.08em;
	}

	.support-detail,
	.info-text,
	.error-text {
		margin: 0;
	}

	.info-text {
		color: var(--ink-soft);
	}

	.error-text {
		color: var(--danger);
	}
</style>
