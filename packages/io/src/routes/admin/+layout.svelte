<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	const navItems = [
		{ href: '/admin', label: 'Dashboard', icon: 'chart' },
		{ href: '/admin/experiments', label: 'Experiments', icon: 'beaker' },
		{ href: '/admin/submissions', label: 'Submissions', icon: 'inbox' },
		{ href: '/admin/subscribers', label: 'Subscribers', icon: 'users' },
		{ href: '/admin/analytics', label: 'Analytics', icon: 'graph' }
	];

	async function logout() {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			goto('/admin/login');
		} catch (error) {
			console.error('Logout error:', error);
		}
	}
</script>

<div class="min-h-screen bg-black text-white">
	<!-- Admin Navigation -->
	<nav class="border-b border-white/10 bg-white/5">
		<div class="max-w-7xl mx-auto px-6">
			<div class="flex items-center justify-between">
				<div class="flex gap-6">
					{#each navItems as item}
						<a
							href={item.href}
							class="py-4 border-b-2 transition-colors {$page.url.pathname === item.href
								? 'border-white text-white'
								: 'border-transparent text-white/60 hover:text-white'}"
						>
							{item.label}
						</a>
					{/each}
				</div>
				<div class="flex items-center gap-4">
					<a href="/" class="text-white/60 hover:text-white text-sm">← Back to Site</a>
					<button
						onclick={logout}
						class="text-white/60 hover:text-white text-sm transition-colors"
					>
						Logout
					</button>
				</div>
			</div>
		</div>
	</nav>

	<!-- Admin Content -->
	<main class="max-w-7xl mx-auto px-6 py-8">
		<slot />
	</main>
</div>

<style>
	:global(body) {
		background: #000;
	}
</style>
