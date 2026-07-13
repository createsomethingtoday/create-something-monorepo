<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';

	interface Props {
		user: {
			id?: string;
			email?: string;
			name?: string;
			tier?: string;
			analytics_opt_out?: boolean;
		} | null;
		pageTitle?: string;
		currentProperty: 'space' | 'io' | 'agency' | 'ltd' | 'lms';
		logoutEndpoint?: string;
		/** Optional analytics slot for Tufte visualizations */
		analytics?: Snippet;
	}

	let { user, pageTitle, currentProperty, logoutEndpoint = '/api/auth/logout', analytics }: Props = $props();
	let isLoggingOut = $state(false);

	const propertyLabels: Record<string, string> = {
		ltd: 'Philosophy',
		io: 'Research',
		space: 'Practice',
		agency: 'Services',
		lms: 'Learning'
	};

	const propertyUrls: Record<string, string> = {
		ltd: 'https://createsomething.ltd/login?redirect=/account',
		io: 'https://createsomething.io/login?redirect=/account',
		space: 'https://createsomething.space/login?redirect=/account',
		agency: 'https://createsomething.agency/login?redirect=/account',
		lms: 'https://learn.createsomething.space/login?redirect=/account'
	};

	async function handleLogout() {
		isLoggingOut = true;
		try {
			const response = await fetch(logoutEndpoint, { method: 'POST' });
			const payload = (await response.json().catch(() => null)) as { logoutUrl?: string } | null;
			window.location.assign(payload?.logoutUrl || '/login');
		} catch {
			goto('/login');
		}
	}
</script>

<svelte:head>
	<title>{pageTitle || 'Account'}</title>
</svelte:head>

<div class="account-container">
	<div class="account-card">
		<div class="account-header">
			<div class="avatar">
				{user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
			</div>
			<div class="account-info">
				<h1>{user?.name || 'Anonymous'}</h1>
				<p class="email">{user?.email}</p>
			</div>
		</div>

		<div class="account-sections">
			<section class="account-section">
				<h2>Account Details</h2>
				<div class="detail-row">
					<span class="detail-label">Email</span>
					<span class="detail-value">{user?.email}</span>
				</div>
				{#if user?.name}
					<div class="detail-row">
						<span class="detail-label">Name</span>
						<span class="detail-value">{user.name}</span>
					</div>
				{/if}
				{#if user?.tier}
					<div class="detail-row">
						<span class="detail-label">Tier</span>
						<span class="detail-value tier">{user.tier}</span>
					</div>
				{/if}
			</section>

			<section class="account-section">
				<h2>Connected Properties</h2>
				<p class="section-description">
					Your account works across all CREATE SOMETHING properties.
				</p>
				<div class="properties-grid">
					{#each ['ltd', 'io', 'space', 'agency'] as prop}
						<a
							href={propertyUrls[prop]}
							class="property-link"
							class:current={currentProperty === prop}
						>
							<span class="property-name">.{prop}</span>
							<span class="property-label">{propertyLabels[prop]}</span>
						</a>
					{/each}
				</div>
			</section>

			{#if analytics}
				<section class="account-section">
					<h2>Your Activity</h2>
					{@render analytics()}
				</section>
			{/if}

			<section class="account-section">
				<h2>Session</h2>
				<button class="logout-button" onclick={handleLogout} disabled={isLoggingOut}>
					{#if isLoggingOut}
						Signing out...
					{:else}
						Sign out
					{/if}
				</button>
			</section>
		</div>
	</div>
</div>

<style>
	.account-container {
		min-height: calc(100vh - 72px);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: var(--space-performance-xl) var(--space-performance-lg);
	}

	.account-card {
		width: 100%;
		max-width: 600px;
	}

	.account-header {
		display: flex;
		align-items: center;
		gap: var(--space-performance-lg);
		margin-bottom: var(--space-performance-xl);
		padding-bottom: var(--space-performance-lg);
	}

	.avatar {
		width: 72px;
		height: 72px;
		border-radius: var(--radius-performance-scale-full);
		background: var(--color-performance-bg-surface);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-performance-h2);
		font-weight: 600;
		color: var(--color-performance-fg-secondary);
	}

	.account-info h1 {
		font-size: var(--text-performance-h2);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
		margin: 0 0 var(--space-performance-xs) 0;
	}

	.email {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-tertiary);
		margin: 0;
	}

	.account-sections {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xl);
	}

	.account-section {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-lg);
	}

	.account-section h2 {
		font-size: var(--text-performance-body-lg);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin: 0 0 var(--space-performance-md) 0;
	}

	.section-description {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		margin: 0 0 var(--space-performance-md) 0;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-performance-sm) 0;
	}

	.detail-row:last-child {
		border-bottom: none;
	}

	.detail-label {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
	}

	.detail-value {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-primary);
	}

	.detail-value.tier {
		text-transform: capitalize;
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-body-sm);
	}

	.properties-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-performance-sm);
	}

	.property-link {
		display: flex;
		flex-direction: column;
		padding: var(--space-performance-md);
		border-radius: var(--radius-performance-scale-md);
		text-decoration: none;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.property-link:hover {
		border-color: var(--color-performance-border-emphasis);
		background: var(--color-performance-hover);
	}

	.property-link.current {
		border-color: var(--color-performance-fg-muted);
	}

	.property-name {
		font-size: var(--text-performance-body);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
	}

	.property-label {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.logout-button {
		width: 100%;
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: transparent;
		color: var(--color-performance-fg-secondary);
		border-radius: var(--radius-performance-scale-md);
		font-size: var(--text-performance-body);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.logout-button:hover:not(:disabled) {
		background: var(--color-performance-hover);
		border-color: var(--color-performance-border-emphasis);
	}

	.logout-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
