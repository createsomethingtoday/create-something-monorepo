<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { KeyRound, Loader2, LogIn, Mail } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let email = $state('');
	let password = $state('');
	let resetEmail = $state('');
	let isLoading = $state(false);
	let isResetting = $state(false);
	let error = $state<string | null>(null);
	let resetMessage = $state<string | null>(null);

	async function login(event: Event) {
		event.preventDefault();
		error = null;
		isLoading = true;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});
			const result = (await response.json()) as { error?: string };

			if (!response.ok) {
				error = result.error || 'Login failed.';
				return;
			}

			await invalidateAll();
			goto(data.redirectTo || '/admin/contacts');
		} catch {
			error = 'Login failed.';
		} finally {
			isLoading = false;
		}
	}

	async function requestReset() {
		resetMessage = null;
		error = null;
		isResetting = true;

		try {
			const response = await fetch('/api/auth/request-reset', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: resetEmail || email })
			});
			const result = (await response.json()) as { error?: string };

			if (!response.ok) {
				error = result.error || 'Reset request failed.';
				return;
			}

			resetMessage = 'If that email has admin access, a reset link has been sent.';
		} catch {
			error = 'Reset request failed.';
		} finally {
			isResetting = false;
		}
	}
</script>

<svelte:head>
	<title>Admin | J AND J HOME HEALTH</title>
</svelte:head>

<main class="admin-login">
	<section class="login-panel">
		<p class="eyebrow">J and J Home Health</p>
		<h1>Admin</h1>

		<form class="form-stack" onsubmit={login}>
			<label>
				<span>Email</span>
				<input type="email" bind:value={email} required autocomplete="username" />
			</label>

			<label>
				<span>Password</span>
				<input type="password" bind:value={password} required autocomplete="current-password" />
			</label>

			{#if error}
				<p class="error">{error}</p>
			{/if}

			{#if resetMessage}
				<p class="success">{resetMessage}</p>
			{/if}

			<button class="primary-action" type="submit" disabled={isLoading}>
				{#if isLoading}
					<Loader2 size={18} class="spin" aria-hidden="true" />
					Logging in...
				{:else}
					<LogIn size={18} aria-hidden="true" />
					Login
				{/if}
			</button>
		</form>

		<div class="reset-panel">
			<div>
				<KeyRound size={18} aria-hidden="true" />
				<span>Password reset</span>
			</div>
			<input
				type="email"
				bind:value={resetEmail}
				placeholder="Admin email"
				autocomplete="email"
				aria-label="Admin email for password reset"
			/>
			<button class="secondary-action" type="button" onclick={requestReset} disabled={isResetting}>
				{#if isResetting}
					<Loader2 size={16} class="spin" aria-hidden="true" />
				{:else}
					<Mail size={16} aria-hidden="true" />
				{/if}
				Send link
			</button>
		</div>
	</section>
</main>
