<script lang="ts">
	/**
	 * Account Page
	 *
	 * Profile management for learners.
	 * Canon: The self is not data to be managed, but identity to be expressed.
	 */

	import type { PageData } from './$types';
	import { User, Mail, Shield, Calendar, Check, Loader2, LogOut } from 'lucide-svelte';
	import { goto, invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let name = $state(data.profile?.name || '');
	let saving = $state(false);
	let saveMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// Format date
	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	}

	// Tier display
	function tierLabel(tier: string): string {
		return tier.charAt(0).toUpperCase() + tier.slice(1);
	}

	// Save profile
	async function saveProfile() {
		if (!data.profile) return;

		saving = true;
		saveMessage = null;

		try {
			const response = await fetch('/api/account', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: name || null }),
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || 'Failed to save');
			}

			saveMessage = { type: 'success', text: 'Profile updated' };
			await invalidateAll();
		} catch (err) {
			saveMessage = { type: 'error', text: err instanceof Error ? err.message : 'Failed to save' };
		} finally {
			saving = false;
		}
	}

	// Logout
	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		goto('/');
	}
</script>

<svelte:head>
	<title>Account | CREATE SOMETHING LMS</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-6 py-16">
	<!-- Header -->
	<header class="mb-12">
		<h1 class="page-title">Account</h1>
		<p class="page-subtitle">Manage your learning identity.</p>
	</header>

	{#if data.error}
		<div class="error-card">
			<p>{data.error}</p>
			<button onclick={() => goto('/login?redirect=/account')} class="retry-btn">
				Try logging in again
			</button>
		</div>
	{:else if data.profile}
		<!-- Profile Section -->
		<section class="profile-section">
			<div class="section-header">
				<h2 class="section-title">Profile</h2>
			</div>

			<form onsubmit={(e) => { e.preventDefault(); saveProfile(); }} class="profile-form">
				<!-- Avatar placeholder -->
				<div class="avatar-container">
					<div class="avatar">
						{#if data.profile.avatar_url}
							<img src={data.profile.avatar_url} alt="Avatar" />
						{:else}
							<User size={32} strokeWidth={1.5} />
						{/if}
					</div>
					<div class="avatar-info">
						<span class="avatar-name">{data.profile.name || 'Learner'}</span>
						<span class="avatar-tier">{tierLabel(data.profile.tier)} tier</span>
					</div>
				</div>

				<!-- Name field -->
				<div class="field">
					<label for="name" class="field-label">
						<User size={16} strokeWidth={1.5} />
						<span>Display Name</span>
					</label>
					<input
						id="name"
						type="text"
						bind:value={name}
						placeholder="Your name"
						class="field-input"
					/>
					<p class="field-hint">How you'll appear in the learning community.</p>
				</div>

				<!-- Email (read-only) -->
				<div class="field">
					<label class="field-label">
						<Mail size={16} strokeWidth={1.5} />
						<span>Email</span>
					</label>
					<div class="field-value">
						{data.profile.email}
						{#if data.profile.email_verified}
							<span class="verified-badge">
								<Check size={12} />
								Verified
							</span>
						{/if}
					</div>
				</div>

				<!-- Tier (read-only) -->
				<div class="field">
					<label class="field-label">
						<Shield size={16} strokeWidth={1.5} />
						<span>Membership Tier</span>
					</label>
					<div class="field-value tier-badge tier-{data.profile.tier}">
						{tierLabel(data.profile.tier)}
					</div>
				</div>

				<!-- Member since -->
				<div class="field">
					<label class="field-label">
						<Calendar size={16} strokeWidth={1.5} />
						<span>Member Since</span>
					</label>
					<div class="field-value">{formatDate(data.profile.created_at)}</div>
				</div>

				<!-- Save button -->
				<div class="form-actions">
					{#if saveMessage}
						<span class="save-message {saveMessage.type}">{saveMessage.text}</span>
					{/if}
					<button type="submit" class="save-btn" disabled={saving}>
						{#if saving}
							<Loader2 size={16} class="animate-spin" />
							<span>Saving...</span>
						{:else}
							<span>Save Changes</span>
						{/if}
					</button>
				</div>
			</form>
		</section>

		<!-- Actions Section -->
		<section class="actions-section">
			<div class="section-header">
				<h2 class="section-title">Session</h2>
			</div>

			<button onclick={logout} class="logout-btn">
				<LogOut size={18} strokeWidth={1.5} />
				<span>Sign Out</span>
			</button>
		</section>
	{/if}
</div>

<style>
	.page-title {
		font-size: var(--text-display);
		font-weight: 300;
		margin-bottom: var(--space-xs);
	}

	.page-subtitle {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-lg);
	}

	/* Error State */
	.error-card {
		padding: var(--space-lg);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-lg);
		text-align: center;
	}

	.error-card p {
		color: var(--color-error);
		margin-bottom: var(--space-md);
	}

	.retry-btn {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		cursor: pointer;
	}

	/* Sections */
	.profile-section,
	.actions-section {
		margin-bottom: var(--space-xl);
	}

	.section-header {
		margin-bottom: var(--space-md);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.section-title {
		font-size: var(--text-h3);
		font-weight: 500;
	}

	/* Avatar */
	.avatar-container {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.avatar {
		width: 64px;
		height: 64px;
		border-radius: var(--radius-full);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-fg-muted);
		overflow: hidden;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.avatar-name {
		font-size: var(--text-body-lg);
		font-weight: 500;
	}

	.avatar-tier {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	/* Form */
	.profile-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.field-label {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		font-weight: 500;
	}

	.field-input {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		font-family: inherit;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.field-input:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.field-hint {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
	}

	.field-value {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) 0;
		color: var(--color-fg-primary);
	}

	.verified-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		background: rgba(68, 170, 68, 0.1);
		color: var(--color-success);
		font-size: var(--text-caption);
		border-radius: var(--radius-sm);
	}

	/* Tier badges */
	.tier-badge {
		display: inline-flex;
		padding: 0.25rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		font-weight: 500;
	}

	.tier-free {
		background: var(--color-bg-surface);
		color: var(--color-fg-tertiary);
	}

	.tier-pro {
		background: rgba(96, 165, 250, 0.1);
		color: var(--color-data-1);
	}

	.tier-agency {
		background: rgba(192, 132, 252, 0.1);
		color: var(--color-data-3);
	}

	/* Form Actions */
	.form-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-md);
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.save-message {
		font-size: var(--text-body-sm);
	}

	.save-message.success {
		color: var(--color-success);
	}

	.save-message.error {
		color: var(--color-error);
	}

	.save-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		font-weight: 500;
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.save-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.save-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Logout */
	.logout-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		color: var(--color-fg-secondary);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		font-family: inherit;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.logout-btn:hover {
		border-color: var(--color-error);
		color: var(--color-error);
	}

	/* Animation */
	:global(.animate-spin) {
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
</style>
