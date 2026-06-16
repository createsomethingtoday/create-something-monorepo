<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { ArrowLeft, KeyRound, Loader2, Save } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let isSaving = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	async function savePassword(event: Event) {
		event.preventDefault();
		error = null;
		success = null;

		if (newPassword !== confirmPassword) {
			error = 'Passwords do not match.';
			return;
		}

		isSaving = true;
		try {
			const response = await fetch('/api/auth/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ currentPassword, newPassword })
			});
			const result = (await response.json()) as { error?: string };

			if (!response.ok) {
				error = result.error || 'Password change failed.';
				return;
			}

			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
			success = 'Password updated.';
			await invalidateAll();
		} catch {
			error = 'Password change failed.';
		} finally {
			isSaving = false;
		}
	}

	async function backToContacts() {
		await goto('/admin/contacts');
	}
</script>

<svelte:head>
	<title>Password | J AND J HOME HEALTH</title>
</svelte:head>

<main class="admin-shell narrow">
	<header class="admin-header">
		<div>
			<p class="eyebrow">J and J Home Health</p>
			<h1>Password</h1>
			<p>{data.admin.email}</p>
		</div>
		<nav class="admin-actions" aria-label="Settings navigation">
			<button type="button" onclick={backToContacts} title="Back to contacts">
				<ArrowLeft size={18} aria-hidden="true" />
				<span>Contacts</span>
			</button>
		</nav>
	</header>

	<section class="settings-panel">
		<div class="settings-title">
			<KeyRound size={20} aria-hidden="true" />
			<h2>Change admin password</h2>
		</div>

		<form class="form-stack" onsubmit={savePassword}>
			<label>
				<span>Current password</span>
				<input
					type="password"
					bind:value={currentPassword}
					required
					autocomplete="current-password"
				/>
			</label>

			<label>
				<span>New password</span>
				<input type="password" bind:value={newPassword} required autocomplete="new-password" />
			</label>

			<label>
				<span>Confirm new password</span>
				<input
					type="password"
					bind:value={confirmPassword}
					required
					autocomplete="new-password"
				/>
			</label>

			{#if error}
				<p class="error">{error}</p>
			{/if}

			{#if success}
				<p class="success">{success}</p>
			{/if}

			<button class="primary-action" type="submit" disabled={isSaving}>
				{#if isSaving}
					<Loader2 size={18} class="spin" aria-hidden="true" />
					Saving...
				{:else}
					<Save size={18} aria-hidden="true" />
					Save password
				{/if}
			</button>
		</form>
	</section>
</main>
