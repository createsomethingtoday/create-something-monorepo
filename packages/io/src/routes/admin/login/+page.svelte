<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { page } from '$app/stores';

	let email = '';
	let password = '';
	let loading = false;
	let error = '';

	function getNextPath() {
		const next = $page.url.searchParams.get('next');
		if (
			!next ||
			!next.startsWith('/admin') ||
			next.startsWith('//') ||
			next === '/admin/login' ||
			next.startsWith('/admin/login?')
		) {
			return '/admin';
		}
		return next;
	}

	async function handleLogin() {
		if (!email || !password) {
			error = 'Please enter both email and password';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			if (response.ok) {
				window.location.href = getNextPath();
			} else {
				const result = (await response.json()) as { error?: string };
				error = result.error || 'Invalid credentials';
			}
		} catch (err) {
			error = 'Login failed. Please try again.';
			console.error('Login error:', err);
		} finally {
			loading = false;
		}
	}
</script>

<SEO
	title="Admin - Login"
	description="Administrative dashboard"
	propertyName="io"
	noindex={true}
/>

<div class="min-h-screen flex items-start justify-center px-6 pt-24">
	<div class="w-full max-w-md">
		<div class="text-center mb-8">
			<h1 class="login-title mb-2">CREATE SOMETHING</h1>
			<p class="login-subtitle">Admin Access</p>
		</div>

		<div class="login-card p-8">
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleLogin();
				}}
			>
				<div class="space-y-6">
					{#if error}
						<div class="error-alert p-4">
							{error}
						</div>
					{/if}

					<div>
						<label for="email" class="field-label block mb-2">Email</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							disabled={loading}
							autocomplete="email"
							placeholder="your@email.com"
							class="input-field w-full px-4 py-3"
						/>
					</div>

					<div>
						<label for="password" class="field-label block mb-2">Password</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							disabled={loading}
							autocomplete="current-password"
							placeholder="••••••••"
							class="input-field w-full px-4 py-3"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						class="btn-primary w-full px-4 py-3"
					>
						{loading ? 'Signing in...' : 'Sign In'}
					</button>
				</div>
			</form>
		</div>

		<div class="mt-6 text-center">
			<a href="/" class="back-link">
				← Back to Site
			</a>
		</div>
	</div>
</div>

<style>
	.login-title {
		font-size: var(--text-performance-h1);
		font-weight: 700;
	}

	.login-subtitle {
		color: var(--color-performance-fg-tertiary);
	}

	.login-card {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
	}

	.error-alert {
		background: var(--color-performance-error-muted);
		border: 1px solid var(--color-performance-error-border);
		border-radius: var(--radius-performance-scale-lg);
		color: var(--color-performance-error);
		font-size: var(--text-performance-body-sm);
	}

	.field-label {
		font-size: var(--text-performance-body-sm);
		font-weight: 500;
	}

	.input-field {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		color: var(--color-performance-fg-primary);
		transition: border-color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.input-field::placeholder {
		color: var(--color-performance-fg-muted);
	}

	.input-field:focus {
		outline: none;
		border-color: var(--color-performance-border-emphasis);
	}

	.input-field:disabled {
		opacity: 0.5;
	}

	.btn-primary {
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-lg);
		font-weight: 600;
		transition: opacity var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.back-link {
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-body-sm);
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.back-link:hover {
		color: var(--color-performance-fg-primary);
	}
</style>
