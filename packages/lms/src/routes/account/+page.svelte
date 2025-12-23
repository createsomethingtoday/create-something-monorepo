<script lang="ts">
	/**
	 * Account Page
	 *
	 * Profile management for learners.
	 * Canon: The self is not data to be managed, but identity to be expressed.
	 */

	import type { PageData } from './$types';
	import { User, Mail, Shield, Calendar, Check, Loader2, LogOut, Key, Eye, EyeOff, Upload, Trash2, AlertTriangle, BarChart3 } from 'lucide-svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getConsentState, updateAnalyticsConsent, initializeConsent } from '@create-something/components/gdpr';

	let { data }: { data: PageData } = $props();

	let name = $state(data.profile?.name || '');
	let saving = $state(false);
	let saveMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// Password change state
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let showCurrentPassword = $state(false);
	let showNewPassword = $state(false);
	let changingPassword = $state(false);
	let passwordMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// Email change state
	let newEmail = $state('');
	let emailPassword = $state('');
	let changingEmail = $state(false);
	let emailMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// Avatar state
	let avatarFile = $state<File | null>(null);
	let avatarPreview = $state<string | null>(null);
	let uploadingAvatar = $state(false);
	let avatarMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let fileInput: HTMLInputElement;

	// Delete account state
	let showDeleteConfirm = $state(false);
	let deletePassword = $state('');
	let deleteConfirmText = $state('');
	let deletingAccount = $state(false);
	let deleteMessage = $state<{ type: 'error'; text: string } | null>(null);

	// Privacy settings state
	let analyticsEnabled = $state(data.profile?.analytics_opt_out === false);
	let savingPrivacy = $state(false);
	let privacyMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// Initialize consent state from server on mount
	onMount(() => {
		if (data.profile) {
			// Sync local consent with server preference
			initializeConsent(data.profile.analytics_opt_out);
			analyticsEnabled = !data.profile.analytics_opt_out;
		}
	});

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
				const err = (await response.json()) as { message?: string };
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

	// Change password
	async function changePassword() {
		passwordMessage = null;

		// Validation
		if (!currentPassword || !newPassword || !confirmPassword) {
			passwordMessage = { type: 'error', text: 'All password fields are required' };
			return;
		}

		if (newPassword.length < 8) {
			passwordMessage = { type: 'error', text: 'New password must be at least 8 characters' };
			return;
		}

		if (newPassword !== confirmPassword) {
			passwordMessage = { type: 'error', text: 'New passwords do not match' };
			return;
		}

		changingPassword = true;

		try {
			const response = await fetch('/api/account/password', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					current_password: currentPassword,
					new_password: newPassword,
				}),
			});

			if (!response.ok) {
				const err = (await response.json()) as { message?: string };
				throw new Error(err.message || 'Failed to change password');
			}

			// Password changed successfully - redirect to login
			goto('/login?message=password_changed');
		} catch (err) {
			passwordMessage = { type: 'error', text: err instanceof Error ? err.message : 'Failed to change password' };
		} finally {
			changingPassword = false;
		}
	}

	// Change email
	async function changeEmail() {
		emailMessage = null;

		if (!newEmail || !emailPassword) {
			emailMessage = { type: 'error', text: 'New email and password required' };
			return;
		}

		// Basic email validation
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
			emailMessage = { type: 'error', text: 'Please enter a valid email address' };
			return;
		}

		changingEmail = true;

		try {
			const response = await fetch('/api/account/email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					new_email: newEmail,
					password: emailPassword,
				}),
			});

			if (!response.ok) {
				const err = (await response.json()) as { message?: string };
				throw new Error(err.message || 'Failed to initiate email change');
			}

			emailMessage = { type: 'success', text: 'Verification email sent. Check your new inbox.' };
			newEmail = '';
			emailPassword = '';
		} catch (err) {
			emailMessage = { type: 'error', text: err instanceof Error ? err.message : 'Failed to change email' };
		} finally {
			changingEmail = false;
		}
	}

	// Avatar file selection
	function handleAvatarSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		// Validate type
		const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
		if (!allowedTypes.includes(file.type)) {
			avatarMessage = { type: 'error', text: 'Please select a PNG, JPEG, WebP, or GIF image' };
			return;
		}

		// Validate size (5MB)
		if (file.size > 5 * 1024 * 1024) {
			avatarMessage = { type: 'error', text: 'Image must be under 5MB' };
			return;
		}

		avatarFile = file;
		avatarPreview = URL.createObjectURL(file);
		avatarMessage = null;
	}

	// Upload avatar
	async function uploadAvatar() {
		if (!avatarFile) return;

		uploadingAvatar = true;
		avatarMessage = null;

		try {
			const formData = new FormData();
			formData.append('avatar', avatarFile);

			const response = await fetch('/api/account/avatar', {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const err = (await response.json()) as { message?: string };
				throw new Error(err.message || 'Failed to upload avatar');
			}

			avatarMessage = { type: 'success', text: 'Avatar updated' };
			avatarFile = null;
			if (avatarPreview) {
				URL.revokeObjectURL(avatarPreview);
				avatarPreview = null;
			}
			await invalidateAll();
		} catch (err) {
			avatarMessage = { type: 'error', text: err instanceof Error ? err.message : 'Failed to upload avatar' };
		} finally {
			uploadingAvatar = false;
		}
	}

	// Cancel avatar selection
	function cancelAvatarSelection() {
		avatarFile = null;
		if (avatarPreview) {
			URL.revokeObjectURL(avatarPreview);
			avatarPreview = null;
		}
		if (fileInput) {
			fileInput.value = '';
		}
	}

	// Delete avatar
	async function deleteAvatar() {
		uploadingAvatar = true;
		avatarMessage = null;

		try {
			const response = await fetch('/api/account/avatar', {
				method: 'DELETE',
			});

			if (!response.ok) {
				const err = (await response.json()) as { message?: string };
				throw new Error(err.message || 'Failed to delete avatar');
			}

			avatarMessage = { type: 'success', text: 'Avatar removed' };
			await invalidateAll();
		} catch (err) {
			avatarMessage = { type: 'error', text: err instanceof Error ? err.message : 'Failed to delete avatar' };
		} finally {
			uploadingAvatar = false;
		}
	}

	// Update privacy settings
	async function updatePrivacySettings() {
		savingPrivacy = true;
		privacyMessage = null;

		try {
			// Update server
			const response = await fetch('/api/account/privacy', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ analytics_opt_out: !analyticsEnabled }),
			});

			if (!response.ok) {
				const err = (await response.json()) as { message?: string };
				throw new Error(err.message || 'Failed to update privacy settings');
			}

			// Update local consent state
			updateAnalyticsConsent(analyticsEnabled);

			privacyMessage = {
				type: 'success',
				text: analyticsEnabled
					? 'Analytics enabled. Thank you for helping us improve.'
					: 'Analytics disabled. Your browsing data will no longer be collected.'
			};
		} catch (err) {
			privacyMessage = { type: 'error', text: err instanceof Error ? err.message : 'Failed to update settings' };
		} finally {
			savingPrivacy = false;
		}
	}

	// Delete account
	async function deleteAccount() {
		deleteMessage = null;

		if (!deletePassword) {
			deleteMessage = { type: 'error', text: 'Password required' };
			return;
		}

		if (deleteConfirmText !== 'DELETE') {
			deleteMessage = { type: 'error', text: 'Please type DELETE to confirm' };
			return;
		}

		deletingAccount = true;

		try {
			const response = await fetch('/api/account/delete', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: deletePassword }),
			});

			if (!response.ok) {
				const err = (await response.json()) as { message?: string };
				throw new Error(err.message || 'Failed to delete account');
			}

			// Account deleted - redirect to home
			goto('/?message=account_deleted');
		} catch (err) {
			deleteMessage = { type: 'error', text: err instanceof Error ? err.message : 'Failed to delete account' };
		} finally {
			deletingAccount = false;
		}
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
				<!-- Avatar section with upload -->
				<div class="avatar-container">
					<div class="avatar">
						{#if avatarPreview}
							<img src={avatarPreview} alt="New avatar preview" />
						{:else if data.profile.avatar_url}
							<img src={data.profile.avatar_url} alt="Avatar" />
						{:else}
							<User size={32} strokeWidth={1.5} />
						{/if}
					</div>
					<div class="avatar-controls">
						<div class="avatar-info">
							<span class="avatar-name">{data.profile.name || 'Learner'}</span>
							<span class="avatar-tier">{tierLabel(data.profile.tier)} tier</span>
						</div>
						<div class="avatar-actions">
							<input
								type="file"
								accept="image/png,image/jpeg,image/webp,image/gif"
								onchange={handleAvatarSelect}
								bind:this={fileInput}
								class="hidden-input"
								id="avatar-input"
							/>
							{#if avatarFile}
								<button type="button" class="avatar-btn upload" onclick={uploadAvatar} disabled={uploadingAvatar}>
									{#if uploadingAvatar}
										<Loader2 size={14} class="animate-spin" />
									{:else}
										<Upload size={14} />
									{/if}
									<span>Upload</span>
								</button>
								<button type="button" class="avatar-btn cancel" onclick={cancelAvatarSelection}>
									<span>Cancel</span>
								</button>
							{:else}
								<label for="avatar-input" class="avatar-btn">
									<Upload size={14} />
									<span>Change</span>
								</label>
								{#if data.profile.avatar_url}
									<button type="button" class="avatar-btn delete" onclick={deleteAvatar} disabled={uploadingAvatar} aria-label="Delete avatar">
										<Trash2 size={14} />
									</button>
								{/if}
							{/if}
						</div>
						{#if avatarMessage}
							<span class="avatar-message {avatarMessage.type}">{avatarMessage.text}</span>
						{/if}
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

		<!-- Security Section -->
		<section class="security-section">
			<div class="section-header">
				<h2 class="section-title">Security</h2>
			</div>

			<form onsubmit={(e) => { e.preventDefault(); changePassword(); }} class="password-form">
				<!-- Current Password -->
				<div class="field">
					<label for="current-password" class="field-label">
						<Key size={16} strokeWidth={1.5} />
						<span>Current Password</span>
					</label>
					<div class="password-input-container">
						<input
							id="current-password"
							type={showCurrentPassword ? 'text' : 'password'}
							bind:value={currentPassword}
							placeholder="Enter current password"
							class="field-input password-input"
							autocomplete="current-password"
						/>
						<button
							type="button"
							class="password-toggle"
							onclick={() => (showCurrentPassword = !showCurrentPassword)}
						>
							{#if showCurrentPassword}
								<EyeOff size={16} />
							{:else}
								<Eye size={16} />
							{/if}
						</button>
					</div>
				</div>

				<!-- New Password -->
				<div class="field">
					<label for="new-password" class="field-label">
						<Key size={16} strokeWidth={1.5} />
						<span>New Password</span>
					</label>
					<div class="password-input-container">
						<input
							id="new-password"
							type={showNewPassword ? 'text' : 'password'}
							bind:value={newPassword}
							placeholder="Enter new password"
							class="field-input password-input"
							autocomplete="new-password"
						/>
						<button
							type="button"
							class="password-toggle"
							onclick={() => (showNewPassword = !showNewPassword)}
						>
							{#if showNewPassword}
								<EyeOff size={16} />
							{:else}
								<Eye size={16} />
							{/if}
						</button>
					</div>
					<p class="field-hint">Minimum 8 characters.</p>
				</div>

				<!-- Confirm Password -->
				<div class="field">
					<label for="confirm-password" class="field-label">
						<Key size={16} strokeWidth={1.5} />
						<span>Confirm New Password</span>
					</label>
					<input
						id="confirm-password"
						type="password"
						bind:value={confirmPassword}
						placeholder="Confirm new password"
						class="field-input"
						autocomplete="new-password"
					/>
				</div>

				<!-- Change Password button -->
				<div class="form-actions">
					{#if passwordMessage}
						<span class="save-message {passwordMessage.type}">{passwordMessage.text}</span>
					{/if}
					<button type="submit" class="change-password-btn" disabled={changingPassword}>
						{#if changingPassword}
							<Loader2 size={16} class="animate-spin" />
							<span>Changing...</span>
						{:else}
							<span>Change Password</span>
						{/if}
					</button>
				</div>
			</form>
		</section>

		<!-- Email Change Section -->
		<section class="email-section">
			<div class="section-header">
				<h2 class="section-title">Email Address</h2>
				<p class="section-subtitle">Change the email address associated with your account.</p>
			</div>

			<form onsubmit={(e) => { e.preventDefault(); changeEmail(); }} class="email-form">
				<!-- New Email -->
				<div class="field">
					<label for="new-email" class="field-label">
						<Mail size={16} strokeWidth={1.5} />
						<span>New Email Address</span>
					</label>
					<input
						id="new-email"
						type="email"
						bind:value={newEmail}
						placeholder="Enter new email"
						class="field-input"
						autocomplete="email"
					/>
				</div>

				<!-- Password for verification -->
				<div class="field">
					<label for="email-password" class="field-label">
						<Key size={16} strokeWidth={1.5} />
						<span>Confirm Password</span>
					</label>
					<input
						id="email-password"
						type="password"
						bind:value={emailPassword}
						placeholder="Enter your password"
						class="field-input"
						autocomplete="current-password"
					/>
					<p class="field-hint">Required to verify your identity.</p>
				</div>

				<div class="form-actions">
					{#if emailMessage}
						<span class="save-message {emailMessage.type}">{emailMessage.text}</span>
					{/if}
					<button type="submit" class="change-email-btn" disabled={changingEmail}>
						{#if changingEmail}
							<Loader2 size={16} class="animate-spin" />
							<span>Sending...</span>
						{:else}
							<span>Send Verification</span>
						{/if}
					</button>
				</div>
			</form>
		</section>

		<!-- Privacy Section -->
		<section class="privacy-section">
			<div class="section-header">
				<h2 class="section-title">Privacy</h2>
				<p class="section-subtitle">Control how your data is collected and used.</p>
			</div>

			<div class="privacy-form">
				<!-- Analytics Toggle -->
				<div class="toggle-field">
					<div class="toggle-info">
						<label for="analytics-toggle" class="toggle-label">
							<BarChart3 size={16} strokeWidth={1.5} />
							<span>Analytics Tracking</span>
						</label>
						<p class="toggle-description">
							Help us improve by allowing anonymous usage analytics. We never share your data with third parties.
						</p>
					</div>
					<div class="toggle-control">
						<label class="toggle-switch">
							<input
								id="analytics-toggle"
								type="checkbox"
								bind:checked={analyticsEnabled}
								onchange={updatePrivacySettings}
								disabled={savingPrivacy}
							/>
							<span class="toggle-slider"></span>
						</label>
						{#if savingPrivacy}
							<Loader2 size={14} class="animate-spin toggle-loading" />
						{/if}
					</div>
				</div>

				{#if privacyMessage}
					<div class="privacy-message {privacyMessage.type}">
						{privacyMessage.text}
					</div>
				{/if}

				<div class="privacy-info">
					<p>
						We respect your privacy. Your browser's <a href="https://allaboutdnt.com/" target="_blank" rel="noopener noreferrer">Do Not Track</a> setting is always honored.
						View our <a href="/privacy">Privacy Policy</a> for more details.
					</p>
				</div>
			</div>
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

		<!-- Danger Zone -->
		<section class="danger-section">
			<div class="section-header">
				<h2 class="section-title danger">Danger Zone</h2>
			</div>

			{#if !showDeleteConfirm}
				<div class="danger-info">
					<p>Once you delete your account, there is no going back. Your account will be scheduled for deletion, and you will have 30 days to recover it by logging in.</p>
					<button type="button" class="delete-account-btn" onclick={() => (showDeleteConfirm = true)}>
						<Trash2 size={16} />
						<span>Delete Account</span>
					</button>
				</div>
			{:else}
				<div class="delete-confirm-card">
					<div class="delete-warning">
						<AlertTriangle size={24} />
						<div>
							<strong>Are you sure?</strong>
							<p>This action cannot be undone. Type <strong>DELETE</strong> to confirm.</p>
						</div>
					</div>

					<form onsubmit={(e) => { e.preventDefault(); deleteAccount(); }} class="delete-form">
						<div class="field">
							<label for="delete-confirm" class="field-label">
								<span>Type DELETE to confirm</span>
							</label>
							<input
								id="delete-confirm"
								type="text"
								bind:value={deleteConfirmText}
								placeholder="DELETE"
								class="field-input"
								autocomplete="off"
							/>
						</div>

						<div class="field">
							<label for="delete-password" class="field-label">
								<Key size={16} strokeWidth={1.5} />
								<span>Your Password</span>
							</label>
							<input
								id="delete-password"
								type="password"
								bind:value={deletePassword}
								placeholder="Enter your password"
								class="field-input"
								autocomplete="current-password"
							/>
						</div>

						{#if deleteMessage}
							<span class="delete-message error">{deleteMessage.text}</span>
						{/if}

						<div class="delete-actions">
							<button type="button" class="cancel-delete-btn" onclick={() => { showDeleteConfirm = false; deleteConfirmText = ''; deletePassword = ''; }}>
								Cancel
							</button>
							<button type="submit" class="confirm-delete-btn" disabled={deletingAccount}>
								{#if deletingAccount}
									<Loader2 size={16} class="animate-spin" />
									<span>Deleting...</span>
								{:else}
									<Trash2 size={16} />
									<span>Delete My Account</span>
								{/if}
							</button>
						</div>
					</form>
				</div>
			{/if}
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
	.security-section,
	.privacy-section,
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

	/* Password Form */
	.password-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.password-input-container {
		position: relative;
		display: flex;
		align-items: center;
	}

	.password-input {
		padding-right: 2.5rem;
	}

	.password-toggle {
		position: absolute;
		right: var(--space-sm);
		padding: var(--space-xs);
		background: transparent;
		border: none;
		color: var(--color-fg-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.password-toggle:hover {
		color: var(--color-fg-secondary);
	}

	.change-password-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		color: var(--color-fg-secondary);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.change-password-btn:hover:not(:disabled) {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.change-password-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Avatar Controls */
	.avatar-controls {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.avatar-actions {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.hidden-input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		overflow: hidden;
	}

	.avatar-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.75rem;
		background: transparent;
		color: var(--color-fg-tertiary);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		font-family: inherit;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.avatar-btn:hover:not(:disabled) {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-secondary);
	}

	.avatar-btn.upload {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-color: var(--color-fg-primary);
	}

	.avatar-btn.upload:hover:not(:disabled) {
		opacity: 0.9;
	}

	.avatar-btn.delete {
		color: var(--color-error);
		border-color: transparent;
	}

	.avatar-btn.delete:hover:not(:disabled) {
		border-color: var(--color-error);
	}

	.avatar-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.avatar-message {
		font-size: var(--text-caption);
	}

	.avatar-message.success {
		color: var(--color-success);
	}

	.avatar-message.error {
		color: var(--color-error);
	}

	/* Email Section */
	.email-section {
		margin-bottom: var(--space-xl);
	}

	.section-subtitle {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		margin-top: var(--space-xs);
	}

	.email-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.change-email-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		color: var(--color-fg-secondary);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.change-email-btn:hover:not(:disabled) {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.change-email-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Danger Zone */
	.danger-section {
		margin-top: var(--space-xl);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.section-title.danger {
		color: var(--color-error);
	}

	.danger-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.danger-info p {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		line-height: 1.6;
	}

	.delete-account-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		color: var(--color-error);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
		align-self: flex-start;
	}

	.delete-account-btn:hover {
		background: rgba(204, 68, 68, 0.1);
	}

	.delete-confirm-card {
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-lg);
	}

	.delete-warning {
		display: flex;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
		color: var(--color-error);
	}

	.delete-warning strong {
		display: block;
		margin-bottom: 0.25rem;
	}

	.delete-warning p {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.delete-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.delete-message {
		font-size: var(--text-body-sm);
	}

	.delete-message.error {
		color: var(--color-error);
	}

	.delete-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		margin-top: var(--space-sm);
	}

	.cancel-delete-btn {
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		color: var(--color-fg-secondary);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		font-family: inherit;
		cursor: pointer;
	}

	.cancel-delete-btn:hover {
		border-color: var(--color-border-emphasis);
	}

	.confirm-delete-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-error);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.confirm-delete-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.confirm-delete-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Privacy Section */
	.privacy-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.toggle-field {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.toggle-info {
		flex: 1;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
		font-weight: 500;
		cursor: pointer;
	}

	.toggle-description {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		margin-top: var(--space-xs);
		line-height: 1.5;
	}

	.toggle-control {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.toggle-switch {
		position: relative;
		display: inline-block;
		width: 44px;
		height: 24px;
		cursor: pointer;
	}

	.toggle-switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.toggle-slider::before {
		position: absolute;
		content: "";
		height: 18px;
		width: 18px;
		left: 2px;
		bottom: 2px;
		background-color: var(--color-fg-muted);
		border-radius: var(--radius-full);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.toggle-switch input:checked + .toggle-slider {
		background-color: var(--color-success-muted);
		border-color: var(--color-success);
	}

	.toggle-switch input:checked + .toggle-slider::before {
		transform: translateX(20px);
		background-color: var(--color-success);
	}

	.toggle-switch input:disabled + .toggle-slider {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toggle-loading {
		color: var(--color-fg-muted);
	}

	.privacy-message {
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
	}

	.privacy-message.success {
		background: var(--color-success-muted);
		color: var(--color-success);
		border: 1px solid var(--color-success-border);
	}

	.privacy-message.error {
		background: var(--color-error-muted);
		color: var(--color-error);
		border: 1px solid var(--color-error-border);
	}

	.privacy-info {
		padding: var(--space-sm) 0;
	}

	.privacy-info p {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		line-height: 1.6;
	}

	.privacy-info a {
		color: var(--color-fg-secondary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.privacy-info a:hover {
		color: var(--color-fg-primary);
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
