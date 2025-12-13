<script lang="ts">
	let email = '';
	let password = '';
	let loading = false;
	let error = '';

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
				const result = await response.json();
				// Redirect to admin dashboard
				window.location.href = '/admin';
			} else {
				const result = await response.json();
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
		font-size: var(--text-h1);
		font-weight: 700;
	}

	.login-subtitle {
		color: var(--color-fg-tertiary);
	}

	.login-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.error-alert {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--radius-lg);
		color: #fca5a5;
		font-size: var(--text-body-sm);
	}

	.field-label {
		font-size: var(--text-body-sm);
		font-weight: 500;
	}

	.input-field {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.input-field::placeholder {
		color: var(--color-fg-muted);
	}

	.input-field:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.input-field:disabled {
		opacity: 0.5;
	}

	.btn-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-lg);
		font-weight: 600;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.back-link {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}
</style>
