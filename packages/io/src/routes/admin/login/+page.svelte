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
			<h1 class="text-3xl font-bold mb-2">CREATE SOMETHING</h1>
			<p class="text-white/60">Admin Access</p>
		</div>

		<div class="bg-white/5 border border-white/10 rounded-lg p-8">
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleLogin();
				}}
			>
				<div class="space-y-6">
					{#if error}
						<div class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
							{error}
						</div>
					{/if}

					<div>
						<label for="email" class="block text-sm font-medium mb-2">Email</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							disabled={loading}
							autocomplete="email"
							placeholder="your@email.com"
							class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 disabled:opacity-50"
						/>
					</div>

					<div>
						<label for="password" class="block text-sm font-medium mb-2">Password</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							disabled={loading}
							autocomplete="current-password"
							placeholder="••••••••"
							class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 disabled:opacity-50"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						class="w-full px-4 py-3 bg-white text-black rounded-lg hover:bg-white/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'Signing in...' : 'Sign In'}
					</button>
				</div>
			</form>
		</div>

		<div class="mt-6 text-center">
			<a href="/" class="text-white/60 hover:text-white text-sm transition-colors">
				← Back to Site
			</a>
		</div>
	</div>
</div>
