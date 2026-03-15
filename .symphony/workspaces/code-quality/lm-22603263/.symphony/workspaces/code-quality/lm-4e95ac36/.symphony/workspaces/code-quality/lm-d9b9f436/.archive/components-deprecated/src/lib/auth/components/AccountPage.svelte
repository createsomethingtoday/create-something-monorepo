<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';

	interface Props {
		user: {
			email?: string;
			name?: string;
			tier?: string;
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
		ltd: '/api/auth/cross-domain?target=ltd&redirect=/account',
		io: '/api/auth/cross-domain?target=io&redirect=/account',
		space: '/api/auth/cross-domain?target=space&redirect=/account',
		agency: '/api/auth/cross-domain?target=agency&redirect=/account',
		lms: '/api/auth/cross-domain?target=lms&redirect=/account'
	};

	async function handleLogout() {
		isLoggingOut = true;
		try {
			await fetch(logoutEndpoint, { method: 'POST' });
			goto('/');
		} catch {
			goto('/');
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
		padding: var(--space-xl) var(--space-lg);
	}

	.account-card {
		width: 100%;
		max-width: 600px;
	}

	.account-header {
		display: flex;
		align-items: center;
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
		padding-bottom: var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.avatar {
		width: 72px;
		height: 72px;
		border-radius: var(--radius-full);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-secondary);
	}

	.account-info h1 {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs) 0;
	}

	.email {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin: 0;
	}

	.account-sections {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	.account-section {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.account-section h2 {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md) 0;
	}

	.section-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-md) 0;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.detail-row:last-child {
		border-bottom: none;
	}

	.detail-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.detail-value {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
	}

	.detail-value.tier {
		text-transform: capitalize;
		background: var(--color-bg-elevated);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
	}

	.properties-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-sm);
	}

	.property-link {
		display: flex;
		flex-direction: column;
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.property-link:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-hover);
	}

	.property-link.current {
		border-color: var(--color-fg-muted);
	}

	.property-name {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.property-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.logout-button {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		color: var(--color-fg-secondary);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.logout-button:hover:not(:disabled) {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.logout-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
