<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { Loader2, LogIn } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let password = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	async function login(event: Event) {
		event.preventDefault();
		error = null;
		isLoading = true;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password })
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
				<span>Password</span>
				<input type="password" bind:value={password} required autocomplete="current-password" />
			</label>

			{#if error}
				<p class="error">{error}</p>
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
	</section>
</main>
