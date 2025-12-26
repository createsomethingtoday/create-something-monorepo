<script lang="ts">
	/**
	 * Subdomain Picker - Step 2
	 *
	 * Real-time subdomain validation with debounced API check.
	 */

	import { wizardState } from '$lib/stores/wizardState';
	import { onMount } from 'svelte';

	let subdomain = $wizardState.subdomain;
	let error = '';
	let suggestion = '';
	let debounceTimer: ReturnType<typeof setTimeout>;

	// Validate subdomain format
	function validateFormat(value: string): { valid: boolean; error?: string } {
		if (value.length < 3) {
			return { valid: false, error: 'At least 3 characters required' };
		}
		if (value.length > 63) {
			return { valid: false, error: 'Maximum 63 characters' };
		}
		if (!/^[a-z0-9-]+$/.test(value)) {
			return { valid: false, error: 'Only lowercase letters, numbers, and hyphens' };
		}
		if (value.startsWith('-') || value.endsWith('-')) {
			return { valid: false, error: 'Cannot start or end with hyphen' };
		}
		if (value.includes('--')) {
			return { valid: false, error: 'Cannot contain consecutive hyphens' };
		}
		return { valid: true };
	}

	// Check availability via API
	async function checkAvailability(value: string) {
		wizardState.setSubdomainChecking(true);
		error = '';
		suggestion = '';

		try {
			const response = await fetch(
				`https://templates.createsomething.space/api/subdomain/check?subdomain=${encodeURIComponent(value)}`
			);
			const data = await response.json();

			if (data.available) {
				wizardState.setSubdomainValid(true);
			} else {
				wizardState.setSubdomainValid(false);
				error =
					data.reason === 'taken'
						? 'This subdomain is already taken'
						: data.reason === 'reserved'
							? 'This subdomain is reserved'
							: 'Invalid subdomain';
				if (data.suggestion) {
					suggestion = data.suggestion;
				}
			}
		} catch {
			error = 'Unable to check availability';
			wizardState.setSubdomainValid(false);
		} finally {
			wizardState.setSubdomainChecking(false);
		}
	}

	function handleInput(e: Event) {
		const value = (e.target as HTMLInputElement).value.toLowerCase().replace(/[^a-z0-9-]/g, '');
		subdomain = value;
		wizardState.setSubdomain(value);

		// Clear previous timer
		clearTimeout(debounceTimer);

		// Validate format first
		const formatCheck = validateFormat(value);
		if (!formatCheck.valid) {
			error = formatCheck.error || '';
			wizardState.setSubdomainValid(false);
			return;
		}

		// Debounce API check
		error = '';
		debounceTimer = setTimeout(() => checkAvailability(value), 300);
	}

	function useSuggestion() {
		subdomain = suggestion;
		wizardState.setSubdomain(suggestion);
		checkAvailability(suggestion);
		suggestion = '';
	}
</script>

<div class="subdomain-picker">
	<h2 class="step-title">Choose your subdomain</h2>
	<p class="step-description">This will be your site's address</p>

	<div class="input-wrapper">
		<div class="subdomain-input-group">
			<input
				type="text"
				class="subdomain-input"
				class:error={error}
				class:valid={$wizardState.subdomainValid}
				value={subdomain}
				oninput={handleInput}
				placeholder="yoursite"
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
			/>
			<span class="domain-suffix">.createsomething.space</span>
		</div>

		{#if $wizardState.subdomainChecking}
			<div class="status checking">Checking availability...</div>
		{:else if error}
			<div class="status error">{error}</div>
		{:else if $wizardState.subdomainValid}
			<div class="status valid">✓ Available</div>
		{/if}

		{#if suggestion}
			<button class="suggestion" onclick={useSuggestion}>
				Try <strong>{suggestion}</strong> instead?
			</button>
		{/if}
	</div>

	<div class="preview">
		<span class="preview-label">Your site will be at:</span>
		<span class="preview-url">
			https://<strong>{subdomain || 'yoursite'}</strong>.createsomething.space
		</span>
	</div>
</div>

<style>
	.subdomain-picker {
		text-align: center;
	}

	.step-title {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.step-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xl);
	}

	.input-wrapper {
		max-width: 500px;
		margin: 0 auto var(--space-xl);
	}

	.subdomain-input-group {
		display: flex;
		align-items: center;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.subdomain-input-group:focus-within {
		border-color: var(--color-border-emphasis);
	}

	.subdomain-input {
		flex: 1;
		background: transparent;
		border: none;
		padding: var(--space-md);
		font-size: var(--text-body-lg);
		color: var(--color-fg-primary);
		outline: none;
		min-width: 0;
	}

	.subdomain-input::placeholder {
		color: var(--color-fg-muted);
	}

	.domain-suffix {
		padding: var(--space-md);
		color: var(--color-fg-muted);
		background: var(--color-bg-subtle);
		font-size: var(--text-body);
		white-space: nowrap;
	}

	.status {
		margin-top: var(--space-sm);
		font-size: var(--text-body-sm);
	}

	.status.checking {
		color: var(--color-fg-muted);
	}

	.status.error {
		color: var(--color-error);
	}

	.status.valid {
		color: var(--color-success);
	}

	.suggestion {
		display: block;
		margin: var(--space-sm) auto 0;
		background: none;
		border: none;
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		cursor: pointer;
		text-decoration: underline;
	}

	.suggestion:hover {
		color: var(--color-fg-primary);
	}

	.preview {
		background: var(--color-bg-subtle);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		max-width: 500px;
		margin: 0 auto;
	}

	.preview-label {
		display: block;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.preview-url {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.preview-url strong {
		color: var(--color-fg-primary);
	}
</style>
