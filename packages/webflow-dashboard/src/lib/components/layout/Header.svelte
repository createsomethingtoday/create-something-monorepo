<script lang="ts">
	import { Button } from '$lib/components/ui';
	import { SearchInput, DarkModeToggle } from '$lib/components/ui';
	import { SubmissionTracker } from '$lib/components/dashboard';
	import { LogOut, User } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast';

	interface Props {
		userEmail?: string;
		submissionsThisMonth?: number;
		submissionLimit?: number;
		onSearch?: (term: string) => void;
	}

	let {
		userEmail,
		submissionsThisMonth = 0,
		submissionLimit = 10,
		onSearch
	}: Props = $props();

	async function handleLogout() {
		try {
			const response = await fetch('/api/auth/logout', { method: 'POST' });
			if (response.ok) {
				toast.success('Logged out successfully');
				goto('/login');
			} else {
				toast.error('Logout failed');
			}
		} catch {
			toast.error('Network error during logout');
		}
	}

	function handleSearch(term: string) {
		onSearch?.(term);
	}
</script>

<header class="header">
	<div class="header-inner">
		<div class="left-section">
			<div class="brand">
				<a href="/" class="logo">
					<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="logo-icon">
						<path d="M16.5 8.25V3L21 7.5V18.75L16.5 22.5V17.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M7.5 8.25V3L3 7.5V18.75L7.5 22.5V17.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M7.5 12H16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
					<span class="logo-text">Asset Dashboard</span>
				</a>
			</div>

			<div class="search-wrapper">
				<SearchInput
					onSearch={handleSearch}
					placeholder="Search assets..."
					className="search-input"
				/>
			</div>
		</div>

		<div class="right-section">
			<SubmissionTracker
				submissionsThisMonth={submissionsThisMonth}
				submissionLimit={submissionLimit}
			/>

			<DarkModeToggle />

			{#if userEmail}
				<button class="profile-button" aria-label="User profile">
					<User size={18} />
				</button>
			{/if}

			<Button variant="ghost" size="sm" onclick={handleLogout} className="logout-button">
				<LogOut size={16} />
				<span class="logout-text">Logout</span>
			</Button>
		</div>
	</div>
</header>

<style>
	.header {
		position: sticky;
		top: 0;
		z-index: 100;
		background: var(--color-bg-pure);
		border-bottom: 1px solid var(--color-border-default);
	}

	.header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 1400px;
		margin: 0 auto;
		padding: 0.75rem 1.5rem;
		gap: 1rem;
	}

	.left-section {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex: 1;
		min-width: 0;
	}

	.brand {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-fg-primary);
		text-decoration: none;
	}

	.logo-icon {
		width: 1.75rem;
		height: 1.75rem;
		color: var(--webflow-blue);
		flex-shrink: 0;
	}

	.logo-text {
		font-family: var(--font-sans);
		font-weight: var(--font-semibold);
		font-size: var(--text-body-lg);
		white-space: nowrap;
	}

	.search-wrapper {
		flex-shrink: 1;
		min-width: 0;
		max-width: 18rem; /* 288px / w-72 */
	}

	.search-wrapper :global(.search-input) {
		width: 100%;
	}

	.right-section {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-shrink: 0;
	}

	.profile-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.profile-button:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.logout-text {
		white-space: nowrap;
	}

	@media (max-width: 1024px) {
		.search-wrapper {
			max-width: 12rem;
		}
	}

	@media (max-width: 768px) {
		.header-inner {
			flex-wrap: wrap;
		}

		.search-wrapper {
			order: 3;
			width: 100%;
			max-width: none;
			flex-basis: 100%;
		}

		.logout-text {
			display: none;
		}
	}

	@media (max-width: 640px) {
		.logo-text {
			display: none;
		}

		.right-section {
			gap: 0.5rem;
		}
	}
</style>
