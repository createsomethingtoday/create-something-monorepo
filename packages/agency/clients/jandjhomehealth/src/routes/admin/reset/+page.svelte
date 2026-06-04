<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { KeyRound, Loader2 } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let newPassword = $state('');
	let confirmPassword = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	async function resetPassword(event: Event) {
		event.preventDefault();
		error = null;

		if (newPassword !== confirmPassword) {
			error = 'Passwords do not match.';
			return;
		}

		isLoading = true;
		try {
			const response = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: data.token, newPassword })
			});
			const result = (await response.json()) as { error?: string };

			if (!response.ok) {
				error = result.error || 'Password reset failed.';
				return;
			}

			await invalidateAll();
			goto('/admin/contacts');
		} catch {
			error = 'Password reset failed.';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Reset Password | J AND J HOME HEALTH</title>
</svelte:head>

<main class="admin-login">
	<section class="login-panel">
		<p class="eyebrow">J and J Home Health</p>
		<h1>Reset Password</h1>

		{#if !data.token}
			<p class="error">Reset token is missing.</p>
			<a class="secondary-link" href="/admin">Back to login</a>
		{:else}
			<form class="form-stack" onsubmit={resetPassword}>
				<label>
					<span>New password</span>
					<input type="password" bind:value={newPassword} required autocomplete="new-password" />
				</label>

				<label>
					<span>Confirm password</span>
					<input type="password" bind:value={confirmPassword} required autocomplete="new-password" />
				</label>

				{#if error}
					<p class="error">{error}</p>
				{/if}

				<button class="primary-action" type="submit" disabled={isLoading}>
					{#if isLoading}
						<Loader2 size={18} class="spin" aria-hidden="true" />
						Resetting...
					{:else}
						<KeyRound size={18} aria-hidden="true" />
						Reset password
					{/if}
				</button>
			</form>
		{/if}
	</section>
</main>
